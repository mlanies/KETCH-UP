// Аналитика обучения и персонализация

import { getWineData } from './data.js';
import { sendMessage, sendMessageWithKeyboard } from './telegramApi.js';
import { askCloudflareAI } from './ai.js';

// Структура для хранения аналитики пользователя
class UserAnalytics {
  constructor(chatId) {
    this.chatId = chatId;
    this.totalSessions = 0;
    this.totalQuestions = 0;
    this.correctAnswers = 0;
    this.categoryPerformance = new Map(); // производительность по категориям
    this.questionTypePerformance = new Map(); // производительность по типам вопросов
    this.learningStreak = 0; // максимальная серия правильных ответов
    this.averageSessionTime = 0; // среднее время сессии в минутах
    this.lastSessionDate = null;
    this.weakCategories = []; // категории, где пользователь делает ошибки
    this.strongCategories = []; // категории, где пользователь силен
    this.recommendedTopics = []; // рекомендуемые темы для изучения
  }

  // Обновление статистики после ответа
  updateAnswerStats(category, questionType, isCorrect, timeSpent = 0) {
    this.totalQuestions++;
    if (isCorrect) {
      this.correctAnswers++;
    }

    // Обновляем статистику по категориям
    if (!this.categoryPerformance.has(category)) {
      this.categoryPerformance.set(category, { correct: 0, total: 0, avgTime: 0 });
    }
    const catStats = this.categoryPerformance.get(category);
    catStats.total++;
    if (isCorrect) catStats.correct++;
    catStats.avgTime = (catStats.avgTime * (catStats.total - 1) + timeSpent) / catStats.total;

    // Обновляем статистику по типам вопросов
    if (!this.questionTypePerformance.has(questionType)) {
      this.questionTypePerformance.set(questionType, { correct: 0, total: 0 });
    }
    const typeStats = this.questionTypePerformance.get(questionType);
    typeStats.total++;
    if (isCorrect) typeStats.correct++;

    // Обновляем слабые и сильные категории
    this.updateCategoryStrengths();
  }

  // Обновление сильных и слабых категорий
  updateCategoryStrengths() {
    this.weakCategories = [];
    this.strongCategories = [];

    for (const [category, stats] of this.categoryPerformance) {
      const accuracy = stats.total > 0 ? stats.correct / stats.total : 0;
      
      if (accuracy < 0.6 && stats.total >= 3) {
        this.weakCategories.push(category);
      } else if (accuracy > 0.8 && stats.total >= 5) {
        this.strongCategories.push(category);
      }
    }
  }

  // Получение общей точности
  getOverallAccuracy() {
    return this.totalQuestions > 0 ? this.correctAnswers / this.totalQuestions : 0;
  }

  // Получение точности по категории
  getCategoryAccuracy(category) {
    const stats = this.categoryPerformance.get(category);
    return stats && stats.total > 0 ? stats.correct / stats.total : 0;
  }

