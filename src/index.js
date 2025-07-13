// Основной воркер для Telegram Wine Bot
// Обрабатывает webhook от Telegram и API запросы

import { handleWebhook } from './handlers/telegram.js';
import { setWebhook, deleteWebhook, getBotStatus, getWebhookInfo } from './handlers/webhook.js';
import { jsonResponse, withCorsHeaders } from './utils/cors.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    console.log('[BACKEND] Request:', request.method, url.pathname);
    
    // Обработка CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    
    try {
      // Webhook от Telegram
      if (url.pathname === '/webhook' && request.method === 'POST') {
        console.log('[BACKEND] Processing Telegram webhook');
        return await handleWebhook(request, env);
      }
      
      // API эндпоинты
      if (url.pathname === '/user-stats' && request.method === 'GET') {
        return withCorsHeaders(await getUserStats(request, env));
      }
      
      if (url.pathname === '/user-achievements' && request.method === 'GET') {
        return withCorsHeaders(await getUserStats(request, env));
      }
      
      if (url.pathname === '/daily-challenges' && request.method === 'GET') {
        return withCorsHeaders(await getDailyChallenges(request, env));
      }
      
      // Управление webhook
      if (url.pathname === '/set-webhook' && request.method === 'POST') {
        return withCorsHeaders(await setWebhook(env));
      }
      
      if (url.pathname === '/delete-webhook' && request.method === 'POST') {
        return withCorsHeaders(await deleteWebhook(env));
      }
      
      if (url.pathname === '/bot-status' && request.method === 'GET') {
        return withCorsHeaders(await getBotStatus(env));
      }
      
      if (url.pathname === '/webhook-info' && request.method === 'GET') {
        return withCorsHeaders(await getWebhookInfo(env));
      }
      
      // Тестовый эндпоинт для проверки работы
      if (url.pathname === '/health' && request.method === 'GET') {
        return jsonResponse({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          worker: 'telegram-wine-bot-backend'
        });
      }
      
      // Тестовый эндпоинт для проверки базы данных
      if (url.pathname === '/test-db' && request.method === 'GET') {
        try {
          const { DatabaseManager } = await import('./handlers/database.js');
          const db = new DatabaseManager(env.DB);
          
          // Простой тест подключения
          const result = await db.query('SELECT 1 as test');
          return jsonResponse({ 
            status: 'ok', 
            db_test: result,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('[BACKEND] Database test error:', error);
          return jsonResponse({ 
            status: 'error', 
            error: error.message,
            timestamp: new Date().toISOString()
          }, 500);
        }
      }
      
      // 404 для неизвестных путей
      console.log('[BACKEND] 404 Not Found:', url.pathname);
      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      console.error('[BACKEND] Error processing request:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

// Получение статистики пользователя
async function getUserStats(request, env) {
  console.log('[BACKEND] getUserStats START');
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    console.log('[BACKEND] getUserStats chatId:', chatId);
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }
    
    console.log('[BACKEND] getUserStats Checking env.DB...');
    if (!env.DB) {
      console.error('[BACKEND] getUserStats env.DB is not available');
      return jsonResponse({ error: 'Database not available' }, 500);
    }
    
    console.log('[BACKEND] getUserStats Importing DatabaseManager...');
    const { DatabaseManager } = await import('./handlers/database.js');
    console.log('[BACKEND] getUserStats DatabaseManager imported successfully');
    
    console.log('[BACKEND] getUserStats Creating database instance...');
    const database = new DatabaseManager(env.DB);
    console.log('[BACKEND] getUserStats Database instance created');
    
    console.log('[BACKEND] getUserStats Initializing user...');
    const initResult = await database.initUser(parseInt(chatId));
    console.log('[BACKEND] getUserStats User initialization result:', initResult);
    
    console.log('[BACKEND] getUserStats Getting user stats...');
    let stats = await database.getUserStats(parseInt(chatId));
    console.log('[BACKEND] getUserStats Raw stats:', stats);
    
    if (!stats || !stats.user) {
      console.log('[BACKEND] getUserStats Creating fallback stats...');
      stats = { 
        user: { 
          id: parseInt(chatId), 
          total_score: 0, 
          total_questions: 0, 
          total_correct: 0, 
          learning_streak: 0,
          experience_points: 0,
          difficulty_level: 'beginner'
        } 
      };
    }
    
    const result = { success: true, data: stats };
    console.log('[BACKEND] getUserStats Final result:', result);
    return jsonResponse(result);
  } catch (error) {
    console.error('[BACKEND] getUserStats Error:', error);
    console.error('[BACKEND] getUserStats Error stack:', error.stack);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Получение ежедневных заданий
async function getDailyChallenges(request, env) {
  console.log('[BACKEND] getDailyChallenges START');
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    console.log('[BACKEND] getDailyChallenges chatId:', chatId);
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }
    
    // Простая реализация - возвращаем базовые задания
    const challenges = [
      {
        id: 1,
        title: 'Пройти быстрый тест',
        description: 'Ответьте на 5 вопросов',
        type: 'quick_test',
        reward: 20,
        completed: false
      },
      {
        id: 2,
        title: 'Изучить новую категорию',
        description: 'Изучите любую категорию напитков',
        type: 'category_study',
        reward: 15,
        completed: false
      },
      {
        id: 3,
        title: 'Задать вопрос ИИ',
        description: 'Получите консультацию от ИИ-помощника',
        type: 'ai_consultation',
        reward: 10,
        completed: false
      }
    ];
    
    const result = { success: true, data: { challenges } };
    console.log('[BACKEND] getDailyChallenges Final result:', result);
    return jsonResponse(result);
  } catch (error) {
    console.error('[BACKEND] getDailyChallenges Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}