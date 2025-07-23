// Система обучения официантов с ИИ

import { getWineData } from './data.js';
import { sendMessage, sendMessageWithKeyboard, editMessage, answerCallbackQuery } from './telegramApi.js';
import { askCloudflareAI } from './ai.js';
import { 
  updateAnalytics, 
  startLearningSession, 
  generatePersonalizedReport,
  generatePersonalizedAIQuestion,
  showDetailedAnalytics,
  exportUserData,
  getUserAnalytics
} from './learningAnalytics.js';
import { DatabaseManager } from './database.js';
import { AchievementSystem } from './achievements.js';
import { DailyChallengeSystem } from './dailyChallenges.js';
import { ChallengeSystem, CHALLENGE_PERIODS } from './challenges.js';
import { generateAdviceForWeakTopics } from './ai.js';

// Состояния обучения для каждого пользователя
const learningStates = new Map();

// Кэш для вопросов
const questionCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

// Типы вопросов для обучения
const QUESTION_TYPES = {
  WINE_PAIRING: 'wine_pairing',
  SERVING_TEMP: 'serving_temp',
  GLASSWARE: 'glassware',
  DESCRIPTION: 'description',
  COUNTRY: 'country',
  ALCOHOL_CONTENT: 'alcohol_content',
  INGREDIENTS: 'ingredients',
  METHOD: 'method'
};

// Структура состояния обучения
class LearningState {
  constructor() {
    this.currentLesson = null;
    this.currentQuestion = null;
    this.score = 0;
    this.totalQuestions = 0;
    this.correctAnswers = 0;
    this.incorrectAnswers = [];
    this.learningProgress = new Map(); // прогресс по категориям
    this.difficulty = 'beginner'; // beginner, intermediate, advanced
    this.streak = 0; // серия правильных ответов
    this.sessionId = null; // ID сессии в базе данных
    this.startTime = Date.now(); // время начала сессии
  }
}

// Генерация вопроса с помощью ИИ
async function generateAIQuestion(wines, questionType, difficulty, env, userContext = {}) {
  const randomWine = wines[Math.floor(Math.random() * wines.length)];

  let prompt = `Ты эксперт-сомелье, который создаёт обучающие вопросы для официантов ресторана.

Создай ОДИН вопрос с 4 вариантами ответа (только один правильный) для обучения официанта.

Информация о напитке:
Название: ${randomWine.name}
Категория: ${randomWine.category}
${randomWine.description ? `Описание: ${randomWine.description}` : ''}
${randomWine.country ? `Страна: ${randomWine.country}` : ''}
${randomWine.alcohol ? `Крепость: ${randomWine.alcohol}` : ''}
${randomWine.sugar ? `Сахар: ${randomWine.sugar}` : ''}
${randomWine.method ? `Метод: ${randomWine.method}` : ''}
${randomWine.glassware ? `Посуда: ${randomWine.glassware}` : ''}
${randomWine.ingredients ? `Состав: ${randomWine.ingredients}` : ''}

Тип вопроса: ${questionType}
Сложность: ${difficulty}

Формат ответа (СТРОГО!):
ВОПРОС: [вопрос]
A) [вариант A]
B) [вариант B]
C) [вариант C]
D) [вариант D]
ПРАВИЛЬНЫЙ: [буква правильного ответа]
ОБЪЯСНЕНИЕ: [краткое объяснение почему это правильный ответ]

Пример:
ВОПРОС: Какой основной сорт винограда используется в вине X?
A) Каберне Совиньон
B) Мерло
C) Шардоне
D) Пино Нуар
ПРАВИЛЬНЫЙ: C
ОБЪЯСНЕНИЕ: В вине X используется сорт Шардоне.

Не добавляй никаких пояснений, только строго по формату!`;

  // Добавим персонализацию, если есть userContext
  if (userContext && userContext.difficulty) {
    prompt += `\n\nУровень знаний пользователя: ${userContext.difficulty}`;
  }
  if (userContext && userContext.preferences) {
    prompt += `\n\nПредпочтения пользователя: ${userContext.preferences.join(', ')}`;
  }

  try {
    const aiResponse = await askCloudflareAI(prompt, env);
    // Фильтрация лишнего текста (например, "Конечно, вот ваш вопрос:")
    const cleanResponse = aiResponse.replace(/^(Конечно, вот ваш вопрос:|Вот ваш вопрос:|Вопрос:|Q:)/i, '').trim();
    const lines = cleanResponse.split('\n');
    let question = '';
    let options = {};
    let correctAnswer = '';
    let explanation = '';
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('ВОПРОС:')) {
        question = line.replace('ВОПРОС:', '').trim();
      } else if (line.startsWith('A)')) {
        options.A = line.replace('A)', '').trim();
      } else if (line.startsWith('B)')) {
        options.B = line.replace('B)', '').trim();
      } else if (line.startsWith('C)')) {
        options.C = line.replace('C)', '').trim();
      } else if (line.startsWith('D)')) {
        options.D = line.replace('D)', '').trim();
      } else if (line.startsWith('ПРАВИЛЬНЫЙ:')) {
        correctAnswer = line.replace('ПРАВИЛЬНЫЙ:', '').trim();
      } else if (line.startsWith('ОБЪЯСНЕНИЕ:')) {
        explanation = line.replace('ОБЪЯСНЕНИЕ:', '').trim();
      }
    }
    if (question && Object.keys(options).length === 4 && correctAnswer && explanation) {
      return {
        question,
        options,
        correctAnswer,
        explanation,
        wineId: randomWine.id,
        wineName: randomWine.name
      };
    }
  } catch (error) {
    console.error('Error generating AI question:', error);
  }
  // Fallback - создаём простой вопрос
  return generateFallbackQuestion(randomWine, questionType);
}

// Функции для работы с кэшем
function getCachedQuestions(category, questionType) {
  const cacheKey = `${category}_${questionType}`;
  const cached = questionCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.questions;
  }
  
  return null;
}

function setCachedQuestions(category, questionType, questions) {
  const cacheKey = `${category}_${questionType}`;
  questionCache.set(cacheKey, {
    questions,
    timestamp: Date.now()
  });
}

// Fallback вопросы если ИИ недоступен
function generateFallbackQuestion(wine, questionType) {
  const questions = {
    [QUESTION_TYPES.WINE_PAIRING]: {
      question: `С какими блюдами лучше всего подавать ${wine.name}?`,
      options: {
        A: 'С морепродуктами и рыбой',
        B: 'С красным мясом и пастой',
        C: 'С десертами и сладостями',
        D: 'С острыми блюдами'
      },
      correctAnswer: wine.category === 'Вина' && wine.sugar === 'Сухое' ? 'B' : 'A',
      explanation: 'Выбор зависит от типа вина и его характеристик'
    },
    [QUESTION_TYPES.SERVING_TEMP]: {
      question: `При какой температуре следует подавать ${wine.name}?`,
      options: {
        A: '4-6°C',
        B: '8-12°C', 
        C: '16-18°C',
        D: '20-22°C'
      },
      correctAnswer: wine.category === 'Вина' ? 'B' : 'A',
      explanation: 'Температура подачи зависит от типа напитка'
    },
    [QUESTION_TYPES.GLASSWARE]: {
      question: `В каком бокале следует подавать ${wine.name}?`,
      options: {
        A: 'В флейте',
        B: 'В бокале для вина',
        C: 'В стакане для виски',
        D: 'В пивном бокале'
      },
      correctAnswer: wine.category === 'Вина' ? 'B' : 'A',
      explanation: 'Выбор бокала зависит от типа напитка'
    }
  };
  
  return {
    ...questions[questionType] || questions[QUESTION_TYPES.WINE_PAIRING],
    wineId: wine.id,
    wineName: wine.name
  };
}

