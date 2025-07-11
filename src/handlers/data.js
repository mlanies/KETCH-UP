// Работа с данными (Google Sheets, кеш, fallback)

import { getFallbackWineData } from '../utils/fallbackData.js';

// Значение sheetId по умолчанию ("Вина")
const DEFAULT_SHEET_ID = 304728120;

// Конфигурация листов Google Sheets
const SHEET_CONFIG = {
  // Вина
  304728120: {
    name: 'Вина',
    category: 'Вина',
    columns: ['name', 'sugar', 'alcohol', 'country', 'description']
  },
  // Граппа, Порто, Коньяк, Вермут
  475136119: {
    name: 'Граппа, Порто, Коньяк, Вермут',
    category: 'Граппа, Порто, Коньяк, Вермут',
    columns: ['name', 'sugar', 'alcohol', 'country', 'description']
  },
  // Виски
  1464137901: {
    name: 'Виски',
    category: 'Виски',
    columns: ['name', 'country', 'alcohol', 'type', 'aging', 'description']
  },
  // Ром, Текила
  622932265: {
    name: 'Ром, Текила',
    category: 'Ром, Текила',
    columns: ['name', 'sugar', 'alcohol', 'country', 'description']
  },
  // Джин, Водка, Ликеры
  1353666556: {
    name: 'Джин, Водка, Ликеры',
    category: 'Джин, Водка, Ликеры',
    columns: ['name', 'sugar', 'alcohol', 'country', 'description']
  },
  // Пиво
  1693795279: {
    name: 'Пиво',
    category: 'Пиво',
    columns: ['name', 'country', 'density', 'alcohol', 'description']
  }
};

// Конфигурация листов с коктейлями и напитками (новый документ)
const COCKTAIL_SHEET_CONFIG = {
  // Коктейли
  933733242: {
    name: 'Коктейли',
    category: 'Коктейли',
    columns: ['name', 'method', 'glassware', 'ice', 'ingredients']
  },
  // Микс дринк
  333534132: {
    name: 'Микс дринк',
    category: 'Микс дринк',
    columns: ['name', 'method', 'glassware', 'ice', 'ingredients']
  },
  // Лимонады и Милкшейки
  960984055: {
    name: 'Лимонады и Милкшейки',
    category: 'Лимонады и Милкшейки',
    columns: ['name', 'method', 'glassware', 'ice', 'ingredients']
  },
  // Чай
  757868796: {
    name: 'Чай',
    category: 'Чай',
    columns: ['name', 'ingredients', 'method']
  },
  // Кофе
  1558262156: {
    name: 'Кофе',
    category: 'Кофе',
    columns: ['name', 'method', 'glassware', 'ice', 'ingredients']
  },
  // Премиксы
  488095192: {
    name: 'Премиксы',
    category: 'Премиксы',
    columns: ['name', 'ingredients']
  },
  // ПФ
  267708529: {
    name: 'ПФ',
    category: 'ПФ',
    columns: ['category', 'name', 'ingredients', 'description']
  },
  // нет в меню
  118586886: {
    name: 'нет в меню',
    category: 'нет в меню',
    columns: ['category', 'name', 'method', 'glassware', 'ice', 'ingredients']
  }
};

// Получение данных о винах из Google Sheets
export async function getWineData(env) {
  try {
    // Сначала проверяем кеш
    const cached = await env.WINE_CACHE.get('wine_data');
    if (cached) {
      console.log('Using cached wine data');
      const wines = JSON.parse(cached);
      console.log('Cached wines count:', wines.length);
      return wines;
    }

    // Если кеша нет, загружаем данные из Google Sheets
    console.log('Cache miss, loading from Google Sheets...');
    let wines = await loadWinesFromGoogleSheets(env);
    console.log('Loaded wines count:', wines.length);
    
    // Кешируем данные на 1 час
    await env.WINE_CACHE.put('wine_data', JSON.stringify(wines), { expirationTtl: 3600 });
    console.log('Wines cached successfully');
    
    return wines;
  } catch (error) {
    console.error('Error getting wine data:', error);
    // Если Google Sheets недоступен, используем fallback
    console.log('Falling back to test data...');
    return getFallbackWineData();
  }
}