  // Генерация персонализированных рекомендаций
  generateRecommendations() {
    const recommendations = [];

    // Рекомендации на основе слабых категорий
    if (this.weakCategories.length > 0) {
      recommendations.push({
        type: 'weak_category',
        message: `📚 Рекомендуем повторить категории: ${this.weakCategories.join(', ')}`,
        priority: 'high'
      });
    }

    // Рекомендации на основе общего прогресса
    const accuracy = this.getOverallAccuracy();
    if (accuracy < 0.7) {
      recommendations.push({
        type: 'general_improvement',
        message: '🎯 Ваша общая точность ниже 70%. Рекомендуем больше практиковаться.',
        priority: 'medium'
      });
    }

    // Рекомендации на основе частоты обучения
    const daysSinceLastSession = this.lastSessionDate ? 
      (Date.now() - this.lastSessionDate) / (1000 * 60 * 60 * 24) : 999;
    
    if (daysSinceLastSession > 7) {
      recommendations.push({
        type: 'frequency',
        message: '⏰ Вы не занимались более недели. Рекомендуем регулярные тренировки.',
        priority: 'medium'
      });
    }

    // Рекомендации для продвинутых пользователей
    if (accuracy > 0.85 && this.totalQuestions > 20) {
      recommendations.push({
        type: 'advanced',
        message: '🏆 Отличные результаты! Попробуйте режим "Продвинутый" для сложных вопросов.',
        priority: 'low'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

// Хранилище аналитики пользователей
const userAnalytics = new Map();

// Получение или создание аналитики пользователя
function getUserAnalytics(chatId) {
  if (!userAnalytics.has(chatId)) {
    userAnalytics.set(chatId, new UserAnalytics(chatId));
  }
  return userAnalytics.get(chatId);
}

// Генерация персонализированного отчета
export async function generatePersonalizedReport(chatId, env) {
  const analytics = getUserAnalytics(chatId);
  const wines = await getWineData(env);
  
  let report = `📊 *Персонализированный отчет*\n\n`;
  
  // Общая статистика
  const accuracy = analytics.getOverallAccuracy();
  report += `🎯 *Общая статистика:*\n`;
  report += `• Всего вопросов: ${analytics.totalQuestions}\n`;
  report += `• Правильных ответов: ${analytics.correctAnswers}\n`;
  report += `• Точность: ${Math.round(accuracy * 100)}%\n`;
  report += `• Сессий обучения: ${analytics.totalSessions}\n\n`;
  
  // Статистика по категориям
  if (analytics.categoryPerformance.size > 0) {
    report += `📚 *По категориям:*\n`;
    for (const [category, stats] of analytics.categoryPerformance) {
      const catAccuracy = stats.correct / stats.total;
      const emoji = catAccuracy > 0.8 ? '🟢' : catAccuracy > 0.6 ? '🟡' : '🔴';
      report += `${emoji} ${category}: ${stats.correct}/${stats.total} (${Math.round(catAccuracy * 100)}%)\n`;
    }
    report += '\n';
  }
  
  // Сильные и слабые стороны
  if (analytics.strongCategories.length > 0) {
    report += `💪 *Ваши сильные стороны:*\n`;
    analytics.strongCategories.forEach(category => {
      report += `• ${category}\n`;
    });
    report += '\n';
  }
  
  if (analytics.weakCategories.length > 0) {
    report += `📖 *Требуют внимания:*\n`;
    analytics.weakCategories.forEach(category => {
      report += `• ${category}\n`;
    });
    report += '\n';
  }
  
  // Рекомендации
  const recommendations = analytics.generateRecommendations();
  if (recommendations.length > 0) {
    report += `💡 *Рекомендации:*\n`;
    recommendations.forEach(rec => {
      report += `• ${rec.message}\n`;
    });
  }
  
  return report;
}

// Генерация персонализированных вопросов с помощью ИИ
export async function generatePersonalizedAIQuestion(chatId, env) {
  const analytics = getUserAnalytics(chatId);
  const wines = await getWineData(env);
  
  // Выбираем категорию на основе слабых сторон пользователя
  let targetCategory = null;
  if (analytics.weakCategories.length > 0) {
    targetCategory = analytics.weakCategories[Math.floor(Math.random() * analytics.weakCategories.length)];
  } else {
    // Если нет слабых категорий, выбираем случайную
    const categories = [...new Set(wines.map(w => w.category))];
    targetCategory = categories[Math.floor(Math.random() * categories.length)];
  }
  
  // Фильтруем вина по выбранной категории
  const categoryWines = wines.filter(w => w.category === targetCategory);
  if (categoryWines.length === 0) {
    return null;
  }
  
  const randomWine = categoryWines[Math.floor(Math.random() * categoryWines.length)];
  
  // Создаем персонализированный промпт для ИИ
  const accuracy = analytics.getOverallAccuracy();
  const difficulty = accuracy > 0.8 ? 'продвинутый' : accuracy > 0.6 ? 'средний' : 'начальный';
  
  const prompt = `Ты эксперт-сомелье, создающий персонализированные вопросы для обучения официанта.

Создай один вопрос с 4 вариантами ответа для обучения официанта.

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

Уровень сложности: ${difficulty}
Целевая категория: ${targetCategory}

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
        wineName: randomWine.name,
        category: targetCategory,
        difficulty
      };
    }
  } catch (error) {
    console.error('Error generating personalized AI question:', error);
  }
  
  return null;
}

// Обновление аналитики после ответа
export function updateAnalytics(chatId, category, questionType, isCorrect, timeSpent = 0) {
  const analytics = getUserAnalytics(chatId);
  analytics.updateAnswerStats(category, questionType, isCorrect, timeSpent);
  analytics.lastSessionDate = Date.now();
}

// Начало новой сессии обучения
export function startLearningSession(chatId) {
  const analytics = getUserAnalytics(chatId);
  analytics.totalSessions++;
  analytics.lastSessionDate = Date.now();
}

// Получение рекомендаций для пользователя
export function getRecommendations(chatId) {
  const analytics = getUserAnalytics(chatId);
  return analytics.generateRecommendations();
}

// Показать детальную аналитику
export async function showDetailedAnalytics(chatId, env) {
  const analytics = getUserAnalytics(chatId);
  
  let analyticsText = `📈 *Детальная аналитика обучения*\n\n`;
  
  // Временная статистика
  if (analytics.lastSessionDate) {
    const daysSinceLastSession = Math.floor((Date.now() - analytics.lastSessionDate) / (1000 * 60 * 60 * 24));
    analyticsText += `⏰ Последняя сессия: ${daysSinceLastSession} дней назад\n`;
  }
  
  analyticsText += `📊 Всего сессий: ${analytics.totalSessions}\n`;
  analyticsText += `🎯 Средняя точность: ${Math.round(analytics.getOverallAccuracy() * 100)}%\n`;
  analyticsText += `🔥 Лучшая серия: ${analytics.learningStreak} правильных ответов\n\n`;
  
  // График прогресса по категориям
  if (analytics.categoryPerformance.size > 0) {
    const categoryChart = createCategoryProgressChart(analytics);
    analyticsText += categoryChart + '\n';
  }
  
  // График прогресса по типам вопросов
  if (analytics.questionTypePerformance.size > 0) {
    const typeChart = createQuestionTypeProgressChart(analytics);
    analyticsText += typeChart + '\n';
  }
  
  // График еженедельного прогресса
  const weeklyChart = createWeeklyProgressChart(analytics);
  analyticsText += weeklyChart + '\n';
  
  // Рекомендации
  const recommendations = analytics.generateRecommendations();
  if (recommendations.length > 0) {
    analyticsText += `💡 *Персональные рекомендации:*\n`;
    recommendations.forEach(rec => {
      analyticsText += `• ${rec.message}\n`;
    });
  }
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🎯 Персонализированный тест', callback_data: 'learning_personalized_test' },
        { text: '📊 Экспорт данных', callback_data: 'learning_export_data' }
      ],
      [
        { text: '📈 Графики', callback_data: 'learning_charts' },
        { text: '🏆 Достижения', callback_data: 'learning_achievements' }
      ],
      [
        { text: '🔙 Назад', callback_data: 'learning_start' }
      ]
    ]
  };
  
  await sendMessageWithKeyboard(chatId, analyticsText, keyboard, env);
}

// Получение названия типа вопроса
function getQuestionTypeName(type) {
  const typeNames = {
    'wine_pairing': 'Сочетание с блюдами',
    'serving_temp': 'Температура подачи',
    'glassware': 'Выбор бокалов',
    'description': 'Описание напитка',
    'country': 'Страна происхождения',
    'alcohol_content': 'Крепость',
    'ingredients': 'Состав',
    'method': 'Метод приготовления'
  };
  return typeNames[type] || type;
}

// Экспорт данных пользователя
export function exportUserData(chatId) {
  const analytics = getUserAnalytics(chatId);
  
  const exportData = {
    chatId: analytics.chatId,
    totalSessions: analytics.totalSessions,
    totalQuestions: analytics.totalQuestions,
    correctAnswers: analytics.correctAnswers,
    overallAccuracy: analytics.getOverallAccuracy(),
    categoryPerformance: Object.fromEntries(analytics.categoryPerformance),
    questionTypePerformance: Object.fromEntries(analytics.questionTypePerformance),
    weakCategories: analytics.weakCategories,
    strongCategories: analytics.strongCategories,
    learningStreak: analytics.learningStreak,
    lastSessionDate: analytics.lastSessionDate,
    exportDate: new Date().toISOString()
  };
  
  return JSON.stringify(exportData, null, 2);
}

// Создание текстового графика прогресса
export function createProgressChart(data, title, maxValue = 100) {
  const chartWidth = 20;
  const filledChar = '█';
  const emptyChar = '░';
  
  let chart = `📊 *${title}*\n`;
  chart += '┌' + '─'.repeat(chartWidth + 2) + '┐\n';
  
  for (const [label, value] of Object.entries(data)) {
    const percentage = Math.min((value / maxValue) * 100, 100);
    const filledWidth = Math.round((percentage / 100) * chartWidth);
    const emptyWidth = chartWidth - filledWidth;
    
    const bar = filledChar.repeat(filledWidth) + emptyChar.repeat(emptyWidth);
    const percentageText = Math.round(percentage).toString().padStart(3);
    
    chart += `│ ${bar} │ ${percentageText}%\n`;
  }
  
  chart += '└' + '─'.repeat(chartWidth + 2) + '┘\n';
  return chart;
}

// Создание графика прогресса по категориям
export function createCategoryProgressChart(analytics) {
  const categoryData = {};
  
  for (const [category, stats] of analytics.categoryPerformance) {
    const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    categoryData[category] = accuracy;
  }
  
  return createProgressChart(categoryData, 'Прогресс по категориям');
}

// Создание графика прогресса по типам вопросов
export function createQuestionTypeProgressChart(analytics) {
  const typeData = {};
  
  for (const [type, stats] of analytics.questionTypePerformance) {
    const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    const typeName = getQuestionTypeName(type);
    typeData[typeName] = accuracy;
  }
  
  return createProgressChart(typeData, 'Прогресс по типам вопросов');
}

// Создание графика еженедельного прогресса
export function createWeeklyProgressChart(analytics) {
  // Симуляция данных за неделю (в реальной системе данные должны браться из БД)
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const weeklyData = {};
  
  weekDays.forEach(day => {
    weeklyData[day] = Math.random() * 100; // Заглушка, в реальности - данные из БД
  });
  
  return createProgressChart(weeklyData, 'Прогресс за неделю');
} 