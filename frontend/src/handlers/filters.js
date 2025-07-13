// Функции для работы с фильтрами и тестирования фильтров

import { sendMessage, sendMessageWithKeyboard, editMessage } from './telegramApi.js';
import { getWineData } from './data.js';
import { getCategoryName } from '../utils/categories.js';

// Обработка выбора фильтра
export async function handleFilterSelection(data, chatId, messageId, env) {
  const parts = data.split('_');
  const filterType = parts[1]; // sugar, alcohol, country
  const categoryType = parts[2]; // wines, spirits, whisky, etc.
  
  console.log('Filter selection:', filterType, 'for category:', categoryType);
  
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

  // Логируем первые несколько вин для отладки
  console.log('First 3 wines in category:', categoryWines.slice(0, 3).map(w => ({
    name: w.name,
    sugar: w.sugar,
    alcohol: w.alcohol,
    country: w.country
  })));

  let uniqueValues = [];
  let filterName = '';

  // Функция для "очистки" значения (только буквы и цифры)
  function cleanValue(val) {
    return (val || '').replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '').toLowerCase();
  }

  switch (filterType) {
    case 'sugar':
      uniqueValues = [...new Set(categoryWines.map(wine => wine.sugar ? wine.sugar.trim() : '').filter(Boolean))];
      filterName = 'сахару';
      console.log('Sugar values found:', uniqueValues);
      break;
    case 'alcohol':
      uniqueValues = [...new Set(categoryWines.map(wine => wine.alcohol ? wine.alcohol.trim() : '').filter(Boolean))];
      filterName = 'крепости';
      console.log('Alcohol values found:', uniqueValues);
      break;
    case 'country':
      uniqueValues = [...new Set(categoryWines.map(wine => wine.country ? wine.country.trim() : '').filter(Boolean))];
      filterName = 'стране';
      console.log('Country values found:', uniqueValues);
      break;
    default:
      console.log('Unknown filter type:', filterType);
      await sendMessage(chatId, 'Неизвестный тип фильтра.', env);
      return;
  }

  if (uniqueValues.length === 0) {
    await sendMessage(chatId, `Нет данных для фильтрации по ${filterName} в категории "${categoryName}".`, env);
    return;
  }

  // Сопоставление: оригинальное значение -> "очищенное"
  const valueMap = {};
  uniqueValues.forEach(val => { valueMap[cleanValue(val)] = val; });
  console.log('Value map for buttons:', valueMap);

  const keyboard = {
    inline_keyboard: uniqueValues.map(value => [
      { text: value, callback_data: `filter_value_${filterType}_${categoryType}_${cleanValue(value)}` }
    ]).concat([
      [{ text: '🔙 Назад', callback_data: `category_${categoryType}` }]
    ])
  };

  try {
    await editMessage(chatId, messageId, `Выберите ${filterName} для категории "${categoryName}":`, keyboard, env);
  } catch (e) {
    await sendMessageWithKeyboard(chatId, `Выберите ${filterName} для категории "${categoryName}":`, keyboard, env);
  }
}

