// Логика для раздела "Меню" (коктейли и напитки)

import { sendMessage, sendMessageWithKeyboard, editMessage } from './telegramApi.js';
import { getWineData } from './data.js';
import { getCategoryName } from '../utils/categories.js';

// Обработка раздела "Меню"
export async function handleMenuSection(chatId, messageId, env) {
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

  try {
    await editMessage(chatId, messageId, menuText, keyboard, env);
  } catch (e) {
    await sendMessageWithKeyboard(chatId, menuText, keyboard, env);
  }
}

// Обработка выбора категории коктейлей
export async function handleCocktailCategorySelection(data, chatId, messageId, env) {
  const categoryType = data.replace('category_', '');
  console.log('Cocktail category selection:', categoryType);
  
  const wines = await getWineData(env);
  console.log('Drinks loaded:', wines ? wines.length : 0);
  
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
  const categoryDrinks = wines.filter(drink => drink.category === categoryName);
  console.log(`Found ${categoryDrinks.length} drinks in category: ${categoryName}`);

  if (categoryDrinks.length === 0) {
    await sendMessage(chatId, `В категории "${categoryName}" пока нет напитков.`, env);
    return;
  }

  // Показываем первые 10 напитков
  const drinksToShow = categoryDrinks.slice(0, 10);
  
  const keyboard = {
    inline_keyboard: drinksToShow.map(drink => [
      { text: drink.name, callback_data: drink.id }
    ]).concat([
      [{ text: '🔙 Назад', callback_data: 'section_menu' }],
      [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
    ])
  };

  const message = `🍹 Все напитки в категории "${categoryName}" (${categoryDrinks.length} шт.):\n\nВыберите напиток для просмотра деталей:`;

  try {
    await editMessage(chatId, messageId, message, keyboard, env);
  } catch (e) {
    await sendMessageWithKeyboard(chatId, message, keyboard, env);
  }
}

// В будущем здесь можно добавить:
// - Категории блюд (закуски, основные блюда, десерты)
// - Описания блюд
// - Цены
// - Рекомендации по подаче
// - Аллергены
// - Калорийность 