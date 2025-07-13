// Фронтенд воркер для Telegram Wine Bot
// Использует ту же базу данных и API, но работает на отдельном домене

import { DatabaseManager } from './handlers/database.js';
import { jsonResponse, withCorsHeaders } from './utils/cors.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    console.log('[FRONTEND] Request:', request.method, url.pathname);
    
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
    
    // Главная страница
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return serveMainPage(env);
    }
    
    // API эндпоинты (используем ту же логику, что и в основном воркере)
    if (url.pathname === '/user-stats' && request.method === 'GET') {
      return withCorsHeaders(getUserStats(request, env));
    }
    
    if (url.pathname === '/user-achievements' && request.method === 'GET') {
      return withCorsHeaders(getUserAchievements(request, env));
    }
    
    if (url.pathname === '/daily-challenges' && request.method === 'GET') {
      return withCorsHeaders(getDailyChallenges(request, env));
    }
    
    // Прокси к основному API для остальных эндпоинтов
    if (url.pathname.startsWith('/api/')) {
      return proxyToBackend(request, env);
    }
    
    // 404 для остальных запросов
    return new Response('Not Found', { status: 404 });
  },
};

// Главная страница приложения
function serveMainPage(env) {
  const html = `<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🍷 Beverage Learning</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        wine: {
                            50: '#fdf2f8',
                            100: '#fce7f3',
                            200: '#fbcfe8',
                            300: '#f9a8d4',
                            400: '#f472b6',
                            500: '#ec4899',
                            600: '#db2777',
                            700: '#be185d',
                            800: '#9d174d',
                            900: '#831843',
                        },
                        dark: {
                            50: '#f8fafc',
                            100: '#f1f5f9',
                            200: '#e2e8f0',
                            300: '#cbd5e1',
                            400: '#94a3b8',
                            500: '#64748b',
                            600: '#475569',
                            700: '#334155',
                            800: '#1e293b',
                            900: '#0f172a',
                            950: '#020617',
                        }
                    },
                    animation: {
                        'fade-in': 'fadeIn 0.5s ease-in-out',
                        'slide-up': 'slideUp 0.3s ease-out',
                        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    },
                    keyframes: {
                        fadeIn: {
                            '0%': { opacity: '0' },
                            '100%': { opacity: '1' },
                        },
                        slideUp: {
                            '0%': { transform: 'translateY(10px)', opacity: '0' },
                            '100%': { transform: 'translateY(0)', opacity: '1' },
                        }
                    }
                }
            }
        }
    </script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
            min-height: 100vh;
            color: #f1f5f9;
            overflow-x: hidden;
        }
        
        .glass-effect {
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .wine-gradient {
            background: linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%);
        }
        
        .wine-gradient-hover:hover {
            background: linear-gradient(135deg, #9d174d 0%, #db2777 50%, #f472b6 100%);
        }
        
        .card-glow {
            box-shadow: 0 0 20px rgba(236, 72, 153, 0.1);
        }
        
        .card-glow:hover {
            box-shadow: 0 0 30px rgba(236, 72, 153, 0.2);
        }
        
        .animate-fade-in {
            animation: fadeIn 0.5s ease-in-out;
        }
        
        .animate-slide-up {
            animation: slideUp 0.3s ease-out;
        }
        
        .loading-spinner {
            border: 3px solid rgba(148, 163, 184, 0.2);
            border-top: 3px solid #ec4899;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .progress-bar {
            background: rgba(148, 163, 184, 0.2);
            border-radius: 9999px;
            overflow: hidden;
        }
        
        .progress-fill {
            background: linear-gradient(90deg, #ec4899, #be185d);
            height: 100%;
            transition: width 0.5s ease;
            border-radius: 9999px;
        }
        
        .menu-item {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .menu-item:hover {
            transform: translateY(-4px) scale(1.02);
        }
        
        .stat-card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(51, 65, 85, 0.8));
            backdrop-filter: blur(10px);
            border: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        .user-avatar {
            border: 3px solid #ec4899;
            box-shadow: 0 0 20px rgba(236, 72, 153, 0.3);
        }
        
        .telegram-theme {
            background: var(--tg-theme-bg-color, #0f172a);
            color: var(--tg-theme-text-color, #f1f5f9);
        }
        
        .telegram-button {
            background: var(--tg-theme-button-color, #ec4899);
            color: var(--tg-theme-button-text-color, #ffffff);
        }
        
        .telegram-secondary {
            background: var(--tg-theme-secondary-bg-color, rgba(30, 41, 59, 0.8));
        }
    </style>
</head>
<body class="telegram-theme">
    <div class="min-h-screen relative">
        <!-- Фоновые элементы -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <div class="absolute -top-40 -right-40 w-80 h-80 bg-wine-500/10 rounded-full blur-3xl"></div>
            <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-wine-600/10 rounded-full blur-3xl"></div>
        </div>
        
        <div class="relative z-10 max-w-md mx-auto px-4 py-4">
            <!-- Заголовок -->
            <div class="text-center mb-6 animate-fade-in">
                <div class="inline-flex items-center justify-center w-14 h-14 bg-wine-gradient rounded-2xl mb-3 shadow-lg">
                    <span class="text-xl">🍷</span>
                </div>
                <h1 class="text-xl font-bold text-white mb-1">Beverage Learning</h1>
                <p class="text-slate-400 text-xs">Обучение официантов по ассортименту напитков</p>
            </div>

            <!-- Загрузка -->
            <div id="loading" class="text-center py-8 animate-fade-in">
                <div class="loading-spinner mx-auto mb-3"></div>
                <p class="text-slate-400 text-sm">Загрузка...</p>
            </div>

            <!-- Сообщения об ошибках и успехе -->
            <div id="error" class="hidden mb-3 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-center animate-slide-up text-sm"></div>
            <div id="success" class="hidden mb-3 p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-300 text-center animate-slide-up text-sm"></div>

            <!-- Информация о пользователе -->
            <div id="userInfo" class="hidden mb-4 animate-slide-up">
                <div class="glass-effect rounded-xl p-4 text-center card-glow">
                    <img id="userAvatar" class="user-avatar w-14 h-14 rounded-full mx-auto mb-3" src="" alt="Avatar">
                    <div id="userName" class="text-base font-semibold text-white mb-2"></div>
                    <div id="userStats" class="text-wine-300 font-medium mb-3 text-sm"></div>
                    
                    <!-- Прогресс уровня -->
                    <div class="mb-3">
                        <div class="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Уровень</span>
                            <span id="levelText">1</span>
                        </div>
                        <div class="progress-bar h-1.5">
                            <div class="progress-fill" id="levelProgress" style="width: 0%"></div>
                        </div>
                    </div>
                    
                    <!-- Статистика -->
                    <div class="grid grid-cols-2 gap-2">
                        <div class="stat-card rounded-lg p-2">
                            <div id="totalScore" class="text-lg font-bold text-wine-400">0</div>
                            <div class="text-xs text-slate-400">Очки</div>
                        </div>
                        <div class="stat-card rounded-lg p-2">
                            <div id="totalQuestions" class="text-lg font-bold text-wine-400">0</div>
                            <div class="text-xs text-slate-400">Вопросов</div>
                        </div>
                        <div class="stat-card rounded-lg p-2">
                            <div id="correctAnswers" class="text-lg font-bold text-wine-400">0</div>
                            <div class="text-xs text-slate-400">Правильно</div>
                        </div>
                        <div class="stat-card rounded-lg p-2">
                            <div id="streak" class="text-lg font-bold text-wine-400">0</div>
                            <div class="text-xs text-slate-400">Серия</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Главное меню -->
            <div id="mainMenu" class="hidden animate-slide-up">
                <div class="grid grid-cols-2 gap-2">
                    <button class="menu-item glass-effect rounded-lg p-3 text-center card-glow wine-gradient-hover" onclick="navigateTo('learning')">
                        <div class="text-xl mb-1">🎓</div>
                        <div class="font-medium text-white text-xs">Обучение</div>
                    </button>
                    <button class="menu-item glass-effect rounded-lg p-3 text-center card-glow wine-gradient-hover" onclick="navigateTo('wines')">
                        <div class="text-xl mb-1">🍷</div>
                        <div class="font-medium text-white text-xs">База напитков</div>
                    </button>
                    <button class="menu-item glass-effect rounded-lg p-3 text-center card-glow wine-gradient-hover" onclick="navigateTo('menu')">
                        <div class="text-xl mb-1">🍽️</div>
                        <div class="font-medium text-white text-xs">Меню</div>
                    </button>
                    <button class="menu-item glass-effect rounded-lg p-3 text-center card-glow wine-gradient-hover" onclick="navigateTo('alcohol')">
                        <div class="text-xl mb-1">🥃</div>
                        <div class="font-medium text-white text-xs">Алкоголь</div>
                    </button>
                    <button class="menu-item glass-effect rounded-lg p-3 text-center card-glow wine-gradient-hover" onclick="navigateTo('search')">
                        <div class="text-xl mb-1">🔍</div>
                        <div class="font-medium text-white text-xs">Поиск</div>
                    </button>
                    <button class="menu-item glass-effect rounded-lg p-3 text-center card-glow wine-gradient-hover" onclick="navigateTo('achievements')">
                        <div class="text-xl mb-1">🏆</div>
                        <div class="font-medium text-white text-xs">Достижения</div>
                    </button>
                    <button class="menu-item glass-effect rounded-lg p-3 text-center card-glow wine-gradient-hover" onclick="navigateTo('challenges')">
                        <div class="text-xl mb-1">🎯</div>
                        <div class="font-medium text-white text-xs">Задания</div>
                    </button>
                    <button class="menu-item glass-effect rounded-lg p-3 text-center card-glow wine-gradient-hover" onclick="navigateTo('ai')">
                        <div class="text-xl mb-1">🤖</div>
                        <div class="font-medium text-white text-xs">ИИ Помощник</div>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        function debugLog(msg) {
            console.log('[Frontend]', msg);
        }
        
        function isTelegramWebApp() {
            return typeof window.Telegram !== 'undefined' && 
                   window.Telegram.WebApp && 
                   window.Telegram.WebApp.initDataUnsafe && 
                   window.Telegram.WebApp.initDataUnsafe.user;
        }
        
        function showUserInfo(user) {
            debugLog('showUserInfo: ' + JSON.stringify(user));
            document.getElementById('userInfo').classList.remove('hidden');
            document.getElementById('mainMenu').classList.remove('hidden');
            document.getElementById('userAvatar').src = user.photo_url;
            document.getElementById('userName').textContent = user.first_name + 
                (user.last_name ? ' ' + user.last_name : '') + 
                (user.username ? ' (@' + user.username + ')' : '');
        }
        
        async function loadUserData(user) {
            try {
                debugLog('loadUserData user.id: ' + user.id);
                // Используем локальный API (тот же воркер)
                const statsRes = await fetch('/user-stats?chatId=' + user.id, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    }
                });
                
                debugLog('Response status: ' + statsRes.status);
                debugLog('Response headers: ' + JSON.stringify(Object.fromEntries(statsRes.headers.entries())));
                
                if (!statsRes.ok) {
                    throw new Error(\`HTTP \${statsRes.status}: \${statsRes.statusText}\`);
                }
                
                const responseText = await statsRes.text();
                debugLog('Response text: ' + responseText);
                
                if (!responseText || responseText.trim() === '') {
                    throw new Error('Empty response from server');
                }
                
                const stats = JSON.parse(responseText);
                debugLog('API response: ' + JSON.stringify(stats));
                
                if (stats && stats.success && stats.data && stats.data.user) {
                    const u = stats.data.user;
                    document.getElementById('userStats').textContent = 'Очки: ' + (u.total_score || 0);
                    document.getElementById('totalScore').textContent = u.total_score || 0;
                    document.getElementById('totalQuestions').textContent = u.total_questions || 0;
                    document.getElementById('correctAnswers').textContent = u.total_correct || 0;
                    document.getElementById('streak').textContent = u.learning_streak || 0;
                    
                    // Обновляем прогресс уровня
                    const level = Math.floor((u.total_score || 0) / 100) + 1;
                    const progress = ((u.total_score || 0) % 100);
                    document.getElementById('levelText').textContent = level;
                    document.getElementById('levelProgress').style.width = progress + '%';
                } else if (stats && stats.error) {
                    debugLog('API error: ' + stats.error);
                    document.getElementById('userStats').textContent = 'Ошибка API: ' + stats.error;
                } else {
                    debugLog('No user data in API response');
                    document.getElementById('userStats').textContent = 'Нет данных';
                }
            } catch (error) {
                debugLog('Error loading user data: ' + error.message);
                document.getElementById('userStats').textContent = 'Ошибка загрузки';
                showError('Ошибка загрузки данных: ' + error.message);
            }
        }
        
        function showError(message) {
            const errorEl = document.getElementById('error');
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
            setTimeout(() => {
                errorEl.classList.add('hidden');
            }, 5000);
        }
        
        function showSuccess(message) {
            const successEl = document.getElementById('success');
            successEl.textContent = message;
            successEl.classList.remove('hidden');
            setTimeout(() => {
                successEl.classList.add('hidden');
            }, 3000);
        }
        
        function hideLoading() {
            document.getElementById('loading').classList.add('hidden');
        }
        
        function navigateTo(page) {
            debugLog('Navigating to: ' + page);
            // Здесь будет навигация к соответствующим страницам
            showSuccess('Переход к ' + page + '...');
        }
        
        // Инициализация приложения
        async function initApp() {
            debugLog('Initializing app...');
            
            if (isTelegramWebApp()) {
                debugLog('Running in Telegram WebApp');
                const tg = window.Telegram.WebApp;
                tg.ready();
                tg.expand();
                
                const user = tg.initDataUnsafe.user;
                if (user) {
                    debugLog('User found: ' + JSON.stringify(user));
                    showUserInfo(user);
                    await loadUserData(user);
                } else {
                    debugLog('No user data');
                    showError('Не удалось получить данные пользователя');
                }
            } else {
                debugLog('Not running in Telegram WebApp');
                // Для тестирования вне Telegram
                const mockUser = {
                    id: 123456789,
                    first_name: 'Тест',
                    last_name: 'Пользователь',
                    username: 'testuser',
                    photo_url: 'https://via.placeholder.com/150'
                };
                showUserInfo(mockUser);
                await loadUserData(mockUser);
            }
            
            hideLoading();
        }
        
        // Запуск приложения
        document.addEventListener('DOMContentLoaded', initApp);
    </script>
</body>
</html>`;
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

// API эндпоинты (копируем из основного воркера)

// Получение статистики пользователя
async function getUserStats(request, env) {
  console.log('[FRONTEND] getUserStats START');
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    console.log('[FRONTEND] getUserStats chatId:', chatId);
    if (!chatId) {
      return jsonResponse({ error: 'chatId parameter is required' }, 400);
    }
    
    console.log('[FRONTEND] getUserStats Checking env.DB...');
    if (!env.DB) {
      console.error('[FRONTEND] getUserStats env.DB is not available');
      return jsonResponse({ error: 'Database not available' }, 500);
    }
    
    console.log('[FRONTEND] getUserStats Importing DatabaseManager...');
    const { DatabaseManager } = await import('./handlers/database.js');
    console.log('[FRONTEND] getUserStats DatabaseManager imported successfully');
    
    console.log('[FRONTEND] getUserStats Creating database instance...');
    const database = new DatabaseManager(env);
    console.log('[FRONTEND] getUserStats Database instance created');
    
    console.log('[FRONTEND] getUserStats Initializing user...');
    const initResult = await database.initUser(parseInt(chatId));
    console.log('[FRONTEND] getUserStats User initialization result:', initResult);
    
    console.log('[FRONTEND] getUserStats Getting user stats...');
    let stats = await database.getUserStats(parseInt(chatId));
    console.log('[FRONTEND] getUserStats Raw stats:', stats);
    
    if (!stats || !stats.user) {
      console.log('[FRONTEND] getUserStats Creating fallback stats...');
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
    console.log('[FRONTEND] getUserStats Final result:', result);
    return jsonResponse(result);
  } catch (error) {
    console.error('[FRONTEND] getUserStats Error:', error);
    console.error('[FRONTEND] getUserStats Error stack:', error.stack);
    return jsonResponse({ error: error.message }, 500);
  }
}

// Получение достижений пользователя
async function getUserAchievements(request, env) {
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    
    if (!chatId) {
      return jsonResponse({
        error: 'chatId parameter is required'
      }, 400);
    }
    
    const { DatabaseManager } = await import('./handlers/database.js');
    const database = new DatabaseManager(env);
    
    await database.initUser(parseInt(chatId));
    const achievements = await database.getAchievements(parseInt(chatId));
    
    return jsonResponse({
      success: true,
      data: achievements
    });
  } catch (error) {
    console.error('[FRONTEND] Error getting user achievements:', error);
    return jsonResponse({
      error: error.message
    }, 500);
  }
}