// Начало обучения
export async function startLearning(chatId, env) {
  const state = new LearningState();
  learningStates.set(chatId, state);
  
  // Инициализируем пользователя в базе данных
  const database = new DatabaseManager(env);
  await database.initUser(chatId);
  
  const welcomeText = `🎓 *Добро пожаловать в систему обучения!*

Здесь вы сможете:
• 📚 Изучить ассортимент напитков
• 🧠 Пройти тесты с ИИ
• 📈 Отслеживать прогресс
• 🏆 Заработать достижения
• 📅 Выполнять ежедневные задания

Выберите режим обучения:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🎯 Быстрый тест', callback_data: 'learning_quick_test' },
        { text: '📚 Урок по категории', callback_data: 'learning_category_lesson' }
      ],
      [
        { text: '🧠 ИИ-обучение', callback_data: 'learning_ai_mode' },
        { text: '📊 Мой прогресс', callback_data: 'learning_progress' }
      ],
      [
        { text: '🏆 Достижения', callback_data: 'learning_achievements' },
        { text: '📅 Задания', callback_data: 'daily_challenges' }
      ],
      [
        { text: '👤 Профиль', callback_data: 'user_profile' },
        { text: '⚙️ Настройки', callback_data: 'learning_settings' }
      ],
      [
        { text: '🔙 Главное меню', callback_data: 'main_menu' }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(chatId, welcomeText, keyboard, env);
}

// Быстрый тест
export async function startQuickTest(chatId, env) {
  const state = learningStates.get(chatId) || new LearningState();
  
  // Создаем сессию в базе данных
  const database = new DatabaseManager(env);
  const sessionId = await database.createLearningSession(chatId, 'quick_test');
  
  state.currentLesson = 'quick_test';
  state.sessionId = sessionId;
  state.totalQuestions = 5;
  state.score = 0;
  state.correctAnswers = 0;
  state.incorrectAnswers = [];
  state.streak = 0;
  state.startTime = Date.now();
  learningStates.set(chatId, state);
  
  // Начинаем новую сессию обучения
  startLearningSession(chatId);
  
  await sendNextQuestion(chatId, env);
}

// Урок по категории
export async function startCategoryLesson(chatId, env) {
  const wines = await getWineData(env);
  const categories = [...new Set(wines.map(w => w.category))];
  
  // Создаем безопасные ID для категорий
  const categoryMap = {};
  categories.forEach((category, index) => {
    categoryMap[`cat_${index}`] = category;
  });
  
  const keyboard = {
    inline_keyboard: categories.map((category, index) => ([
      { text: category, callback_data: `learning_category_cat_${index}` }
    ])).concat([
      [{ text: '🔙 Назад', callback_data: 'learning_start' }]
    ])
  };
  
  // Сохраняем маппинг категорий в состоянии
  const state = learningStates.get(chatId) || new LearningState();
  state.categoryMap = categoryMap;
  learningStates.set(chatId, state);
  
  await sendMessageWithKeyboard(chatId, 'Выберите категорию для изучения:', keyboard, env);
}

// ИИ-режим обучения
export async function startAIMode(chatId, env) {
  const state = learningStates.get(chatId) || new LearningState();
  
  // Создаем сессию в базе данных
  const database = new DatabaseManager(env);
  const sessionId = await database.createLearningSession(chatId, 'ai_mode');
  
  state.currentLesson = 'ai_mode';
  state.sessionId = sessionId;
  state.totalQuestions = 10;
  state.score = 0;
  state.correctAnswers = 0;
  state.incorrectAnswers = [];
  state.streak = 0;
  state.startTime = Date.now();
  learningStates.set(chatId, state);
  
  // Начинаем новую сессию обучения
  startLearningSession(chatId);
  
  await sendMessage(chatId, '🤖 Запускаю ИИ-режим обучения...\n\nИИ будет создавать персонализированные вопросы на основе ваших ответов и прогресса.', env);
  await sendNextAIQuestion(chatId, env);
}

// Отправка следующего вопроса
async function sendNextQuestion(chatId, env) {
  const state = learningStates.get(chatId);
  if (!state || state.correctAnswers >= state.totalQuestions) {
    await finishLesson(chatId, env);
    return;
  }
  
  try {
    console.log('=== sendNextQuestion START ===');
    console.log('chatId:', chatId);
    console.log('state:', {
      correctAnswers: state.correctAnswers,
      totalQuestions: state.totalQuestions,
      difficulty: state.difficulty
    });
    
    const wines = await getWineData(env);
    console.log('Wines loaded:', wines.length);
    
    // Выбираем тип вопроса на основе сложности и прогресса
    const questionTypes = Object.values(QUESTION_TYPES);
    let selectedType;
    
    // Прогрессивная сложность на основе статистики пользователя
    const accuracy = state.correctAnswers > 0 ? state.correctAnswers / (state.correctAnswers + state.incorrectAnswers.length) : 0.5;
    
    if (accuracy > 0.8 && state.difficulty === 'beginner') {
      // Повышаем сложность
      state.difficulty = 'intermediate';
      console.log('Upgrading difficulty to intermediate');
    } else if (accuracy > 0.9 && state.difficulty === 'intermediate') {
      // Повышаем сложность
      state.difficulty = 'advanced';
      console.log('Upgrading difficulty to advanced');
    }
    
    // Выбираем тип вопроса на основе сложности
    if (state.difficulty === 'beginner') {
      selectedType = ['wine_pairing', 'country', 'description'][Math.floor(Math.random() * 3)];
    } else if (state.difficulty === 'intermediate') {
      selectedType = ['serving_temp', 'glassware', 'alcohol_content'][Math.floor(Math.random() * 3)];
    } else {
      selectedType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    }
    
    console.log('Selected question type:', selectedType);
    
    // Пытаемся получить вопрос из кэша
    const cachedQuestions = getCachedQuestions('general', selectedType);
    let question;
    
    if (cachedQuestions && cachedQuestions.length > 0) {
      question = cachedQuestions[Math.floor(Math.random() * cachedQuestions.length)];
      console.log('Using cached question');
    } else {
      // Генерируем новый вопрос
      const randomWine = wines[Math.floor(Math.random() * wines.length)];
      question = generateFallbackQuestion(randomWine, selectedType);
      
      // Кэшируем вопрос
      const questions = [question];
      setCachedQuestions('general', selectedType, questions);
      console.log('Generated and cached new question');
    }
    
    state.currentQuestion = question;
    
    const questionText = `❓ *Вопрос ${state.correctAnswers + 1}/${state.totalQuestions}*
🎯 Сложность: ${state.difficulty === 'beginner' ? '🟢 Новичок' : state.difficulty === 'intermediate' ? '🟡 Средний' : '🔴 Продвинутый'}

${question.question}

*Варианты ответов:*
А. ${question.options.A}
Б. ${question.options.B}
В. ${question.options.C}
Г. ${question.options.D}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: 'А', callback_data: `learning_answer_A` },
          { text: 'Б', callback_data: `learning_answer_B` },
          { text: 'В', callback_data: `learning_answer_C` },
          { text: 'Г', callback_data: `learning_answer_D` }
        ],
        [
          { text: '💡 Подсказка', callback_data: 'learning_hint' },
          { text: '🔙 Завершить тест', callback_data: 'learning_finish' }
        ]
      ]
    };
    
    console.log('Sending question with keyboard...');
    await sendMessageWithKeyboard(chatId, questionText, keyboard, env);
    console.log('=== sendNextQuestion END ===');
  } catch (error) {
    console.error('Error in sendNextQuestion:', error);
    console.error('Error stack:', error.stack);
    await sendMessage(chatId, '❌ Ошибка загрузки вопроса. Попробуйте позже.', env);
  }
}

