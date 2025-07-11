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
  exportUserData
} from './learningAnalytics.js';
import { DatabaseManager } from './database.js';
import { AchievementSystem } from './achievements.js';
import { DailyChallengeSystem } from './dailyChallenges.js';

// Состояния обучения для каждого пользователя
const learningStates = new Map();

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
async function generateAIQuestion(wines, questionType, difficulty, env) {
  const randomWine = wines[Math.floor(Math.random() * wines.length)];
  
  let prompt = `Ты эксперт-сомелье, который создает обучающие вопросы для официантов ресторана.

Создай один вопрос с 4 вариантами ответа (только один правильный) для обучения официанта.

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

Формат ответа (строго):
ВОПРОС: [вопрос]
A) [вариант A]
B) [вариант B]
C) [вариант C]
D) [вариант D]
ПРАВИЛЬНЫЙ: [буква правильного ответа]
ОБЪЯСНЕНИЕ: [краткое объяснение почему это правильный ответ]

Сделай вопрос интересным и практичным для официанта.`;

  try {
    const aiResponse = await askCloudflareAI(prompt, env);
    
    // Парсим ответ ИИ
    const lines = aiResponse.split('\n');
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
  
  // Fallback - создаем простой вопрос
  return generateFallbackQuestion(randomWine, questionType);
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
  
  const wines = await getWineData(env);
  const questionTypes = Object.values(QUESTION_TYPES);
  const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
  
  const question = generateFallbackQuestion(wines[Math.floor(Math.random() * wines.length)], randomType);
  state.currentQuestion = question;
  
  const questionText = `❓ *Вопрос ${state.correctAnswers + 1}/${state.totalQuestions}*

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
  
  const accuracy = Math.round((state.correctAnswers / state.totalQuestions) * 100);
  const grade = getGrade(accuracy);
  
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
  if (accuracy >= 80 && state.totalQuestions >= 5) {
    await dailyChallenges.checkAndUpdateProgress(chatId, 'test_completed', accuracy);
  }
  
  let message = `🎓 *Урок завершен!*\n\n`;
  message += `📊 *Результаты:*\n`;
  message += `✅ Правильных ответов: ${state.correctAnswers}/${state.totalQuestions}\n`;
  message += `📈 Точность: ${accuracy}%\n`;
  message += `🏆 Оценка: ${grade}\n`;
  message += `💎 Общий счет: ${state.score} баллов\n`;
  message += `💎 Опыт: +${userStats.experiencePoints} XP\n\n`;
  
  // Бонус за идеальный тест
  if (accuracy === 100 && state.totalQuestions >= 5) {
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
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔄 Повторить тест', callback_data: 'learning_quick_test' },
        { text: '🧠 ИИ-режим', callback_data: 'learning_ai_mode' }
      ],
      [
        { text: '📚 Другой урок', callback_data: 'learning_category_lesson' },
        { text: '📊 Прогресс', callback_data: 'learning_progress' }
      ],
      [
        { text: '🎯 Персонализированный тест', callback_data: 'learning_personalized_test' }
      ],
      [
        { text: '🔙 Главное меню', callback_data: 'main_menu' }
      ]
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
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🎯 Продолжить обучение', callback_data: 'learning_quick_test' },
        { text: '🧠 ИИ-режим', callback_data: 'learning_ai_mode' }
      ],
      [
        { text: '📈 Детальная аналитика', callback_data: 'learning_detailed_analytics' },
        { text: '🎯 Персонализированный тест', callback_data: 'learning_personalized_test' }
      ],
      [
        { text: '🔙 Назад', callback_data: 'learning_start' }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(chatId, report, keyboard, env);
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
    } else if (data === 'learning_next_question') {
      await sendNextQuestionBasedOnLesson(chatId, env);
    } else if (data === 'user_profile') {
      await showUserProfile(chatId, env);
    } else if (data === 'daily_challenges') {
      try {
        console.log('Handling daily_challenges callback - START');
        console.log('chatId:', chatId);
        console.log('env keys:', Object.keys(env));
        console.log('About to call showDailyChallenges...');
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
    }
  } catch (error) {
    console.error('Learning callback error:', error);
    await sendMessage(chatId, 'Произошла ошибка в системе обучения. Попробуйте позже.', env);
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
  console.log('Function called with env:', env);
  
  try {
    console.log('showDailyChallenges called with chatId:', chatId);
    const database = new DatabaseManager(env);
    console.log('Database manager created');
    const dailyChallenges = new DailyChallengeSystem(database, env);
    console.log('DailyChallengeSystem created');
    
    await dailyChallenges.showDailyChallenges(chatId);
    console.log('showDailyChallenges completed successfully');
  } catch (error) {
    console.error('Error in showDailyChallenges function:', error);
    console.error('Error stack:', error.stack);
    await sendMessage(chatId, '❌ Ошибка загрузки ежедневных заданий', env);
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