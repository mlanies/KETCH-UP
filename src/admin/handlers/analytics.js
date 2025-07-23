// src/admin/handlers/analytics.js
// Аналитика обучения

import { DatabaseManager } from '../../handlers/database.js';
import { TelegramHandler } from './telegram.js';

export class AnalyticsHandler {
  constructor(env) {
    this.env = env;
    this.database = new DatabaseManager(env);
    this.telegram = new TelegramHandler(env);
  }

  // Получение общей аналитики
  async getGeneralAnalytics() {
    try {
      const db = this.database.db;
      
      // Общая статистика пользователей
      const userStats = await db.prepare(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN last_activity >= datetime('now', '-7 days') THEN 1 END) as active_7d,
          COUNT(CASE WHEN last_activity >= datetime('now', '-30 days') THEN 1 END) as active_30d,
          AVG(total_score) as avg_score,
          AVG(total_questions) as avg_questions,
          AVG(CAST(total_correct AS FLOAT) / total_questions * 100) as avg_accuracy
        FROM users
        WHERE total_questions > 0
      `).first();

      // Статистика сессий
      const sessionStats = await db.prepare(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN start_time >= datetime('now', '-7 days') THEN 1 END) as sessions_7d,
          COUNT(CASE WHEN start_time >= datetime('now', '-30 days') THEN 1 END) as sessions_30d,
          AVG(total_questions) as avg_questions_per_session,
          AVG(CAST(correct_answers AS FLOAT) / total_questions * 100) as avg_session_accuracy
        FROM learning_sessions
        WHERE total_questions > 0
      `).first();

      // Статистика по категориям
      const categoryStats = await db.prepare(`
        SELECT 
          category,
          COUNT(*) as total_questions,
          SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
          ROUND(CAST(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1) as accuracy
        FROM user_answers
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY total_questions DESC
        LIMIT 10
      `).all();

      // Статистика по типам вопросов
      const questionTypeStats = await db.prepare(`
        SELECT 
          question_type,
          COUNT(*) as total_questions,
          SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
          ROUND(CAST(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1) as accuracy
        FROM user_answers
        WHERE question_type IS NOT NULL
        GROUP BY question_type
        ORDER BY total_questions DESC
        LIMIT 10
      `).all();

      return {
        success: true,
        data: {
          users: userStats,
          sessions: sessionStats,
          categories: categoryStats.results,
          questionTypes: questionTypeStats.results
        }
      };
    } catch (error) {
      console.error('[ANALYTICS] Error getting general analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Получение аналитики по пользователям
  async getUserAnalytics() {
    try {
      const db = this.database.db;
      
      // Топ пользователей по активности
      const topUsers = await db.prepare(`
        SELECT 
          u.chat_id,
          u.username,
          u.first_name,
          u.total_score,
          u.total_questions,
          u.total_correct,
          u.experience_points,
          u.learning_streak,
          ROUND(CAST(u.total_correct AS FLOAT) / u.total_questions * 100, 1) as accuracy,
          u.last_activity
        FROM users u
        WHERE u.total_questions > 0
        ORDER BY u.total_score DESC
        LIMIT 10
      `).all();

      // Статистика по уровням сложности
      const difficultyStats = await db.prepare(`
        SELECT 
          difficulty_level,
          COUNT(*) as user_count,
          AVG(total_score) as avg_score,
          AVG(total_questions) as avg_questions,
          AVG(CAST(total_correct AS FLOAT) / total_questions * 100) as avg_accuracy
        FROM users
        WHERE total_questions > 0
        GROUP BY difficulty_level
      `).all();

      // Новые пользователи за последние 30 дней
      const newUsers = await db.prepare(`
        SELECT 
          COUNT(*) as new_users_30d,
          COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as new_users_7d
        FROM users
        WHERE created_at >= datetime('now', '-30 days')
      `).first();

      return {
        success: true,
        data: {
          topUsers: topUsers.results,
          difficultyStats: difficultyStats.results,
          newUsers: newUsers
        }
      };
    } catch (error) {
      console.error('[ANALYTICS] Error getting user analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Получение аналитики по времени
  async getTimeAnalytics() {
    try {
      const db = this.database.db;
      
      // Активность по дням недели
      const dailyActivity = await db.prepare(`
        SELECT 
          strftime('%w', start_time) as day_of_week,
          COUNT(*) as sessions_count,
          AVG(total_questions) as avg_questions,
          AVG(CAST(correct_answers AS FLOAT) / total_questions * 100) as avg_accuracy
        FROM learning_sessions
        WHERE start_time >= datetime('now', '-30 days')
        GROUP BY strftime('%w', start_time)
        ORDER BY day_of_week
      `).all();

      // Активность по часам
      const hourlyActivity = await db.prepare(`
        SELECT 
          strftime('%H', start_time) as hour,
          COUNT(*) as sessions_count
        FROM learning_sessions
        WHERE start_time >= datetime('now', '-30 days')
        GROUP BY strftime('%H', start_time)
        ORDER BY hour
      `).all();

      // Длительность сессий
      const sessionDuration = await db.prepare(`
        SELECT 
          AVG(CAST((julianday(end_time) - julianday(start_time)) * 24 * 60 AS INTEGER)) as avg_duration_minutes,
          MIN(CAST((julianday(end_time) - julianday(start_time)) * 24 * 60 AS INTEGER)) as min_duration_minutes,
          MAX(CAST((julianday(end_time) - julianday(start_time)) * 24 * 60 AS INTEGER)) as max_duration_minutes
        FROM learning_sessions
        WHERE end_time IS NOT NULL
        AND start_time >= datetime('now', '-30 days')
      `).first();

      return {
        success: true,
        data: {
          dailyActivity: dailyActivity.results,
          hourlyActivity: hourlyActivity.results,
          sessionDuration: sessionDuration
        }
      };
    } catch (error) {
      console.error('[ANALYTICS] Error getting time analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Форматирование общей аналитики для Telegram
  formatGeneralAnalytics(analytics) {
    const { users, sessions, categories, questionTypes } = analytics;
    
    let message = '📊 *Общая аналитика системы*\n\n';
    
    // Статистика пользователей
    message += `👥 *Пользователи:*\n`;
    message += `• Всего: ${users.total_users || 0}\n`;
    message += `• Активных за 7 дней: ${users.active_7d || 0}\n`;
    message += `• Активных за 30 дней: ${users.active_30d || 0}\n`;
    message += `• Средний счет: ${Math.round(users.avg_score || 0)}\n`;
    message += `• Средняя точность: ${Math.round(users.avg_accuracy || 0)}%\n\n`;

    // Статистика сессий
    message += `📈 *Сессии обучения:*\n`;
    message += `• Всего сессий: ${sessions.total_sessions || 0}\n`;
    message += `• За 7 дней: ${sessions.sessions_7d || 0}\n`;
    message += `• За 30 дней: ${sessions.sessions_30d || 0}\n`;
    message += `• Среднее вопросов/сессия: ${Math.round(sessions.avg_questions_per_session || 0)}\n`;
    message += `• Средняя точность сессий: ${Math.round(sessions.avg_session_accuracy || 0)}%\n\n`;

    // Топ категорий
    if (categories && categories.length > 0) {
      message += `🏆 *Топ категорий:*\n`;
      categories.slice(0, 5).forEach(cat => {
        message += `• ${cat.category}: ${cat.total_questions} вопросов, ${cat.accuracy}% точность\n`;
      });
      message += '\n';
    }

    return message;
  }

  // Форматирование аналитики пользователей
  formatUserAnalytics(analytics) {
    const { topUsers, difficultyStats, newUsers } = analytics;
    
    let message = '👥 *Аналитика пользователей*\n\n';
    
    // Новые пользователи
    message += `🆕 *Новые пользователи:*\n`;
    message += `• За 7 дней: ${newUsers.new_users_7d || 0}\n`;
    message += `• За 30 дней: ${newUsers.new_users_30d || 0}\n\n`;

    // Топ пользователей
    if (topUsers && topUsers.length > 0) {
      message += `🏆 *Топ пользователей:*\n`;
      topUsers.slice(0, 5).forEach((user, index) => {
        const username = user.username || user.first_name || `Пользователь #${user.chat_id}`;
        // Экранируем username для Markdown
        const safeUsername = this.telegram.escapeUserText(username);
        message += `${index + 1}. ${safeUsername}\n`;
        message += `   Счет: ${user.total_score}, Вопросов: ${user.total_questions}\n`;
        message += `   Точность: ${user.accuracy}%, Опыт: ${user.experience_points}\n\n`;
      });
    }

    // Статистика по уровням
    if (difficultyStats && difficultyStats.length > 0) {
      message += `📊 *По уровням сложности:*\n`;
      difficultyStats.forEach(level => {
        message += `• ${level.difficulty_level}: ${level.user_count} пользователей\n`;
        message += `  Средний счет: ${Math.round(level.avg_score || 0)}\n`;
        message += `  Средняя точность: ${Math.round(level.avg_accuracy || 0)}%\n\n`;
      });
    }

    return message;
  }

  // Форматирование временной аналитики
  formatTimeAnalytics(analytics) {
    const { dailyActivity, hourlyActivity, sessionDuration } = analytics;
    
    let message = '⏰ *Временная аналитика*\n\n';
    
    // Длительность сессий
    message += `⏱️ *Длительность сессий:*\n`;
    message += `• Средняя: ${Math.round(sessionDuration.avg_duration_minutes || 0)} мин\n`;
    message += `• Минимальная: ${Math.round(sessionDuration.min_duration_minutes || 0)} мин\n`;
    message += `• Максимальная: ${Math.round(sessionDuration.max_duration_minutes || 0)} мин\n\n`;

    // Активность по дням недели
    if (dailyActivity && dailyActivity.length > 0) {
      const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
      message += `📅 *Активность по дням:*\n`;
      dailyActivity.forEach(day => {
        const dayName = dayNames[parseInt(day.day_of_week)];
        message += `• ${dayName}: ${day.sessions_count} сессий\n`;
      });
      message += '\n';
    }

    // Пиковые часы
    if (hourlyActivity && hourlyActivity.length > 0) {
      const peakHours = hourlyActivity
        .sort((a, b) => b.sessions_count - a.sessions_count)
        .slice(0, 3);
      
      message += `🕐 *Пиковые часы:*\n`;
      peakHours.forEach(hour => {
        message += `• ${hour.hour}:00 - ${hour.sessions_count} сессий\n`;
      });
    }

    return message;
  }
} 