// Отправка ИИ-вопроса
async function sendNextAIQuestion(chatId, env) {
  const state = learningStates.get(chatId);
  if (!state || state.correctAnswers >= state.totalQuestions) {
    await finishLesson(chatId, env);
    return;
  }
  
  const wines = await getWineData(env);
  const questionTypes = Object.values(QUESTION_TYPES);
  const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
  
  await sendMessage(chatId, '🤖 ИИ создает вопрос...', env);
  
  const question = await generateAIQuestion(wines, randomType, state.difficulty, env);
  state.currentQuestion = question;
  
  const questionText = `🤖 *ИИ-вопрос ${state.correctAnswers + 1}/${state.totalQuestions}*

${question.question}

*Варианты ответов:*
А. ${question.options.A}
Б. ${question.options.B}
В. ${question.options.C}
Г. ${question.options.D}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: 'А', callback_data: `learning_answer_A` },
        { text: 'Б', callback_data: `learning_answer_B` },
        { text: 'В', callback_data: `learning_answer_C` },
        { text: 'Г', callback_data: `learning_answer_D` }
      ],
      [
        { text: '🔙 Завершить тест', callback_data: 'learning_finish' }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(chatId, questionText, keyboard, env);
}

// Обработка ответа
export async function handleLearningAnswer(chatId, answer, env) {
  const state = learningStates.get(chatId);
  if (!state || !state.currentQuestion) {
    await sendMessage(chatId, 'Ошибка: вопрос не найден. Начните обучение заново.', env);
    return;
  }

  // Инициализируем системы
  const database = new DatabaseManager(env);
  const achievements = new AchievementSystem(database, env);
  const dailyChallenges = new DailyChallengeSystem(database, env);

  // Инициализируем пользователя в базе данных
  await database.initUser(chatId);
  
  const isCorrect = answer === state.currentQuestion.correctAnswer;
  const responseTime = Date.now() - state.startTime;
  state.totalQuestions++;
  
  // Сохраняем ответ в базу данных
  if (state.sessionId) {
    const wineCategory = state.currentQuestion.wineName ? 
      (await getWineData(env)).find(w => w.id === state.currentQuestion.wineId)?.category : 'Общее';
    
    await database.saveAnswer(chatId, state.sessionId, {
      questionText: state.currentQuestion.question,
      userAnswer: answer,
      correctAnswer: state.currentQuestion.correctAnswer,
      isCorrect,
      category: wineCategory,
      questionType: state.currentQuestion.questionType || 'general',
      wineId: state.currentQuestion.wineId,
      responseTimeMs: responseTime
    });
  }
  
  if (isCorrect) {
    state.correctAnswers++;
    state.streak++;
    
    // Рассчитываем награды
    const context = {
      isWeekend: [0, 6].includes(new Date().getDay()),
      isFirstSession: true, // TODO: проверить первую сессию дня
      consecutiveDays: 1 // TODO: получить из базы данных
    };
    
    const rewards = achievements.calculateAnswerRewards(true, state.streak, context);
    state.score += rewards.points;
    
    let message = `✅ *Правильно!* +${rewards.points} баллов\n\n`;
    message += `🎯 Серия правильных ответов: ${state.streak}\n`;
    message += `📊 Общий счет: ${state.score} баллов\n`;
    message += `💎 +${rewards.experience} XP\n\n`;
    message += `💡 *Объяснение:*\n${state.currentQuestion.explanation}`;
    
    // Бонусы за серию
    if (state.streak >= 3) {
      const streakBonus = Math.min(state.streak * 2, 20);
      message += `\n\n🔥 *Бонус за серию:* +${streakBonus} баллов!`;
    }
    
    // Добавляем кнопки для продолжения
    const keyboard = {
      inline_keyboard: [
        [
          { text: '⏭️ Следующий вопрос', callback_data: 'learning_next_question' },
          { text: '🏁 Завершить тест', callback_data: 'learning_finish' }
        ]
      ]
    };
    
    await sendMessageWithKeyboard(chatId, message, keyboard, env);
  } else {
    state.streak = 0;
    state.incorrectAnswers.push({
      question: state.currentQuestion.question,
      userAnswer: answer,
      correctAnswer: state.currentQuestion.correctAnswer,
      wineName: state.currentQuestion.wineName
    });
    
    const rewards = achievements.calculateAnswerRewards(false, 0);
    state.score += rewards.points;
    
    let message = `❌ *Неправильно!*\n\n`;
    message += `Правильный ответ: ${state.currentQuestion.correctAnswer})\n`;
    message += `📊 Общий счет: ${state.score} баллов\n`;
    message += `💎 +${rewards.experience} XP\n\n`;
    message += `💡 *Объяснение:*\n${state.currentQuestion.explanation}`;
    
    // Добавляем кнопки для продолжения
    const keyboard = {
      inline_keyboard: [
        [
          { text: '⏭️ Следующий вопрос', callback_data: 'learning_next_question' },
          { text: '🏁 Завершить тест', callback_data: 'learning_finish' }
        ]
      ]
    };
    
    await sendMessageWithKeyboard(chatId, message, keyboard, env);
  }
  
  // Обновляем прогресс по категории
  const wineCategory = state.currentQuestion.wineName ? 
    (await getWineData(env)).find(w => w.id === state.currentQuestion.wineId)?.category : 'Общее';
  
  if (!state.learningProgress.has(wineCategory)) {
    state.learningProgress.set(wineCategory, { correct: 0, total: 0 });
  }
  const progress = state.learningProgress.get(wineCategory);
  progress.total++;
  if (isCorrect) progress.correct++;
  
  // Обновляем аналитику
  const questionType = state.currentQuestion.questionType || 'general';
  updateAnalytics(chatId, wineCategory, questionType, isCorrect);
  
  // Проверяем ежедневные задания
  await dailyChallenges.checkAndUpdateProgress(chatId, 'answer_question', 1);
  
  // Обновляем время для следующего вопроса
  state.startTime = Date.now();
}

// Завершение урока
async function finishLesson(chatId, env) {
  const state = learningStates.get(chatId);
  if (!state) return;

  // Инициализируем системы
  const database = new DatabaseManager(env);
  const achievements = new AchievementSystem(database, env);
  const dailyChallenges = new DailyChallengeSystem(database, env);
  
  const analyticsFinish = getUserAnalytics(chatId);
  const weakCategoriesFinish = analyticsFinish.weakCategories || [];
  const accuracyFinish = analyticsFinish.getOverallAccuracy();
  const totalQuestionsFinish = analyticsFinish.totalQuestions;

  const weakCategoryButtonsFinish = weakCategoriesFinish.slice(0, 3).map(cat => ([{ text: `Тест по ${cat}`, callback_data: `learning_category_${cat}` }]));
  const aiModeButtonFinish = (accuracyFinish > 0.8 && totalQuestionsFinish > 20) ? [[{ text: '🤖 ИИ-режим', callback_data: 'learning_ai_mode' }]] : [];
  const mainButtonsFinish = [
    [{ text: '🎯 Быстрый тест', callback_data: 'learning_quick_test' }],
    [{ text: '📊 Детальная аналитика', callback_data: 'learning_detailed_analytics' }],
    [{ text: '🏁 Завершить', callback_data: 'learning_finish' }]
  ];
  const keyboardFinish = {
    inline_keyboard: [
      ...weakCategoryButtonsFinish,
      ...aiModeButtonFinish,
      ...mainButtonsFinish
    ]
  };
  
  const grade = getGrade(accuracyFinish);
  
  // Завершаем сессию в базе данных
  if (state.sessionId) {
    const sessionStats = {
      totalQuestions: state.totalQuestions,
      correctAnswers: state.correctAnswers,
      score: state.score,
      experienceGained: Math.round(state.score * 0.5) // Примерный расчет опыта
    };
    
    await database.finishLearningSession(state.sessionId, sessionStats);
  }
  
  // Обновляем статистику пользователя
  const userStats = {
    totalScore: state.score,
    totalQuestions: state.totalQuestions,
    totalCorrect: state.correctAnswers,
    learningStreak: state.streak,
    maxStreak: state.streak, // TODO: получить из базы данных
    experiencePoints: Math.round(state.score * 0.5)
  };
  
  await database.updateUserStats(chatId, userStats);
  
  // Проверяем достижения
  const stats = {
    totalQuestions: state.totalQuestions,
    totalScore: state.score,
    maxStreak: state.streak,
    aiQuestions: state.currentLesson === 'ai_mode' ? state.totalQuestions : 0,
    categoriesStudied: state.learningProgress.size
  };
  
  const newAchievements = await achievements.checkAchievements(chatId, stats);
  
  // Проверяем повышение уровня
  const user = await database.getUser(chatId);
  if (user) {
    const oldExperience = user.experience_points - userStats.experiencePoints;
    const newExperience = user.experience_points;
    await achievements.checkLevelUp(chatId, oldExperience, newExperience);
  }
  
  // Проверяем ежедневные задания
  if (accuracyFinish >= 80 && state.totalQuestions >= 5) {
    await dailyChallenges.checkAndUpdateProgress(chatId, 'test_completed', accuracyFinish);
  }
  
  let message = `🎓 *Урок завершен!*\n\n`;
  message += `📊 *Результаты:*\n`;
  message += `✅ Правильных ответов: ${state.correctAnswers}/${state.totalQuestions}\n`;
  message += `📈 Точность: ${accuracyFinish}%\n`;
  message += `🏆 Оценка: ${grade}\n`;
  message += `💎 Общий счет: ${state.score} баллов\n`;
  message += `💎 Опыт: +${userStats.experiencePoints} XP\n\n`;
  
  // Бонус за идеальный тест
  if (accuracyFinish === 100 && state.totalQuestions >= 5) {
    const perfectRewards = achievements.calculatePerfectTestRewards(state.totalQuestions);
    message += `✨ *Идеальный тест!* +${perfectRewards.points} бонусных баллов\n\n`;
  }
  
  if (state.incorrectAnswers.length > 0) {
    message += `📝 *Рекомендации для изучения:*\n`;
    state.incorrectAnswers.slice(0, 3).forEach((item, index) => {
      message += `${index + 1}. ${item.wineName} - повторите характеристики\n`;
    });
    message += '\n';
  }
  
  // Показываем новые достижения
  if (newAchievements.length > 0) {
    message += `🏆 *Новые достижения:*\n`;
    newAchievements.forEach(achievement => {
      message += `• ${achievement.icon} ${achievement.name}\n`;
    });
    message += '\n';
  }
  
  // Получаем аналитику пользователя
  const analytics = getUserAnalytics(chatId);
  const weakCategories = analytics.weakCategories || [];
  const accuracy = analytics.getOverallAccuracy();
  const totalQuestions = analytics.totalQuestions;

  // Формируем кнопки для слабых тем
  const weakCategoryButtons = weakCategories.slice(0, 3).map(cat => ([{ text: `Тест по ${cat}`, callback_data: `learning_category_${cat}` }]));

  // Кнопка AI-режима для продвинутых
  const aiModeButton = (accuracy > 0.8 && totalQuestions > 20) ? [[{ text: '🤖 ИИ-режим', callback_data: 'learning_ai_mode' }]] : [];

  // Отправляем AI-совет по слабой теме, если есть
  if (weakCategories.length > 0) {
    try {
      const weakTopic = weakCategories[0];
      const userStats = { accuracy, totalQuestions };
      const aiAdvice = await generateAdviceForWeakTopics(chatId, weakTopic, env, userStats);
      await sendMessage(chatId, `💡 Персональный совет по теме "${weakTopic}":\n${aiAdvice}`, env);
    } catch (e) {
      console.error('AI advice error:', e);
    }
  }

  // Основные кнопки
  const mainButtons = [
    [{ text: '🎯 Быстрый тест', callback_data: 'learning_quick_test' }],
    [{ text: '📊 Детальная аналитика', callback_data: 'learning_detailed_analytics' }],
    [{ text: '🏁 Завершить', callback_data: 'learning_finish' }]
  ];

  const keyboard = {
    inline_keyboard: [
      ...weakCategoryButtons,
      ...aiModeButton,
      ...mainButtons
    ]
  };
  
  await sendMessageWithKeyboard(chatId, message, keyboard, env);
  
  // Логируем завершение сессии
  await database.logActivity(
    chatId,
    'session_completed',
    `Завершена сессия: ${state.currentLesson || 'обучение'}`,
    state.score,
    userStats.experiencePoints
  );
  
  // Сбрасываем состояние
  state.currentLesson = null;
  state.currentQuestion = null;
  state.sessionId = null;

  // После отправки итогового сообщения и рекомендаций отправляем опрос для сбора обратной связи
  const feedbackKeyboard = {
    inline_keyboard: [
      [
        { text: '👍 Всё понравилось', callback_data: 'feedback_like' },
        { text: '🤔 Были сложные вопросы', callback_data: 'feedback_hard' }
      ],
      [
        { text: '😴 Слишком легко', callback_data: 'feedback_easy' },
        { text: '✍️ Оставить комментарий', callback_data: 'feedback_comment' }
      ]
    ]
  };
  await sendMessageWithKeyboard(chatId, '🗣️ *Обратная связь*\nЧто было сложно/понравилось? Выберите вариант или напишите свой комментарий.', feedbackKeyboard, env);

  // Обновляем прогресс по еженедельным/ежемесячным челленджам
  try {
    const challengeSystem = new ChallengeSystem(database, env);
    // Получаем челленджи пользователя (weekly + monthly)
    const weeklyChallenges = await challengeSystem.getUserChallenges(chatId, CHALLENGE_PERIODS.WEEKLY);
    const monthlyChallenges = await challengeSystem.getUserChallenges(chatId, CHALLENGE_PERIODS.MONTHLY);
    const allChallenges = [...weeklyChallenges, ...monthlyChallenges];
    for (const challenge of allChallenges) {
      if (challenge.completed) continue;
      // Пример: обновляем прогресс по типу челленджа
      if (challenge.type === 'lessons') {
        // Увеличиваем прогресс на 1 за каждый завершенный урок
        await challengeSystem.updateChallengeProgress(chatId, challenge.id, (challenge.progress || 0) + 1);
        // Если достигнут таргет — завершаем челлендж
        if ((challenge.progress || 0) + 1 >= challenge.target) {
          await challengeSystem.completeChallenge(chatId, challenge.id);
        }
      }
      if (challenge.type === 'streak') {
        // Проверяем streak пользователя
        const user = await database.getUser(chatId);
        if (user && user.learning_streak >= challenge.target) {
          await challengeSystem.updateChallengeProgress(chatId, challenge.id, user.learning_streak);
          await challengeSystem.completeChallenge(chatId, challenge.id);
        }
      }
      if (challenge.type === 'accuracy') {
        // Проверяем точность за период (пример: за месяц)
        const accuracy = state.totalQuestions > 0 ? state.correctAnswers / state.totalQuestions : 0;
        await challengeSystem.updateChallengeProgress(chatId, challenge.id, accuracy);
        if (accuracy >= challenge.target) {
          await challengeSystem.completeChallenge(chatId, challenge.id);
        }
      }
    }
  } catch (e) {
    console.error('ChallengeSystem integration error:', e);
  }
}

// Получение оценки
function getGrade(accuracy) {
  if (accuracy >= 90) return 'A+ 🏆';
  if (accuracy >= 80) return 'A 🥇';
  if (accuracy >= 70) return 'B 🥈';
  if (accuracy >= 60) return 'C 🥉';
  if (accuracy >= 50) return 'D 📚';
  return 'F ❌';
}

// Проверка достижений
function checkAchievements(state) {
  const achievements = [];
  
  if (state.correctAnswers >= 10 && !state.achievements?.includes('Первые шаги')) {
    achievements.push('🎯 Первые шаги - 10 правильных ответов');
  }
  
  if (state.streak >= 5 && !state.achievements?.includes('Серия побед')) {
    achievements.push('🔥 Серия побед - 5 правильных ответов подряд');
  }
  
  if (state.score >= 100 && !state.achievements?.includes('Стобалльник')) {
    achievements.push('💎 Стобалльник - 100 баллов');
  }
  
  if (!state.achievements) state.achievements = [];
  state.achievements.push(...achievements.map(a => a.split(' - ')[1]));
  
  return achievements;
}

// Показать прогресс
export async function showProgress(chatId, env) {
  const state = learningStates.get(chatId);
  if (!state) {
    await sendMessage(chatId, 'У вас пока нет прогресса. Начните обучение!', env);
    return;
  }
  
  // Генерируем персонализированный отчет
  const report = await generatePersonalizedReport(chatId, env);
  
  // Получаем аналитику пользователя
  const analyticsProgress = getUserAnalytics(chatId);
  const weakCategoriesProgress = analyticsProgress.weakCategories || [];
  const accuracyProgress = analyticsProgress.getOverallAccuracy();
  const totalQuestionsProgress = analyticsProgress.totalQuestions;

  // Формируем кнопки для слабых тем
  const weakCategoryButtonsProgress = weakCategoriesProgress.slice(0, 3).map(cat => ([{ text: `Тест по ${cat}`, callback_data: `learning_category_${cat}` }]));

  // Кнопка AI-режима для продвинутых
  const aiModeButtonProgress = (accuracyProgress > 0.8 && totalQuestionsProgress > 20) ? [[{ text: '🤖 ИИ-режим', callback_data: 'learning_ai_mode' }]] : [];

  // Основные кнопки
  const mainButtonsProgress = [
    [{ text: '🎯 Быстрый тест', callback_data: 'learning_quick_test' }],
    [{ text: '📊 Детальная аналитика', callback_data: 'learning_detailed_analytics' }],
    [{ text: '🏁 Завершить', callback_data: 'learning_finish' }]
  ];

  const keyboardProgress = {
    inline_keyboard: [
      ...weakCategoryButtonsProgress,
      ...aiModeButtonProgress,
      ...mainButtonsProgress
    ]
  };
  
  await sendMessageWithKeyboard(chatId, report, keyboardProgress, env);
}

// Обработка callback query для обучения
export async function handleLearningCallback(data, chatId, messageId, env) {
  try {
    if (data === 'learning_start') {
      await startLearning(chatId, env);
    } else if (data === 'learning_quick_test') {
      await startQuickTest(chatId, env);
    } else if (data === 'learning_category_lesson') {
      await startCategoryLesson(chatId, env);
    } else if (data === 'learning_ai_mode') {
      await startAIMode(chatId, env);
    } else if (data === 'learning_progress') {
      await showProgress(chatId, env);
    } else if (data === 'learning_achievements') {
      await showAchievements(chatId, env);
    } else if (data === 'learning_settings') {
      await showLearningSettings(chatId, env);
    } else if (data === 'learning_finish') {
      await finishLesson(chatId, env);
    } else if (data.startsWith('learning_answer_')) {
      const answer = data.replace('learning_answer_', '');
      await handleLearningAnswer(chatId, answer, env);
    } else if (data.startsWith('learning_category_')) {
      const categoryId = data.replace('learning_category_', '');
      const state = learningStates.get(chatId);
      const category = state?.categoryMap?.[categoryId] || categoryId;
      await startCategorySpecificLesson(chatId, category, env);
    } else if (data === 'learning_detailed_analytics') {
      await showDetailedAnalytics(chatId, env);
    } else if (data === 'learning_personalized_test') {
      await startPersonalizedTest(chatId, env);
    } else if (data === 'learning_export_data') {
      await exportLearningData(chatId, env);
    } else if (data === 'learning_charts') {
      await showLearningCharts(chatId, env);
    } else if (data === 'learning_next_question') {
      await sendNextQuestionBasedOnLesson(chatId, env);
    } else if (data === 'learning_hint') {
      await showHint(chatId, env);
    } else if (data === 'learning_back_to_question') {
      await showCurrentQuestion(chatId, env);
    } else if (data === 'user_profile') {
      await showUserProfile(chatId, env);
    } else if (data === 'daily_challenges') {
      try {
        console.log('Handling daily_challenges callback - START');
        console.log('chatId:', chatId);
        console.log('env keys:', Object.keys(env));
        console.log('About to call showDailyChallenges...');
        
        // Проверяем, что env содержит необходимые ключи
        if (!env.DB) {
          console.error('DB not found in env');
          await sendMessage(chatId, '❌ Ошибка: база данных недоступна', env);
          return;
        }
        
        await showDailyChallenges(chatId, env);
        console.log('Handling daily_challenges callback - END');
      } catch (error) {
        console.error('Error in daily_challenges handler:', error);
        console.error('Error stack:', error.stack);
        await sendMessage(chatId, '❌ Ошибка загрузки ежедневных заданий', env);
      }
    } else if (data === 'daily_challenges_refresh') {
      await showDailyChallenges(chatId, env);
    } else if (data === 'daily_challenges_stats') {
      await showChallengeStats(chatId, env);
    } else if (data === 'achievements_history') {
      await showAchievementsHistory(chatId, env);
    } else if (data === 'detailed_stats') {
      await showDetailedStats(chatId, env);
    } else if (data === 'feedback_like') {
      await saveUserFeedback(chatId, 'like', null, null, env);
      console.log('[LEARNING] Sending thank you message for feedback_like');
      await sendMessage(chatId, 'Спасибо за ваш отзыв! 😊', env);
      console.log('[LEARNING] Calling startLearning after feedback_like');
      await startLearning(chatId, env);
      return;
    } else if (data === 'feedback_hard') {
      await saveUserFeedback(chatId, 'hard', null, null, env);
      console.log('[LEARNING] Sending thank you message for feedback_hard');
      await sendMessage(chatId, 'Спасибо! Мы учтём, что вопросы были сложными.', env);
      console.log('[LEARNING] Calling startLearning after feedback_hard');
      await startLearning(chatId, env);
      return;
    } else if (data === 'feedback_easy') {
      await saveUserFeedback(chatId, 'easy', null, null, env);
      console.log('[LEARNING] Sending thank you message for feedback_easy');
      await sendMessage(chatId, 'Спасибо! Мы постараемся сделать вопросы интереснее.', env);
      console.log('[LEARNING] Calling startLearning after feedback_easy');
      await startLearning(chatId, env);
      return;
    } else if (data === 'feedback_comment') {
      if (!env.__awaiting_feedback) env.__awaiting_feedback = {};
      env.__awaiting_feedback[chatId] = true;
      await sendMessage(chatId, 'Пожалуйста, напишите ваш комментарий в ответном сообщении.', env);
      return;
    }
  } catch (error) {
    console.error('Learning callback error:', error);
    await sendMessage(chatId, 'Произошла ошибка в системе обучения. Попробуйте позже.', env);
  }
}

// Сохранение отзыва пользователя в базу данных
async function saveUserFeedback(chatId, feedbackType, feedbackText = null, sessionData = null, env) {
  try {
    const database = new DatabaseManager(env);
    const db = database.db;
    
    // Получаем данные о последней сессии пользователя
    let sessionType = 'unknown';
    let questionCount = 0;
    let correctAnswers = 0;
    let sessionDuration = 0;
    
    if (sessionData) {
      sessionType = sessionData.sessionType || 'unknown';
      questionCount = sessionData.questionCount || 0;
      correctAnswers = sessionData.correctAnswers || 0;
      sessionDuration = sessionData.duration || 0;
    } else {
      // Получаем данные о последней сессии из базы
      const lastSession = await db.prepare(`
        SELECT session_type, total_questions, correct_answers, 
               CAST((julianday(end_time) - julianday(start_time)) * 24 * 60 AS INTEGER) as duration_minutes
        FROM learning_sessions
        WHERE chat_id = ? AND end_time IS NOT NULL
        ORDER BY end_time DESC
        LIMIT 1
      `).bind(chatId).first();
      
      if (lastSession) {
        sessionType = lastSession.session_type;
        questionCount = lastSession.total_questions;
        correctAnswers = lastSession.correct_answers;
        sessionDuration = lastSession.duration_minutes || 0;
      }
    }
    
    // Сохраняем отзыв в базу данных
    await db.prepare(`
      INSERT INTO user_feedback (
        chat_id, feedback_type, feedback_text, session_type, 
        question_count, correct_answers, session_duration_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      chatId, feedbackType, feedbackText, sessionType,
      questionCount, correctAnswers, sessionDuration
    ).run();
    
    console.log(`[LEARNING] Saved feedback: ${feedbackType} from user ${chatId}`);
    return true;
  } catch (error) {
    console.error('[LEARNING] Error saving feedback:', error);
    return false;
  }
}