// Обработка выбора значения фильтра
export async function handleFilterValueSelection(data, chatId, messageId, env) {
  // Новый разбор callback_data с поддержкой категорий
  const parts = data.split('_');
  const filterType = parts[2]; // sugar, alcohol, country
  const categoryType = parts[3]; // wines, spirits, whisky, etc.
  const clean = parts.slice(4).join('_'); // очищенное значение

  console.log('Filter value selection:', filterType, 'for category:', categoryType, 'clean value:', clean);

  // Функция для "очистки" значения (только буквы и цифры)
  function cleanValue(val) {
    return (val || '').replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '').toLowerCase();
  }

  const wines = await getWineData(env);
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

  // Получаем все уникальные значения для фильтра в рамках категории
  let uniqueValues = [];
  switch (filterType) {
    case 'sugar':
      uniqueValues = [...new Set(categoryWines.map(wine => wine.sugar ? wine.sugar.trim() : '').filter(Boolean))];
      break;
    case 'alcohol':
      uniqueValues = [...new Set(categoryWines.map(wine => wine.alcohol ? wine.alcohol.trim() : '').filter(Boolean))];
      break;
    case 'country':
      uniqueValues = [...new Set(categoryWines.map(wine => wine.country ? wine.country.trim() : '').filter(Boolean))];
      break;
    default:
      await sendMessage(chatId, 'Неизвестный тип фильтра.', env);
      return;
  }

  // Сопоставляем "очищенное" значение с оригинальным
  const valueMap = {};
  uniqueValues.forEach(val => { valueMap[cleanValue(val)] = val; });
  const filterValue = valueMap[clean];
  console.log('FilterValue from callback:', filterValue, '| Clean:', clean, '| Map:', valueMap);

  let filteredWines = [];
  let filterName = '';

  switch (filterType) {
    case 'sugar':
      filteredWines = categoryWines.filter(wine => (wine.sugar ? wine.sugar.trim() : '') === filterValue);
      filterName = 'сахару';
      break;
    case 'alcohol':
      filteredWines = categoryWines.filter(wine => (wine.alcohol ? wine.alcohol.trim() : '') === filterValue);
      filterName = 'крепости';
      break;
    case 'country':
      filteredWines = categoryWines.filter(wine => (wine.country ? wine.country.trim() : '') === filterValue);
      filterName = 'стране';
      break;
    default:
      await sendMessage(chatId, 'Неизвестный тип фильтра.', env);
      return;
  }

  if (!filterValue) {
    await sendMessage(chatId, 'Ошибка фильтрации: не удалось сопоставить значение.', env);
    return;
  }

  if (filteredWines.length === 0) {
    await sendMessage(chatId, `По фильтру "${filterValue}" в категории "${categoryName}" ничего не найдено.`, env);
    return;
  }

  // Показываем результаты фильтрации
  const winesToShow = filteredWines.slice(0, 10);
  
  const keyboard = {
    inline_keyboard: winesToShow.map(wine => [
      { text: wine.name, callback_data: wine.id }
    ]).concat([
      [{ text: '🔙 Назад', callback_data: `category_${categoryType}` }],
      [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
    ])
  };

  await editMessage(chatId, messageId, 
    `🍷 Найдено ${filteredWines.length} напитков в категории "${categoryName}" по ${filterName} "${filterValue}":`, 
    keyboard, env);
}

// Тестирование фильтров
export async function testFilters(env) {
  try {
    const wines = await getWineData(env);
    
    if (!wines || wines.length === 0) {
      return new Response(JSON.stringify({
        error: 'No wines data available'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Тестируем фильтры
    const sugarValues = [...new Set(wines.map(wine => wine.sugar ? wine.sugar.trim() : '').filter(Boolean))];
    const alcoholValues = [...new Set(wines.map(wine => wine.alcohol ? wine.alcohol.trim() : '').filter(Boolean))];
    const countryValues = [...new Set(wines.map(wine => wine.country ? wine.country.trim() : '').filter(Boolean))];
    
    // Тестируем фильтрацию
    const testSugarFilter = wines.filter(wine => (wine.sugar ? wine.sugar.trim() : '') === 'Brut');
    const testAlcoholFilter = wines.filter(wine => (wine.alcohol ? wine.alcohol.trim() : '') === '11.5%');
    
    return new Response(JSON.stringify({
      success: true,
      total_wines: wines.length,
      first_3_wines: wines.slice(0, 3).map(w => ({
        name: w.name,
        sugar: w.sugar,
        alcohol: w.alcohol,
        country: w.country
      })),
      sugar_values: sugarValues,
      alcohol_values: alcoholValues,
      country_values: countryValues,
      test_sugar_filter: {
        filter_value: 'Brut',
        found_count: testSugarFilter.length,
        wines: testSugarFilter.map(w => w.name)
      },
      test_alcohol_filter: {
        filter_value: '11.5%',
        found_count: testAlcoholFilter.length,
        wines: testAlcoholFilter.map(w => w.name)
      }
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Filter test error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 