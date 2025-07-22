// Управление базой данных для системы обучения
// Интеграция с Cloudflare D1

// Расширенная система достижений
export const ACHIEVEMENT_TYPES = {
  // Базовые достижения
  FIRST_TEST: {
    id: 'first_test_completed',
    name: 'Первый шаг',
    description: 'Пройдите свой первый тест',
    icon: '🎯',
    points: 50,
    type: 'basic'
  },
  
  // Серии и стрики
  STREAK_3_DAYS: {
    id: 'streak_3_days',
    name: 'Постоянство',
    description: 'Проходите тесты 3 дня подряд',
    icon: '🔥',
    points: 100,
    type: 'streak'
  },
  STREAK_7_DAYS: {
    id: 'streak_7_days',
    name: 'Недельный марафон',
    description: 'Проходите тесты 7 дней подряд',
    icon: '🏃‍♂️',
    points: 250,
    type: 'streak'
  },
  
  // Качество ответов
  PERFECT_SCORE: {
    id: 'perfect_score',
    name: 'Отличник',
    description: 'Получите 100% правильных ответов',
    icon: '⭐',
    points: 200,
    type: 'quality'
  },
  SPEED_DEMON: {
    id: 'speed_demon',
    name: 'Скорость',
    description: 'Отвечайте быстрее 10 секунд',
    icon: '⚡',
    points: 75,
    type: 'speed'
  },
  
  // Мастерство по категориям
  CATEGORY_MASTER: {
    id: 'category_master',
    name: 'Мастер категории',
    description: 'Достигните 90%+ в любой категории',
    icon: '👑',
    points: 300,
    type: 'mastery'
  },
  
  // Социальные достижения
  HELPER: {
    id: 'helper',
    name: 'Помощник',
    description: 'Помогите 5 другим пользователям',
    icon: '🤝',
    points: 150,
    type: 'social'
  },
  
  // Уровневые достижения
  LEVEL_5: {
    id: 'level_5',
    name: 'Опытный ученик',
    description: 'Достигните 5 уровня',
    icon: '📚',
    points: 500,
    type: 'level'
  },
  LEVEL_10: {
    id: 'level_10',
    name: 'Знаток',
    description: 'Достигните 10 уровня',
    icon: '🎓',
    points: 1000,
    type: 'level'
  },
  
  // Специальные достижения
  WEEKLY_CHAMPION: {
    id: 'weekly_champion',
    name: 'Чемпион недели',
    description: 'Лучший результат недели',
    icon: '🏆',
    points: 750,
    type: 'special'
  },
  
  // Устаревшие достижения (для совместимости)
  FIRST_STEPS: {
    id: 'first_steps',
    name: 'Первые шаги',
    description: 'Ответьте на 10 вопросов',
    icon: '👣',
    points: 25,
    type: 'legacy'
  },
  STREAK_MASTER: {
    id: 'streak_master',
    name: 'Мастер серий',
    description: 'Достигните серии из 5 правильных ответов',
    icon: '🔥',
    points: 50,
    type: 'legacy'
  },
  SCORE_100: {
    id: 'score_100',
    name: 'Сотня',
    description: 'Наберите 100 очков',
    icon: '💯',
    points: 100,
    type: 'legacy'
  },
  AI_MASTER: {
    id: 'ai_master',
    name: 'ИИ Мастер',
    description: 'Задайте 10 вопросов ИИ',
    icon: '🤖',
    points: 75,
    type: 'legacy'
  },
  CATEGORY_EXPERT: {
    id: 'category_expert',
    name: 'Эксперт категорий',
    description: 'Изучите 8 категорий',
    icon: '📚',
    points: 150,
    type: 'legacy'
  },
  CHAMPION: {
    id: 'champion',
    name: 'Чемпион',
    description: 'Наберите 1000 очков',
    icon: '🏆',
    points: 500,
    type: 'legacy'
  }
};