// Показать достижения
async function showAchievements(chatId, env) {
  const database = new DatabaseManager(env);
  const achievements = new AchievementSystem(database, env);
  
  await achievements.showAchievements(chatId);
}

// Показать профиль пользователя
async function showUserProfile(chatId, env) {
  const database = new DatabaseManager(env);
  const achievements = new AchievementSystem(database, env);
  
  await achievements.showUserProfile(chatId);
}

// Показать ежедневные задания
async function showDailyChallenges(chatId, env) {
  console.log('=== showDailyChallenges FUNCTION ENTRY ===');
  console.log('Function called with chatId:', chatId);
  console.log('Function called with env keys:', Object.keys(env));
  
  try {
    console.log('Creating DatabaseManager...');
    const database = new DatabaseManager(env);
    console.log('Database manager created successfully');
    
    console.log('Creating DailyChallengeSystem...');
    const dailyChallenges = new DailyChallengeSystem(database, env);
    console.log('DailyChallengeSystem created successfully');
    
    console.log('Calling dailyChallenges.showDailyChallenges...');
    await dailyChallenges.showDailyChallenges(chatId);
    console.log('showDailyChallenges completed successfully');
  } catch (error) {
    console.error('Error in showDailyChallenges function:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    // Отправляем более информативное сообщение об ошибке
    const errorMessage = `❌ Ошибка загрузки ежедневных заданий

🔍 Детали ошибки:
• Тип: ${error.name}
• Сообщение: ${error.message}

Попробуйте позже или обратитесь к администратору.`;
    
    await sendMessage(chatId, errorMessage, env);
  }
}

// Показать статистику заданий
async function showChallengeStats(chatId, env) {
  const database = new DatabaseManager(env);
  const dailyChallenges = new DailyChallengeSystem(database, env);
  
  await dailyChallenges.showChallengeStats(chatId);
}

// Показать историю достижений
async function showAchievementsHistory(chatId, env) {
  const database = new DatabaseManager(env);
  
  try {
    const achievements = await database.getAchievements(chatId);
    
    if (achievements.length === 0) {
      await sendMessage(chatId, '🏆 У вас пока нет достижений. Продолжайте обучение, чтобы их получить!');
      return;
    }
    
    let message = `🏆 *История достижений*\n\n`;
    
    achievements.forEach((achievement, index) => {
      const date = new Date(achievement.unlocked_at).toLocaleDateString('ru-RU');
      message += `${achievement.icon} **${achievement.achievement_name}**\n`;
      message += `└ ${achievement.description}\n`;
      message += `└ 📅 ${date}\n`;
      message += `└ 💎 +${achievement.points} XP\n\n`;
    });
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔙 Назад', callback_data: 'learning_start' }
        ]
      ]
    };
    
    await sendMessageWithKeyboard(chatId, message, keyboard, env);
  } catch (error) {
    console.error('Error showing achievements history:', error);
    await sendMessage(chatId, '❌ Ошибка загрузки истории достижений');
  }
}

