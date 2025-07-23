// Основной воркер для Telegram Wine Bot
// Обрабатывает webhook от Telegram и API запросы

import { handleWebhook } from './handlers/telegram.js';
import { setWebhook, deleteWebhook, getBotStatus, getWebhookInfo } from './handlers/webhook.js';
import { jsonResponse, withCorsHeaders } from './utils/cors.js';
const { generateReminderMessage, sendTelegramMessage } = require('./utils/learningReminder');
const { DatabaseManager } = require('./handlers/database');
const { askCloudflareAI } = require('./handlers/ai');

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function getTimeOfDay(date) {
  const hour = date.getHours();
  if (hour < 6) return 'ночь';
  if (hour < 12) return 'утро';
  if (hour < 18) return 'день';
  return 'вечер';
}

function shouldSendMotivation(userData, now, lastMotivationSent) {
  const daysSinceLastLearning = userData.lastLearningDate ? daysBetween(userData.lastLearningDate, now) : 99;
  const daysSinceLastActive = userData.lastActiveDate ? daysBetween(userData.lastActiveDate, now) : 99;
  const daysSinceLastMotivation = lastMotivationSent ? daysBetween(lastMotivationSent, now) : 99;
  if (daysSinceLastMotivation < 1) return false;
  if (
    daysSinceLastActive > 3 ||
    daysSinceLastLearning > 2 ||
    (userData.progress && userData.progress > 90) ||
    (userData.streak && userData.streak === 5) ||
    (userData.errors && userData.errors > 3)
  ) {
    return true;
  }
  return false;
}

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
      
      // API для webapp - ассортимент напитков
      if (url.pathname === '/drinks' && request.method === 'GET') {
        return withCorsHeaders(await getDrinks(request, env));
      }
      
      // API для webapp - ИИ консультации
      if (url.pathname === '/ai-consultation' && request.method === 'POST') {
        return withCorsHeaders(await handleAIConsultation(request, env));
      }
      
      // API для webapp - начало быстрого теста
      if (url.pathname === '/start-quick-test' && request.method === 'POST') {
        return withCorsHeaders(await startQuickTest(request, env));
      }
      
      // API для webapp - получение вопроса теста
      if (url.pathname === '/get-test-question' && request.method === 'POST') {
        return withCorsHeaders(await getTestQuestion(request, env));
      }
      
      // API для webapp - отправка ответа на вопрос
      if (url.pathname === '/submit-test-answer' && request.method === 'POST') {
        return withCorsHeaders(await submitTestAnswer(request, env));
      }
      
      // API для webapp - детальная статистика из D1
      if (url.pathname === '/user-detailed-stats' && request.method === 'GET') {
        return withCorsHeaders(await getUserDetailedStats(request, env));
      }
      
      // Новые API эндпоинты для системы геймификации
      if (url.pathname === '/achievements/check' && request.method === 'POST') {
        return withCorsHeaders(await checkAchievements(request, env));
      }
      
      if (url.pathname === '/achievements/user' && request.method === 'GET') {
        return withCorsHeaders(await getUserAchievements(request, env));
      }
      
      if (url.pathname === '/user/level' && request.method === 'GET') {
        return withCorsHeaders(await getUserLevel(request, env));
      }
      
      if (url.pathname === '/user/experience/add' && request.method === 'POST') {
        return withCorsHeaders(await addUserExperience(request, env));
      }
      
      if (url.pathname === '/daily-challenges/user' && request.method === 'GET') {
        return withCorsHeaders(await getUserDailyChallenges(request, env));
      }
      
      if (url.pathname === '/daily-challenges/complete' && request.method === 'POST') {
        return withCorsHeaders(await completeDailyChallenge(request, env));
      }
      
      if (url.pathname === '/analytics/action' && request.method === 'POST') {
        return withCorsHeaders(await logUserAction(request, env));
      }
      
      // === НОВЫЕ API ЭНДПОИНТЫ ДЛЯ СИСТЕМЫ СТИМУЛИРОВАНИЯ ===
      
      if (url.pathname === '/motivation/analyze' && request.method === 'POST') {
        return withCorsHeaders(await analyzeUserMotivation(request, env));
      }
      
      if (url.pathname === '/motivation/messages' && request.method === 'GET') {
        return withCorsHeaders(await getMotivationMessages(request, env));
      }
      
      if (url.pathname === '/motivation/messages/read' && request.method === 'POST') {
        return withCorsHeaders(await markMotivationMessageRead(request, env));
      }
      
      if (url.pathname === '/rewards/user' && request.method === 'GET') {
        return withCorsHeaders(await getUserRewards(request, env));
      }
      
      if (url.pathname === '/rewards/claim' && request.method === 'POST') {
        return withCorsHeaders(await claimReward(request, env));
      }
      
      if (url.pathname === '/notifications/user' && request.method === 'GET') {
        return withCorsHeaders(await getUserNotifications(request, env));
      }
      
      if (url.pathname === '/notifications/mark-read' && request.method === 'POST') {
        return withCorsHeaders(await markNotificationRead(request, env));
      }
      
      if (url.pathname === '/achievements-progress' && request.method === 'GET') {
        return withCorsHeaders(await getAchievementsProgress(request, env));
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
          const db = new DatabaseManager(env);
          
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

      // Тестовый эндпоинт для рассылки напоминаний вручную
      if (url.pathname === '/test-reminder' && request.method === 'GET') {
        await handleScheduled(env);
        return jsonResponse({ status: 'ok', message: 'Test reminder sent!' });
      }
      
      // 404 для неизвестных путей
      console.log('[BACKEND] 404 Not Found:', url.pathname);
      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      console.error('[BACKEND] Error processing request:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(sendLearningReminders(env));
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
    const database = new DatabaseManager(env);
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

// Получение ассортимента напитков для webapp
async function getDrinks(request, env) {
  console.log('[BACKEND] getDrinks START');
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    
    console.log('[BACKEND] getDrinks params:', { category, search });
    
    // Импортируем функцию получения данных о напитках
    const { getWineData } = await import('./handlers/data.js');
    
    // Получаем все данные о напитках
    const allDrinks = await getWineData(env);
    console.log('[BACKEND] getDrinks loaded:', allDrinks ? allDrinks.length : 0);
    
    if (!allDrinks || allDrinks.length === 0) {
      return jsonResponse({ 
        success: true, 
        data: { drinks: [], total: 0 },
        message: 'Данные о напитках временно недоступны'
      });
    }
    
    let filteredDrinks = allDrinks;
    
    // Фильтрация по категории
    if (category && category !== 'all') {
      filteredDrinks = filteredDrinks.filter(drink => drink.category === category);
    }
    
    // Поиск по названию
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDrinks = filteredDrinks.filter(drink => 
        drink.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Получаем уникальные категории для фильтров
    const categories = [...new Set(allDrinks.map(drink => drink.category))].sort();
    
    const result = { 
      success: true, 
      data: { 
        drinks: filteredDrinks,
        total: filteredDrinks.length,
        categories: categories,
        allCategories: categories
      }
    };
    
    console.log('[BACKEND] getDrinks Final result:', {
      total: filteredDrinks.length,
      categories: categories.length
    });
    
    return jsonResponse(result);
  } catch (error) {
    console.error('[BACKEND] getDrinks Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Обработка ИИ консультаций для webapp
async function handleAIConsultation(request, env) {
  console.log('[BACKEND] handleAIConsultation START');
  try {
    const body = await request.json();
    const { question, wineId, chatId, userContext } = body;
    
    console.log('[BACKEND] handleAIConsultation params:', { 
      question: question?.substring(0, 100), 
      wineId, 
      chatId 
    });
    
    if (!question) {
      return jsonResponse({ error: 'question parameter is required' }, 400);
    }
    
    // Импортируем функции ИИ
    const { askCloudflareAI, askCloudflareAIWithWineContext } = await import('./handlers/ai.js');
    
    let aiResponse;
    
    // Если указан wineId, используем контекст конкретного напитка
    if (wineId) {
      console.log('[BACKEND] handleAIConsultation using wine context');
      aiResponse = await askCloudflareAIWithWineContext(question, wineId, env, userContext);
    } else {
      console.log('[BACKEND] handleAIConsultation using general AI');
      aiResponse = await askCloudflareAI(question, env, userContext);
    }
    
    const result = { 
      success: true, 
      data: { 
        answer: aiResponse,
        question: question,
        wineId: wineId || null,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('[BACKEND] handleAIConsultation Final result:', {
      answerLength: aiResponse?.length || 0
    });
    
    return jsonResponse(result);
  } catch (error) {
    console.error('[BACKEND] handleAIConsultation Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Начало быстрого теста
async function startQuickTest(request, env) {
  console.log('[BACKEND] startQuickTest START');
  try {
    const body = await request.json();
    const { chatId } = body;
    console.log('[BACKEND] startQuickTest chatId:', chatId);
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }

    console.log('[BACKEND] startQuickTest Checking env.DB...');
    if (!env.DB) {
      console.error('[BACKEND] startQuickTest env.DB is not available');
      return jsonResponse({ error: 'Database not available' }, 500);
    }

    console.log('[BACKEND] startQuickTest Importing DatabaseManager...');
    const { DatabaseManager } = await import('./handlers/database.js');
    console.log('[BACKEND] startQuickTest DatabaseManager imported successfully');

    console.log('[BACKEND] startQuickTest Creating database instance...');
    const database = new DatabaseManager(env);
    console.log('[BACKEND] startQuickTest Database instance created');

    console.log('[BACKEND] startQuickTest Initializing user...');
    const initResult = await database.initUser(parseInt(chatId));
    console.log('[BACKEND] startQuickTest User initialization result:', initResult);

    console.log('[BACKEND] startQuickTest Starting quick test...');
    const quickTestSession = await database.startQuickTestSession(parseInt(chatId));
    console.log('[BACKEND] startQuickTest Quick test session started:', quickTestSession);

    const result = { success: true, data: { sessionId: quickTestSession.id } };
    console.log('[BACKEND] startQuickTest Final result:', result);
    return jsonResponse(result);
  } catch (error) {
    console.error('[BACKEND] startQuickTest Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Получение вопроса для быстрого теста
async function getTestQuestion(request, env) {
  console.log('[BACKEND] getTestQuestion START');
  try {
    const body = await request.json();
    const { sessionId } = body;
    console.log('[BACKEND] getTestQuestion sessionId:', sessionId);
    if (!sessionId) {
      return jsonResponse({ error: 'sessionId parameter is required' }, 400);
    }

    console.log('[BACKEND] getTestQuestion Checking env.DB...');
    if (!env.DB) {
      console.error('[BACKEND] getTestQuestion env.DB is not available');
      return jsonResponse({ error: 'Database not available' }, 500);
    }

    console.log('[BACKEND] getTestQuestion Importing DatabaseManager...');
    const { DatabaseManager } = await import('./handlers/database.js');
    console.log('[BACKEND] getTestQuestion DatabaseManager imported successfully');

    console.log('[BACKEND] getTestQuestion Creating database instance...');
    const database = new DatabaseManager(env);
    console.log('[BACKEND] getTestQuestion Database instance created');

    console.log('[BACKEND] getTestQuestion Getting question for session...');
    const question = await database.getTestQuestion(parseInt(sessionId));
    console.log('[BACKEND] getTestQuestion Question:', question);

    if (!question) {
      return jsonResponse({ error: 'No question found for this session' }, 404);
    }

    const result = { success: true, data: { question: question } };
    console.log('[BACKEND] getTestQuestion Final result:', result);
    return jsonResponse(result);
  } catch (error) {
    console.error('[BACKEND] getTestQuestion Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Отправка ответа на вопрос теста
async function submitTestAnswer(request, env) {
  console.log('[BACKEND] submitTestAnswer START');
  try {
    const body = await request.json();
    const { sessionId, questionId, answer, isCorrect } = body;
    console.log('[BACKEND] submitTestAnswer params:', { sessionId, questionId, answer, isCorrect });

    if (!sessionId || !questionId || answer === undefined || isCorrect === undefined) {
      return jsonResponse({ error: 'Missing required parameters' }, 400);
    }

    console.log('[BACKEND] submitTestAnswer Checking env.DB...');
    if (!env.DB) {
      console.error('[BACKEND] submitTestAnswer env.DB is not available');
      return jsonResponse({ error: 'Database not available' }, 500);
    }

    console.log('[BACKEND] submitTestAnswer Importing DatabaseManager...');
    const { DatabaseManager } = await import('./handlers/database.js');
    console.log('[BACKEND] submitTestAnswer DatabaseManager imported successfully');

    console.log('[BACKEND] submitTestAnswer Creating database instance...');
    const database = new DatabaseManager(env);
    console.log('[BACKEND] submitTestAnswer Database instance created');

    console.log('[BACKEND] submitTestAnswer Updating session...');
    const updatedSession = await database.submitTestAnswer(parseInt(sessionId), parseInt(questionId), answer, isCorrect);
    console.log('[BACKEND] submitTestAnswer Session updated:', updatedSession);

    const result = { success: true, data: updatedSession };
    console.log('[BACKEND] submitTestAnswer Final result:', result);
    return jsonResponse(result);
  } catch (error) {
    console.error('[BACKEND] submitTestAnswer Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Получение детальной статистики пользователя из D1
async function getUserDetailedStats(request, env) {
  console.log('[BACKEND] getUserDetailedStats START');
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    console.log('[BACKEND] getUserDetailedStats chatId:', chatId);
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }
    
    console.log('[BACKEND] getUserDetailedStats Checking env.DB...');
    if (!env.DB) {
      console.error('[BACKEND] getUserDetailedStats env.DB is not available');
      return jsonResponse({ error: 'Database not available' }, 500);
    }
    
    console.log('[BACKEND] getUserDetailedStats Importing DatabaseManager...');
    const { DatabaseManager } = await import('./handlers/database.js');
    console.log('[BACKEND] getUserDetailedStats DatabaseManager imported successfully');
    
    console.log('[BACKEND] getUserDetailedStats Creating database instance...');
    const database = new DatabaseManager(env);
    console.log('[BACKEND] getUserDetailedStats Database instance created');
    
    console.log('[BACKEND] getUserDetailedStats Initializing user...');
    const initResult = await database.initUser(parseInt(chatId));
    console.log('[BACKEND] getUserDetailedStats User initialization result:', initResult);
    
    console.log('[BACKEND] getUserDetailedStats Getting detailed stats...');
    let stats = await database.getUserStats(parseInt(chatId));
    console.log('[BACKEND] getUserDetailedStats Raw stats:', stats);
    
    if (!stats || !stats.user) {
      console.log('[BACKEND] getUserDetailedStats Creating fallback stats...');
      stats = { 
        user: { 
          id: parseInt(chatId), 
          total_score: 0, 
          total_questions: 0, 
          total_correct: 0, 
          learning_streak: 0,
          experience_points: 0,
          difficulty_level: 'beginner'
        },
        categoryStats: [],
        questionTypeStats: [],
        recentSessions: []
      };
    }
    
    // Получаем дополнительную статистику
    console.log('[BACKEND] getUserDetailedStats Getting activity history...');
    const activityHistory = await database.getActivityHistory(parseInt(chatId), 20);
    
    console.log('[BACKEND] getUserDetailedStats Getting achievements...');
    const achievements = await database.getAchievements(parseInt(chatId));
    
    // Получаем статистику по дням для графика
    console.log('[BACKEND] getUserDetailedStats Getting daily stats...');
    const dailyStats = await database.prepare(`
      SELECT 
        DATE(start_time) as date,
        COUNT(*) as sessions_count,
        SUM(correct_answers) as total_correct,
        SUM(score) as total_score,
        AVG(CAST(correct_answers AS FLOAT) / total_questions * 100) as accuracy
      FROM learning_sessions 
      WHERE chat_id = ? AND end_time IS NOT NULL
      GROUP BY DATE(start_time)
      ORDER BY date DESC
      LIMIT 30
    `).bind(parseInt(chatId)).all();
    
    const result = { 
      success: true, 
      data: {
        ...stats,
        activityHistory: activityHistory,
        achievements: achievements,
        dailyStats: dailyStats.results || []
      }
    };
    
    console.log('[BACKEND] getUserDetailedStats Final result:', {
      user: result.data.user ? 'present' : 'missing',
      categoryStats: result.data.categoryStats?.length || 0,
      questionTypeStats: result.data.questionTypeStats?.length || 0,
      recentSessions: result.data.recentSessions?.length || 0,
      activityHistory: result.data.activityHistory?.length || 0,
      achievements: result.data.achievements?.length || 0,
      dailyStats: result.data.dailyStats?.length || 0
    });
    
    return jsonResponse(result);
  } catch (error) {
    console.error('[BACKEND] getUserDetailedStats Error:', error);
    console.error('[BACKEND] getUserDetailedStats Error stack:', error.stack);
    return jsonResponse({ error: error.message }, 500);
  }
}

// ===== НОВЫЕ ФУНКЦИИ ДЛЯ СИСТЕМЫ ГЕЙМИФИКАЦИИ =====

// Проверка достижений
async function checkAchievements(request, env) {
  console.log('[BACKEND] checkAchievements START');
  try {
    const body = await request.json();
    const { chatId, stats } = body;
    
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const { AchievementSystem } = await import('./handlers/achievements.js');
    
    const database = new DatabaseManager(env);
    const achievementSystem = new AchievementSystem(database, env);
    
    const newAchievements = await achievementSystem.checkAchievements(parseInt(chatId), stats || {});
    
    return jsonResponse({ 
      success: true, 
      data: { 
        newAchievements,
        totalAchievements: newAchievements.length
      } 
    });
  } catch (error) {
    console.error('[BACKEND] checkAchievements Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Получение достижений пользователя
async function getUserAchievements(request, env) {
  console.log('[BACKEND] getUserAchievements START');
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const { AchievementSystem } = await import('./handlers/achievements.js');
    
    const database = new DatabaseManager(env);
    const achievementSystem = new AchievementSystem(database, env);
    
    const achievements = await database.getAchievements(parseInt(chatId));
    const progress = await achievementSystem.getAchievementProgress(parseInt(chatId));
    
    return jsonResponse({ 
      success: true, 
      data: { 
        achievements,
        progress
      } 
    });
  } catch (error) {
    console.error('[BACKEND] getUserAchievements Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Получение уровня пользователя
async function getUserLevel(request, env) {
  console.log('[BACKEND] getUserLevel START');
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    
    const levelInfo = await database.getUserLevel(parseInt(chatId));
    
    if (!levelInfo) {
      return jsonResponse({ error: 'User not found' }, 404);
    }
    
    return jsonResponse({ 
      success: true, 
      data: levelInfo 
    });
  } catch (error) {
    console.error('[BACKEND] getUserLevel Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Добавление опыта пользователю
async function addUserExperience(request, env) {
  console.log('[BACKEND] addUserExperience START');
  try {
    const body = await request.json();
    const { chatId, action, context } = body;
    
    if (!chatId || !action) {
      return jsonResponse({ error: 'chatId and action parameters are required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    
    const result = await database.addExperience(parseInt(chatId), action, context || {});
    
    return jsonResponse({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('[BACKEND] addUserExperience Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Получение ежедневных заданий пользователя
async function getUserDailyChallenges(request, env) {
  console.log('[BACKEND] getUserDailyChallenges START');
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const { DailyChallengeSystem } = await import('./handlers/dailyChallenges.js');
    
    const database = new DatabaseManager(env);
    const challengeSystem = new DailyChallengeSystem(database, env);
    
    const challenges = await challengeSystem.getUserDailyChallenges(parseInt(chatId));
    
    return jsonResponse({ 
      success: true, 
      data: { challenges } 
    });
  } catch (error) {
    console.error('[BACKEND] getUserDailyChallenges Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Завершение ежедневного задания
async function completeDailyChallenge(request, env) {
  console.log('[BACKEND] completeDailyChallenge START');
  try {
    const body = await request.json();
    const { chatId, challengeId } = body;
    
    if (!chatId || !challengeId) {
      return jsonResponse({ error: 'chatId and challengeId parameters are required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const { DailyChallengeSystem } = await import('./handlers/dailyChallenges.js');
    
    const database = new DatabaseManager(env);
    const challengeSystem = new DailyChallengeSystem(database, env);
    
    const result = await challengeSystem.completeChallenge(parseInt(chatId), challengeId);
    
    return jsonResponse({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('[BACKEND] completeDailyChallenge Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Логирование действий пользователя
async function logUserAction(request, env) {
  console.log('[BACKEND] logUserAction START');
  try {
    const body = await request.json();
    const { chatId, actionType, description, pointsEarned, experienceEarned } = body;
    
    if (!chatId || !actionType) {
      return jsonResponse({ error: 'chatId and actionType parameters are required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    
    await database.logActivity(
      parseInt(chatId), 
      actionType, 
      description || '', 
      pointsEarned || 0, 
      experienceEarned || 0
    );
    
    return jsonResponse({ 
      success: true, 
      data: { logged: true } 
    });
  } catch (error) {
    console.error('[BACKEND] logUserAction Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// === НОВЫЕ ФУНКЦИИ ДЛЯ СИСТЕМЫ СТИМУЛИРОВАНИЯ ===

// Анализ мотивации пользователя
async function analyzeUserMotivation(request, env) {
  console.log('[BACKEND] analyzeUserMotivation START');
  console.log('[BACKEND] analyzeUserMotivation env keys:', Object.keys(env));
  console.log('[BACKEND] analyzeUserMotivation env.DB:', env.DB ? 'present' : 'missing');
  console.log('[BACKEND] analyzeUserMotivation env.WINE_CACHE:', env.WINE_CACHE ? 'present' : 'missing');
  
  try {
    const body = await request.json();
    const { chatId } = body;
    
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const { MotivationSystem } = await import('./handlers/motivation.js');
    
    const database = new DatabaseManager(env);
    const motivationSystem = new MotivationSystem(database);
    
    const result = await motivationSystem.analyzeUserAndMotivate(parseInt(chatId));
    
    return jsonResponse(result);
  } catch (error) {
    console.error('[BACKEND] analyzeUserMotivation Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Получение мотивационных сообщений пользователя
async function getMotivationMessages(request, env) {
  console.log('[BACKEND] getMotivationMessages START');
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    
    let query = 'SELECT * FROM motivation_messages WHERE chat_id = ?';
    let params = [parseInt(chatId)];
    
    if (unreadOnly) {
      query += ' AND is_read = FALSE';
    }
    
    query += ' ORDER BY created_at DESC LIMIT 20';
    
    const messagesResult = await database.prepare(query).bind(...params).all();
    const messages = messagesResult.results || [];
    
    return jsonResponse({ 
      success: true, 
      data: { messages } 
    });
  } catch (error) {
    console.error('[BACKEND] getMotivationMessages Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Отметить мотивационное сообщение как прочитанное
async function markMotivationMessageRead(request, env) {
  console.log('[BACKEND] markMotivationMessageRead START');
  try {
    const body = await request.json();
    const { chatId, messageId } = body;
    
    if (!chatId || !messageId) {
      return jsonResponse({ error: 'chatId and messageId parameters are required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    
    await database.prepare(
      'UPDATE motivation_messages SET is_read = TRUE WHERE id = ? AND chat_id = ?'
    ).bind(messageId, parseInt(chatId)).run();
    
    return jsonResponse({ 
      success: true, 
      data: { updated: true } 
    });
  } catch (error) {
    console.error('[BACKEND] markMotivationMessageRead Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Получение наград пользователя
async function getUserRewards(request, env) {
  console.log('[BACKEND] getUserRewards START');
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    const unclaimedOnly = url.searchParams.get('unclaimedOnly') === 'true';
    
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    
    let query = 'SELECT * FROM rewards WHERE chat_id = ?';
    let params = [parseInt(chatId)];
    
    if (unclaimedOnly) {
      query += ' AND is_claimed = FALSE';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const rewardsResult = await database.prepare(query).bind(...params).all();
    const rewards = rewardsResult.results || [];
    
    return jsonResponse({ 
      success: true, 
      data: { rewards } 
    });
  } catch (error) {
    console.error('[BACKEND] getUserRewards Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Получение награды
async function claimReward(request, env) {
  console.log('[BACKEND] claimReward START');
  try {
    const body = await request.json();
    const { chatId, rewardId } = body;
    
    if (!chatId || !rewardId) {
      return jsonResponse({ error: 'chatId and rewardId parameters are required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    
    // Проверяем, что награда существует и не получена
    const rewardResult = await database.prepare(
      'SELECT * FROM rewards WHERE id = ? AND chat_id = ? AND is_claimed = FALSE'
    ).bind(rewardId, parseInt(chatId)).all();
    const reward = rewardResult.results || [];
    
    if (!reward || reward.length === 0) {
      return jsonResponse({ error: 'Reward not found or already claimed' }, 404);
    }
    
    // Отмечаем награду как полученную
    await database.prepare(
      'UPDATE rewards SET is_claimed = TRUE, claimed_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(rewardId).run();
    
    return jsonResponse({ 
      success: true, 
      data: { 
        claimed: true,
        reward: reward[0]
      } 
    });
  } catch (error) {
    console.error('[BACKEND] claimReward Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Получение уведомлений пользователя
async function getUserNotifications(request, env) {
  console.log('[BACKEND] getUserNotifications START');
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    
    let query = 'SELECT * FROM notifications WHERE chat_id = ?';
    let params = [parseInt(chatId)];
    
    if (unreadOnly) {
      query += ' AND is_read = FALSE';
    }
    
    query += ' ORDER BY priority DESC, created_at DESC LIMIT 20';
    
    const notificationsResult = await database.prepare(query).bind(...params).all();
    const notifications = notificationsResult.results || [];
    
    return jsonResponse({ 
      success: true, 
      data: { notifications } 
    });
  } catch (error) {
    console.error('[BACKEND] getUserNotifications Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Отметить уведомление как прочитанное
async function markNotificationRead(request, env) {
  console.log('[BACKEND] markNotificationRead START');
  try {
    const body = await request.json();
    const { chatId, notificationId } = body;
    
    if (!chatId || !notificationId) {
      return jsonResponse({ error: 'chatId and notificationId parameters are required' }, 400);
    }

    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    
    await database.prepare(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND chat_id = ?'
    ).bind(notificationId, parseInt(chatId)).run();
    
    return jsonResponse({ 
      success: true, 
      data: { updated: true } 
    });
  } catch (error) {
    console.error('[BACKEND] markNotificationRead Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Новый эндпоинт для прогресса достижений
async function getAchievementsProgress(request, env) {
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }
    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    const progress = await database.getAchievementProgress(parseInt(chatId));
    return jsonResponse({ success: true, data: progress });
  } catch (error) {
    console.error('[BACKEND] getAchievementsProgress Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// === Функция для рассылки напоминаний (handleScheduled) ===
async function handleScheduled(env) {
  const db = new DatabaseManager(env);

  // Получаем всех пользователей из БД
  const users = await db.getAllUserChatIds();

  const today = new Date().toISOString().split('T')[0];

  for (const user of users) {
    // Фильтрация по условиям (можно оставить как есть)
    if (user.level < 3 || user.lastLearningDate !== today) {
      const message = generateReminderMessage(user);
      await sendTelegramMessage(user.chatId, message, env);
    }
  }
}

async function sendLearningReminders(env) {
  const db = new DatabaseManager(env);
  const users = await db.getAllUserChatIds();
  const now = new Date();
  const timeOfDay = getTimeOfDay(now);

  for (const user of users) {
    try {
      const stats = await db.getUserStats(user.chatId);
      const userData = {
        chatId: user.chatId,
        lastLearningDate: user.lastLearningDate,
        lastActiveDate: user.lastActiveDate,
        level: stats?.user?.level || 1,
        levelName: stats?.user?.level_name || '',
        progress: stats?.user?.progress || 0,
        streak: stats?.user?.learning_streak || 0,
        maxStreak: stats?.user?.max_streak || 0,
        errors: stats?.user?.total_questions && stats?.user?.total_questions > 0 ? (stats?.user?.total_questions - stats?.user?.total_correct) : 0,
        totalQuestions: stats?.user?.total_questions || 0,
        totalCorrect: stats?.user?.total_correct || 0,
        lastTopics: stats?.categoryStats?.slice(0, 2).map(c => c.category) || [],
        weakTopics: stats?.categoryStats?.filter(c => c.accuracy < 60).map(c => c.category) || [],
        strongTopics: stats?.categoryStats?.filter(c => c.accuracy > 80).map(c => c.category) || [],
      };
      const lastMotivationSent = await db.getLastMotivationSent(user.chatId);
      if (!shouldSendMotivation(userData, now, lastMotivationSent)) continue;

      // Новое: достижения, динамика, любимая тема
      const achievements = await db.getRecentAchievements(user.chatId, 3);
      const progressDynamics = await db.getProgressDynamics(user.chatId);
      const favoriteTopic = userData.strongTopics[0] || userData.lastTopics[0] || '';
      const weakTopic = userData.weakTopics[0] || '';
      const isRecordStreak = userData.streak && userData.streak === userData.maxStreak && userData.streak > 0;

      // Вариативный промпт для AI
      const prompt = `Ты корпоративный наставник и мотиватор. Вот данные о сотруднике:
- Уровень: ${userData.level} ${userData.levelName}
- Прогресс: ${userData.progress}%
- Последний урок: ${userData.lastLearningDate || 'нет данных'}
- Серия правильных ответов: ${userData.streak}${isRecordStreak ? ' (рекорд!)' : ''}
- Ошибок за всё время: ${userData.errors}
- Достижения: ${achievements.join(', ') || 'нет'}
- Сильные стороны: ${userData.strongTopics.join(', ') || 'нет'}
- Слабые стороны: ${userData.weakTopics.join(', ') || 'нет'}
- Любимая категория: ${favoriteTopic || 'нет'}
- Время суток: ${timeOfDay}
- Динамика: за неделю прогресс ${progressDynamics >= 0 ? 'вырос' : 'упал'} на ${Math.abs(progressDynamics)} XP
- До следующего уровня: ${stats?.user?.next_level_xp ? (stats.user.next_level_xp - stats.user.experience_points) : 'нет данных'} XP

Сформулируй короткое (до 200 символов) мотивационное сообщение, поздравь с достижениями, подскажи, что осталось до следующей цели, предложи пройти урок по слабой теме, пожелай хорошего ${timeOfDay}. Используй дружелюбный стиль, эмодзи, вариативные фразы, вопросы, челленджи, поздравления, пожелания. Не повторяйся каждый день!`;

      let message;
      try {
        message = await askCloudflareAI(prompt, env);
        if (message.length > 220) message = message.slice(0, 220) + '...';
      } catch (e) {
        message = generateReminderMessage(userData); // fallback
      }
      // Кнопки для Telegram
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🎓 Начать урок', callback_data: 'learning_start' },
            { text: '🏆 Мои достижения', callback_data: 'learning_achievements' }
          ],
          [
            { text: '📈 Мой прогресс', callback_data: 'learning_progress' },
            { text: '💡 Получить совет', callback_data: 'learning_advice' }
          ]
        ]
      };
      await sendTelegramMessage(userData.chatId, message, env, keyboard);
      await db.updateLastMotivationSent(userData.chatId, now);
      console.log(`[CRON] Sent motivation to ${userData.chatId}`);
    } catch (err) {
      console.error(`[CRON] Error for user ${user.chatId}:`, err);
    }
  }
}