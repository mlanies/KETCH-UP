// Обработчики Telegram и логика команд

import { getWineData, getSelectedSheetId, getSheetNameById, refreshWineData } from './data.js';
import { sendMessage, sendMessageWithKeyboard, editMessage, sendPhotoWithCaption, answerCallbackQuery } from './telegramApi.js';
import { askCloudflareAI, askCloudflareAIWithWineContext } from './ai.js';
import { getCategoryType } from '../utils/categories.js';
import { handleMenuSection } from './menu.js';
import { handleAlcoholSection, handleCategorySelection, handleShowCategory } from './alcohol.js';
import { handleLearningCallback } from './learning.js';

// Обработка входящих сообщений от Telegram
export async function handleWebhook(request, env) {
  try {
    const update = await request.json();
    
    if (update.message) {
      await handleMessage(update.message, env);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, env);
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error', { status: 500 });
  }
}

// Обработка текстовых сообщений
export async function handleMessage(message, env) {
  const chatId = message.chat.id;
  const text = message.text || '';
  
  // Сохраняем/обновляем профиль пользователя
  try {
    const { DatabaseManager } = await import('./database.js');
    const database = new DatabaseManager(env);
    if (message.from) {
      await database.initUser(chatId, message.from);
    } else {
      await database.initUser(chatId);
    }
  } catch (e) {
    console.error('initUser error:', e);
  }

  try {
    if (text === '/start') {
      await sendWelcomeMessage(chatId, env);
    } else if (text === '/help') {
      await sendHelpMessage(chatId, env);
    } else if (text === '/refresh') {
      // Административная команда для обновления данных
      await refreshWineData(env);
      await sendMessage(chatId, 'Данные обновлены!', env);
    } else if (text.startsWith('/ai')) {
      // /ai вопрос
      const question = text.replace('/ai', '').trim();
      if (!question) {
        await sendMessage(chatId, 'Пожалуйста, напишите вопрос после /ai, например:\n/ai Чем отличается сухое вино от полусухого?', env);
      } else {
        await sendMessage(chatId, '⏳ Запрос к ИИ... Ожидайте ответ.', env);
        const aiAnswer = await askCloudflareAI(question, env);
        await sendMessage(chatId, `🤖 Ответ ИИ:\n${aiAnswer}`, env);
      }
    } else if (env.__awaiting_ai_question && env.__awaiting_ai_question[chatId]) {
      // Пользователь ранее нажал кнопку "Спросить у ИИ"
      const question = text.trim();
      const aiContext = env.__awaiting_ai_question[chatId];
      env.__awaiting_ai_question[chatId] = false;
      
      await sendMessage(chatId, '⏳ Запрос к ИИ... Ожидайте ответ.', env);
      
      // Если есть контекст конкретного напитка, передаем его в ИИ
      if (aiContext && aiContext.wineId) {
        const aiAnswer = await askCloudflareAIWithWineContext(question, aiContext.wineId, env);
        await sendMessage(chatId, `🤖 Ответ ИИ:\n${aiAnswer}`, env);
      } else {
        const aiAnswer = await askCloudflareAI(question, env);
        await sendMessage(chatId, `🤖 Ответ ИИ:\n${aiAnswer}`, env);
      }
    } else if (text.startsWith('/set_sheet')) {
      const parts = text.split(' ');
      if (parts.length < 2) {
        await sendMessage(chatId, 'Укажите sheetId, например: /set_sheet 304728120', env);
        return;
      }
      const sheetId = parseInt(parts[1]);
      if (isNaN(sheetId)) {
        await sendMessage(chatId, 'sheetId должен быть числом.', env);
        return;
      }
      // Проверим, существует ли такой лист
      try {
        const sheetName = await getSheetNameById(env, sheetId);
        await env.WINE_CACHE.put('selected_sheet_id', String(sheetId));
        await sendMessage(chatId, `Выбран лист: ${sheetName} (sheetId: ${sheetId})`, env);
      } catch (e) {
        await sendMessage(chatId, 'Лист с таким sheetId не найден.', env);
      }
      return;
    } else if (text === '/sheet') {
      const sheetId = await getSelectedSheetId(env);
      try {
        const sheetName = await getSheetNameById(env, sheetId);
        await sendMessage(chatId, `Текущий лист: ${sheetName} (sheetId: ${sheetId})`, env);
      } catch (e) {
        await sendMessage(chatId, `sheetId: ${sheetId}, но лист не найден.`, env);
      }
      return;
    } else if (text === '/recommend') {
      // Персональные рекомендации по обучению
      const { generatePersonalizedReport, getUserAnalytics } = await import('./learningAnalytics.js');
      const report = await generatePersonalizedReport(chatId, env);
      const analytics = getUserAnalytics(chatId);
      const weakCategories = analytics.weakCategories || [];
      const accuracy = analytics.getOverallAccuracy();
      const totalQuestions = analytics.totalQuestions;
      const weakCategoryButtons = weakCategories.slice(0, 3).map(cat => ([{ text: `Тест по ${cat}`, callback_data: `learning_category_${cat}` }]));
      const aiModeButton = (accuracy > 0.8 && totalQuestions > 20) ? [[{ text: '🤖 ИИ-режим', callback_data: 'learning_ai_mode' }]] : [];
      const keyboard = {
        inline_keyboard: [
          ...weakCategoryButtons,
          ...aiModeButton
        ]
      };
      await sendMessageWithKeyboard(chatId, report, keyboard, env);
      return;
    } else if (env.__awaiting_feedback && env.__awaiting_feedback[chatId]) {
      env.__awaiting_feedback[chatId] = false;
      // Сохраняем комментарий пользователя в базу данных
      const { saveUserFeedback, startLearning } = await import('./learning.js');
      await saveUserFeedback(chatId, 'comment', text, null, env);
      await sendMessage(chatId, 'Спасибо за ваш подробный отзыв!', env);
      await startLearning(chatId, env);
      return;
    } else if (text === '/motivation_on') {
      const { DatabaseManager } = await import('./database.js');
      const database = new DatabaseManager(env);
      await database.setMotivationEnabled(chatId, true);
      await sendMessage(chatId, '✅ Мотивационные сообщения включены. Вы будете получать персональные напоминания и советы!', env);
    } else if (text === '/motivation_off') {
      const { DatabaseManager } = await import('./database.js');
      const database = new DatabaseManager(env);
      await database.setMotivationEnabled(chatId, false);
      await sendMessage(chatId, '🔕 Мотивационные сообщения отключены. Вы не будете получать напоминания и мотивацию.', env);
    } else if (text === '/shop') {
      await showRewardShop(chatId, env);
    } else {
      // Поиск по названию вина
      await searchWineByName(text, chatId, env);
    }
  } catch (error) {
    console.error('Message handling error:', error);
    await sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.', env);
  }
}

