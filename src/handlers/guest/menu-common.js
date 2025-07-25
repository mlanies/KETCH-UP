// src/handlers/guest/menu-common.js
// Универсальные функции показа категорий, напитков и деталей напитка для гостевого бота

import { sendMessageWithKeyboard, sendPhotoWithCaption } from '../../handlers/telegramApi.js';
import { getWineData } from '../../handlers/data.js';
import { getCategoryName } from '../../utils/categories.js';
import { askCloudflareAI } from '../../handlers/ai.js';

function getCloudflareImageUrl(imageId, env) {
  const baseUrl = env.CLOUDFLARE_IMAGES_BASE_URL || "https://imagedelivery.net/tdcdGyOL6_eTEtlo-2Ihkw";
  const variant = env.CLOUDFLARE_IMAGES_VARIANT || "public";
  return `${baseUrl}/${imageId}/${variant}`;
}

// Список категорий меню (безалкогольные)
export async function showMenuCategories(chatId, env) {
  const menuText = `🍹 *Коктейли и напитки*\n\nВыберите категорию коктейлей и безалкогольных напитков:`;
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🍸 Коктейли', callback_data: 'category_cocktails' },
        { text: '🥤 Микс дринк', callback_data: 'category_mix_drinks' }
      ],
      [
        { text: '🍋 Лимонады и Милкшейки', callback_data: 'category_lemonades_milkshakes' },
        { text: '☕ Кофе', callback_data: 'category_coffee' }
      ],
      [
        { text: '🍵 Чай', callback_data: 'category_tea' },
        { text: '🍯 Премиксы', callback_data: 'category_premixes' }
      ],
      [
        { text: '📋 ПФ', callback_data: 'category_pf' },
        { text: '❌ нет в меню', callback_data: 'category_not_in_menu' }
      ],
      [
        { text: '🔙 Назад', callback_data: 'main_menu' }
      ]
    ]
  };
  await sendMessageWithKeyboard(chatId, menuText, keyboard, env);
}

// Список напитков по категории
export async function showCategoryDrinks(categoryType, chatId, env) {
  const wines = await getWineData(env);
  console.log('[DEBUG] Всего напитков загружено:', wines.length);
  const allCategories = Array.from(new Set(wines.map(w => w.category)));
  console.log('[DEBUG] Категории в данных:', allCategories);
  const categoryName = getCategoryName(categoryType);
  console.log('[DEBUG] Искомая категория:', categoryName);
  if (!categoryName) {
    await sendMessageWithKeyboard(chatId, 'Неизвестная категория.', { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'section_menu' }]] }, env);
    return;
  }
  const categoryDrinks = wines.filter(drink => drink.category === categoryName);
  console.log('[DEBUG] Найдено напитков в категории', categoryName, ':', categoryDrinks.length);
  if (!categoryDrinks.length) {
    console.log('[DEBUG] Все напитки:', JSON.stringify(wines, null, 2));
    await sendMessageWithKeyboard(chatId, `В категории "${categoryName}" пока нет напитков.`, { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'section_menu' }]] }, env);
    return;
  }
  const drinksToShow = categoryDrinks.slice(0, 10);
  const keyboard = {
    inline_keyboard: drinksToShow.map(drink => [
      { text: drink.name, callback_data: `drink_${drink.id}` }
    ]).concat([
      [{ text: '🔙 Назад', callback_data: 'section_menu' }],
      [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
    ])
  };
  const message = `🍹 Все напитки в категории "${categoryName}" (${categoryDrinks.length} шт.):\n\nВыберите напиток для просмотра деталей:`;
  await sendMessageWithKeyboard(chatId, message, keyboard, env);
}

