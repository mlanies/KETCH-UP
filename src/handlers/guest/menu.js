// src/handlers/guest/menu.js
// Модуль меню для гостевого бота

import { sendMessageWithKeyboard } from '../../handlers/telegramApi.js';
import { getWineData } from '../../handlers/data.js';
import { getCategoryName } from '../../utils/categories.js';
import { sendPhotoWithCaption } from '../../handlers/telegramApi.js';

function getCloudflareImageUrl(imageId, env) {
  const baseUrl = env.CLOUDFLARE_IMAGES_BASE_URL || "https://imagedelivery.net/tdcdGyOL6_eTEtlo-2Ihkw";
  const variant = env.CLOUDFLARE_IMAGES_VARIANT || "public";
  return `${baseUrl}/${imageId}/${variant}`;
}

// Главное меню для гостей
export async function sendGuestMainMenu(chatId, env, customText) {
  const text = customText || '🏠 Главное меню. Выберите раздел:';
  const keyboard = {
    inline_keyboard: [
      [ { text: '🍽️ Меню', callback_data: 'guest_menu' }, { text: '🍷 Алкоголь', callback_data: 'guest_alcohol' } ],
      [ { text: '✍️ Оставить отзыв', callback_data: 'guest_feedback' } ],
      [ { text: '🤖 AI-подбор блюд', callback_data: 'guest_ai_food_chat' } ],
      [ { text: '🤖 Спросить у AI', callback_data: 'guest_ask_ai' } ],
      [ { text: '🏪 О заведении', callback_data: 'guest_about' } ]
    ]
  };
  await sendMessageWithKeyboard(chatId, text, keyboard, env);
}

// Меню ресторана (пример)
export async function sendGuestMenu(chatId, env) {
  const text = '🍽️ Меню ресторана:\n- Бургеры\n- Пицца\n- Салаты\n- ...';
  await sendMessageWithKeyboard(chatId, text, {
    inline_keyboard: [
      [ { text: '🔙 Назад', callback_data: 'guest_main_menu' } ]
    ]
  }, env);
}

// Напитки (пример)
export async function sendGuestDrinks(chatId, env) {
  const text = '🍷 Напитки:\n- Вина\n- Коктейли\n- Пиво\n- ...';
  await sendMessageWithKeyboard(chatId, text, {
    inline_keyboard: [
      [ { text: '🔙 Назад', callback_data: 'guest_main_menu' } ]
    ]
  }, env);
}

// AI-чат для подбора блюд по предпочтениям
import { askCloudflareAI } from '../../handlers/ai.js';

export async function startGuestAIFoodChat(chatId, env) {
  const text = '🤖 Напишите ваши предпочтения (например: "люблю острое, не ем мясо, хочу что-то легкое") — и я подберу блюда из меню!';
  await sendMessageWithKeyboard(chatId, text, {
    inline_keyboard: [
      [ { text: '🔙 Назад', callback_data: 'guest_main_menu' } ]
    ]
  }, env);
  // Состояние ожидания предпочтений будет храниться в env
  if (!env.__awaiting_guest_ai_prefs) env.__awaiting_guest_ai_prefs = {};
  env.__awaiting_guest_ai_prefs[chatId] = true;
}

export async function handleGuestAIPrefsMessage(message, env) {
  const chatId = message.chat.id;
  const text = message.text || '';
  if (!env.__awaiting_guest_ai_prefs || !env.__awaiting_guest_ai_prefs[chatId]) return false;
  env.__awaiting_guest_ai_prefs[chatId] = false;
  // Формируем промпт для ИИ
  const prompt = `Гость ресторана описал свои предпочтения: "${text}". Подбери блюда и напитки из меню, которые максимально подходят под эти предпочтения. Выведи список с кратким описанием и эмодзи. Если что-то не найдено — предложи альтернативу.`;
  const aiResponse = await askCloudflareAI(prompt, env, { preferences: [text] });
  await sendMessageWithKeyboard(chatId, `Ваш персональный подбор от ИИ:

${aiResponse}`, {
    inline_keyboard: [ [ { text: '🏠 Главное меню', callback_data: 'guest_main_menu' } ] ]
  }, env);
  return true;
}

// Список категорий меню для гостей
export async function guestMenuCategoryList(chatId, env) {
  const menuText = `🍹 *Коктейли и напитки*\n\nВыберите категорию коктейлей и безалкогольных напитков:`;
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🍸 Коктейли', callback_data: 'guest_category_cocktails' },
        { text: '🥤 Микс дринк', callback_data: 'guest_category_mix_drinks' }
      ],
      [
        { text: '🍋 Лимонады и Милкшейки', callback_data: 'guest_category_lemonades_milkshakes' },
        { text: '☕ Кофе', callback_data: 'guest_category_coffee' }
      ],
      [
        { text: '🍵 Чай', callback_data: 'guest_category_tea' },
        { text: '🍯 Премиксы', callback_data: 'guest_category_premixes' }
      ],
      [
        { text: '📋 ПФ', callback_data: 'guest_category_pf' },
        { text: '❌ нет в меню', callback_data: 'guest_category_not_in_menu' }
      ],
      [
        { text: '🔙 Назад', callback_data: 'guest_main_menu' }
      ]
    ]
  };
  await sendMessageWithKeyboard(chatId, menuText, keyboard, env);
}

