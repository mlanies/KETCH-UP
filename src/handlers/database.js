// Управление базой данных для системы обучения
// Интеграция с Cloudflare D1

export class DatabaseManager {
  constructor(env) {
    this.env = env;
    this.db = env.DB;
  }

  // Инициализация пользователя
  async initUser(chatId, telegramUser = null) {
    try {
      // Проверяем, существует ли пользователь
      const existingUser = await this.db.prepare(
        'SELECT chat_id FROM users WHERE chat_id = ?'
      ).bind(chatId).first();

      if (!existingUser) {
        // Создаем нового пользователя
        const username = telegramUser?.username || null;
        const firstName = telegramUser?.first_name || null;
        const lastName = telegramUser?.last_name || null;

        await this.db.prepare(`
          INSERT INTO users (chat_id, username, first_name, last_name, created_at, last_activity)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).bind(chatId, username, firstName, lastName).run();

        console.log(`Created new user: ${chatId}`);
      } else {
        // Обновляем время последней активности
        await this.db.prepare(`
          UPDATE users SET last_activity = CURRENT_TIMESTAMP
          WHERE chat_id = ?
        `).bind(chatId).run();
      }

      return true;
    } catch (error) {
      console.error('Error initializing user:', error);
      return false;
    }
  }

  // Получение данных пользователя
  async getUser(chatId) {
    try {
      const user = await this.db.prepare(`
        SELECT * FROM users WHERE chat_id = ?
      `).bind(chatId).first();
      
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
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
      const user = await this.getUser(chatId);
      if (!user) return null;

      // Получаем статистику по категориям
      const categoryStats = await this.db.prepare(`
        SELECT category, total_questions, correct_answers,
               ROUND(CAST(correct_answers AS FLOAT) / total_questions * 100, 1) as accuracy
        FROM category_stats 
        WHERE chat_id = ?
        ORDER BY total_questions DESC
      `).bind(chatId).all();

      // Получаем статистику по типам вопросов
      const questionTypeStats = await this.db.prepare(`
        SELECT question_type, total_questions, correct_answers,
               ROUND(CAST(correct_answers AS FLOAT) / total_questions * 100, 1) as accuracy
        FROM question_type_stats 
        WHERE chat_id = ?
        ORDER BY total_questions DESC
      `).bind(chatId).all();

      // Получаем последние сессии
      const recentSessions = await this.db.prepare(`
        SELECT session_type, total_questions, correct_answers, score, start_time
        FROM learning_sessions 
        WHERE chat_id = ? AND end_time IS NOT NULL
        ORDER BY start_time DESC 
        LIMIT 10
      `).bind(chatId).all();

      return {
        user,
        categoryStats: categoryStats.results,
        questionTypeStats: questionTypeStats.results,
        recentSessions: recentSessions.results
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
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

      // Проверяем каждое достижение
      for (const [type, achievement] of Object.entries(ACHIEVEMENT_TYPES)) {
        if (existingTypes.includes(type)) continue;

        if (achievement.condition(stats)) {
          // Награждаем достижением
          await this.db.prepare(`
            INSERT INTO achievements (
              chat_id, achievement_type, achievement_name, description, 
              progress_value, icon, points
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            chatId, type, achievement.name, achievement.description,
            stats.totalQuestions, achievement.icon, achievement.points
          ).run();

          // Добавляем очки опыта
          await this.updateUserStats(chatId, {
            experiencePoints: achievement.points
          });

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
}

// Константы достижений (будут использоваться в системе достижений)
export const ACHIEVEMENT_TYPES = {
  FIRST_STEPS: {
    id: 'first_steps',
    name: 'Первые шаги',
    description: 'Ответьте на 10 вопросов',
    condition: (stats) => stats.totalQuestions >= 10,
    icon: '🎯',
    points: 10
  },
  
  STREAK_MASTER: {
    id: 'streak_master',
    name: 'Серия побед',
    description: '5 правильных ответов подряд',
    condition: (stats) => stats.maxStreak >= 5,
    icon: '🔥',
    points: 25
  },
  
  SCORE_100: {
    id: 'score_100',
    name: 'Стобалльник',
    description: 'Заработайте 100 баллов',
    condition: (stats) => stats.totalScore >= 100,
    icon: '💎',
    points: 50
  },
  
  AI_MASTER: {
    id: 'ai_master',
    name: 'ИИ-мастер',
    description: 'Пройдите 10 ИИ-вопросов',
    condition: (stats) => stats.aiQuestions >= 10,
    icon: '🤖',
    points: 75
  },
  
  CATEGORY_EXPERT: {
    id: 'category_expert',
    name: 'Категорийный эксперт',
    description: 'Изучите все категории',
    condition: (stats) => stats.categoriesStudied >= 8,
    icon: '📚',
    points: 100
  },
  
  CHAMPION: {
    id: 'champion',
    name: 'Чемпион',
    description: 'Заработайте 1000 баллов',
    condition: (stats) => stats.totalScore >= 1000,
    icon: '🏆',
    points: 200
  },
  
  // Новые достижения
  PERFECT_ACCURACY: {
    id: 'perfect_accuracy',
    name: 'Точность 100%',
    description: 'Пройдите тест с идеальной точностью (минимум 5 вопросов)',
    condition: (stats) => stats.accuracy >= 100 && stats.totalQuestions >= 5,
    icon: '🎯',
    points: 150
  },
  
  DAILY_WARRIOR: {
    id: 'daily_warrior',
    name: 'Ежедневный воин',
    description: 'Выполните 7 ежедневных заданий подряд',
    condition: (stats) => stats.consecutiveDays >= 7,
    icon: '📅',
    points: 100
  },
  
  SPEED_DEMON: {
    id: 'speed_demon',
    name: 'Скоростной демон',
    description: 'Ответьте на 10 вопросов быстрее чем за 2 минуты',
    condition: (stats) => stats.fastAnswers >= 10,
    icon: '⚡',
    points: 75
  },
  
  KNOWLEDGE_SEEKER: {
    id: 'knowledge_seeker',
    name: 'Искатель знаний',
    description: 'Изучите 50 разных напитков',
    condition: (stats) => stats.uniqueWines >= 50,
    icon: '🔍',
    points: 125
  },
  
  WEEKEND_LEARNER: {
    id: 'weekend_learner',
    name: 'Выходной ученик',
    description: 'Занимайтесь в течение 4 выходных подряд',
    condition: (stats) => stats.weekendSessions >= 4,
    icon: '🌅',
    points: 80
  },
  
  MORNING_PERSON: {
    id: 'morning_person',
    name: 'Ранняя пташка',
    description: 'Занимайтесь 5 раз до 9 утра',
    condition: (stats) => stats.morningSessions >= 5,
    icon: '🌅',
    points: 60
  },
  
  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Ночная сова',
    description: 'Занимайтесь 5 раз после 22:00',
    condition: (stats) => stats.nightSessions >= 5,
    icon: '🦉',
    points: 60
  },
  
  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: 'Социальная бабочка',
    description: 'Поделитесь результатами 3 раза',
    condition: (stats) => stats.sharedResults >= 3,
    icon: '🦋',
    points: 40
  },
  
  CONSISTENCY_KING: {
    id: 'consistency_king',
    name: 'Король постоянства',
    description: 'Занимайтесь 30 дней подряд',
    condition: (stats) => stats.consecutiveDays >= 30,
    icon: '👑',
    points: 300
  },
  
  EXPLORER: {
    id: 'explorer',
    name: 'Исследователь',
    description: 'Попробуйте все типы вопросов',
    condition: (stats) => stats.questionTypes >= 8,
    icon: '🗺️',
    points: 90
  }
}; 