// Получение ежедневных заданий
async function getDailyChallenges(request, env) {
  try {
    const url = new URL(request.url);
    const chatId = url.searchParams.get('chatId');
    
    if (!chatId) {
      return jsonResponse({
        error: 'chatId parameter is required'
      }, 400);
    }
    
    const { DailyChallengeSystem } = await import('./handlers/dailyChallenges.js');
    const { DatabaseManager } = await import('./handlers/database.js');
    
    const database = new DatabaseManager(env);
    const dailyChallenges = new DailyChallengeSystem(database, env);
    
    await database.initUser(parseInt(chatId));
    const challenges = await dailyChallenges.getActiveChallenges(parseInt(chatId));
    
    return jsonResponse({
      success: true,
      data: challenges
    });
  } catch (error) {
    console.error('[FRONTEND] Error getting daily challenges:', error);
    return jsonResponse({
      error: error.message
    }, 500);
  }
}

// Прокси к основному API
async function proxyToBackend(request, env) {
  const url = new URL(request.url);
  const apiPath = url.pathname.replace('/api', '');
  const backendUrl = env.API_URL + apiPath + url.search;
  
  console.log('[FRONTEND] Proxying to backend:', backendUrl);
  
  try {
    const response = await fetch(backendUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' ? await request.text() : undefined,
    });
    
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[FRONTEND] Proxy error:', error);
    return new Response('Backend error', { status: 500 });
  }
} 