// Система уровней
export const LEVEL_SYSTEM = {
  levels: [
    { level: 1, name: 'Новичок', minExperience: 0, icon: '🌱', color: '#6B7280', rewards: { unlockFeatures: ['basic_tests'] } },
    { level: 2, name: 'Ученик', minExperience: 100, icon: '📚', color: '#3B82F6', rewards: { unlockFeatures: ['daily_challenges'] } },
    { level: 3, name: 'Знаток', minExperience: 300, icon: '🎓', color: '#10B981', rewards: { unlockFeatures: ['advanced_tests'] } },
    { level: 4, name: 'Эксперт', minExperience: 600, icon: '🏆', color: '#F59E0B', rewards: { unlockFeatures: ['ai_consultations'] } },
    { level: 5, name: 'Мастер', minExperience: 1000, icon: '👑', color: '#EF4444', rewards: { unlockFeatures: ['mentor_mode'] } },
    { level: 6, name: 'Гуру', minExperience: 1500, icon: '🌟', color: '#8B5CF6', rewards: { unlockFeatures: ['custom_tests'] } },
    { level: 7, name: 'Легенда', minExperience: 2500, icon: '💎', color: '#06B6D4', rewards: { unlockFeatures: ['all_features'] } }
  ],
  
  getLevel(experience) {
    return this.levels.reduce((current, level) => {
      return experience >= level.minExperience ? level : current;
    });
  },
  
  getProgress(experience) {
    const currentLevel = this.getLevel(experience);
    const nextLevel = this.levels.find(l => l.minExperience > experience);
    
    if (!nextLevel) return 100;
    
    const currentLevelExp = currentLevel.minExperience;
    const nextLevelExp = nextLevel.minExperience;
    const userProgress = experience - currentLevelExp;
    const levelRange = nextLevelExp - currentLevelExp;
    
    return Math.round((userProgress / levelRange) * 100);
  },
  
  getNextLevel(experience) {
    return this.levels.find(l => l.minExperience > experience);
  }
};

// Система опыта
export const EXPERIENCE_SYSTEM = {
  rewards: {
    test_completed: 10,
    correct_answer: 5,
    perfect_score: 50,
    daily_streak: 25,
    achievement_unlocked: 100,
    helping_others: 15,
    category_mastery: 200,
    speed_bonus: 2,
    weekend_bonus: 1.5
  },
  
  multipliers: {
    weekend: 1.5,
    firstSessionOfDay: 2.0,
    consecutiveDay: 1.1,
    levelUp: 1.5
  },
  
  calculateExperience(action, context = {}) {
    let baseExp = this.rewards[action] || 0;
    
    // Применяем множители
    if (context.isWeekend) baseExp *= this.multipliers.weekend;
    if (context.isFirstSession) baseExp *= this.multipliers.firstSessionOfDay;
    if (context.consecutiveDays > 1) {
      baseExp *= Math.pow(this.multipliers.consecutiveDay, Math.min(context.consecutiveDays - 1, 7));
    }
    if (context.isLevelUp) baseExp *= this.multipliers.levelUp;
    
    return Math.round(baseExp);
  }
};

export class DatabaseManager {
  constructor(env) {
    this.env = env;
    this.db = env.DB;
    
    console.log('[DatabaseManager] Constructor called');
    console.log('[DatabaseManager] env:', env ? 'present' : 'missing');
    console.log('[DatabaseManager] env.DB:', env?.DB ? 'present' : 'missing');
    console.log('[DatabaseManager] this.db:', this.db ? 'present' : 'missing');
    
    // Добавляем подробное логирование всех свойств env
    if (env) {
      console.log('[DatabaseManager] env keys:', Object.keys(env));
      console.log('[DatabaseManager] env.WINE_CACHE:', env.WINE_CACHE ? 'present' : 'missing');
      console.log('[DatabaseManager] env.WORKER_URL:', env.WORKER_URL ? 'present' : 'missing');
      console.log('[DatabaseManager] env.DB type:', typeof env.DB);
      console.log('[DatabaseManager] env.DB constructor:', env.DB?.constructor?.name);
    }
  }

  // Метод для прямого доступа к базе данных (для совместимости)
  prepare(sql) {
    console.log('[DatabaseManager] prepare called with sql:', sql.substring(0, 50) + '...');
    console.log('[DatabaseManager] this.db:', this.db ? 'present' : 'missing');
    
    if (!this.db) {
      console.error('[DatabaseManager] Database not available in prepare method');
      throw new Error('Database not available');
    }
    
    console.log('[DatabaseManager] Calling this.db.prepare...');
    return this.db.prepare(sql);
  }