// Список напитков по категории для гостей
export async function guestMenuCategoryDrinks(categoryType, chatId, env) {
  const wines = await getWineData(env);
  const categoryName = getCategoryName(categoryType);
  if (!categoryName) {
    await sendMessageWithKeyboard(chatId, 'Неизвестная категория.', { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'guest_menu' }]] }, env);
    return;
  }
  const categoryDrinks = wines.filter(drink => drink.category === categoryName);
  if (!categoryDrinks.length) {
    await sendMessageWithKeyboard(chatId, `В категории "${categoryName}" пока нет напитков.`, { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'guest_menu' }]] }, env);
    return;
  }
  const drinksToShow = categoryDrinks.slice(0, 10);
  const keyboard = {
    inline_keyboard: drinksToShow.map(drink => [
      { text: drink.name, callback_data: `guest_drink_${drink.id}` }
    ]).concat([
      [{ text: '🔙 Назад', callback_data: 'guest_menu' }],
      [{ text: '🏠 Главное меню', callback_data: 'guest_main_menu' }]
    ])
  };
  const message = `🍹 Все напитки в категории "${categoryName}" (${categoryDrinks.length} шт.):\n\nВыберите напиток для просмотра деталей:`;
  await sendMessageWithKeyboard(chatId, message, keyboard, env);
}

export async function guestShowDrinkDetails(drinkId, chatId, env) {
  const wines = await getWineData(env);
  const wine = wines.find(w => w.id === drinkId);
  if (!wine) {
    await sendMessageWithKeyboard(chatId, 'Напиток не найден.', { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'guest_menu' }]] }, env);
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
      [ { text: '🔙 Назад к списку', callback_data: 'guest_menu' } ],
      [ { text: '🏠 Главное меню', callback_data: 'guest_main_menu' } ]
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

// Список алкогольных категорий для гостей
export async function guestAlcoholCategoryList(chatId, env) {
  const alcoholText = `🍷 *Алкоголь*\n\nВыберите категорию алкогольных напитков:`;
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🍷 Вина', callback_data: 'guest_alc_category_wines' },
        { text: '🥃 Граппа, Порто, Коньяк, Вермут', callback_data: 'guest_alc_category_spirits' }
      ],
      [
        { text: '🥃 Виски', callback_data: 'guest_alc_category_whisky' },
        { text: '🍹 Ром, Текила', callback_data: 'guest_alc_category_rum_tequila' }
      ],
      [
        { text: '🍸 Джин, Водка, Ликеры', callback_data: 'guest_alc_category_gin_vodka' },
        { text: '🍺 Пиво', callback_data: 'guest_alc_category_beer' }
      ],
      [
        { text: '🔙 Назад', callback_data: 'guest_main_menu' }
      ]
    ]
  };
  await sendMessageWithKeyboard(chatId, alcoholText, keyboard, env);
}

// Список алкогольных напитков по категории для гостей
export async function guestAlcoholCategoryDrinks(categoryType, chatId, env) {
  const wines = await getWineData(env);
  const categoryName = getCategoryName(categoryType);
  if (!categoryName) {
    await sendMessageWithKeyboard(chatId, 'Неизвестная категория.', { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'guest_alcohol' }]] }, env);
    return;
  }
  const categoryDrinks = wines.filter(drink => drink.category === categoryName);
  if (!categoryDrinks.length) {
    await sendMessageWithKeyboard(chatId, `В категории "${categoryName}" пока нет напитков.`, { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'guest_alcohol' }]] }, env);
    return;
  }
  const drinksToShow = categoryDrinks.slice(0, 10);
  const keyboard = {
    inline_keyboard: drinksToShow.map(drink => [
      { text: drink.name, callback_data: `guest_drink_${drink.id}` }
    ]).concat([
      [{ text: '🔙 Назад', callback_data: 'guest_alcohol' }],
      [{ text: '🏠 Главное меню', callback_data: 'guest_main_menu' }]
    ])
  };
  const message = `🍷 Все напитки в категории "${categoryName}" (${categoryDrinks.length} шт.):\n\nВыберите напиток для просмотра деталей:`;
  await sendMessageWithKeyboard(chatId, message, keyboard, env);
} 