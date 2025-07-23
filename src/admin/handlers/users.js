// src/admin/handlers/users.js
// Управление пользователями

import { DatabaseManager } from '../../handlers/database.js';
import { TelegramHandler } from './telegram.js';

export class UsersHandler {
  constructor(env) {
    this.env = env;
    this.database = new DatabaseManager(env);
    this.telegram = new TelegramHandler(env);
  }

  // Вспомогательный метод для форматирования имени пользователя
  formatUserName(user) {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else if (user.username) {
      return `@${user.username}`;
    } else {
      return `Пользователь #${user.chat_id}`;
    }
  }

  // Получение списка пользователей
  async getUsersList(limit = 20, offset = 0) {
    try {
      const db = this.database.db;
      
      const users = await db.prepare(`
        SELECT 
          chat_id,
          username,
          first_name,
          last_name,
          created_at,
          last_activity,
          total_score,
          total_questions,
          total_correct,
          experience_points,
          difficulty_level,
          learning_streak,
          consecutive_days
        FROM users
        ORDER BY last_activity DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();

      return {
        success: true,
        data: users.results
      };
    } catch (error) {
      console.error('[USERS] Error getting users list:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Получение информации о конкретном пользователе
  async getUserInfo(chatId) {
    try {
      const db = this.database.db;
      
      // Основная информация о пользователе
      const user = await db.prepare(`
        SELECT 
          chat_id,
          username,
          first_name,
          last_name,
          created_at,
          last_activity,
          total_score,
          total_questions,
          total_correct,
          experience_points,
          difficulty_level,
          learning_streak,
          consecutive_days,
          motivation_level,
          preferred_learning_time,
          learning_style
        FROM users
        WHERE chat_id = ?
      `).bind(chatId).first();

      if (!user) {
        return {
          success: false,
          error: 'Пользователь не найден'
        };
      }

      // Статистика по категориям
      const categoryStats = await db.prepare(`
        SELECT 
          category,
          total_questions,
          correct_answers,
          ROUND(CAST(correct_answers AS FLOAT) / total_questions * 100, 1) as accuracy
        FROM category_stats
        WHERE chat_id = ?
        ORDER BY total_questions DESC
      `).bind(chatId).all();

      // Последние сессии
      const recentSessions = await db.prepare(`
        SELECT 
          id,
          session_type,
          start_time,
          end_time,
          total_questions,
          correct_answers,
          score,
          experience_gained
        FROM learning_sessions
        WHERE chat_id = ?
        ORDER BY start_time DESC
        LIMIT 10
      `).bind(chatId).all();

      // Достижения
      const achievements = await db.prepare(`
        SELECT 
          achievement_type,
          achievement_name,
          description,
          unlocked_at,
          points
        FROM achievements
        WHERE chat_id = ?
        ORDER BY unlocked_at DESC
        LIMIT 10
      `).bind(chatId).all();

      return {
        success: true,
        data: {
          user,
          categoryStats: categoryStats.results,
          recentSessions: recentSessions.results,
          achievements: achievements.results
        }
      };
    } catch (error) {
      console.error('[USERS] Error getting user info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Поиск пользователей
  async searchUsers(query) {
    try {
      const db = this.database.db;
      
      const users = await db.prepare(`
        SELECT 
          chat_id,
          username,
          first_name,
          last_name,
          created_at,
          last_activity,
          total_score,
          total_questions,
          total_correct
        FROM users
        WHERE username LIKE ? OR first_name LIKE ? OR last_name LIKE ?
        ORDER BY last_activity DESC
        LIMIT 20
      `).bind(`%${query}%`, `%${query}%`, `%${query}%`).all();

      return {
        success: true,
        data: users.results
      };
    } catch (error) {
      console.error('[USERS] Error searching users:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Получение неактивных пользователей
  async getInactiveUsers(days = 7) {
    try {
      const db = this.database.db;
      
      const users = await db.prepare(`
        SELECT 
          chat_id,
          username,
          first_name,
          last_name,
          created_at,
          last_activity,
          total_score,
          total_questions,
          total_correct
        FROM users
        WHERE last_activity < datetime('now', '-? days')
        ORDER BY last_activity ASC
        LIMIT 50
      `).bind(days).all();

      return {
        success: true,
        data: users.results
      };
    } catch (error) {
      console.error('[USERS] Error getting inactive users:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Получение топ пользователей
  async getTopUsers(limit = 10, sortBy = 'total_score') {
    try {
      const db = this.database.db;
      
      let orderBy;
      switch (sortBy) {
        case 'total_score':
          orderBy = 'total_score DESC';
          break;
        case 'total_questions':
          orderBy = 'total_questions DESC';
          break;
        case 'experience_points':
          orderBy = 'experience_points DESC';
          break;
        case 'accuracy':
          orderBy = 'CAST(total_correct AS FLOAT) / total_questions DESC';
          break;
        default:
          orderBy = 'total_score DESC';
      }

      const users = await db.prepare(`
        SELECT 
          chat_id,
          username,
          first_name,
          last_name,
          total_score,
          total_questions,
          total_correct,
          experience_points,
          ROUND(CAST(total_correct AS FLOAT) / total_questions * 100, 1) as accuracy
        FROM users
        WHERE total_questions > 0
        ORDER BY ${orderBy}
        LIMIT ?
      `).bind(limit).all();

      return {
        success: true,
        data: users.results
      };
    } catch (error) {
      console.error('[USERS] Error getting top users:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Форматирование списка пользователей для Telegram
  formatUsersList(users) {
    let message = '👥 *Список пользователей*\n\n';
    
    users.forEach((user, index) => {
      const displayName = this.formatUserName(user);
      // Экранируем username для Markdown
      const safeDisplayName = this.telegram.escapeUserText(displayName);
      const accuracy = user.total_questions > 0 ? 
        Math.round((user.total_correct / user.total_questions) * 100) : 0;
      const lastActivity = new Date(user.last_activity).toLocaleDateString('ru-RU');
      
      message += `${index + 1}. *${safeDisplayName}*\n`;
      message += `   Счет: ${user.total_score}, Вопросов: ${user.total_questions}\n`;
      message += `   Точность: ${accuracy}%, Опыт: ${user.experience_points}\n`;
      message += `   Последняя активность: ${lastActivity}\n\n`;
    });

    return message;
  }

  // Форматирование информации о пользователе
  formatUserInfo(userData) {
    const { user, categoryStats, recentSessions, achievements } = userData;
    
    let message = `👤 *Информация о пользователе*\n\n`;
    
    // Основная информация
    const displayName = this.formatUserName(user);
    // Экранируем username для Markdown
    const safeDisplayName = this.telegram.escapeUserText(displayName);
    const accuracy = user.total_questions > 0 ? 
      Math.round((user.total_correct / user.total_questions) * 100) : 0;
    
    message += `*${safeDisplayName}*\n`;
    message += `ID: ${user.chat_id}\n`;
    message += `Создан: ${new Date(user.created_at).toLocaleDateString('ru-RU')}\n`;
    message += `Последняя активность: ${new Date(user.last_activity).toLocaleDateString('ru-RU')}\n\n`;
    
    // Статистика
    message += `📊 *Статистика:*\n`;
    message += `• Общий счет: ${user.total_score}\n`;
    message += `• Вопросов: ${user.total_questions}\n`;
    message += `• Правильных: ${user.total_correct}\n`;
    message += `• Точность: ${accuracy}%\n`;
    message += `• Опыт: ${user.experience_points}\n`;
    message += `• Серия: ${user.learning_streak}\n`;
    message += `• Дней подряд: ${user.consecutive_days}\n`;
    message += `• Уровень: ${user.difficulty_level}\n\n`;

    // Топ категорий
    if (categoryStats && categoryStats.length > 0) {
      message += `🏆 *Топ категорий:*\n`;
      categoryStats.slice(0, 5).forEach(cat => {
        message += `• ${cat.category}: ${cat.total_questions} вопросов, ${cat.accuracy}% точность\n`;
      });
      message += '\n';
    }

    // Последние сессии
    if (recentSessions && recentSessions.length > 0) {
      message += `📈 *Последние сессии:*\n`;
      recentSessions.slice(0, 3).forEach(session => {
        const date = new Date(session.start_time).toLocaleDateString('ru-RU');
        const accuracy = session.total_questions > 0 ? 
          Math.round((session.correct_answers / session.total_questions) * 100) : 0;
        message += `• ${session.session_type} (${date}): ${session.total_questions} вопросов, ${accuracy}% точность\n`;
      });
      message += '\n';
    }

    // Достижения
    if (achievements && achievements.length > 0) {
      message += `🏅 *Достижения:*\n`;
      achievements.slice(0, 5).forEach(achievement => {
        const date = new Date(achievement.unlocked_at).toLocaleDateString('ru-RU');
        message += `• ${achievement.achievement_name} (${date})\n`;
      });
    }

    return message;
  }

  // Форматирование топ пользователей
  formatTopUsers(users, sortBy = 'total_score') {
    let message = '🏆 *Топ пользователей*\n\n';
    
    const sortNames = {
      'total_score': 'по общему счету',
      'total_questions': 'по количеству вопросов',
      'experience_points': 'по опыту',
      'accuracy': 'по точности'
    };
    
    message += `Сортировка: ${sortNames[sortBy] || 'по общему счету'}\n\n`;
    
    users.forEach((user, index) => {
      const displayName = this.formatUserName(user);
      // Экранируем username для Markdown
      const safeDisplayName = this.telegram.escapeUserText(displayName);
      
      message += `${index + 1}. *${safeDisplayName}*\n`;
      message += `   Счет: ${user.total_score}, Вопросов: ${user.total_questions}\n`;
      message += `   Точность: ${user.accuracy}%, Опыт: ${user.experience_points}\n\n`;
    });

    return message;
  }

  // Блокировка пользователя
  async blockUser(chatId) {
    try {
      const db = this.database.db;
      await db.prepare(`UPDATE users SET is_blocked = TRUE WHERE chat_id = ?`).bind(chatId).run();
      return { success: true };
    } catch (error) {
      console.error('[USERS] Error blocking user:', error);
      return { success: false, error: error.message };
    }
  }

  // Разблокировка пользователя
  async unblockUser(chatId) {
    try {
      const db = this.database.db;
      await db.prepare(`UPDATE users SET is_blocked = FALSE WHERE chat_id = ?`).bind(chatId).run();
      return { success: true };
    } catch (error) {
      console.error('[USERS] Error unblocking user:', error);
      return { success: false, error: error.message };
    }
  }

  // Массовая блокировка пользователей
  async blockUsers(chatIds) {
    try {
      const db = this.database.db;
      for (const id of chatIds) {
        await db.prepare(`UPDATE users SET is_blocked = TRUE WHERE chat_id = ?`).bind(id).run();
      }
      return { success: true };
    } catch (error) {
      console.error('[USERS] Error blocking users:', error);
      return { success: false, error: error.message };
    }
  }

  // Массовая разблокировка пользователей
  async unblockUsers(chatIds) {
    try {
      const db = this.database.db;
      for (const id of chatIds) {
        await db.prepare(`UPDATE users SET is_blocked = FALSE WHERE chat_id = ?`).bind(id).run();
      }
      return { success: true };
    } catch (error) {
      console.error('[USERS] Error unblocking users:', error);
      return { success: false, error: error.message };
    }
  }

  // Сброс прогресса пользователя
  async resetUserProgress(chatId) {
    try {
      const db = this.database.db;
      // Сбросить основные поля
      await db.prepare(`UPDATE users SET total_score = 0, total_questions = 0, total_correct = 0, learning_streak = 0, max_streak = 0, experience_points = 0, consecutive_days = 0, last_learning_date = NULL WHERE chat_id = ?`).bind(chatId).run();
      // Сбросить статистику по категориям
      await db.prepare(`DELETE FROM category_stats WHERE chat_id = ?`).bind(chatId).run();
      // Сбросить статистику по типам вопросов
      await db.prepare(`DELETE FROM question_type_stats WHERE chat_id = ?`).bind(chatId).run();
      // Сбросить достижения
      await db.prepare(`DELETE FROM achievements WHERE chat_id = ?`).bind(chatId).run();
      // Сбросить сессии
      await db.prepare(`DELETE FROM learning_sessions WHERE chat_id = ?`).bind(chatId).run();
      // Сбросить ответы
      await db.prepare(`DELETE FROM user_answers WHERE chat_id = ?`).bind(chatId).run();
      // Сбросить ежедневные задания
      await db.prepare(`DELETE FROM daily_challenges WHERE chat_id = ?`).bind(chatId).run();
      return { success: true };
    } catch (error) {
      console.error('[USERS] Error resetting user progress:', error);
      return { success: false, error: error.message };
    }
  }

  // Массовый сброс прогресса пользователей
  async resetUsersProgress(chatIds) {
    try {
      for (const id of chatIds) {
        await this.resetUserProgress(id);
      }
      return { success: true };
    } catch (error) {
      console.error('[USERS] Error resetting users progress:', error);
      return { success: false, error: error.message };
    }
  }
} 