// Обработка callback query (нажатия на кнопки)
export async function handleCallbackQuery(callbackQuery, env) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  
  // Сохраняем/обновляем профиль пользователя
  try {
    const { DatabaseManager } = await import('./database.js');
    const database = new DatabaseManager(env);
    if (callbackQuery.from) {
      await database.initUser(chatId, callbackQuery.from);
    } else {
      await database.initUser(chatId);
    }
  } catch (e) {
    console.error('initUser error:', e);
  }

  console.log('Callback query received:', data);
  
  try {
    if (data === 'ask_ai') {
      // Сохраняем состояние ожидания вопроса от пользователя
      if (!env.__awaiting_ai_question) env.__awaiting_ai_question = {};
      env.__awaiting_ai_question[chatId] = true;
      await sendMessage(chatId, 'Введите ваш вопрос для ИИ (например: Чем отличается сухое вино от полусухого?):', env);
    } else if (data.startsWith('ask_ai_wine_')) {
      // Сохраняем состояние ожидания вопроса от пользователя с контекстом конкретного напитка
      const wineId = data.replace('ask_ai_wine_', '');
      if (!env.__awaiting_ai_question) env.__awaiting_ai_question = {};
      env.__awaiting_ai_question[chatId] = { wineId: wineId };
      await sendMessage(chatId, 'Введите ваш вопрос об этом напитке (например: С чем лучше подавать это вино?):', env);
    } else if (data.startsWith('section_')) {
      await handleSectionSelection(data, chatId, messageId, env);
    } else if (data.startsWith('category_')) {
      // Проверяем, является ли это категорией коктейлей
      const categoryType = data.replace('category_', '');
      if (['cocktails', 'mix_drinks', 'lemonades_milkshakes', 'coffee', 'tea', 'premixes', 'pf', 'not_in_menu'].includes(categoryType)) {
        // Импортируем из menu.js
        const { handleCocktailCategorySelection } = await import('./menu.js');
        await handleCocktailCategorySelection(data, chatId, messageId, env);
      } else {
        await handleCategorySelection(data, chatId, messageId, env);
      }
    } else if (data.startsWith('filter_value_')) {
      // Импортируем из filters.js
      const { handleFilterValueSelection } = await import('./filters.js');
      await handleFilterValueSelection(data, chatId, messageId, env);
    } else if (data.startsWith('filter_')) {
      // Импортируем из filters.js
      const { handleFilterSelection } = await import('./filters.js');
      await handleFilterSelection(data, chatId, messageId, env);
    } else if (data.startsWith('wine_') || data.startsWith('spirit_') || data.startsWith('whisky_') || data.startsWith('rum_') || data.startsWith('gin_') || data.startsWith('beer_')) {
      console.log('Showing wine details for:', data);
      await showWineDetails(data, chatId, env);
    } else if (data === 'main_menu') {
      await sendMainMenu(chatId, env);
    } else if (data === 'back') {
      await sendMainMenu(chatId, env);
    } else if (data === 'search_by_name') {
      await handleSearchByName(chatId, env);
    } else if (data === 'show_all_wines') {
      await showAllWines(chatId, env);
    } else if (data.startsWith('show_category_')) {
      await handleShowCategory(data, chatId, messageId, env);
    } else if (data === 'refresh_data') {
      await handleRefreshData(chatId, messageId, env);
    } else if (data.startsWith('learning_')) {
      // Обработка callback query для обучения
      await handleLearningCallback(data, chatId, messageId, env);
    } else if (data === 'daily_challenges') {
      // Обработка ежедневных заданий
      console.log('Handling daily challenges callback');
      const { handleLearningCallback } = await import('./learning.js');
      await handleLearningCallback(data, chatId, messageId, env);
    } else if (data === 'user_profile') {
      // Обработка профиля пользователя
      const { handleLearningCallback } = await import('./learning.js');
      await handleLearningCallback(data, chatId, messageId, env);
    } else if (data === 'show_author') {
      await sendAuthorInfo(chatId, env);
    } else if (data.startsWith('buy_reward_')) {
      const rewardId = parseInt(data.replace('buy_reward_', ''));
      await handleBuyReward(chatId, rewardId, env);
      return;
    } else if (data === 'open_reward_shop') {
      await showRewardShop(chatId, env);
      return;
    }
    if (data === 'no_xp') {
      await sendMessage(chatId, 'Недостаточно XP для покупки этого приза.', env);
      await showRewardShop(chatId, env);
      return;
    }
    
    // Отвечаем на callback query
    try {
      await answerCallbackQuery(callbackQuery.id, env);
    } catch (callbackError) {
      console.error('Failed to answer callback query:', callbackError);
      // Не прерываем выполнение, если не удалось ответить на callback
    }
  } catch (error) {
    console.error('Callback query error:', error);
    try {
      await sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.', env);
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }
}

