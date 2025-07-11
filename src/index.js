// Telegram Wine Bot for Cloudflare Workers
// Бот для обучения официантов по ассортименту вин

import {
  handleWebhook,
  handleMessage,
  handleCallbackQuery,
  sendWelcomeMessage,
  sendMainMenu,
  handleSectionSelection,
  handleSearchByName,
  showAllWines,
  searchWineByName,
  showWineDetails,
  sendHelpMessage,
  handleRefreshData
} from './handlers/telegram.js';
import {
  startLearning,
  handleLearningCallback
} from './handlers/learning.js';
import {
  handleMenuSection
} from './handlers/menu.js';
import {
  handleAlcoholSection,
  handleCategorySelection,
  handleShowCategory
} from './handlers/alcohol.js';
import {
  getWineData,
  getSelectedSheetId,
  getSheetNameById,
  loadWinesFromGoogleSheets,
  refreshWineData,
  getWineNames,
  getAllWineData,
  getCurrentSheet
} from './handlers/data.js';
import {
  sendMessage,
  sendMessageWithKeyboard,
  editMessage,
  sendPhotoWithCaption,
  answerCallbackQuery
} from './handlers/telegramApi.js';
import {
  askCloudflareAI,
  askCloudflareAIWithWineContext,
  testAI
} from './handlers/ai.js';
import {
  setWebhook,
  deleteWebhook,
  getBotStatus,
  getWebhookInfo
} from './handlers/webhook.js';
import {
  handleFilterSelection,
  handleFilterValueSelection,
  testFilters
} from './handlers/filters.js';

// Значение sheetId по умолчанию ("Вина")
const DEFAULT_SHEET_ID = 304728120;

