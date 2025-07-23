// Система стимулирования официантов с ИИ-анализом
import { DatabaseManager } from './database.js';

export class MotivationSystem {
  constructor(db) {
    this.db = db;
  }

  // Анализ поведения пользователя и генерация персонализированной мотивации
  async analyzeUserAndMotivate(chatId) {
    try {
      // Проверяем, включена ли мотивация для пользователя
      const motivationEnabled = await this.db.getMotivationEnabled(chatId);
      if (!motivationEnabled) {
        return {
          success: false,
          error: 'Мотивация отключена пользователем'
        };
      }

      // Получаем все данные пользователя
      const userData = await this.getComprehensiveUserData(chatId);
      
      // Анализируем поведение
      const behaviorAnalysis = await this.analyzeBehavior(userData);
      
      // Обновляем предпочтительное время мотивации, если оно изменилось
      if (behaviorAnalysis.preferredTime) {
        await this.db.setPreferredMotivationTime(chatId, behaviorAnalysis.preferredTime);
      }

      // Генерируем мотивационное сообщение
      const motivationMessage = await this.generateMotivationMessage(userData, behaviorAnalysis, chatId);
      
      // Сохраняем анализ в БД
      await this.saveAnalysis(chatId, behaviorAnalysis);
      
      // Создаем мотивационное сообщение
      await this.createMotivationMessage(chatId, motivationMessage);
      
      // Проверяем, нужны ли призы
      const rewards = await this.checkAndAwardRewards(chatId, userData);
      
      return {
        success: true,
        data: {
          motivation: motivationMessage,
          analysis: behaviorAnalysis,
          rewards: rewards
        }
      };
    } catch (error) {
      console.error('[MOTIVATION] Error in analyzeUserAndMotivate:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Получение комплексных данных пользователя
  async getComprehensiveUserData(chatId) {
    // Получаем основную статистику пользователя
    const userStats = await this.db.getUserStats(chatId);
    const user = userStats?.user || null;

    // Получаем достижения
    let achievements = [];
    if (typeof this.db.getAchievements === 'function') {
      achievements = await this.db.getAchievements(chatId);
    } else {
      console.log('[MOTIVATION] this.db:', this.db ? 'present' : 'missing');
      const achievementsResult = await this.db.prepare(
        'SELECT * FROM achievements WHERE chat_id = ? ORDER BY unlocked_at DESC LIMIT 10'
      ).bind(chatId).all();
      achievements = achievementsResult.results || [];
    }

    // Получаем последние сессии (если есть метод)
    let recentSessions = [];
    if (typeof this.db.getRecentSessions === 'function') {
      recentSessions = await this.db.getRecentSessions(chatId);
    } else {
      console.log('[MOTIVATION] this.db:', this.db ? 'present' : 'missing');
      const sessionsResult = await this.db.prepare(
        'SELECT * FROM learning_sessions WHERE chat_id = ? ORDER BY start_time DESC LIMIT 7'
      ).bind(chatId).all();
      recentSessions = sessionsResult.results || [];
    }

    // Получаем ежедневные задания
    let dailyChallenges = [];
    if (typeof this.db.getUserDailyChallenges === 'function') {
      dailyChallenges = await this.db.getUserDailyChallenges(chatId);
    } else {
      console.log('[MOTIVATION] this.db:', this.db ? 'present' : 'missing');
      const challengesResult = await this.db.prepare(
        'SELECT * FROM daily_challenges WHERE chat_id = ? AND created_date = CURRENT_DATE'
      ).bind(chatId).all();
      dailyChallenges = challengesResult.results || [];
    }

    // Получаем лог активности
    let activityLog = [];
    if (typeof this.db.getActivityHistory === 'function') {
      activityLog = await this.db.getActivityHistory(chatId, 20);
    } else {
      console.log('[MOTIVATION] this.db:', this.db ? 'present' : 'missing');
      const activityResult = await this.db.prepare(
        'SELECT * FROM activity_log WHERE chat_id = ? ORDER BY created_at DESC LIMIT 20'
      ).bind(chatId).all();
      activityLog = activityResult.results || [];
    }

    // Получаем статистику по категориям
    let categoryStats = [];
    if (typeof this.db.getCategoryStats === 'function') {
      categoryStats = await this.db.getCategoryStats(chatId);
    } else {
      console.log('[MOTIVATION] this.db:', this.db ? 'present' : 'missing');
      const categoryResult = await this.db.prepare(
        'SELECT * FROM category_stats WHERE chat_id = ? ORDER BY correct_answers DESC'
      ).bind(chatId).all();
      categoryStats = categoryResult.results || [];
    }

    return {
      user,
      achievements,
      recentSessions,
      dailyChallenges,
      activityLog,
      categoryStats
    };
  }

  // Анализ поведения пользователя
  async analyzeBehavior(userData) {
    const { user, recentSessions, activityLog, categoryStats } = userData;
    
    // Анализ активности
    const activityAnalysis = this.analyzeActivity(activityLog, recentSessions);
    
    // Анализ прогресса
    const progressAnalysis = this.analyzeProgress(user, recentSessions);
    
    // Анализ сильных и слабых сторон
    const strengthsWeaknesses = this.analyzeStrengthsWeaknesses(categoryStats);
    
    // Анализ мотивации
    const motivationAnalysis = this.analyzeMotivation(user, activityLog);
    
    // Определение стиля обучения
    const learningStyle = this.determineLearningStyle(recentSessions, activityLog);
    
    // Предпочтительное время обучения
    const preferredTime = this.determinePreferredTime(recentSessions);
    
    return {
      activity: activityAnalysis,
      progress: progressAnalysis,
      strengthsWeaknesses: strengthsWeaknesses,
      motivation: motivationAnalysis,
      learningStyle: learningStyle,
      preferredTime: preferredTime,
      overallScore: this.calculateOverallScore(activityAnalysis, progressAnalysis, motivationAnalysis)
    };
  }

  // Анализ активности
  analyzeActivity(activityLog, recentSessions) {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentActivity = activityLog.filter(log => new Date(log.created_at) > lastWeek);
    const recentSessionsCount = recentSessions.length;
    
    const dailyActivity = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyActivity[dateStr] = recentActivity.filter(log => 
        log.created_at.startsWith(dateStr)
      ).length;
    }
    
    const totalActivity = recentActivity.length;
    const avgDailyActivity = totalActivity / 7;
    
    return {
      totalActivity,
      avgDailyActivity,
      dailyActivity,
      recentSessionsCount,
      isActive: avgDailyActivity > 1,
      activityTrend: this.calculateTrend(Object.values(dailyActivity))
    };
  }

  // Анализ прогресса
  analyzeProgress(user, recentSessions) {
    if (recentSessions.length < 2) {
      return {
        hasProgress: false,
        progressRate: 0,
        improvement: 0
      };
    }
    
    const recentScores = recentSessions.map(s => s.score || 0);
    const avgRecentScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    
    const olderSessions = recentSessions.slice(3);
    const avgOlderScore = olderSessions.length > 0 
      ? olderSessions.map(s => s.score || 0).reduce((a, b) => a + b, 0) / olderSessions.length
      : avgRecentScore;
    
    const improvement = avgRecentScore - avgOlderScore;
    const progressRate = improvement / Math.max(avgOlderScore, 1) * 100;
    
    return {
      hasProgress: true,
      progressRate,
      improvement,
      avgRecentScore,
      avgOlderScore,
      isImproving: improvement > 0
    };
  }

  // Анализ сильных и слабых сторон
  analyzeStrengthsWeaknesses(categoryStats) {
    if (!categoryStats || categoryStats.length === 0) {
      return {
        strengths: [],
        weaknesses: [],
        hasData: false
      };
    }
    
    const categoriesWithAccuracy = categoryStats.map(stat => ({
      category: stat.category,
      accuracy: stat.total_questions > 0 ? (stat.correct_answers / stat.total_questions) * 100 : 0,
      totalQuestions: stat.total_questions
    }));
    
    const strengths = categoriesWithAccuracy
      .filter(cat => cat.accuracy >= 70 && cat.totalQuestions >= 5)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 3);
    
    const weaknesses = categoriesWithAccuracy
      .filter(cat => cat.accuracy < 60 && cat.totalQuestions >= 3)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);
    
    return {
      strengths,
      weaknesses,
      hasData: true
    };
  }