// Отправка приветственного сообщения
export async function sendWelcomeMessage(chatId, env) {
  const welcomeText = `🍷 Добро пожаловать в Beverage Learning Bot!\n\n🏪 *Ресторан KETCH UP*\n\nРестораны Ketch Up — для современных и динамичных. Это формат ресторана для мегаполиса. Здесь можно устроить деловую встречу, весело провести время с друзьями в шумной компании, собрать семью на ланч, ужин или позавтракать перед насыщенным рабочим днем.\n\nЭтот бот поможет вам изучить ассортимент напитков и улучшить качество обслуживания клиентов.\n\nВыберите раздел или откройте мини-приложение:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🍷 Открыть Web App', web_app: { url: 'https://wine-app.2gc.ru/' } }
      ],
      [
        { text: '🍽️ Меню', callback_data: 'section_menu' },
        { text: '🍷 Алкоголь', callback_data: 'section_alcohol' }
      ],
      [
        { text: '🎓 Обучение', callback_data: 'learning_start' },
        { text: '🔍 Поиск по названию', callback_data: 'search_by_name' }
      ],
      [
        { text: '📋 Все напитки', callback_data: 'show_all_wines' }
      ],
      [
        { text: '🔄 Обновить данные', callback_data: 'refresh_data' }
      ],
      [
        { text: '🎁 Магазин', callback_data: 'open_reward_shop' }
      ],
      [
        { text: '🤖 Спросить у ИИ', callback_data: 'ask_ai' }
      ]
    ]
  };

  await sendMessageWithKeyboard(chatId, welcomeText, keyboard, env);
}

// В главном меню добавим кнопку "🍷 Открыть Web App"
export async function sendMainMenu(chatId, env) {
  const menuText = `🍷 Главное меню\n\nВыберите раздел или откройте мини-приложение:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🍷 Открыть Web App', web_app: { url: 'https://wine-app.2gc.ru/' } }
      ],
      [
        { text: '🍽️ Меню', callback_data: 'section_menu' },
        { text: '🍷 Алкоголь', callback_data: 'section_alcohol' }
      ],
      [
        { text: '🎓 Обучение', callback_data: 'learning_start' },
        { text: '🔍 Поиск по названию', callback_data: 'search_by_name' }
      ],
      [
        { text: '📋 Все напитки', callback_data: 'show_all_wines' }
      ],
      [
        { text: '🔄 Обновить данные', callback_data: 'refresh_data' }
      ],
      [
        { text: '🎁 Магазин', callback_data: 'open_reward_shop' }
      ],
      [
        { text: '🤖 Спросить у ИИ', callback_data: 'ask_ai' }
      ],
      [
        { text: '👨‍💻 Автор разработки', callback_data: 'show_author' }
      ]
    ]
  };

  await sendMessageWithKeyboard(chatId, menuText, keyboard, env);
}

