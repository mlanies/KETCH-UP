// Логика для раздела "Алкоголь" (алкогольные напитки)

import { sendMessage, sendMessageWithKeyboard, editMessage } from './telegramApi.js';
import { getWineData } from './data.js';
import { getCategoryName } from '../utils/categories.js';

// Обработка раздела "Алкоголь"
export async function handleAlcoholSection(chatId, messageId, env) {
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
        { text: '🔙 Назад', callback_data: `section_alcohol` },
        { text: '🏠 Главное меню', callback_data: 'main_menu' }
      ]
    ]
  };

  try {
    await editMessage(chatId, messageId, alcoholText, keyboard, env);
  } catch (e) {
    await sendMessageWithKeyboard(chatId, alcoholText, keyboard, env);
  }
}

// Обработка выбора категории алкоголя
export async function handleCategorySelection(data, chatId, messageId, env) {
  const categoryType = data.replace('category_', '');
  console.log('Category selection:', categoryType);
  
  const wines = await getWineData(env);
  console.log('Wines loaded:', wines ? wines.length : 0);
  
  if (!wines || wines.length === 0) {
    await sendMessage(chatId, 'Данные о напитках временно недоступны. Попробуйте позже.', env);
    return;
  }

  // Определяем категорию по типу
  const categoryName = getCategoryName(categoryType);
  if (!categoryName) {
    await sendMessage(chatId, 'Неизвестная категория.', env);
    return;
  }

  // Фильтруем напитки по категории
  const categoryWines = wines.filter(wine => wine.category === categoryName);
  console.log(`Found ${categoryWines.length} drinks in category: ${categoryName}`);

  if (categoryWines.length === 0) {
    await sendMessage(chatId, `В категории "${categoryName}" пока нет напитков.`, env);
    return;
  }

  // Создаем клавиатуру с фильтрами для категории
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🍯 Фильтр по сахару', callback_data: `filter_sugar_${categoryType}` },
        { text: '🥃 Фильтр по крепости', callback_data: `filter_alcohol_${categoryType}` }
      ],
      [
        { text: '🌍 Фильтр по стране', callback_data: `filter_country_${categoryType}` },
        { text: '📋 Все напитки', callback_data: `show_category_${categoryType}` }
      ],
      [
        { text: '🔄 Обновить данные', callback_data: 'refresh_data' },
        { text: '🔙 Назад', callback_data: `section_alcohol` }
      ]
    ]
  };

  try {
    await editMessage(chatId, messageId, `🍷 Категория: ${categoryName}\n\nНайдено ${categoryWines.length} напитков.\n\nВыберите способ фильтрации:`, keyboard, env);
  } catch (e) {
    await sendMessageWithKeyboard(chatId, `🍷 Категория: ${categoryName}\n\nНайдено ${categoryWines.length} напитков.\n\nВыберите способ фильтрации:`, keyboard, env);
  }
}

// Показать все напитки в категории
export async function handleShowCategory(data, chatId, messageId, env) {
  const categoryType = data.replace('show_category_', '');
  console.log('Show category:', categoryType);
  
  const wines = await getWineData(env);
  console.log('Wines loaded:', wines ? wines.length : 0);
  
  if (!wines || wines.length === 0) {
    await sendMessage(chatId, 'Данные о напитках временно недоступны. Попробуйте позже.', env);
    return;
  }

  // Определяем категорию по типу
  const categoryName = getCategoryName(categoryType);
  if (!categoryName) {
    await sendMessage(chatId, 'Неизвестная категория.', env);
    return;
  }

  // Фильтруем напитки по категории
  const categoryWines = wines.filter(wine => wine.category === categoryName);
  console.log(`Found ${categoryWines.length} drinks in category: ${categoryName}`);

  if (categoryWines.length === 0) {
    await sendMessage(chatId, `В категории "${categoryName}" пока нет напитков.`, env);
    return;
  }

  // Показываем первые 10 напитков
  const winesToShow = categoryWines.slice(0, 10);
  
  const keyboard = {
    inline_keyboard: winesToShow.map(wine => [
      { text: wine.name, callback_data: wine.id }
    ]).concat([
      [{ text: '🔙 Назад', callback_data: `category_${categoryType}` }],
      [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
    ])
  };

  const message = `🍷 Все напитки в категории "${categoryName}" (${categoryWines.length} шт.):\n\nВыберите напиток для просмотра деталей:`;

  try {
    await editMessage(chatId, messageId, message, keyboard, env);
  } catch (e) {
    await sendMessageWithKeyboard(chatId, message, keyboard, env);
  }
} 