// Показать детальную статистику
async function showDetailedStats(chatId, env) {
  const database = new DatabaseManager(env);
  
  try {
    const stats = await database.getUserStats(chatId);
    
    if (!stats) {
      await sendMessage(chatId, '❌ Ошибка загрузки статистики');
      return;
    }
    
    const { user, categoryStats, questionTypeStats, recentSessions } = stats;
    const accuracy = user.total_questions > 0 ? 
      Math.round((user.total_correct / user.total_questions) * 100) : 0;
    
    let message = `📊 *Детальная статистика*\n\n`;
    
    // Общая статистика
    message += `🎯 *Общая статистика:*\n`;
    message += `• Всего вопросов: ${user.total_questions}\n`;
    message += `• Правильных ответов: ${user.total_correct}\n`;
    message += `• Точность: ${accuracy}%\n`;
    message += `• Общий счет: ${user.total_score} баллов\n`;
    message += `• Очки опыта: ${user.experience_points} XP\n\n`;
    
    // Статистика по категориям
    if (categoryStats.length > 0) {
      message += `📚 *По категориям:*\n`;
      categoryStats.slice(0, 5).forEach(stat => {
        const emoji = stat.accuracy > 80 ? '🟢' : stat.accuracy > 60 ? '🟡' : '🔴';
        message += `${emoji} ${stat.category}: ${stat.correct_answers}/${stat.total_questions} (${stat.accuracy}%)\n`;
      });
      message += '\n';
    }
    
    // Последние сессии
    if (recentSessions.length > 0) {
      message += `📈 *Последние сессии:*\n`;
      recentSessions.slice(0, 3).forEach(session => {
        const date = new Date(session.start_time).toLocaleDateString('ru-RU');
        const sessionAccuracy = session.total_questions > 0 ? 
          Math.round((session.correct_answers / session.total_questions) * 100) : 0;
        message += `• ${date}: ${session.correct_answers}/${session.total_questions} (${sessionAccuracy}%) - ${session.score} баллов\n`;
      });
    }
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 Экспорт данных', callback_data: 'learning_export_data' },
          { text: '🏆 Достижения', callback_data: 'achievements_history' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'learning_start' }
        ]
      ]
    };
    
    await sendMessageWithKeyboard(chatId, message, keyboard, env);
  } catch (error) {
    console.error('Error showing detailed stats:', error);
    await sendMessage(chatId, '❌ Ошибка загрузки детальной статистики');
  }
}