// Обработка выбора раздела
export async function handleSectionSelection(data, chatId, messageId, env) {
  const sectionType = data.replace('section_', '');
  console.log('Section selection:', sectionType);
  
  switch (sectionType) {
    case 'menu':
      await handleMenuSection(chatId, messageId, env);
      break;
    case 'alcohol':
      await handleAlcoholSection(chatId, messageId, env);
      break;
    default:
      await sendMessage(chatId, 'Неизвестный раздел.', env);
      return;
  }
}

// Показать детали вина
export async function showWineDetails(data, chatId, env) {
  // Теперь data может быть просто ID напитка (wine_1, spirit_1, whisky_1, etc.)
  const wineId = data;
  console.log('Looking for wine with ID:', wineId);
  const wines = await getWineData(env);
  console.log('Total wines loaded:', wines.length);
  const wine = wines.find(w => w.id === wineId);
  console.log('Found wine:', wine ? wine.name : 'NOT FOUND');
  console.log('wine object:', JSON.stringify(wine, null, 2));
  console.log('wine.image_id:', wine.image_id);

  if (!wine) {
    console.log('Wine not found, sending error message');
    await sendMessage(chatId, 'Напиток не найден.', env);
    return;
  }

  // Формируем текст в зависимости от категории напитка
  let wineText = `🍷 *${wine.name}*
📂 *Категория:* ${wine.category || 'Не указано'}`;

  // Добавляем поля в зависимости от категории
  if (wine.category === 'Виски') {
    wineText += `
🥃 *Крепость:* ${wine.alcohol || 'Не указано'}
🌍 *Страна:* ${wine.country || 'Не указано'}
🍯 *Тип:* ${wine.type || 'Не указано'}
⏰ *Выдержка:* ${wine.aging || 'Не указано'}
🍯 *Сахар:* ${wine.sugar || 'Сухой'}`;
  } else if (wine.category === 'Пиво') {
    wineText += `
🍺 *Крепость:* ${wine.alcohol || 'Не указано'}
🌍 *Страна:* ${wine.country || 'Не указано'}
📊 *Плотность:* ${wine.density || 'Не указано'}
🍯 *Сахар:* ${wine.sugar || 'Сухое'}`;
  } else if (wine.category === 'Коктейли' || wine.category === 'Микс дринк' || wine.category === 'Лимонады и Милкшейки' || wine.category === 'Кофе') {
    // Коктейли и напитки: Название, Метод, Посуда, Лед, Состав
    wineText += `
🥤 *Метод:* ${wine.method || 'Не указано'}
🥂 *Посуда:* ${wine.glassware || 'Не указано'}
🧊 *Лед:* ${wine.ice || 'Не указано'}
🍹 *Состав:* ${wine.ingredients || 'Не указано'}`;
  } else if (wine.category === 'Чай') {
    // Чай: Название, Состав, Метод
    wineText += `
🍵 *Состав:* ${wine.ingredients || 'Не указано'}
☕ *Метод:* ${wine.method || 'Не указано'}`;
  } else if (wine.category === 'Премиксы') {
    // Премиксы: название, состав
    wineText += `
🍯 *Состав:* ${wine.ingredients || 'Не указано'}`;
  } else if (wine.category === 'ПФ') {
    // ПФ: Категория, Название, Состав, Описание
    wineText += `
📂 *Подкатегория:* ${wine.subcategory || 'Не указано'}
🍯 *Состав:* ${wine.ingredients || 'Не указано'}`;
  } else if (wine.category === 'нет в меню') {
    // нет в меню: Категория, Название, Метод, Посуда, Лед, Состав
    wineText += `
📂 *Подкатегория:* ${wine.subcategory || 'Не указано'}
🥤 *Метод:* ${wine.method || 'Не указано'}
🥂 *Посуда:* ${wine.glassware || 'Не указано'}
🧊 *Лед:* ${wine.ice || 'Не указано'}
🍹 *Состав:* ${wine.ingredients || 'Не указано'}`;
  } else {
    // Для остальных категорий (Вина, Граппа/Порто/Коньяк/Вермут, Ром/Текила, Джин/Водка/Ликеры)
    wineText += `
🍯 *Сахар:* ${wine.sugar || 'Не указано'}
🥃 *Крепость:* ${wine.alcohol || 'Не указано'}
🌍 *Страна:* ${wine.country || 'Не указано'}`;
  }

  wineText += `

📝 *Описание:*
${wine.description || 'Описание отсутствует'}`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🤖 Спросить у ИИ', callback_data: `ask_ai_wine_${wine.id}` }],
      [{ text: '🔙 Назад к списку', callback_data: 'back' }],
      [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
    ]
  };

  try {
    let imageUrl = null;
    if (wine.image_id) {
      imageUrl = getCloudflareImageUrl(wine.image_id, env);
    }
    if (imageUrl) {
      console.log('Sending photo with caption...');
      await sendPhotoWithCaption(chatId, imageUrl, wineText, keyboard, env);
      console.log('Photo sent!');
    } else {
      console.log('Sending message with keyboard...');
      await sendMessageWithKeyboard(chatId, wineText, keyboard, env);
      console.log('Message sent!');
    }
  } catch (e) {
    console.error('Error sending wine details:', e);
    await sendMessage(chatId, 'Ошибка при отправке информации о напитке.', env);
  }
}