// Детали напитка
export async function showDrinkDetails(drinkId, chatId, env) {
  const wines = await getWineData(env);
  const wine = wines.find(w => w.id === drinkId);
  if (!wine) {
    await sendMessageWithKeyboard(chatId, 'Напиток не найден.', { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'section_menu' }]] }, env);
    return;
  }
  let wineText = `🍷 *${wine.name}*\n📂 *Категория:* ${wine.category || 'Не указано'}`;
  if (wine.category === 'Виски') {
    wineText += `\n🥃 *Крепость:* ${wine.alcohol || 'Не указано'}\n🌍 *Страна:* ${wine.country || 'Не указано'}\n🍯 *Тип:* ${wine.type || 'Не указано'}\n⏰ *Выдержка:* ${wine.aging || 'Не указано'}\n🍯 *Сахар:* ${wine.sugar || 'Сухой'}`;
  } else if (wine.category === 'Пиво') {
    wineText += `\n🍺 *Крепость:* ${wine.alcohol || 'Не указано'}\n🌍 *Страна:* ${wine.country || 'Не указано'}\n📊 *Плотность:* ${wine.density || 'Не указано'}\n🍯 *Сахар:* ${wine.sugar || 'Сухое'}`;
  } else if ([ 'Коктейли', 'Микс дринк', 'Лимонады и Милкшейки', 'Кофе' ].includes(wine.category)) {
    wineText += `\n🥤 *Метод:* ${wine.method || 'Не указано'}\n🥂 *Посуда:* ${wine.glassware || 'Не указано'}\n🧊 *Лед:* ${wine.ice || 'Не указано'}\n🍹 *Состав:* ${wine.ingredients || 'Не указано'}`;
  } else if (wine.category === 'Чай') {
    wineText += `\n🍵 *Состав:* ${wine.ingredients || 'Не указано'}\n☕ *Метод:* ${wine.method || 'Не указано'}`;
  } else if (wine.category === 'Премиксы') {
    wineText += `\n🍯 *Состав:* ${wine.ingredients || 'Не указано'}`;
  } else if (wine.category === 'ПФ') {
    wineText += `\n📂 *Подкатегория:* ${wine.subcategory || 'Не указано'}\n🍯 *Состав:* ${wine.ingredients || 'Не указано'}`;
  } else if (wine.category === 'нет в меню') {
    wineText += `\n📂 *Подкатегория:* ${wine.subcategory || 'Не указано'}\n🥤 *Метод:* ${wine.method || 'Не указано'}\n🥂 *Посуда:* ${wine.glassware || 'Не указано'}\n🧊 *Лед:* ${wine.ice || 'Не указано'}\n🍹 *Состав:* ${wine.ingredients || 'Не указано'}`;
  } else {
    wineText += `\n🍯 *Сахар:* ${wine.sugar || 'Не указано'}\n🥃 *Крепость:* ${wine.alcohol || 'Не указано'}\n🌍 *Страна:* ${wine.country || 'Не указано'}`;
  }
  wineText += `\n\n📝 *Описание:*\n${wine.description || 'Описание отсутствует'}`;
  const keyboard = {
    inline_keyboard: [
      [ { text: '🔙 Назад к списку', callback_data: 'section_menu' } ],
      [ { text: '🏠 Главное меню', callback_data: 'main_menu' } ]
    ]
  };
  let imageUrl = null;
  if (wine.image_id) {
    imageUrl = getCloudflareImageUrl(wine.image_id, env);
  }
  if (imageUrl) {
    await sendPhotoWithCaption(chatId, imageUrl, wineText, keyboard, env);
  } else {
    await sendMessageWithKeyboard(chatId, wineText, keyboard, env);
  }
}

// Список алкогольных категорий
export async function showAlcoholCategories(chatId, env) {
  const alcoholText = `🍷 *Алкоголь*\n\nВыберите категорию алкогольных напитков:`;
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🍷 Вина', callback_data: 'category_wines' },
        { text: '🥃 Граппа, Порто, Коньяк, Вермут', callback_data: 'category_spirits' }
      ],
      [
        { text: '🥃 Виски', callback_data: 'category_whisky' },
        { text: '🍹 Ром, Текила', callback_data: 'category_rum_tequila' }
      ],
      [
        { text: '🍸 Джин, Водка, Ликеры', callback_data: 'category_gin_vodka' },
        { text: '🍺 Пиво', callback_data: 'category_beer' }
      ],
      [
        { text: '🔙 Назад', callback_data: 'main_menu' }
      ]
    ]
  };
  await sendMessageWithKeyboard(chatId, alcoholText, keyboard, env);
}

export async function startGuestAIFoodChat(chatId, env) {
  const text = '🤖 Напишите ваши предпочтения (например: "люблю острое, не ем мясо, хочу что-то легкое") — и я подберу блюда из меню!';
  await sendMessageWithKeyboard(chatId, text, {
    inline_keyboard: [
      [ { text: '🔙 Назад', callback_data: 'main_menu' } ]
    ]
  }, env);
  if (!env.__awaiting_guest_ai_prefs) env.__awaiting_guest_ai_prefs = {};
  env.__awaiting_guest_ai_prefs[chatId] = true;
}

export async function handleGuestAIPrefsMessage(message, env) {
  const chatId = message.chat.id;
  const text = message.text || '';
  if (!env.__awaiting_guest_ai_prefs || !env.__awaiting_guest_ai_prefs[chatId]) return false;
  env.__awaiting_guest_ai_prefs[chatId] = false;
  const prompt = `Гость ресторана описал свои предпочтения: "${text}". Подбери блюда и напитки из меню, которые максимально подходят под эти предпочтения. Выведи список с кратким описанием и эмодзи. Если что-то не найдено — предложи альтернативу.`;
  const aiResponse = await askCloudflareAI(prompt, env, { preferences: [text] });
  await sendMessageWithKeyboard(chatId, `Ваш персональный подбор от ИИ:\n\n${aiResponse}`, {
    inline_keyboard: [ [ { text: '🏠 Главное меню', callback_data: 'main_menu' } ] ]
  }, env);
  return true;
}

export const guestMenuCategoryList = showMenuCategories;
export const guestMenuCategoryDrinks = showCategoryDrinks;
export const guestShowDrinkDetails = showDrinkDetails;
export const guestAlcoholCategoryList = showAlcoholCategories;
export const guestAlcoholCategoryDrinks = showCategoryDrinks; 