// Показать настройки обучения
async function showLearningSettings(chatId, env) {
  const state = learningStates.get(chatId);
  const currentDifficulty = state?.difficulty || 'beginner';
  
  const difficulties = {
    beginner: 'Новичок',
    intermediate: 'Средний',
    advanced: 'Продвинутый'
  };
  
  let message = `⚙️ *Настройки обучения*\n\n`;
  message += `📊 Текущая сложность: ${difficulties[currentDifficulty]}\n`;
  message += `🎯 Вопросов в тесте: ${state?.totalQuestions || 5}\n\n`;
  message += `Выберите сложность:`;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🟢 Новичок', callback_data: 'learning_difficulty_beginner' },
        { text: '🟡 Средний', callback_data: 'learning_difficulty_intermediate' }
      ],
      [
        { text: '🔴 Продвинутый', callback_data: 'learning_difficulty_advanced' }
      ],
      [
        { text: '🔙 Назад', callback_data: 'learning_start' }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(chatId, message, keyboard, env);
}

// Урок по конкретной категории
async function startCategorySpecificLesson(chatId, category, env) {
  const state = learningStates.get(chatId) || new LearningState();
  state.currentLesson = 'category_lesson';
  state.currentCategory = category;
  state.totalQuestions = 5;
  state.score = 0;
  state.correctAnswers = 0;
  state.incorrectAnswers = [];
  learningStates.set(chatId, state);
  
  await sendMessage(chatId, `📚 Начинаем урок по категории: ${category}\n\nБудет задано ${state.totalQuestions} вопросов.`, env);
  await sendNextCategoryQuestion(chatId, env);
}