// Получить выбранный sheetId из KV или вернуть дефолтный
export async function getSelectedSheetId(env) {
  const id = await env.WINE_CACHE.get('selected_sheet_id');
  return id ? parseInt(id) : DEFAULT_SHEET_ID;
}

// Получить название листа по sheetId
export async function getSheetNameById(env, sheetId) {
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = env.GOOGLE_SHEETS_API_KEY;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
  
  console.log('Getting sheet name by ID...');
  console.log('SheetId:', sheetId);
  console.log('URL:', url);
  
  const response = await fetch(url);
  console.log('Response status:', response.status);
  
  const responseText = await response.text();
  console.log('Response text (first 500 chars):', responseText.substring(0, 500));
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}. Response: ${responseText.substring(0, 1000)}`);
  }
  
  const data = JSON.parse(responseText);
  console.log('Data keys:', Object.keys(data));
  console.log('Sheets array:', data.sheets ? data.sheets.length : 'undefined');
  
  if (!data.sheets) {
    console.log('Full response:', JSON.stringify(data, null, 2));
    throw new Error('No sheets found in response');
  }
  
  const sheet = data.sheets.find(s => s.properties.sheetId == sheetId);
  if (!sheet) {
    console.log('Available sheetIds:', data.sheets.map(s => s.properties.sheetId));
    throw new Error(`Sheet with ID ${sheetId} not found`);
  }
  
  console.log('Found sheet:', sheet.properties.title);
  return sheet.properties.title;
}

// Загрузка данных из всех листов Google Sheets
export async function loadWinesFromGoogleSheets(env) {
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = env.GOOGLE_SHEETS_API_KEY;
  
  console.log('Loading wines from all Google Sheets...');
  console.log('Spreadsheet ID:', spreadsheetId);
  console.log('API Key present:', !!apiKey);
  
  const allWines = [];
  let wineIdCounter = 1;
  
  // Загружаем данные со всех листов алкогольных напитков
  for (const [sheetId, config] of Object.entries(SHEET_CONFIG)) {
    try {
      console.log(`Loading from sheet: ${config.name} (ID: ${sheetId})`);
      
      // URL-кодируем название листа для корректной работы с кириллицей
      const encodedSheetName = encodeURIComponent(config.name);
      const range = `${encodedSheetName}!A:Z`; // Загружаем все столбцы
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
      
      console.log('Request URL:', url);
      
      const response = await fetch(url);
      console.log(`Response status for ${config.name}:`, response.status);
      
      if (!response.ok) {
        console.error(`Error loading sheet ${config.name}:`, response.status, response.statusText);
        continue; // Пропускаем проблемный лист
      }
      
      const responseText = await response.text();
      const data = JSON.parse(responseText);
      
      if (!data.values || data.values.length < 2) {
        console.log(`No data found in sheet ${config.name}`);
        continue;
      }
      
      const headers = data.values[0]; // Первая строка - заголовки
      console.log(`Headers for ${config.name}:`, headers);
      
      // Создаем маппинг столбцов
      const columnMapping = {};
      config.columns.forEach((columnName, index) => {
        columnMapping[columnName] = index;
      });
      
      // Обрабатываем данные начиная со второй строки
      for (let i = 1; i < data.values.length; i++) {
        const row = data.values[i];
        
        // Проверяем, что есть название в первой колонке
        if (row.length > 0 && row[0] && row[0].trim() !== '') {
          const name = row[0].trim();
          
          // Пропускаем пустые строки и строки с заголовками
          if (name.length < 3) continue;
          if (name.toLowerCase().includes('название')) continue;
          
          // Создаем объект напитка
          const wine = {
            id: `wine_${wineIdCounter++}`,
            name: name,
            category: config.category
          };
          
          // Заполняем поля в зависимости от структуры листа
          if (config.category === 'Виски') {
            // Виски: Название, Страна, Крепость, Тип, Выдержка, Описание
            wine.country = row[columnMapping.country] || '';
            wine.alcohol = row[columnMapping.alcohol] || '';
            wine.type = row[columnMapping.type] || '';
            wine.aging = row[columnMapping.aging] || '';
            wine.description = row[columnMapping.description] || '';
            wine.sugar = 'Сухой'; // Для виски всегда сухой
          } else if (config.category === 'Пиво') {
            // Пиво: Название Пива, Страна, Плотность, Крепость, Описание
            wine.country = row[columnMapping.country] || '';
            wine.density = row[columnMapping.density] || '';
            wine.alcohol = row[columnMapping.alcohol] || '';
            wine.description = row[columnMapping.description] || '';
            wine.sugar = 'Сухое'; // Для пива всегда сухое
          } else {
            // Остальные категории: Название, Сахар, Крепость, Страна, Описание
            wine.sugar = row[columnMapping.sugar] || '';
            wine.alcohol = row[columnMapping.alcohol] || '';
            wine.country = row[columnMapping.country] || '';
            wine.description = row[columnMapping.description] || '';
          }
          
          // Добавляем вино только если есть название
          if (name && name.length > 3) {
            allWines.push(wine);
          }
        }
      }
      
      console.log(`Loaded ${allWines.length} wines from ${config.name}`);
      
    } catch (error) {
      console.error(`Error loading sheet ${config.name}:`, error);
      // Продолжаем загрузку других листов
    }
  }
  
  // Загружаем данные со всех листов коктейлей и напитков
  let cocktailDataLoaded = false;
  for (const [sheetId, config] of Object.entries(COCKTAIL_SHEET_CONFIG)) {
    try {
      console.log(`Loading from cocktail sheet: ${config.name} (ID: ${sheetId})`);
      
      // URL-кодируем название листа для корректной работы с кириллицей
      const encodedSheetName = encodeURIComponent(config.name);
      const range = `${encodedSheetName}!A:Z`; // Загружаем все столбцы
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
      
      console.log('Request URL:', url);
      
      const response = await fetch(url);
      console.log(`Response status for ${config.name}:`, response.status);
      
      if (!response.ok) {
        console.error(`Error loading cocktail sheet ${config.name}:`, response.status, response.statusText);
        continue; // Пропускаем проблемный лист
      }
      
      const responseText = await response.text();
      const data = JSON.parse(responseText);
      
      if (!data.values || data.values.length < 2) {
        console.log(`No data found in cocktail sheet ${config.name}`);
        continue;
      }
      
      const headers = data.values[0]; // Первая строка - заголовки
      console.log(`Headers for ${config.name}:`, headers);
      
      // Создаем маппинг столбцов
      const columnMapping = {};
      config.columns.forEach((columnName, index) => {
        columnMapping[columnName] = index;
      });
      
      // Обрабатываем данные начиная со второй строки
      for (let i = 1; i < data.values.length; i++) {
        const row = data.values[i];
        
        // Проверяем, что есть название в первой колонке
        if (row.length > 0 && row[0] && row[0].trim() !== '') {
          const name = row[0].trim();
          
          // Пропускаем пустые строки и строки с заголовками
          if (name.length < 3) continue;
          if (name.toLowerCase().includes('название')) continue;
          
          // Создаем объект напитка
          const drink = {
            id: `wine_${wineIdCounter++}`,
            name: name,
            category: config.category
          };
          
          // Заполняем поля в зависимости от структуры листа
          if (config.category === 'Чай') {
            // Чай: Название, Состав, Метод
            drink.ingredients = row[columnMapping.ingredients] || '';
            drink.method = row[columnMapping.method] || '';
            drink.description = `Чай: ${drink.ingredients}. Способ приготовления: ${drink.method}`;
          } else if (config.category === 'Премиксы') {
            // Премиксы: название, состав
            drink.ingredients = row[columnMapping.ingredients] || '';
            drink.description = `Премикс: ${drink.ingredients}`;
          } else if (config.category === 'ПФ') {
            // ПФ: Категория, Название, Состав, Описание
            drink.subcategory = row[columnMapping.category] || '';
            drink.ingredients = row[columnMapping.ingredients] || '';
            drink.description = row[columnMapping.description] || '';
          } else if (config.category === 'нет в меню') {
            // нет в меню: Категория, Название, Метод, Посуда, Лед, Состав
            drink.subcategory = row[columnMapping.category] || '';
            drink.method = row[columnMapping.method] || '';
            drink.glassware = row[columnMapping.glassware] || '';
            drink.ice = row[columnMapping.ice] || '';
            drink.ingredients = row[columnMapping.ingredients] || '';
            drink.description = `${drink.subcategory}: ${drink.ingredients}. Метод: ${drink.method}. Посуда: ${drink.glassware}. Лед: ${drink.ice}`;
          } else {
            // Остальные категории: Название, Метод, Посуда, Лед, Состав
            drink.method = row[columnMapping.method] || '';
            drink.glassware = row[columnMapping.glassware] || '';
            drink.ice = row[columnMapping.ice] || '';
            drink.ingredients = row[columnMapping.ingredients] || '';
            drink.description = `${drink.category}: ${drink.ingredients}. Метод: ${drink.method}. Посуда: ${drink.glassware}. Лед: ${drink.ice}`;
          }
          
          // Добавляем напиток только если есть название
          if (name && name.length > 3) {
            allWines.push(drink);
          }
        }
      }
      
      console.log(`Loaded ${allWines.length} drinks from ${config.name}`);
      cocktailDataLoaded = true;
      
    } catch (error) {
      console.error(`Error loading cocktail sheet ${config.name}:`, error);
      // Продолжаем загрузку других листов
    }
  }
  
  // Если не удалось загрузить данные коктейлей из Google Sheets, добавляем fallback данные
  if (!cocktailDataLoaded) {
    console.log('Cocktail data not loaded from Google Sheets, adding fallback cocktail data...');
    const fallbackData = getFallbackWineData();
    const cocktailFallbackData = fallbackData.filter(wine => 
      ['Коктейли', 'Микс дринк', 'Лимонады и Милкшейки', 'Чай', 'Кофе', 'Премиксы', 'ПФ', 'нет в меню'].includes(wine.category)
    );
    
    // Обновляем ID для fallback данных коктейлей
    cocktailFallbackData.forEach(drink => {
      drink.id = `wine_${wineIdCounter++}`;
    });
    
    allWines.push(...cocktailFallbackData);
    console.log(`Added ${cocktailFallbackData.length} fallback cocktail drinks`);
  }
  
  console.log(`Total drinks loaded: ${allWines.length}`);
  return allWines;
}

// Обновление данных из Google Sheets
export async function refreshWineData(env) {
  try {
    console.log('Starting data refresh...');
    const wines = await loadWinesFromGoogleSheets(env);
    console.log(`Successfully loaded ${wines.length} wines from Google Sheets`);
    await env.WINE_CACHE.put('wine_data', JSON.stringify(wines), { expirationTtl: 3600 });
    console.log('Data cached successfully');
    return new Response('Data refreshed successfully', { status: 200 });
  } catch (error) {
    console.error('Error refreshing data:', error);
    // Если Google Sheets недоступен, используем fallback
    console.log('Falling back to test data...');
    const wines = getFallbackWineData();
    await env.WINE_CACHE.put('wine_data', JSON.stringify(wines), { expirationTtl: 3600 });
    return new Response(`Data refreshed with fallback: ${error.message}`, { status: 200 });
  }
}

// Получение названий вин из Google Sheets
export async function getWineNames(env) {
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = env.GOOGLE_SHEETS_API_KEY;
  
  try {
    console.log('Getting wine names from Google Sheets...');
    
    const allWineNames = [];
    
    // Получаем названия со всех листов алкогольных напитков
    for (const [sheetId, config] of Object.entries(SHEET_CONFIG)) {
      try {
        const encodedSheetName = encodeURIComponent(config.name);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}!A:A?key=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) continue;
        
        const data = JSON.parse(await response.text());
        
        if (data.values && data.values.length > 0) {
          const wineNames = data.values
            .map(row => row[0])
            .filter(name => name && name.trim() !== '')
            .filter(name => !name.toLowerCase().includes('название'))
            .filter(name => name.length > 2);
          
          allWineNames.push(...wineNames);
        }
      } catch (error) {
        console.error(`Error getting names from ${config.name}:`, error);
      }
    }
    
    // Получаем названия со всех листов коктейлей и напитков
    let cocktailNamesLoaded = false;
    for (const [sheetId, config] of Object.entries(COCKTAIL_SHEET_CONFIG)) {
      try {
        const encodedSheetName = encodeURIComponent(config.name);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}!A:A?key=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) continue;
        
        const data = JSON.parse(await response.text());
        
        if (data.values && data.values.length > 0) {
          const drinkNames = data.values
            .map(row => row[0])
            .filter(name => name && name.trim() !== '')
            .filter(name => !name.toLowerCase().includes('название'))
            .filter(name => name.length > 2);
          
          allWineNames.push(...drinkNames);
          cocktailNamesLoaded = true;
        }
      } catch (error) {
        console.error(`Error getting names from ${config.name}:`, error);
      }
    }
    
    // Если не удалось загрузить названия коктейлей из Google Sheets, добавляем fallback данные
    if (!cocktailNamesLoaded) {
      console.log('Cocktail names not loaded from Google Sheets, adding fallback cocktail names...');
      const fallbackData = getFallbackWineData();
      const cocktailFallbackNames = fallbackData
        .filter(wine => ['Коктейли', 'Микс дринк', 'Лимонады и Милкшейки', 'Чай', 'Кофе', 'Премиксы', 'ПФ', 'нет в меню'].includes(wine.category))
        .map(wine => wine.name);
      
      allWineNames.push(...cocktailFallbackNames);
      console.log(`Added ${cocktailFallbackNames.length} fallback cocktail names`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      total_wines: allWineNames.length,
      wine_names: allWineNames,
      first_10_names: allWineNames.slice(0, 10)
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting wine names:', error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Получение всех данных из всех листов
export async function getAllWineData(env) {
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = env.GOOGLE_SHEETS_API_KEY;
  
  try {
    console.log('Getting all wine data from Google Sheets...');
    
    const allData = {};
    
    // Получаем данные со всех листов алкогольных напитков
    for (const [sheetId, config] of Object.entries(SHEET_CONFIG)) {
      try {
        const encodedSheetName = encodeURIComponent(config.name);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}!A:Z?key=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) continue;
        
        const data = JSON.parse(await response.text());
        
        if (data.values && data.values.length > 0) {
          allData[config.name] = {
            headers: data.values[0] || [],
            rows: data.values.slice(1, 11), // Первые 10 строк данных
            total_rows: data.values.length
          };
        }
      } catch (error) {
        console.error(`Error getting data from ${config.name}:`, error);
      }
    }
    
    // Получаем данные со всех листов коктейлей и напитков
    for (const [sheetId, config] of Object.entries(COCKTAIL_SHEET_CONFIG)) {
      try {
        const encodedSheetName = encodeURIComponent(config.name);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}!A:Z?key=${apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) continue;
        
        const data = JSON.parse(await response.text());
        
        if (data.values && data.values.length > 0) {
          allData[config.name] = {
            headers: data.values[0] || [],
            rows: data.values.slice(1, 11), // Первые 10 строк данных
            total_rows: data.values.length
          };
        }
      } catch (error) {
        console.error(`Error getting data from ${config.name}:`, error);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      sheets: allData,
      sheet_config: SHEET_CONFIG
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting all wine data:', error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Новый эндпоинт для просмотра выбранного листа
export async function getCurrentSheet(env) {
  const sheetId = await getSelectedSheetId(env);
  try {
    const sheetName = await getSheetNameById(env, sheetId);
    return new Response(JSON.stringify({sheetId, sheetName}), {headers: {'Content-Type': 'application/json'}});
  } catch (e) {
    return new Response(JSON.stringify({sheetId, error: e.message}), {headers: {'Content-Type': 'application/json'}});
  }
} 