// Поиск напитка по названию
export async function searchWineByName(query, chatId, env) {
  const wines = await getWineData(env);
  
  if (!wines || wines.length === 0) {
    await sendMessage(chatId, 'Данные о напитках временно недоступны. Попробуйте позже.', env);
    return;
  }

  const searchResults = wines.filter(wine => 
    wine.name.toLowerCase().includes(query.toLowerCase())
  );

  if (searchResults.length === 0) {
    await sendMessage(chatId, `По запросу "${query}" ничего не найдено. Попробуйте другой поиск.`, env);
    return;
  }

  if (searchResults.length === 1) {
    // Если найден только один результат, показываем его детали
    await showWineDetails(searchResults[0].id, chatId, env);
  } else {
    // Если найдено несколько результатов, показываем список
    const keyboard = {
      inline_keyboard: searchResults.slice(0, 10).map(wine => [
        { text: wine.name, callback_data: wine.id }
      ]).concat([
        [{ text: '🔙 Назад', callback_data: 'main_menu' }]
      ])
    };

    await sendMessageWithKeyboard(chatId, `Найдено ${searchResults.length} напитков по запросу "${query}":`, keyboard, env);
  }
}

// Отправка справки
export async function sendHelpMessage(chatId, env) {
  const helpText = `🍷 *Справка по использованию бота*

*Основные команды:*
/start - Главное меню
/help - Эта справка
/refresh - Обновить данные (только для администраторов)

*Способы поиска:*
• *По названию* - просто напишите название вина
• *По сахару* - выберите из списка (сухое, полусухое и т.д.)
• *По крепости* - выберите из списка (11%, 11.5% и т.д.)
• *По стране* - выберите из списка (Испания, Италия и т.д.)

*Навигация:*
• Используйте кнопки для навигации
• Нажмите "Назад" для возврата к предыдущему меню
• Нажмите "Главное меню" для возврата к началу

*Отображение информации:*
• Для каждого вина показывается полная информация
• Если есть изображение, оно отображается вместе с описанием`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🏠 Главное меню', callback_data: 'main_menu' }]
    ]
  };

  await sendMessageWithKeyboard(chatId, helpText, keyboard, env);
}