// Показать графики обучения
async function showLearningCharts(chatId, env) {
  try {
    const { createCategoryProgressChart, createQuestionTypeProgressChart, createWeeklyProgressChart } = await import('./learningAnalytics.js');
    
    // Получаем аналитику пользователя (симуляция)
    const mockAnalytics = {
      categoryPerformance: new Map([
        ['Вина', { correct: 15, total: 20 }],
        ['Коктейли', { correct: 8, total: 12 }],
        ['Крепкие напитки', { correct: 12, total: 15 }]
      ]),
      questionTypePerformance: new Map([
        ['wine_pairing', { correct: 10, total: 15 }],
        ['serving_temp', { correct: 8, total: 10 }],
        ['glassware', { correct: 6, total: 8 }]
      ])
    };
    
    let chartsText = `📊 *Графики прогресса обучения*\n\n`;
    
    // График по категориям
    const categoryChart = createCategoryProgressChart(mockAnalytics);
    chartsText += categoryChart + '\n';
    
    // График по типам вопросов
    const typeChart = createQuestionTypeProgressChart(mockAnalytics);
    chartsText += typeChart + '\n';
    
    // График еженедельного прогресса
    const weeklyChart = createWeeklyProgressChart(mockAnalytics);
    chartsText += weeklyChart + '\n';
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📈 Детальная аналитика', callback_data: 'learning_detailed_analytics' },
          { text: '🏆 Достижения', callback_data: 'learning_achievements' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'learning_start' }
        ]
      ]
    };
    
    await sendMessageWithKeyboard(chatId, chartsText, keyboard, env);
  } catch (error) {
    console.error('Error showing learning charts:', error);
    await sendMessage(chatId, '❌ Ошибка загрузки графиков.', env);
  }
}

