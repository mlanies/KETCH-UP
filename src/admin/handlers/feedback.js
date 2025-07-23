// src/admin/handlers/feedback.js
// Обработка отзывов пользователей

import { DatabaseManager } from '../../handlers/database.js';
import { TelegramHandler } from './telegram.js';

export class FeedbackHandler {
  constructor(env) {
    this.env = env;
    this.database = new DatabaseManager(env);
    this.telegram = new TelegramHandler(env);
  }

  // Получение отзывов пользователей
  async getFeedbackStats() {
    try {
      const db = this.database.db;
      
      // Получаем общую статистику отзывов
      const feedbackStats = await db.prepare(`
        SELECT 
          COUNT(*) as total_feedback,
          SUM(CASE WHEN feedback_type = 'like' THEN 1 ELSE 0 END) as likes,
          SUM(CASE WHEN feedback_type = 'hard' THEN 1 ELSE 0 END) as hard_questions,
          SUM(CASE WHEN feedback_type = 'easy' THEN 1 ELSE 0 END) as easy_questions,
          SUM(CASE WHEN feedback_type = 'comment' THEN 1 ELSE 0 END) as comments
        FROM user_feedback
        WHERE created_at >= datetime('now', '-30 days')
      `).first();

      // Получаем последние отзывы
      const recentFeedback = await db.prepare(`
        SELECT 
          uf.id,
          uf.chat_id,
          u.username,
          u.first_name,
          u.last_name,
          uf.feedback_type,
          uf.feedback_text,
          uf.created_at,
          uf.session_type,
          uf.question_count,
          uf.correct_answers
        FROM user_feedback uf
        LEFT JOIN users u ON uf.chat_id = u.chat_id
        ORDER BY uf.created_at DESC
        LIMIT 10
      `).all();

      // Получаем статистику по типам сессий
      const sessionStats = await db.prepare(`
        SELECT 
          session_type,
          COUNT(*) as total_sessions,
          AVG(CAST(correct_answers AS FLOAT) / question_count * 100) as avg_accuracy,
          AVG(question_count) as avg_questions
        FROM user_feedback
        WHERE created_at >= datetime('now', '-30 days')
        GROUP BY session_type
      `).all();

      return {
        success: true,
        data: {
          stats: feedbackStats,
          recent: recentFeedback.results,
          sessions: sessionStats.results
        }
      };
    } catch (error) {
      console.error('[FEEDBACK] Error getting feedback stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Получение детальных отзывов
  async getDetailedFeedback(limit = 20, offset = 0) {
    try {
      const db = this.database.db;
      
      const feedback = await db.prepare(`
        SELECT 
          uf.id,
          uf.chat_id,
          u.username,
          u.first_name,
          u.last_name,
          uf.feedback_type,
          uf.feedback_text,
          uf.created_at,
          uf.session_type,
          uf.question_count,
          uf.correct_answers,
          uf.session_duration_minutes
        FROM user_feedback uf
        LEFT JOIN users u ON uf.chat_id = u.chat_id
        ORDER BY uf.created_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();

      return {
        success: true,
        data: feedback.results
      };
    } catch (error) {
      console.error('[FEEDBACK] Error getting detailed feedback:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Получение отзывов по типу
  async getFeedbackByType(feedbackType) {
    try {
      const db = this.database.db;
      
      const feedback = await db.prepare(`
        SELECT 
          uf.id,
          uf.chat_id,
          u.username,
          u.first_name,
          u.last_name,
          uf.feedback_type,
          uf.feedback_text,
          uf.created_at,
          uf.session_type,
          uf.question_count,
          uf.correct_answers
        FROM user_feedback uf
        LEFT JOIN users u ON uf.chat_id = u.chat_id
        WHERE uf.feedback_type = ?
        ORDER BY uf.created_at DESC
        LIMIT 20
      `).bind(feedbackType).all();

      return {
        success: true,
        data: feedback.results
      };
    } catch (error) {
      console.error('[FEEDBACK] Error getting feedback by type:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Отметить отзыв как обработанный
  async markFeedbackProcessed(feedbackId) {
    try {
      const db = this.database.db;
      await db.prepare(`UPDATE user_feedback SET is_processed = TRUE WHERE id = ?`).bind(feedbackId).run();
      return { success: true };
    } catch (error) {
      console.error('[FEEDBACK] Error marking feedback processed:', error);
      return { success: false, error: error.message };
    }
  }

  // Ответить на отзыв (отправить сообщение пользователю)
  async replyToFeedback(feedbackId, text) {
    try {
      const db = this.database.db;
      const feedback = await db.prepare(`SELECT chat_id FROM user_feedback WHERE id = ?`).bind(feedbackId).first();
      if (!feedback || !feedback.chat_id) {
        return { success: false, error: 'Пользователь не найден для этого отзыва' };
      }
      await this.telegram.sendMessage(feedback.chat_id, text);
      return { success: true };
    } catch (error) {
      console.error('[FEEDBACK] Error replying to feedback:', error);
      return { success: false, error: error.message };
    }
  }

  // Массовая отметка отзывов как обработанных
  async markFeedbacksProcessed(feedbackIds) {
    try {
      const db = this.database.db;
      for (const id of feedbackIds) {
        await db.prepare(`UPDATE user_feedback SET is_processed = TRUE WHERE id = ?`).bind(id).run();
      }
      return { success: true };
    } catch (error) {
      console.error('[FEEDBACK] Error marking feedbacks processed:', error);
      return { success: false, error: error.message };
    }
  }

  // Форматирование отзывов для Telegram
  formatFeedbackStats(stats) {
    const { stats: feedbackStats, recent, sessions } = stats;
    
    let message = '📝 <b>Статистика отзывов за 30 дней</b>\n\n';
    
    // Общая статистика
    message += `📊 <b>Общая статистика:</b>\n`;
    message += `• Всего отзывов: ${feedbackStats.total_feedback || 0}\n`;
    message += `• 👍 Понравилось: ${feedbackStats.likes || 0}\n`;
    message += `• 🤔 Сложные вопросы: ${feedbackStats.hard_questions || 0}\n`;
    message += `• 😴 Слишком легко: ${feedbackStats.easy_questions || 0}\n`;
    message += `• ✍️ Комментарии: ${feedbackStats.comments || 0}\n\n`;

    // Статистика по сессиям
    if (sessions && sessions.length > 0) {
      message += `📈 <b>По типам сессий:</b>\n`;
      sessions.forEach(session => {
        const accuracy = session.avg_accuracy ? Math.round(session.avg_accuracy) : 0;
        message += `• ${session.session_type}: ${session.total_sessions} сессий, ${accuracy}% точность\n`;
      });
      message += '\n';
    }

    // Последние отзывы
    if (recent && recent.length > 0) {
      message += `🕒 <b>Последние отзывы:</b>\n`;
      recent.slice(0, 5).forEach((feedback, index) => {
        // Формируем полное имя пользователя
        let username = '';
        if (feedback.username) {
          username = `@${feedback.username}`;
        } else if (feedback.first_name && feedback.last_name) {
          username = `${feedback.first_name} ${feedback.last_name}`;
        } else if (feedback.first_name) {
          username = feedback.first_name;
        } else {
          username = `Пользователь #${feedback.chat_id}`;
        }
        
        // Отладочная информация
        console.log(`[DEBUG] Feedback ${index}:`, {
          chat_id: feedback.chat_id,
          username: feedback.username,
          first_name: feedback.first_name,
          last_name: feedback.last_name,
          final_username: username
        });
        
        // Экранируем username для Markdown
        const safeUsername = this.telegram.escapeUserText(username);
        const type = this.getFeedbackTypeEmoji(feedback.feedback_type);
        const date = new Date(feedback.created_at).toLocaleDateString('ru-RU');
        
        const line = `${type} ${safeUsername} \\(${date}\\)\n`;
        console.log(`[DEBUG] Line ${index}:`, line);
        message += line;
        
        if (feedback.feedback_text) {
          // Экранируем специальные символы в тексте отзыва
          const safeText = this.telegram.escapeUserText(feedback.feedback_text).substring(0, 50);
          const feedbackLine = `   "${safeText}..."\n`;
          console.log(`[DEBUG] Feedback text ${index}:`, feedbackLine);
          message += feedbackLine;
        }
      });
    }

    console.log(`[DEBUG] Final message length:`, message.length);
    console.log(`[DEBUG] Final message:`, message);
    
    return message;
  }

  // Получение эмодзи для типа отзыва
  getFeedbackTypeEmoji(type) {
    const emojis = {
      'like': '👍',
      'hard': '🤔',
      'easy': '😴',
      'comment': '✍️'
    };
    return emojis[type] || '📝';
  }

  // Форматирование детального отзыва
  formatDetailedFeedback(feedback) {
    let message = '📝 *Детальные отзывы*\n\n';
    
    feedback.forEach(item => {
      // Формируем полное имя пользователя
      let username = '';
      if (item.username) {
        username = `@${item.username}`;
      } else if (item.first_name && item.last_name) {
        username = `${item.first_name} ${item.last_name}`;
      } else if (item.first_name) {
        username = item.first_name;
      } else {
        username = `Пользователь #${item.chat_id}`;
      }
      // Экранируем username для Markdown
      const safeUsername = this.telegram.escapeUserText(username);
      const type = this.getFeedbackTypeEmoji(item.feedback_type);
      const date = new Date(item.created_at).toLocaleDateString('ru-RU');
      const time = new Date(item.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      
      message += `${type} *${safeUsername}* (${date} ${time})\n`;
      message += `Тип: ${item.feedback_type}\n`;
      message += `Сессия: ${item.session_type}\n`;
      message += `Вопросов: ${item.question_count}, Правильно: ${item.correct_answers}\n`;
      
      if (item.feedback_text) {
        // Экранируем специальные символы в тексте отзыва
        const safeText = this.telegram.escapeUserText(item.feedback_text);
        message += `Комментарий: "${safeText}"\n`;
      }
      message += '\n';
    });

    return message;
  }
} 