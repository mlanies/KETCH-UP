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
  
  const welcomeText = `🎓 *Добро пожаловать в систему обучения!*

Здесь вы сможете:
• 📚 Изучить ассортимент напитков
• 🧠 Пройти тесты с ИИ
• 📈 Отслеживать прогресс
• 🏆 Заработать достижения

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
  state.currentLesson = 'quick_test';
  state.totalQuestions = 5;
  state.score = 0;
  state.correctAnswers = 0;
  state.incorrectAnswers = [];
  learningStates.set(chatId, state);
  
  // Начинаем новую сессию обучения
  startLearningSession(chatId);
  
  await sendNextQuestion(chatId, env);
}

// Урок по категории
export async function startCategoryLesson(chatId, env) {
  const wines = await getWineData(env);
  const categories = [...new Set(wines.map(w => w.category))];
  
  const keyboard = {
    inline_keyboard: categories.map(category => ([
      { text: category, callback_data: `learning_category_${category}` }
    ])).concat([
      [{ text: '🔙 Назад', callback_data: 'learning_start' }]
    ])
  };
  
  await sendMessageWithKeyboard(chatId, 'Выберите категорию для изучения:', keyboard, env);
}

// ИИ-режим обучения
export async function startAIMode(chatId, env) {
  const state = learningStates.get(chatId) || new LearningState();
  state.currentLesson = 'ai_mode';
  state.totalQuestions = 10;
  state.score = 0;
  state.correctAnswers = 0;
  state.incorrectAnswers = [];
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

Варианты ответов:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: `A) ${question.options.A}`, callback_data: `learning_answer_A` },
        { text: `B) ${question.options.B}`, callback_data: `learning_answer_B` }
      ],
      [
        { text: `C) ${question.options.C}`, callback_data: `learning_answer_C` },
        { text: `D) ${question.options.D}`, callback_data: `learning_answer_D` }
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

Варианты ответов:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: `A) ${question.options.A}`, callback_data: `learning_answer_A` },
        { text: `B) ${question.options.B}`, callback_data: `learning_answer_B` }
      ],
      [
        { text: `C) ${question.options.C}`, callback_data: `learning_answer_C` },
        { text: `D) ${question.options.D}`, callback_data: `learning_answer_D` }
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
  
  const isCorrect = answer === state.currentQuestion.correctAnswer;
  state.totalQuestions++;
  
  if (isCorrect) {
    state.correctAnswers++;
    state.score += 10;
    state.streak++;
    
    let message = `✅ *Правильно!* +10 баллов\n\n`;
    message += `🎯 Серия правильных ответов: ${state.streak}\n`;
    message += `📊 Общий счет: ${state.score} баллов\n\n`;
    message += `💡 *Объяснение:*\n${state.currentQuestion.explanation}`;
    
    // Бонусы за серию
    if (state.streak >= 3) {
      const bonus = Math.floor(state.streak / 3) * 5;
      state.score += bonus;
      message += `\n\n🔥 *Бонус за серию:* +${bonus} баллов!`;
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
    
    let message = `❌ *Неправильно!*\n\n`;
    message += `Правильный ответ: ${state.currentQuestion.correctAnswer})\n`;
    message += `📊 Общий счет: ${state.score} баллов\n\n`;
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
}

// Завершение урока
async function finishLesson(chatId, env) {
  const state = learningStates.get(chatId);
  if (!state) return;
  
  const accuracy = Math.round((state.correctAnswers / state.totalQuestions) * 100);
  const grade = getGrade(accuracy);
  
  let message = `🎓 *Урок завершен!*\n\n`;
  message += `📊 *Результаты:*\n`;
  message += `✅ Правильных ответов: ${state.correctAnswers}/${state.totalQuestions}\n`;
  message += `📈 Точность: ${accuracy}%\n`;
  message += `🏆 Оценка: ${grade}\n`;
  message += `💎 Общий счет: ${state.score} баллов\n\n`;
  
  if (state.incorrectAnswers.length > 0) {
    message += `📝 *Рекомендации для изучения:*\n`;
    state.incorrectAnswers.slice(0, 3).forEach((item, index) => {
      message += `${index + 1}. ${item.wineName} - повторите характеристики\n`;
    });
  }
  
  // Проверяем достижения
  const achievements = checkAchievements(state);
  if (achievements.length > 0) {
    message += `\n🏆 *Новые достижения:*\n`;
    achievements.forEach(achievement => {
      message += `• ${achievement}\n`;
    });
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
  
  // Сбрасываем состояние
  state.currentLesson = null;
  state.currentQuestion = null;
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
      const category = data.replace('learning_category_', '');
      await startCategorySpecificLesson(chatId, category, env);
    } else if (data === 'learning_detailed_analytics') {
      await showDetailedAnalytics(chatId, env);
    } else if (data === 'learning_personalized_test') {
      await startPersonalizedTest(chatId, env);
    } else if (data === 'learning_export_data') {
      await exportLearningData(chatId, env);
    } else if (data === 'learning_next_question') {
      await sendNextQuestionBasedOnLesson(chatId, env);
    }
  } catch (error) {
    console.error('Learning callback error:', error);
    await sendMessage(chatId, 'Произошла ошибка в системе обучения. Попробуйте позже.', env);
  }
}

// Показать достижения
async function showAchievements(chatId, env) {
  const state = learningStates.get(chatId);
  const achievements = [
    { name: '🎯 Первые шаги', description: '10 правильных ответов', unlocked: state?.correctAnswers >= 10 },
    { name: '🔥 Серия побед', description: '5 правильных ответов подряд', unlocked: state?.streak >= 5 },
    { name: '💎 Стобалльник', description: '100 баллов', unlocked: state?.score >= 100 },
    { name: '🧠 ИИ-мастер', description: 'Пройдите 10 ИИ-вопросов', unlocked: false },
    { name: '📚 Категорийный эксперт', description: 'Изучите все категории', unlocked: false },
    { name: '🏆 Чемпион', description: '1000 баллов', unlocked: state?.score >= 1000 }
  ];
  
  let message = `🏆 *Достижения*\n\n`;
  achievements.forEach(achievement => {
    const status = achievement.unlocked ? '✅' : '🔒';
    message += `${status} ${achievement.name}\n`;
    message += `   ${achievement.description}\n\n`;
  });
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔙 Назад', callback_data: 'learning_start' }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(chatId, message, keyboard, env);
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

Варианты ответов:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: `A) ${question.options.A}`, callback_data: `learning_answer_A` },
        { text: `B) ${question.options.B}`, callback_data: `learning_answer_B` }
      ],
      [
        { text: `C) ${question.options.C}`, callback_data: `learning_answer_C` },
        { text: `D) ${question.options.D}`, callback_data: `learning_answer_D` }
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

Варианты ответов:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: `A) ${question.options.A}`, callback_data: `learning_answer_A` },
        { text: `B) ${question.options.B}`, callback_data: `learning_answer_B` }
      ],
      [
        { text: `C) ${question.options.C}`, callback_data: `learning_answer_C` },
        { text: `D) ${question.options.D}`, callback_data: `learning_answer_D` }
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
  const exportData = exportUserData(chatId);
  
  const message = `📊 *Экспорт данных обучения*

Ваши данные готовы для экспорта. Скопируйте JSON ниже:

\`\`\`json
${exportData}
\`\`\`

💡 *Что включено:*
• Общая статистика обучения
• Производительность по категориям
• Производительность по типам вопросов
• Сильные и слабые стороны
• Рекомендации для улучшения`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔙 Назад', callback_data: 'learning_detailed_analytics' }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(chatId, message, keyboard, env);
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