  // Инициализация пользователя
  async initUser(chatId, telegramUser = null) {
    try {
      console.log('[DatabaseManager] initUser called with chatId:', chatId);
      
      if (!this.db) {
        console.error('[DatabaseManager] Database not available');
        return false;
      }
      
      // Проверяем, существует ли пользователь
      console.log('[DatabaseManager] Checking if user exists...');
      let existingUser = null;
      try {
        existingUser = await this.db.prepare(
          'SELECT chat_id FROM users WHERE chat_id = ?'
        ).bind(chatId).first();
        console.log('[DatabaseManager] After SELECT chat_id');
        console.log('[DatabaseManager] existingUser:', existingUser);
      } catch (e) {
        console.error('[DatabaseManager] Error in SELECT chat_id:', e);
        throw e;
      }

      if (!existingUser) {
        // Создаем нового пользователя
        console.log('[DatabaseManager] Creating new user...');
        const username = telegramUser?.username || null;
        const firstName = telegramUser?.first_name || null;
        const lastName = telegramUser?.last_name || null;

        await this.db.prepare(`
          INSERT INTO users (chat_id, username, first_name, last_name, created_at, last_activity)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(chatId, username, firstName, lastName).run();

        console.log(`[DatabaseManager] Created new user: ${chatId}`);
      } else {
        // Обновляем время последней активности
        console.log('[DatabaseManager] Updating user activity...');
        await this.db.prepare(`
          UPDATE users SET last_activity = CURRENT_TIMESTAMP
          WHERE chat_id = ?
        `).bind(chatId).run();
        console.log('[DatabaseManager] User activity updated');
      }

      console.log('[DatabaseManager] initUser completed successfully');
      return true;
    } catch (error) {
      console.error('[DatabaseManager] Error initializing user:', error);
      console.error('[DatabaseManager] Error stack:', error.stack);
      return false;
    }
  }

  // Получение данных пользователя
  async getUser(chatId) {
    try {
      console.log('[DatabaseManager] getUser called with chatId:', chatId);
      
      if (!this.db) {
        console.error('[DatabaseManager] Database not available in getUser');
        return null;
      }
      
      const user = await this.db.prepare(`
        SELECT * FROM users WHERE chat_id = ?
      `).bind(chatId).first();
      
      console.log('[DatabaseManager] getUser result:', user);
      return user;
    } catch (error) {
      console.error('[DatabaseManager] Error getting user:', error);
      console.error('[DatabaseManager] Error stack:', error.stack);
      return null;
    }
  }

  // Обновление статистики пользователя
  async updateUserStats(chatId, stats) {
    try {
      const {
        totalScore = 0,
        totalQuestions = 0,
        totalCorrect = 0,
        learningStreak = 0,
        maxStreak = 0,
        difficultyLevel = 'beginner',
        experiencePoints = 0,
        consecutiveDays = 0
      } = stats;

      await this.db.prepare(`
        UPDATE users SET 
          total_score = total_score + ?,
          total_questions = total_questions + ?,
          total_correct = total_correct + ?,
          learning_streak = ?,
          max_streak = CASE WHEN ? > max_streak THEN ? ELSE max_streak END,
          difficulty_level = ?,
          experience_points = experience_points + ?,
          consecutive_days = ?,
          last_activity = CURRENT_TIMESTAMP
        WHERE chat_id = ?
      `).bind(
        totalScore, totalQuestions, totalCorrect, 
        learningStreak, maxStreak, maxStreak,
        difficultyLevel, experiencePoints, consecutiveDays, chatId
      ).run();

      return true;
    } catch (error) {
      console.error('Error updating user stats:', error);
      return false;
    }
  }

  // Создание новой сессии обучения
  async createLearningSession(chatId, sessionType) {
    try {
      const result = await this.db.prepare(`
        INSERT INTO learning_sessions (chat_id, session_type, start_time)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).bind(chatId, sessionType).run();

      return result.meta.last_row_id;
    } catch (error) {
      console.error('Error creating learning session:', error);
      return null;
    }
  }

  // Создание сессии быстрого теста
  async startQuickTestSession(chatId) {
    try {
      const result = await this.db.prepare(`
        INSERT INTO learning_sessions (chat_id, session_type, start_time)
        VALUES (?, 'quick_test', CURRENT_TIMESTAMP)
      `).bind(chatId).run();

      return {
        id: result.meta.last_row_id,
        sessionType: 'quick_test',
        startTime: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error starting quick test session:', error);
      return null;
    }
  }

  // Получение вопроса для теста
  async getTestQuestion(sessionId) {
    try {
      // Получаем информацию о сессии
      const session = await this.db.prepare(`
        SELECT chat_id, session_type FROM learning_sessions WHERE id = ?
      `).bind(sessionId).first();

      if (!session) {
        return null;
      }

      // Генерируем простой вопрос (в реальной реализации здесь была бы логика генерации)
      const question = {
        id: `question_${Date.now()}`,
        question: "Какой тип вина лучше всего сочетается с красным мясом?",
        options: {
          A: "Белое сухое вино",
          B: "Красное сухое вино", 
          C: "Розовое вино",
          D: "Игристое вино"
        },
        correctAnswer: "B",
        explanation: "Красное сухое вино традиционно сочетается с красным мясом благодаря танинам и структуре.",
        category: "Вина",
        difficulty: "beginner"
      };

      return question;
    } catch (error) {
      console.error('Error getting test question:', error);
      return null;
    }
  }

  // Отправка ответа на вопрос теста
  async submitTestAnswer(sessionId, questionId, answer, isCorrect) {
    try {
      // Получаем информацию о сессии
      const session = await this.db.prepare(`
        SELECT chat_id, session_type FROM learning_sessions WHERE id = ?
      `).bind(sessionId).first();

      if (!session) {
        return null;
      }

      // Сохраняем ответ
      await this.db.prepare(`
        INSERT INTO user_answers (
          chat_id, session_id, question_text, user_answer, correct_answer,
          is_correct, category, question_type, response_time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        session.chat_id, 
        sessionId, 
        `Question ${questionId}`, 
        answer, 
        isCorrect ? answer : 'unknown',
        isCorrect ? 1 : 0, 
        'General', 
        'test_question',
        Date.now()
      ).run();

      // Обновляем статистику сессии
      const result = await this.db.prepare(`
        UPDATE learning_sessions SET 
          total_questions = total_questions + 1,
          correct_answers = correct_answers + ?
        WHERE id = ?
      `).bind(isCorrect ? 1 : 0, sessionId).run();

      return {
        sessionId,
        questionId,
        answer,
        isCorrect,
        updated: true
      };
    } catch (error) {
      console.error('Error submitting test answer:', error);
      return null;
    }
  }

  // Завершение сессии обучения
  async finishLearningSession(sessionId, stats) {
    try {
      const {
        totalQuestions = 0,
        correctAnswers = 0,
        score = 0,
        experienceGained = 0
      } = stats;

      await this.db.prepare(`
        UPDATE learning_sessions SET 
          end_time = CURRENT_TIMESTAMP,
          total_questions = ?,
          correct_answers = ?,
          score = ?,
          experience_gained = ?
        WHERE id = ?
      `).bind(totalQuestions, correctAnswers, score, experienceGained, sessionId).run();

      return true;
    } catch (error) {
      console.error('Error finishing learning session:', error);
      return false;
    }
  }

  // Сохранение ответа пользователя
  async saveAnswer(chatId, sessionId, answerData) {
    try {
      const {
        questionText,
        userAnswer,
        correctAnswer,
        isCorrect,
        category,
        questionType,
        wineId,
        responseTimeMs
      } = answerData;

      await this.db.prepare(`
        INSERT INTO user_answers (
          chat_id, session_id, question_text, user_answer, correct_answer,
          is_correct, category, question_type, wine_id, response_time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        chatId, sessionId, questionText, userAnswer, correctAnswer,
        isCorrect ? 1 : 0, category, questionType, wineId, responseTimeMs
      ).run();

      // Обновляем статистику по категориям
      await this.updateCategoryStats(chatId, category, isCorrect);
      
      // Обновляем статистику по типам вопросов
      await this.updateQuestionTypeStats(chatId, questionType, isCorrect);

      return true;
    } catch (error) {
      console.error('Error saving answer:', error);
      return false;
    }
  }

  // Обновление статистики по категориям
  async updateCategoryStats(chatId, category, isCorrect) {
    try {
      // Проверяем, существует ли запись
      const existing = await this.db.prepare(`
        SELECT id FROM category_stats WHERE chat_id = ? AND category = ?
      `).bind(chatId, category).first();

      if (existing) {
        // Обновляем существующую запись
        await this.db.prepare(`
          UPDATE category_stats SET 
            total_questions = total_questions + 1,
            correct_answers = correct_answers + ?,
            last_activity = CURRENT_TIMESTAMP
          WHERE chat_id = ? AND category = ?
        `).bind(isCorrect ? 1 : 0, chatId, category).run();
      } else {
        // Создаем новую запись
        await this.db.prepare(`
          INSERT INTO category_stats (chat_id, category, total_questions, correct_answers)
          VALUES (?, ?, 1, ?)
        `).bind(chatId, category, isCorrect ? 1 : 0).run();
      }
    } catch (error) {
      console.error('Error updating category stats:', error);
    }
  }

  // Обновление статистики по типам вопросов
  async updateQuestionTypeStats(chatId, questionType, isCorrect) {
    try {
      const existing = await this.db.prepare(`
        SELECT id FROM question_type_stats WHERE chat_id = ? AND question_type = ?
      `).bind(chatId, questionType).first();

      if (existing) {
        await this.db.prepare(`
          UPDATE question_type_stats SET 
            total_questions = total_questions + 1,
            correct_answers = correct_answers + ?,
            last_activity = CURRENT_TIMESTAMP
          WHERE chat_id = ? AND question_type = ?
        `).bind(isCorrect ? 1 : 0, chatId, questionType).run();
      } else {
        await this.db.prepare(`
          INSERT INTO question_type_stats (chat_id, question_type, total_questions, correct_answers)
          VALUES (?, ?, 1, ?)
        `).bind(chatId, questionType, isCorrect ? 1 : 0).run();
      }
    } catch (error) {
      console.error('Error updating question type stats:', error);
    }
  }

  // Получение статистики пользователя
  async getUserStats(chatId) {
    try {
      console.log('[DatabaseManager] getUserStats called with chatId:', chatId);
      
      if (!this.db) {
        console.error('[DatabaseManager] Database not available in getUserStats');
        return null;
      }
      
      console.log('[DatabaseManager] Getting user data...');
      const user = await this.getUser(chatId);
      console.log('[DatabaseManager] User data:', user);
      
      if (!user) {
        console.log('[DatabaseManager] User not found, returning null');
        return null;
      }

      console.log('[DatabaseManager] Getting category stats...');
      // Получаем статистику по категориям
      const categoryStats = await this.db.prepare(`
        SELECT category, total_questions, correct_answers,
               ROUND(CAST(correct_answers AS FLOAT) / total_questions * 100, 1) as accuracy
        FROM category_stats 
        WHERE chat_id = ?
        ORDER BY total_questions DESC
      `).bind(chatId).all();
      console.log('[DatabaseManager] Category stats:', categoryStats);

      console.log('[DatabaseManager] Getting question type stats...');
      // Получаем статистику по типам вопросов
      const questionTypeStats = await this.db.prepare(`
        SELECT question_type, total_questions, correct_answers,
               ROUND(CAST(correct_answers AS FLOAT) / total_questions * 100, 1) as accuracy
        FROM question_type_stats 
        WHERE chat_id = ?
        ORDER BY total_questions DESC
      `).bind(chatId).all();
      console.log('[DatabaseManager] Question type stats:', questionTypeStats);

      console.log('[DatabaseManager] Getting recent sessions...');
      // Получаем последние сессии
      const recentSessions = await this.db.prepare(`
        SELECT session_type, total_questions, correct_answers, score, start_time
        FROM learning_sessions 
        WHERE chat_id = ? AND end_time IS NOT NULL
        ORDER BY start_time DESC 
        LIMIT 10
      `).bind(chatId).all();
      console.log('[DatabaseManager] Recent sessions:', recentSessions);

      const result = {
        user,
        categoryStats: categoryStats.results,
        questionTypeStats: questionTypeStats.results,
        recentSessions: recentSessions.results
      };
      
      console.log('[DatabaseManager] Final getUserStats result:', result);
      return result;
    } catch (error) {
      console.error('[DatabaseManager] Error getting user stats:', error);
      console.error('[DatabaseManager] Error stack:', error.stack);
      return null;
    }
  }

  // Получение достижений пользователя
  async getAchievements(chatId) {
    try {
      const achievements = await this.db.prepare(`
        SELECT achievement_type, achievement_name, description, 
               unlocked_at, progress_value, icon, points
        FROM achievements 
        WHERE chat_id = ?
        ORDER BY unlocked_at DESC
      `).bind(chatId).all();

      return achievements.results;
    } catch (error) {
      console.error('Error getting achievements:', error);
      return [];
    }
  }

  // Проверка и награждение достижений
  async checkAndAwardAchievements(chatId, stats) {
    try {
      const user = await this.getUser(chatId);
      if (!user) return [];

      const newAchievements = [];
      const existingAchievements = await this.getAchievements(chatId);
      const existingTypes = existingAchievements.map(a => a.achievement_type);

      // Получаем дополнительную статистику для проверки достижений
      const categoryStats = await this.db.prepare(`
        SELECT category, total_questions, correct_answers,
               ROUND(CAST(correct_answers AS FLOAT) / total_questions * 100, 1) as accuracy
        FROM category_stats 
        WHERE chat_id = ?
      `).bind(chatId).all();

      const recentAnswers = await this.db.prepare(`
        SELECT response_time_ms, is_correct
        FROM user_answers 
        WHERE chat_id = ? 
        ORDER BY answered_at DESC 
        LIMIT 10
      `).bind(chatId).all();

      // Проверяем каждое достижение
      for (const [type, achievement] of Object.entries(ACHIEVEMENT_TYPES)) {
        if (existingTypes.includes(achievement.id)) continue;

        let shouldAward = false;
        let progressValue = 0;

        switch (achievement.id) {
          case 'first_test_completed':
            shouldAward = (user.total_questions || 0) >= 1;
            progressValue = user.total_questions || 0;
            break;

          case 'streak_3_days':
            shouldAward = (user.consecutive_days || 0) >= 3;
            progressValue = user.consecutive_days || 0;
            break;

          case 'streak_7_days':
            shouldAward = (user.consecutive_days || 0) >= 7;
            progressValue = user.consecutive_days || 0;
            break;

          case 'perfect_score':
            // Проверяем последнюю сессию на 100% точность
            const lastSession = await this.db.prepare(`
              SELECT total_questions, correct_answers
              FROM learning_sessions 
              WHERE chat_id = ? AND end_time IS NOT NULL
              ORDER BY end_time DESC 
              LIMIT 1
            `).bind(chatId).first();
            
            if (lastSession && lastSession.total_questions >= 5) {
              const accuracy = (lastSession.correct_answers / lastSession.total_questions) * 100;
              shouldAward = accuracy === 100;
              progressValue = Math.round(accuracy);
            }
            break;

          case 'speed_demon':
            // Проверяем быстрые ответы (менее 10 секунд)
            const fastAnswers = recentAnswers.results.filter(a => 
              a.response_time_ms && a.response_time_ms < 10000 && a.is_correct
            ).length;
            shouldAward = fastAnswers >= 5;
            progressValue = fastAnswers;
            break;

          case 'category_master':
            // Проверяем мастерство в категориях (90%+ точность)
            const masterCategories = categoryStats.results.filter(c => 
              c.total_questions >= 10 && c.accuracy >= 90
            ).length;
            shouldAward = masterCategories >= 1;
            progressValue = masterCategories;
            break;

          case 'level_5':
            const currentLevel = LEVEL_SYSTEM.getLevel(user.experience_points || 0);
            shouldAward = currentLevel.level >= 5;
            progressValue = currentLevel.level;
            break;

          case 'level_10':
            const userLevel = LEVEL_SYSTEM.getLevel(user.experience_points || 0);
            shouldAward = userLevel.level >= 10;
            progressValue = userLevel.level;
            break;

          // Устаревшие достижения для совместимости
          case 'first_steps':
            shouldAward = (user.total_questions || 0) >= 10;
            progressValue = user.total_questions || 0;
            break;

          case 'streak_master':
            shouldAward = (user.max_streak || 0) >= 5;
            progressValue = user.max_streak || 0;
            break;

          case 'score_100':
            shouldAward = (user.total_score || 0) >= 100;
            progressValue = user.total_score || 0;
            break;

          case 'champion':
            shouldAward = (user.total_score || 0) >= 1000;
            progressValue = user.total_score || 0;
            break;

          default:
            // Для остальных достижений используем базовую логику
            shouldAward = false;
            break;
        }

        if (shouldAward) {
          // Награждаем достижением
          await this.db.prepare(`
            INSERT INTO achievements (
              chat_id, achievement_type, achievement_name, description, 
              progress_value, icon, points
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            chatId, achievement.id, achievement.name, achievement.description,
            progressValue, achievement.icon, achievement.points
          ).run();

          // Добавляем очки опыта
          await this.updateUserStats(chatId, {
            experiencePoints: achievement.points
          });

          // Логируем активность
          await this.logActivity(
            chatId, 
            'achievement_unlocked', 
            `Получено достижение: ${achievement.name}`,
            achievement.points,
            achievement.points
          );

          newAchievements.push(achievement);
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  // Логирование активности
  async logActivity(chatId, activityType, description, pointsEarned = 0, experienceEarned = 0) {
    try {
      await this.db.prepare(`
        INSERT INTO activity_log (chat_id, activity_type, description, points_earned, experience_earned)
        VALUES (?, ?, ?, ?, ?)
      `).bind(chatId, activityType, description, pointsEarned, experienceEarned).run();
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  // Получение истории активности
  async getActivityHistory(chatId, limit = 20) {
    try {
      const activities = await this.db.prepare(`
        SELECT activity_type, description, points_earned, experience_earned, created_at
        FROM activity_log 
        WHERE chat_id = ?
        ORDER BY created_at DESC 
        LIMIT ?
      `).bind(chatId, limit).all();

      return activities.results;
    } catch (error) {
      console.error('Error getting activity history:', error);
      return [];
    }
  }

  // Экспорт данных пользователя
  async exportUserData(chatId) {
    try {
      const user = await this.getUser(chatId);
      const achievements = await this.getAchievements(chatId);
      const activityHistory = await this.getActivityHistory(chatId, 100);
      const stats = await this.getUserStats(chatId);

      return {
        user,
        achievements,
        activityHistory,
        stats,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      return null;
    }
  }

  // Получение информации об уровне пользователя
  async getUserLevel(chatId) {
    try {
      const user = await this.getUser(chatId);
      if (!user) return null;

      const currentLevel = LEVEL_SYSTEM.getLevel(user.experience_points || 0);
      const progress = LEVEL_SYSTEM.getProgress(user.experience_points || 0);
      const nextLevel = LEVEL_SYSTEM.getNextLevel(user.experience_points || 0);

      return {
        currentLevel,
        progress,
        nextLevel,
        experiencePoints: user.experience_points || 0
      };
    } catch (error) {
      console.error('Error getting user level:', error);
      return null;
    }
  }

  // Добавление опыта пользователю
  async addExperience(chatId, action, context = {}) {
    try {
      const experienceGained = EXPERIENCE_SYSTEM.calculateExperience(action, context);
      
      if (experienceGained > 0) {
        const user = await this.getUser(chatId);
        const oldExperience = user.experience_points || 0;
        const newExperience = oldExperience + experienceGained;

        await this.updateUserStats(chatId, {
          experiencePoints: experienceGained
        });

        // Проверяем повышение уровня
        const oldLevel = LEVEL_SYSTEM.getLevel(oldExperience);
        const newLevel = LEVEL_SYSTEM.getLevel(newExperience);

        if (newLevel.level > oldLevel.level) {
          // Логируем повышение уровня
          await this.logActivity(
            chatId,
            'level_up',
            `Повышение уровня: ${oldLevel.name} → ${newLevel.name}`,
            newLevel.level * 50,
            newLevel.level * 25
          );

          return {
            levelUp: true,
            oldLevel,
            newLevel,
            experienceGained
          };
        }

        return {
          levelUp: false,
          experienceGained
        };
      }

      return { levelUp: false, experienceGained: 0 };
    } catch (error) {
      console.error('Error adding experience:', error);
      return { levelUp: false, experienceGained: 0 };
    }
  }

  // Получение прогресса по достижениям
  async getAchievementProgress(chatId) {
    try {
      const user = await this.getUser(chatId);
      if (!user) return [];

      const achievements = await this.getAchievements(chatId);
      const unlockedTypes = achievements.map(a => a.achievement_type);

      const progress = [];
      
      for (const [type, achievement] of Object.entries(ACHIEVEMENT_TYPES)) {
        const isUnlocked = unlockedTypes.includes(achievement.id);
        const currentValue = this.getCurrentProgressValue(achievement.id, user);
        const targetValue = this.getTargetValue(achievement.id);
        const progressPercent = Math.min(Math.round((currentValue / targetValue) * 100), 100);

        progress.push({
          type,
          achievement,
          isUnlocked,
          currentValue,
          targetValue,
          progressPercent
        });
      }

      return progress;
    } catch (error) {
      console.error('Error getting achievement progress:', error);
      return [];
    }
  }

  // Получение текущего значения прогресса для достижения
  getCurrentProgressValue(achievementId, user) {
    switch (achievementId) {
      case 'first_test_completed':
        return user.total_questions || 0;
      case 'streak_3_days':
      case 'streak_7_days':
        return user.consecutive_days || 0;
      case 'perfect_score':
        return 0; // Будет вычисляться динамически
      case 'speed_demon':
        return 0; // Будет вычисляться динамически
      case 'category_master':
        return 0; // Будет вычисляться динамически
      case 'level_5':
      case 'level_10':
        const currentLevel = LEVEL_SYSTEM.getLevel(user.experience_points || 0);
        return currentLevel.level;
      case 'first_steps':
        return user.total_questions || 0;
      case 'streak_master':
        return user.max_streak || 0;
      case 'score_100':
      case 'champion':
        return user.total_score || 0;
      default:
        return 0;
    }
  }

  // Получение целевого значения для достижения
  getTargetValue(achievementId) {
    switch (achievementId) {
      case 'first_test_completed':
        return 1;
      case 'streak_3_days':
        return 3;
      case 'streak_7_days':
        return 7;
      case 'perfect_score':
        return 100;
      case 'speed_demon':
        return 5;
      case 'category_master':
        return 1;
      case 'level_5':
        return 5;
      case 'level_10':
        return 10;
      case 'first_steps':
        return 10;
      case 'streak_master':
        return 5;
      case 'score_100':
        return 100;
      case 'champion':
        return 1000;
      default:
        return 1;
    }
  }

  // Получить все chatId пользователей для рассылки напоминаний
  async getAllUserChatIds() {
    if (!this.db) {
      console.error('[DatabaseManager] Database not available in getAllUserChatIds');
      return [];
    }
    const result = await this.db.prepare(`
      SELECT 
        chat_id as chatId,
        last_learning_date as lastLearningDate,
        last_activity as lastActiveDate
      FROM users
    `).all();
    return result.results || [];
  }

  // Получить время последней мотивации
  async getLastMotivationSent(chatId) {
    if (!this.db) return null;
    const result = await this.db.prepare('SELECT last_motivation_sent FROM users WHERE chat_id = ?').bind(chatId).first();
    return result?.last_motivation_sent || null;
  }

  // Обновить время последней мотивации
  async updateLastMotivationSent(chatId, date) {
    if (!this.db) return false;
    await this.db.prepare('UPDATE users SET last_motivation_sent = ? WHERE chat_id = ?').bind(date.toISOString(), chatId).run();
    return true;
  }

  // Получить последние достижения пользователя
  async getRecentAchievements(chatId, limit = 3) {
    if (!this.db) return [];
    const result = await this.db.prepare('SELECT achievement_name FROM achievements WHERE chat_id = ? ORDER BY unlocked_at DESC LIMIT ?').bind(chatId, limit).all();
    return result.results?.map(r => r.achievement_name) || [];
  }

  // Получить динамику прогресса за последнюю неделю
  async getProgressDynamics(chatId) {
    if (!this.db) return 0;
    // Получаем XP неделю назад и сейчас
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const xpWeekAgoResult = await this.db.prepare('SELECT experience_points FROM users WHERE chat_id = ? AND last_activity <= ? ORDER BY last_activity DESC LIMIT 1').bind(chatId, weekAgo).first();
    const xpNowResult = await this.db.prepare('SELECT experience_points FROM users WHERE chat_id = ?').bind(chatId).first();
    const xpWeekAgo = xpWeekAgoResult?.experience_points || 0;
    const xpNow = xpNowResult?.experience_points || 0;
    return xpNow - xpWeekAgo;
  }
} 