// Обработка показа всех напитков
export async function showAllWines(chatId, env) {
  const wines = await getWineData(env);
  
  if (!wines || wines.length === 0) {
    await sendMessage(chatId, 'Данные о напитках временно недоступны. Попробуйте позже.', env);
    return;
  }

  // Группируем напитки по категориям
  const categories = {};
  wines.forEach(wine => {
    if (!categories[wine.category]) {
      categories[wine.category] = [];
    }
    categories[wine.category].push(wine);
  });

  // Создаем клавиатуру с категориями
  const keyboard = {
    inline_keyboard: Object.keys(categories).map(category => [
      { text: `${category} (${categories[category].length})`, callback_data: `show_category_${getCategoryType(category)}` }
    ]).concat([
      [{ text: '🔙 Назад', callback_data: 'main_menu' }]
    ])
  };

  const totalDrinks = wines.length;
  const categoryCount = Object.keys(categories).length;

  await sendMessageWithKeyboard(chatId, 
    `🍷 Все напитки (${totalDrinks} шт. в ${categoryCount} категориях):\n\nВыберите категорию для просмотра:`, 
    keyboard, env);
}

// Обработка поиска по названию
export async function handleSearchByName(chatId, env) {
  await sendMessage(chatId, '🔍 Введите название напитка для поиска:', env);
}



// Обработка обновления данных
export async function handleRefreshData(chatId, messageId, env) {
  try {
    // Отправляем сообщение о начале обновления
    await sendMessage(chatId, '🔄 Обновление данных...', env);
    
    // Очищаем кеш
    await env.WINE_CACHE.delete('wine_data');
    console.log('Cache cleared');
    
    // Загружаем новые данные
    const wines = await getWineData(env);
    console.log('Data refreshed, loaded wines:', wines ? wines.length : 0);
    
    if (wines && wines.length > 0) {
      // Группируем напитки по категориям для отчета
      const categories = {};
      wines.forEach(wine => {
        if (!categories[wine.category]) {
          categories[wine.category] = [];
        }
        categories[wine.category].push(wine);
      });
      
      const categoryReport = Object.keys(categories).map(category => 
        `• ${category}: ${categories[category].length} шт.`
      ).join('\n');
      
      const successMessage = `✅ Данные успешно обновлены!\n\n📊 Статистика:\n${categoryReport}\n\nВсего напитков: ${wines.length}`;
      
      await sendMessage(chatId, successMessage, env);
    } else {
      await sendMessage(chatId, '❌ Ошибка при обновлении данных. Попробуйте позже.', env);
    }
  } catch (error) {
    console.error('Error refreshing data:', error);
    await sendMessage(chatId, '❌ Ошибка при обновлении данных. Попробуйте позже.', env);
  }
} 