export default {
  async fetch(request, env, ctx) {
    // Обработка CORS для веб-хуков
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    
    // Обработка веб-хука от Telegram
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    }
    
    // Установка веб-хука
    if (url.pathname === '/set-webhook' && request.method === 'GET') {
      return setWebhook(env);
    }
    
    // Удаление веб-хука
    if (url.pathname === '/delete-webhook' && request.method === 'GET') {
      return deleteWebhook(env);
    }
    
    // Обновление данных из Google Sheets
    if (url.pathname === '/refresh-data' && request.method === 'POST') {
      return refreshWineData(env);
    }
    
    // Статус бота
    if (url.pathname === '/status' && request.method === 'GET') {
      return getBotStatus(env);
    }
    
    // Информация о webhook
    if (url.pathname === '/webhook-info' && request.method === 'GET') {
      return getWebhookInfo(env);
    }
    
    // Тест Google Sheets API
    if (url.pathname === '/test-sheets' && request.method === 'GET') {
      return testGoogleSheets(env);
    }
    
    // Тест документа с коктейлями
    if (url.pathname === '/test-cocktails' && request.method === 'GET') {
      return testCocktailSheets(env);
    }
    
    // Тест ИИ
    if (url.pathname === '/test-ai' && request.method === 'POST') {
      return testAI(request, env);
    }
    
    // Тест ИИ с контекстом конкретного напитка
    if (url.pathname === '/test-ai-wine' && request.method === 'POST') {
      return testAIWithWine(request, env);
    }
    
    // Тест фильтров
    if (url.pathname === '/test-filters' && request.method === 'GET') {
      return testFilters(env);
    }
    
    // Просмотр названий вин
    if (url.pathname === '/wine-names' && request.method === 'GET') {
      return getWineNames(env);
    }
    
    // Просмотр всех данных из листа "Вина"
    if (url.pathname === '/wine-data' && request.method === 'GET') {
      return getAllWineData(env);
    }

    // Новый эндпоинт для просмотра выбранного листа
    if (url.pathname === '/sheet' && request.method === 'GET') {
      return getCurrentSheet(env);
    }
    
    // Тестовый эндпоинт для проверки ID коктейлей
    if (url.pathname === '/test-cocktails-ids' && request.method === 'GET') {
      return testCocktailsIds(env);
    }

    // API эндпоинты для системы обучения
    if (url.pathname === '/user-stats' && request.method === 'GET') {
      return getUserStats(request, env);
    }

    if (url.pathname === '/user-achievements' && request.method === 'GET') {
      return getUserAchievements(request, env);
    }

    if (url.pathname === '/daily-challenges' && request.method === 'GET') {
      return getDailyChallenges(request, env);
    }

    if (url.pathname === '/export-data' && request.method === 'POST') {
      return exportUserData(request, env);
    }

    return new Response('Telegram Wine Bot is running!', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};

// Тестирование ИИ с контекстом конкретного напитка
async function testAIWithWine(request, env) {
  try {
    const { question, wineId } = await request.json();
    
    if (!question || !wineId) {
      return new Response(JSON.stringify({
        error: 'Question and wineId are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('Testing AI with wine context:', { question, wineId });
    const answer = await askCloudflareAIWithWineContext(question, wineId, env);
    
    return new Response(JSON.stringify({
      success: true,
      question: question,
      wineId: wineId,
      answer: answer
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('AI with wine test error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// API эндпоинты для системы обучения

// Получение статистики пользователя
async function getUserStats(request, env) {
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    
    if (!chatId) {
      return new Response(JSON.stringify({
        error: 'chatId parameter is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    
    const stats = await database.getUserStats(parseInt(chatId));
    
    if (!stats) {
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: stats
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Получение достижений пользователя
async function getUserAchievements(request, env) {
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    
    if (!chatId) {
      return new Response(JSON.stringify({
        error: 'chatId parameter is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    
    const achievements = await database.getAchievements(parseInt(chatId));
    
    return new Response(JSON.stringify({
      success: true,
      data: achievements
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Получение ежедневных заданий
async function getDailyChallenges(request, env) {
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    
    if (!chatId) {
      return new Response(JSON.stringify({
        error: 'chatId parameter is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { DailyChallengeSystem } = await import('./handlers/dailyChallenges.js');
    const { DatabaseManager } = await import('./handlers/database.js');
    
    const database = new DatabaseManager(env);
    const dailyChallenges = new DailyChallengeSystem(database);
    
    const challenges = await dailyChallenges.getActiveChallenges(parseInt(chatId));
    
    return new Response(JSON.stringify({
      success: true,
      data: challenges
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error getting daily challenges:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Экспорт данных пользователя
async function exportUserData(request, env) {
  try {
    const { chatId } = await request.json();
    
    if (!chatId) {
      return new Response(JSON.stringify({
        error: 'chatId is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    
    const exportData = await database.exportUserData(parseInt(chatId));
    
    if (!exportData) {
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: exportData
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Тестирование документа с коктейлями
async function testCocktailSheets(env) {
  const cocktailSpreadsheetId = env.GOOGLE_SHEETS_COCKTAIL_SPREADSHEET_ID || '1yi9x61BR2puwtGgOND6FNmqqI7F9rb0e';
  const apiKey = env.GOOGLE_SHEETS_API_KEY;
  
  try {
    console.log('Testing Cocktail Google Sheets API...');
    console.log('Cocktail Spreadsheet ID:', cocktailSpreadsheetId);
    console.log('API Key:', apiKey ? 'Present' : 'Missing');
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${cocktailSpreadsheetId}?key=${apiKey}`;
    console.log('Request URL:', url);
    
    const response = await fetch(url);
    const responseText = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response text (first 500 chars):', responseText.substring(0, 500));
    
    if (!response.ok) {
      return new Response(JSON.stringify({
        error: 'Cocktail Google Sheets API error',
        status: response.status,
        statusText: response.statusText,
        response: responseText.substring(0, 1000)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const data = JSON.parse(responseText);
    
    return new Response(JSON.stringify({
      success: true,
      spreadsheet: {
        title: data.properties?.title,
        sheets: data.sheets?.map(s => ({
          title: s.properties?.title,
          sheetId: s.properties?.sheetId
        }))
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Cocktail Google Sheets test error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Тестирование Google Sheets API (оставляем здесь, так как это тестовый эндпоинт)
async function testGoogleSheets(env) {
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const apiKey = env.GOOGLE_SHEETS_API_KEY;
  
  try {
    console.log('Testing Google Sheets API...');
    console.log('Spreadsheet ID:', spreadsheetId);
    console.log('API Key:', apiKey ? 'Present' : 'Missing');
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
    console.log('Request URL:', url);
    
    const response = await fetch(url);
    const responseText = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response text (first 500 chars):', responseText.substring(0, 500));
    
    if (!response.ok) {
      return new Response(JSON.stringify({
        error: 'Google Sheets API error',
        status: response.status,
        statusText: response.statusText,
        response: responseText.substring(0, 1000)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const data = JSON.parse(responseText);
    
    return new Response(JSON.stringify({
      success: true,
      spreadsheet: {
        title: data.properties?.title,
        sheets: data.sheets?.map(s => s.properties?.title)
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Google Sheets test error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Тестирование ID коктейлей
async function testCocktailsIds(env) {
  try {
    const wines = await getWineData(env);
    const cocktails = wines.filter(wine => 
      ['Коктейли', 'Микс дринк', 'Лимонады и Милкшейки', 'Чай', 'Кофе', 'Премиксы', 'ПФ', 'нет в меню'].includes(wine.category)
    );
    
    return new Response(JSON.stringify({
      success: true,
      total_cocktails: cocktails.length,
      cocktails: cocktails.map(c => ({
        id: c.id,
        name: c.name,
        category: c.category
      }))
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error testing cocktail IDs:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}