  // Анализ мотивации
  analyzeMotivation(user, activityLog) {
    const recentActivity = activityLog.filter(log => 
      new Date(log.created_at) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    );
    
    const positiveActions = recentActivity.filter(log => 
      log.points_earned > 0 || log.experience_earned > 0
    ).length;
    
    const totalActions = recentActivity.length;
    const motivationRatio = totalActions > 0 ? positiveActions / totalActions : 0;
    
    let motivationLevel = 50; // базовый уровень
    
    if (motivationRatio > 0.8) motivationLevel = 80;
    else if (motivationRatio > 0.6) motivationLevel = 70;
    else if (motivationRatio > 0.4) motivationLevel = 60;
    else if (motivationRatio < 0.2) motivationLevel = 30;
    
    return {
      level: motivationLevel,
      ratio: motivationRatio,
      recentActivity: totalActions,
      positiveActions,
      isMotivated: motivationLevel > 60
    };
  }

  // Определение стиля обучения
  determineLearningStyle(recentSessions, activityLog) {
    const sessionTypes = recentSessions.map(s => s.session_type);
    const activityTypes = activityLog.map(log => log.activity_type);
    
    const typeCounts = {};
    [...sessionTypes, ...activityTypes].forEach(type => {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    if (typeCounts['quick_test'] > typeCounts['ai_mode']) {
      return 'practical';
    } else if (typeCounts['ai_mode'] > typeCounts['quick_test']) {
      return 'theoretical';
    } else {
      return 'balanced';
    }
  }

  // Определение предпочтительного времени
  determinePreferredTime(recentSessions) {
    if (recentSessions.length === 0) return 'afternoon';
    
    const hourCounts = { morning: 0, afternoon: 0, evening: 0 };
    
    recentSessions.forEach(session => {
      const hour = new Date(session.start_time).getHours();
      if (hour >= 6 && hour < 12) hourCounts.morning++;
      else if (hour >= 12 && hour < 18) hourCounts.afternoon++;
      else hourCounts.evening++;
    });
    
    return Object.entries(hourCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  // Модифицированная генерация мотивационного сообщения с учетом истории
  async generateMotivationMessage(userData, analysis, chatId) {
    const { user, achievements, dailyChallenges } = userData;
    const { activity, progress, strengthsWeaknesses, motivation } = analysis;

    let messageType = 'encouragement';
    let messageText = '';
    let templates = [];
    let usedMessages = [];

    // Получаем последние мотивационные сообщения пользователя
    if (chatId) {
      usedMessages = await this.getRecentMotivationHistory(chatId, 5);
    }

    // Определяем тип сообщения на основе анализа
    if (motivation.level < 40) {
      messageType = 'encouragement';
      templates = [
        `Вижу, что ты давно не заходил. Знаешь, даже 5 минут в день могут изменить твои знания о напитках! Попробуй быстрый тест — это займет всего пару минут.`,
        `🍷 Твои коллеги уже улучшают свои навыки. Не отставай! Пройди один тест сегодня — и ты будешь на шаг ближе к новому достижению.`,
        `🌟 Каждый эксперт когда-то был новичком. Ты уже на ${user?.difficulty_level || 1} уровне — это отличный старт! Продолжай в том же духе.`
      ];
    } else if (progress.isImproving && progress.progressRate > 20) {
      messageType = 'praise';
      templates = [
        `🎉 Отличная работа! Твой прогресс впечатляет! Ты улучшился на ${Math.round(progress.progressRate)}% за последнее время. Продолжай в том же духе!`,
        `🏆 Поздравляю! Ты показываешь отличные результаты. Твой streak: ${user?.learning_streak || 0} дней! Ты настоящий профессионал!`,
        `⭐ Потрясающе! Ты не только учишься, но и делаешь это эффективно. Твой опыт: ${user?.experience_points || 0} XP — это говорит о твоей целеустремленности!`
      ];
    } else if (activity.recentSessionsCount === 0) {
      messageType = 'reminder';
      templates = [
        `⏰ Не забывай о своих целях! У тебя есть ${user?.learning_streak || 0} дней streak — не прерывай его! Пройди тест сегодня.`,
        `📚 Эй! Твои знания о напитках ждут обновления! Зайди на 5 минут — пройди быстрый тест и получи опыт.`,
        `🎯 Напоминание: каждый день обучения делает тебя лучше! Ты уже на ${user?.difficulty_level || 1} уровне — не останавливайся!`
      ];
    } else if (strengthsWeaknesses.weaknesses.length > 0) {
      messageType = 'challenge';
      const weakCategory = strengthsWeaknesses.weaknesses[0];
      templates = [
        `🎯 Вызов принят? У тебя есть слабое место: ${weakCategory.category || 'неизвестной категории'}. Пройди тест по этой категории и улучши свои навыки!`,
        `⚡ Готов к вызову? Твоя точность в ${weakCategory.category || 'неизвестной категории'}: ${Math.round(weakCategory.accuracy || 0)}%. Попробуй улучшить этот результат!`,
        `🔥 Время для роста! ${weakCategory.category || 'неизвестной категории'} требует внимания. Пройди специализированный тест и стань экспертом!`
      ];
    } else {
      messageType = 'motivation';
      templates = [
        `🚀 Ты на правильном пути! Каждый тест приближает тебя к новому уровню. До следующего уровня осталось ${this.calculateXPToNextLevel(user)} XP.`,
        `💪 Отличная работа! Ты показываешь стабильный прогресс. Продолжай учиться — твои знания бесценны!`,
        `🌟 Ты делаешь всё правильно! Обучение — это инвестиция в себя. Твои клиенты оценят твою экспертизу!`
      ];
    }

    // Исключаем последние использованные сообщения
    const availableTemplates = templates.filter(t => !usedMessages.includes(t));
    if (availableTemplates.length > 0) {
      messageText = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
    } else {
      // Если все шаблоны уже были — используем случайный
      messageText = templates[Math.floor(Math.random() * templates.length)];
    }

    // Сохраняем сообщение в историю и чистим старые
    if (chatId) {
      await this.saveMotivationToHistory(chatId, messageText);
      await this.cleanupOldMotivationHistory(chatId, 5);
    }

    return {
      type: messageType,
      text: messageText,
      priority: this.calculateMessagePriority(messageType, analysis),
      context: {
        userLevel: user?.difficulty_level,
        experiencePoints: user?.experience_points,
        streak: user?.learning_streak,
        analysis: analysis
      }
    };
  }

  // Генерация ободряющего сообщения
  generateEncouragementMessage(user, analysis) {
    // Проверяем наличие данных пользователя
    if (!user) {
      console.log('[MOTIVATION] generateEncouragementMessage: user data is null/undefined');
      return '👋 Начни свой путь изучения напитков сегодня!';
    }

    const difficultyLevel = user.difficulty_level || 1;
    
    const templates = [
      `Вижу, что ты давно не заходил. Знаешь, даже 5 минут в день могут изменить твои знания о напитках! Попробуй быстрый тест — это займет всего пару минут.`,
      `🍷 Твои коллеги уже улучшают свои навыки. Не отставай! Пройди один тест сегодня — и ты будешь на шаг ближе к новому достижению.`,
      `🌟 Каждый эксперт когда-то был новичком. Ты уже на ${difficultyLevel} уровне — это отличный старт! Продолжай в том же духе.`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Генерация хвалебного сообщения
  generatePraiseMessage(user, analysis) {
    // Проверяем наличие данных пользователя и анализа
    if (!user) {
      console.log('[MOTIVATION] generatePraiseMessage: user data is null/undefined');
      return '🎉 Отличная работа! Продолжай в том же духе!';
    }

    if (!analysis || !analysis.progress) {
      console.log('[MOTIVATION] generatePraiseMessage: analysis data is null/undefined');
      return '🎉 Отличная работа! Ты показываешь отличные результаты!';
    }

    const progressRate = analysis.progress.progressRate || 0;
    const learningStreak = user.learning_streak || 0;
    const experiencePoints = user.experience_points || 0;
    
    const templates = [
      `🎉 Отличная работа! Твой прогресс впечатляет! Ты улучшился на ${Math.round(progressRate)}% за последнее время. Продолжай в том же духе!`,
      `🏆 Поздравляю! Ты показываешь отличные результаты. Твой streak: ${learningStreak} дней! Ты настоящий профессионал!`,
      `⭐ Потрясающе! Ты не только учишься, но и делаешь это эффективно. Твой опыт: ${experiencePoints} XP — это говорит о твоей целеустремленности!`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Генерация напоминания
  generateReminderMessage(user, analysis) {
    // Проверяем наличие данных пользователя
    if (!user) {
      console.log('[MOTIVATION] generateReminderMessage: user data is null/undefined');
      return '⏰ Не забывай о своих целях! Пройди тест сегодня.';
    }

    const learningStreak = user.learning_streak || 0;
    const difficultyLevel = user.difficulty_level || 1;
    
    const templates = [
      `⏰ Не забывай о своих целях! У тебя есть ${learningStreak} дней streak — не прерывай его! Пройди тест сегодня.`,
      `📚 Эй! Твои знания о напитках ждут обновления! Зайди на 5 минут — пройди быстрый тест и получи опыт.`,
      `🎯 Напоминание: каждый день обучения делает тебя лучше! Ты уже на ${difficultyLevel} уровне — не останавливайся!`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Генерация вызова
  generateChallengeMessage(user, analysis) {
    // Проверяем наличие данных анализа
    if (!analysis || !analysis.strengthsWeaknesses || !analysis.strengthsWeaknesses.weaknesses) {
      console.log('[MOTIVATION] generateChallengeMessage: analysis data is null/undefined or missing weaknesses');
      return '🎯 Готов к вызову? Пройди тест и улучши свои навыки!';
    }

    const weakCategory = analysis.strengthsWeaknesses.weaknesses[0];
    if (!weakCategory) {
      console.log('[MOTIVATION] generateChallengeMessage: no weak category found');
      return '🎯 Готов к вызову? Пройди тест и улучши свои навыки!';
    }

    const categoryName = weakCategory.category || 'неизвестной категории';
    const accuracy = weakCategory.accuracy || 0;
    
    const templates = [
      `🎯 Вызов принят? У тебя есть слабое место: ${categoryName}. Пройди тест по этой категории и улучши свои навыки!`,
      `⚡ Готов к вызову? Твоя точность в ${categoryName}: ${Math.round(accuracy)}%. Попробуй улучшить этот результат!`,
      `🔥 Время для роста! ${categoryName} требует внимания. Пройди специализированный тест и стань экспертом!`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Генерация общего мотивационного сообщения
  generateGeneralMotivationMessage(user, analysis) {
    // Проверяем наличие данных пользователя
    if (!user) {
      console.log('[MOTIVATION] generateGeneralMotivationMessage: user data is null/undefined');
      return '🚀 Ты на правильном пути! Каждый тест приближает тебя к новому уровню.';
    }

    const xpToNext = this.calculateXPToNextLevel(user);
    
    const templates = [
      `🚀 Ты на правильном пути! Каждый тест приближает тебя к новому уровню. До следующего уровня осталось ${xpToNext} XP.`,
      `💪 Отличная работа! Ты показываешь стабильный прогресс. Продолжай учиться — твои знания бесценны!`,
      `🌟 Ты делаешь всё правильно! Обучение — это инвестиция в себя. Твои клиенты оценят твою экспертизу!`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Проверка и награждение призов
  async checkAndAwardRewards(chatId, userData) {
    const rewards = [];
    const { user, achievements, activityLog } = userData;
    
    // Проверяем различные условия для наград
    const newRewards = await this.checkRewardConditions(chatId, user, achievements, activityLog);
    
    if (newRewards.length > 0) {
      for (const reward of newRewards) {
        await this.createReward(chatId, reward);
        rewards.push(reward);
      }
    }
    
    return rewards;
  }

  // Проверка условий для наград
  async checkRewardConditions(chatId, user, achievements, activityLog) {
    const rewards = [];
    
    // Проверяем, не выдавали ли уже эту награду
    const existingRewardsResult = await this.db.prepare(
      'SELECT reward_name FROM rewards WHERE chat_id = ?'
    ).bind(chatId).all();
    const existingRewards = existingRewardsResult.results || [];
    const existingRewardNames = existingRewards.map(r => r.reward_name);
    
    // Награда за первый день streak
    if (user.learning_streak === 1 && !existingRewardNames.includes('Первый шаг')) {
      rewards.push({
        type: 'badge',
        name: 'Первый шаг',
        description: 'Начал свой путь обучения',
        data: { icon: '🌱', color: '#4CAF50' }
      });
    }
    
    // Награда за 3 дня streak
    if (user.learning_streak === 3 && !existingRewardNames.includes('Постоянство')) {
      rewards.push({
        type: 'badge',
        name: 'Постоянство',
        description: '3 дня подряд обучения',
        data: { icon: '🔥', color: '#FF9800' }
      });
    }
    
    // Награда за 7 дней streak
    if (user.learning_streak === 7 && !existingRewardNames.includes('Неделя успеха')) {
      rewards.push({
        type: 'title',
        name: 'Неделя успеха',
        description: '7 дней подряд обучения',
        data: { icon: '🏆', color: '#FFD700' }
      });
    }
    
    // Награда за 100 XP
    if (user.experience_points >= 100 && !existingRewardNames.includes('Столетие')) {
      rewards.push({
        type: 'badge',
        name: 'Столетие',
        description: 'Достиг 100 XP',
        data: { icon: '💯', color: '#9C27B0' }
      });
    }
    
    return rewards;
  }

  // Сохранение анализа в БД
  async saveAnalysis(chatId, analysis) {
    await this.db.prepare(
      'INSERT INTO ai_analysis (chat_id, analysis_type, analysis_data, confidence_score) VALUES (?, ?, ?, ?)'
    ).bind(chatId, 'comprehensive', JSON.stringify(analysis), 0.85).run();
  }

  // Создание мотивационного сообщения
  async createMotivationMessage(chatId, motivation) {
    await this.db.prepare(
      'INSERT INTO motivation_messages (chat_id, message_type, message_text, context_data, points_awarded) VALUES (?, ?, ?, ?, ?)'
    ).bind(chatId, motivation.type, motivation.text, JSON.stringify(motivation.context), 0).run();
  }

  // Создание награды
  async createReward(chatId, reward) {
    await this.db.prepare(
      'INSERT INTO rewards (chat_id, reward_type, reward_name, description, reward_data) VALUES (?, ?, ?, ?, ?)'
    ).bind(chatId, reward.type, reward.name, reward.description, JSON.stringify(reward.data)).run();
  }

  // Вспомогательные методы
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    const recent = values.slice(-3).reduce((a, b) => a + b, 0);
    const older = values.slice(0, -3).reduce((a, b) => a + b, 0);
    if (recent > older * 1.2) return 'increasing';
    if (recent < older * 0.8) return 'decreasing';
    return 'stable';
  }

  calculateOverallScore(activity, progress, motivation) {
    let score = 50; // базовый балл
    
    if (activity.isActive) score += 20;
    if (progress.isImproving) score += 15;
    if (motivation.isMotivated) score += 15;
    
    return Math.min(100, Math.max(0, score));
  }

  calculateMessagePriority(messageType, analysis) {
    const priorities = {
      'reminder': 5,
      'encouragement': 4,
      'challenge': 3,
      'motivation': 2,
      'praise': 1
    };
    
    return priorities[messageType] || 3;
  }

  calculateXPToNextLevel(user) {
    const levels = [0, 100, 300, 600, 1000, 1500, 2500];
    const currentLevel = levels.findIndex(level => user.experience_points < level);
    if (currentLevel === -1) return 0;
    return levels[currentLevel] - user.experience_points;
  }

  // Получить последние N мотивационных сообщений пользователя
  async getRecentMotivationHistory(chatId, limit = 5) {
    const result = await this.db.prepare(
      'SELECT message FROM motivation_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(chatId, limit).all();
    return (result.results || []).map(r => r.message);
  }

  // Сохранить мотивационное сообщение в историю
  async saveMotivationToHistory(chatId, message) {
    await this.db.prepare(
      'INSERT INTO motivation_history (user_id, message) VALUES (?, ?)'
    ).bind(chatId, message).run();
  }

  // Очистить старые сообщения, оставив только последние N
  async cleanupOldMotivationHistory(chatId, keep = 5) {
    await this.db.prepare(
      `DELETE FROM motivation_history WHERE user_id = ? AND id NOT IN (
        SELECT id FROM motivation_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
      )`
    ).bind(chatId, chatId, keep).run();
  }
} 