// Добавим функцию отправки информации об авторе
export async function sendAuthorInfo(chatId, env) {
  const text = '👨‍💻 Автор разработки: Ланиес Максим\nКонтакты: m.lanies@2gc.ru';
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '💸 Поблагодарить автора', url: 'https://yoomoney.ru/fundraise/1BEKKUL671V.250712' }
      ],
      [
        { text: '🔙 Назад', callback_data: 'main_menu' }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(chatId, text, keyboard, env);
} 

function getCloudflareImageUrl(imageId, env) {
  const baseUrl = env.CLOUDFLARE_IMAGES_BASE_URL || "https://imagedelivery.net/tdcdGyOL6_eTEtlo-2Ihkw";
  const variant = env.CLOUDFLARE_IMAGES_VARIANT || "public";
  return `${baseUrl}/${imageId}/${variant}`;
} 

// Показывает магазин призов пользователю
async function showRewardShop(chatId, env) {
  const { DatabaseManager } = await import('./database.js');
  const database = new DatabaseManager(env);
  const db = database.db;
  const user = await db.prepare('SELECT * FROM users WHERE chat_id = ?').bind(chatId).first();
  const rewards = await db.prepare('SELECT * FROM reward_shop WHERE is_active = 1 AND quantity_left > 0 ORDER BY price_xp ASC').all();
  let message = `<b>🎁 Магазин призов</b>\n`;
  if (user) {
    message += `Ваши XP: <b>${user.experience_points}</b>\n`;
  }
  message += `<b>Товары:</b>\n`;
  if (rewards.results.length === 0) {
    message += 'Нет доступных призов.';
  } else {
    for (const r of rewards.results) {
      if (r.quantity_left > 0) {
        message += `• <b>${r.name}</b> — ${r.price_xp} XP\nОсталось: ${r.quantity_left}\n`;
      }
    }
  }
  const keyboard = rewards.results
    .filter(r => r.quantity_left > 0)
    .map(r => {
      if (user && user.experience_points >= r.price_xp) {
        return [{ text: `Купить: ${r.name} (${r.price_xp} XP)`, callback_data: `buy_reward_${r.id}` }];
      } else {
        return [{ text: `Недостаточно XP: ${r.name}`, callback_data: 'no_xp' }];
      }
    });
  keyboard.push([{ text: '🔙 Назад', callback_data: 'main_menu' }]);
  await sendMessageWithKeyboard(chatId, message, { inline_keyboard: keyboard }, env, 'HTML');
}

// Покупка приза
async function handleBuyReward(chatId, rewardId, env) {
  const { DatabaseManager } = await import('./database.js');
  const database = new DatabaseManager(env);
  const db = database.db;
  const reward = await db.prepare('SELECT * FROM reward_shop WHERE id = ? AND is_active = 1').bind(rewardId).first();
  if (!reward) {
    await sendMessage(chatId, '❌ Приз не найден или недоступен.', env);
    return;
  }
  if (reward.quantity_left !== null && reward.quantity_left <= 0) {
    await sendMessage(chatId, '❌ Приз закончился и больше недоступен для покупки.', env);
    return;
  }
  const user = await db.prepare('SELECT * FROM users WHERE chat_id = ?').bind(chatId).first();
  if (!user) {
    await sendMessage(chatId, '❌ Пользователь не найден.', env);
    return;
  }
  if (user.experience_points < reward.price_xp) {
    await sendMessage(chatId, `Недостаточно XP. Для покупки нужно ${reward.price_xp} XP, у вас: ${user.experience_points} XP.`, env);
    return;
  }
  // Списываем XP, уменьшаем количество и записываем покупку
  await db.prepare('UPDATE users SET experience_points = experience_points - ? WHERE chat_id = ?').bind(reward.price_xp, chatId).run();
  await db.prepare('UPDATE reward_shop SET quantity_left = quantity_left - 1 WHERE id = ?').bind(rewardId).run();
  await db.prepare('INSERT INTO reward_purchases (user_id, reward_id) VALUES (?, ?)').bind(chatId, rewardId).run();
  await sendMessage(chatId, `🎉 Поздравляем! Вы купили приз: ${reward.name} за ${reward.price_xp} XP.`, env);
} 