// Показать текущий вопрос
async function showCurrentQuestion(chatId, env) {
  const state = learningStates.get(chatId);
  if (!state || !state.currentQuestion) {
    await sendMessage(chatId, '❌ Нет активного вопроса.', env);
    return;
  }
  
  try {
    const question = state.currentQuestion;
    
    const questionText = `❓ *Вопрос ${state.correctAnswers + 1}/${state.totalQuestions}*
🎯 Сложность: ${state.difficulty === 'beginner' ? '🟢 Новичок' : state.difficulty === 'intermediate' ? '🟡 Средний' : '🔴 Продвинутый'}

${question.question}

*Варианты ответов:*
А. ${question.options.A}
Б. ${question.options.B}
В. ${question.options.C}
Г. ${question.options.D}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: 'А', callback_data: `learning_answer_A` },
          { text: 'Б', callback_data: `learning_answer_B` },
          { text: 'В', callback_data: `learning_answer_C` },
          { text: 'Г', callback_data: `learning_answer_D` }
        ],
        [
          { text: '💡 Подсказка', callback_data: 'learning_hint' },
          { text: '🔙 Завершить тест', callback_data: 'learning_finish' }
        ]
      ]
    };
    
    await sendMessageWithKeyboard(chatId, questionText, keyboard, env);
  } catch (error) {
    console.error('Error showing current question:', error);
    await sendMessage(chatId, '❌ Ошибка отображения вопроса.', env);
  }
}

// Показать подсказку для текущего вопроса
async function showHint(chatId, env) {
  const state = learningStates.get(chatId);
  if (!state || !state.currentQuestion) {
    await sendMessage(chatId, '❌ Нет активного вопроса для подсказки.', env);
    return;
  }
  
  try {
    const question = state.currentQuestion;
    let hint = '';
    
    // Генерируем подсказку на основе типа вопроса
    switch (question.questionType || 'general') {
      case 'wine_pairing':
        hint = '💡 *Подсказка:* Обратите внимание на тип вина (красное/белое/розовое) и его характеристики (сухое/полусухое/сладкое). Красные вина обычно сочетаются с мясом, белые - с рыбой и морепродуктами.';
        break;
      case 'serving_temp':
        hint = '💡 *Подсказка:* Температура подачи зависит от типа напитка. Вина обычно подаются при 8-18°C, крепкие напитки - при комнатной температуре, игристые вина - охлажденными.';
        break;
      case 'glassware':
        hint = '💡 *Подсказка:* Форма бокала влияет на вкус напитка. Бокалы для вина имеют широкую чашу, флейты - узкую и высокую для игристых вин.';
        break;
      case 'country':
        hint = '💡 *Подсказка:* Обратите внимание на регион происхождения напитка. Разные страны известны своими традициями виноделия.';
        break;
      default:
        hint = '💡 *Подсказка:* Внимательно прочитайте вопрос и все варианты ответов. Исключите явно неправильные варианты.';
    }
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔙 К вопросу', callback_data: 'learning_back_to_question' }
        ]
      ]
    };
    
    await sendMessageWithKeyboard(chatId, hint, keyboard, env);
  } catch (error) {
    console.error('Error showing hint:', error);
    await sendMessage(chatId, '❌ Ошибка загрузки подсказки.', env);
  }
}

// Отправка вопроса по категории
async function sendNextCategoryQuestion(chatId, env) {
  const state = learningStates.get(chatId);
  if (!state || state.correctAnswers >= state.totalQuestions) {
    await finishLesson(chatId, env);
    return;
  }
  
  const wines = await getWineData(env);
  const categoryWines = wines.filter(w => w.category === state.currentCategory);
  
  if (categoryWines.length === 0) {
    await sendMessage(chatId, 'В данной категории нет напитков для изучения.', env);
    await finishLesson(chatId, env);
    return;
  }
  
  const randomWine = categoryWines[Math.floor(Math.random() * categoryWines.length)];
  const questionTypes = Object.values(QUESTION_TYPES);
  const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
  
  const question = generateFallbackQuestion(randomWine, randomType);
  state.currentQuestion = question;
  
  const questionText = `📚 *Вопрос ${state.correctAnswers + 1}/${state.totalQuestions}* (${state.currentCategory})

${question.question}

*Варианты ответов:*
А. ${question.options.A}
Б. ${question.options.B}
В. ${question.options.C}
Г. ${question.options.D}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: 'А', callback_data: `learning_answer_A` },
        { text: 'Б', callback_data: `learning_answer_B` },
        { text: 'В', callback_data: `learning_answer_C` },
        { text: 'Г', callback_data: `learning_answer_D` }
      ],
      [
        { text: '🔙 Завершить тест', callback_data: 'learning_finish' }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(chatId, questionText, keyboard, env);
} 

// Персонализированный тест на основе аналитики
async function startPersonalizedTest(chatId, env) {
  const state = learningStates.get(chatId) || new LearningState();
  state.currentLesson = 'personalized_test';
  state.totalQuestions = 8;
  state.score = 0;
  state.correctAnswers = 0;
  state.incorrectAnswers = [];
  learningStates.set(chatId, state);
  
  // Начинаем новую сессию обучения
  startLearningSession(chatId);
  
  await sendMessage(chatId, '🎯 Запускаю персонализированный тест...\n\nВопросы будут подобраны специально для вас на основе вашего прогресса и слабых сторон.', env);
  await sendNextPersonalizedQuestion(chatId, env);
}

// Отправка персонализированного вопроса
async function sendNextPersonalizedQuestion(chatId, env) {
  const state = learningStates.get(chatId);
  if (!state || state.correctAnswers >= state.totalQuestions) {
    await finishLesson(chatId, env);
    return;
  }
  
  await sendMessage(chatId, '🤖 ИИ создает персонализированный вопрос...', env);
  
  const question = await generatePersonalizedAIQuestion(chatId, env);
  if (!question) {
    // Fallback на обычный вопрос
    await sendNextQuestion(chatId, env);
    return;
  }
  
  state.currentQuestion = question;
  
  const questionText = `🎯 *Персонализированный вопрос ${state.correctAnswers + 1}/${state.totalQuestions}*

${question.question}

*Категория:* ${question.category}
*Сложность:* ${question.difficulty}

*Варианты ответов:*
А. ${question.options.A}
Б. ${question.options.B}
В. ${question.options.C}
Г. ${question.options.D}`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: 'А', callback_data: `learning_answer_A` },
        { text: 'Б', callback_data: `learning_answer_B` },
        { text: 'В', callback_data: `learning_answer_C` },
        { text: 'Г', callback_data: `learning_answer_D` }
      ],
      [
        { text: '🔙 Завершить тест', callback_data: 'learning_finish' }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(chatId, questionText, keyboard, env);
}

// Экспорт данных обучения
async function exportLearningData(chatId, env) {
  const database = new DatabaseManager(env);
  
  try {
    const exportData = await database.exportUserData(chatId);
    
    if (!exportData) {
      await sendMessage(chatId, '❌ Ошибка экспорта данных');
      return;
    }
    
    const { user, achievements, activityHistory, stats } = exportData;
    const accuracy = user.total_questions > 0 ? 
      Math.round((user.total_correct / user.total_questions) * 100) : 0;
    
    const message = `📊 *Экспорт данных обучения*

✅ Данные успешно экспортированы
📅 Дата: ${new Date().toLocaleDateString('ru-RU')}

👤 *Профиль пользователя:*
• Имя: ${user.first_name || 'Не указано'}
• Всего вопросов: ${user.total_questions}
• Правильных ответов: ${user.total_correct}
• Точность: ${accuracy}%
• Общий счет: ${user.total_score} баллов
• Очки опыта: ${user.experience_points} XP
• Достижений: ${achievements.length}
• Активностей: ${activityHistory.length}

📈 *Статистика:*
• Категорий изучено: ${stats.categoryStats?.length || 0}
• Типов вопросов: ${stats.questionTypeStats?.length || 0}
• Сессий обучения: ${stats.recentSessions?.length || 0}

Данные сохранены в формате JSON и готовы для анализа.`;
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 Детальная статистика', callback_data: 'detailed_stats' },
          { text: '🏆 Достижения', callback_data: 'achievements_history' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'learning_start' }
        ]
      ]
    };
    
    await sendMessageWithKeyboard(chatId, message, keyboard, env);
  } catch (error) {
    console.error('Error exporting learning data:', error);
    await sendMessage(chatId, '❌ Ошибка экспорта данных');
  }
} 

// Отправка следующего вопроса в зависимости от типа урока
async function sendNextQuestionBasedOnLesson(chatId, env) {
  const state = learningStates.get(chatId);
  if (!state) {
    await sendMessage(chatId, 'Ошибка: состояние обучения не найдено. Начните обучение заново.', env);
    return;
  }
  
  // Проверяем, не завершен ли тест
  if (state.correctAnswers >= state.totalQuestions) {
    await finishLesson(chatId, env);
    return;
  }
  
  // Отправляем следующий вопрос в зависимости от типа урока
  if (state.currentLesson === 'ai_mode') {
    await sendNextAIQuestion(chatId, env);
  } else if (state.currentLesson === 'personalized_test') {
    await sendNextPersonalizedQuestion(chatId, env);
  } else if (state.currentLesson === 'category_lesson') {
    await sendNextCategoryQuestion(chatId, env);
  } else {
    await sendNextQuestion(chatId, env);
  }
} 