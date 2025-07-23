// src/admin/handlers/commands.js
// Обработка команд админ-бота

import { FeedbackHandler } from './feedback.js';
import { AnalyticsHandler } from './analytics.js';
import { UsersHandler } from './users.js';
import { TelegramHandler } from './telegram.js';

// Cloudflare KV state helpers
async function getUserState(chatId, env) {
  const raw = await env.WINE_CACHE.get(`admin_state_${chatId}`);
  return raw ? JSON.parse(raw) : null;
}
async function setUserState(chatId, state, env) {
  await env.WINE_CACHE.put(`admin_state_${chatId}`, JSON.stringify(state));
}
async function clearUserState(chatId, env) {
  await env.WINE_CACHE.delete(`admin_state_${chatId}`);
}

export class CommandsHandler {
  constructor(env) {
    this.env = env;
    this.telegram = new TelegramHandler(env);
    this.feedback = new FeedbackHandler(env);
    this.analytics = new AnalyticsHandler(env);
    this.users = new UsersHandler(env);
    
    // Состояния пользователей для многошаговых команд
    // this.userStates = new Map(); // Удалено, заменено на KV
  }

  // Обработка команды /start
  async handleStart(chatId) {
    const message = `👋 <b>Добро пожаловать в админ-панель!</b>

🔧 <b>Выберите раздел для управления:</b>

📊 <b>Аналитика</b> - статистика системы и пользователей
📝 <b>Отзывы</b> - обратная связь от пользователей  
👥 <b>Пользователи</b> - управление пользователями
🎁 <b>Призы</b> - магазин призов за XP
🔍 <b>Поиск</b> - поиск по системе

💡 <b>Используйте кнопки для навигации!</b>`;

    const keyboard = this.telegram.createInlineKeyboard([
      [
        { text: '📊 Аналитика', callback_data: 'admin_analytics' },
        { text: '📝 Отзывы', callback_data: 'admin_feedback' }
      ],
      [
        { text: '👥 Пользователи', callback_data: 'admin_users' },
        { text: '🎁 Призы', callback_data: 'admin_rewards' }
      ],
      [
        { text: '🔍 Поиск', callback_data: 'admin_search' }
      ],
      [
        { text: '❓ Помощь', callback_data: 'admin_help' }
      ]
    ]);

    await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
  }

  // Обработка команды /analytics
  async handleAnalytics(chatId) {
    try {
      // Проверяем доступность базы данных
      if (!this.analytics.database.db) {
        await this.telegram.sendMessage(chatId, '❌ База данных недоступна. Проверьте конфигурацию.');
        return;
      }

      const analytics = await this.analytics.getGeneralAnalytics();
      
      if (!analytics.success) {
        await this.telegram.sendMessage(chatId, `❌ Ошибка получения аналитики: ${analytics.error}`);
        return;
      }

      const message = this.analytics.formatGeneralAnalytics(analytics.data);
      
      const keyboard = this.telegram.createInlineKeyboard([
        [
          { text: '👥 Пользователи', callback_data: 'admin_analytics_users' },
          { text: '⏰ Время', callback_data: 'admin_analytics_time' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'admin_main_menu' }
        ]
      ]);

      await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
    } catch (error) {
      console.error('[COMMANDS] Error in handleAnalytics:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при получении аналитики');
    }
  }

  // Обработка команды /feedback
  async handleFeedback(chatId) {
    try {
      // Проверяем доступность базы данных
      if (!this.feedback.database.db) {
        await this.telegram.sendMessage(chatId, '❌ База данных недоступна. Проверьте конфигурацию.');
        return;
      }

      const feedback = await this.feedback.getFeedbackStats();
      
      if (!feedback.success) {
        await this.telegram.sendMessage(chatId, `❌ Ошибка получения отзывов: ${feedback.error}`);
        return;
      }

      const message = this.feedback.formatFeedbackStats(feedback.data);
      
      const keyboard = this.telegram.createInlineKeyboard([
        [
          { text: '📋 Детально', callback_data: 'admin_feedback_detailed' },
          { text: '👍 Понравилось', callback_data: 'admin_feedback_likes' }
        ],
        [
          { text: '🤔 Сложно', callback_data: 'admin_feedback_hard' },
          { text: '😴 Легко', callback_data: 'admin_feedback_easy' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'admin_main_menu' }
        ]
      ]);

      await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
    } catch (error) {
      console.error('[COMMANDS] Error in handleFeedback:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при получении отзывов');
    }
  }

  // Обработка команды /users
  async handleUsers(chatId) {
    try {
      // Проверяем доступность базы данных
      if (!this.users.database.db) {
        await this.telegram.sendMessage(chatId, '❌ База данных недоступна. Проверьте конфигурацию.');
        return;
      }

      const users = await this.users.getUsersList(10);
      
      if (!users.success) {
        await this.telegram.sendMessage(chatId, `❌ Ошибка получения пользователей: ${users.error}`);
        return;
      }

      const message = this.users.formatUsersList(users.data);
      
      const keyboard = this.telegram.createInlineKeyboard([
        [
          { text: '🏆 Топ', callback_data: 'admin_users_top' },
          { text: '😴 Неактивные', callback_data: 'admin_users_inactive' }
        ],
        [
          { text: '🔍 Поиск', callback_data: 'admin_search_user' },
          { text: '📋 Все', callback_data: 'admin_users_all' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'admin_main_menu' }
        ]
      ]);

      await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
    } catch (error) {
      console.error('[COMMANDS] Error in handleUsers:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при получении пользователей');
    }
  }

  // Обработка команды /user_info
  async handleUserInfo(chatId, args) {
    if (!args || args.length === 0) {
      await this.telegram.sendMessage(chatId, '❌ Укажите ID пользователя: /user_info <ID>');
      return;
    }

    const userId = parseInt(args[0]);
    if (isNaN(userId)) {
      await this.telegram.sendMessage(chatId, '❌ Неверный ID пользователя');
      return;
    }

    try {
      const userInfo = await this.users.getUserInfo(userId);
      
      if (!userInfo.success) {
        await this.telegram.sendMessage(chatId, `❌ ${userInfo.error}`);
        return;
      }

      const message = this.users.formatUserInfo(userInfo.data);
      
      const keyboard = this.telegram.createInlineKeyboard([
        [
          { text: '🚫 Заблокировать', callback_data: `admin_block_user_${userId}` },
          { text: '✅ Разблокировать', callback_data: `admin_unblock_user_${userId}` }
        ],
        [
          { text: '🔄 Сбросить прогресс', callback_data: `admin_reset_user_${userId}` }
        ],
        [
          { text: '🔙 Назад к пользователям', callback_data: 'admin_users' }
        ]
      ]);

      await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
    } catch (error) {
      console.error('[COMMANDS] Error in handleUserInfo:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при получении информации о пользователе');
    }
  }

  // Обработка команды /search_user
  async handleSearchUser(chatId, args) {
    if (!args || args.length === 0) {
      await this.telegram.sendMessage(chatId, '❌ Укажите имя для поиска: /search_user <имя>');
      return;
    }

    const query = args.join(' ');
    
    try {
      const users = await this.users.searchUsers(query);
      
      if (!users.success) {
        await this.telegram.sendMessage(chatId, `❌ Ошибка поиска: ${users.error}`);
        return;
      }

      if (users.data.length === 0) {
        await this.telegram.sendMessage(chatId, `🔍 Пользователи по запросу "${query}" не найдены`);
        return;
      }

      const message = this.users.formatUsersList(users.data);
      
      const keyboard = this.telegram.createInlineKeyboard([
        [
          { text: '🔙 Назад', callback_data: 'admin_users' }
        ]
      ]);

      await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
    } catch (error) {
      console.error('[COMMANDS] Error in handleSearchUser:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при поиске пользователей');
    }
  }

  // Обработка команды /block_user
  async handleBlockUser(chatId, args) {
    if (!args || args.length === 0) {
      await this.telegram.sendMessage(chatId, '❌ Укажите ID пользователя: /block_user <ID>');
      return;
    }
    const userId = parseInt(args[0]);
    if (isNaN(userId)) {
      await this.telegram.sendMessage(chatId, '❌ Неверный ID пользователя');
      return;
    }
    try {
      const result = await this.users.blockUser(userId);
      if (result.success) {
        await this.telegram.sendMessage(chatId, `🚫 Пользователь ${userId} заблокирован.`);
      } else {
        await this.telegram.sendMessage(chatId, `❌ Ошибка блокировки: ${result.error}`);
      }
    } catch (error) {
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при блокировке пользователя');
    }
  }

  // Обработка команды /unblock_user
  async handleUnblockUser(chatId, args) {
    if (!args || args.length === 0) {
      await this.telegram.sendMessage(chatId, '❌ Укажите ID пользователя: /unblock_user <ID>');
      return;
    }
    const userId = parseInt(args[0]);
    if (isNaN(userId)) {
      await this.telegram.sendMessage(chatId, '❌ Неверный ID пользователя');
      return;
    }
    try {
      const result = await this.users.unblockUser(userId);
      if (result.success) {
        await this.telegram.sendMessage(chatId, `✅ Пользователь ${userId} разблокирован.`);
      } else {
        await this.telegram.sendMessage(chatId, `❌ Ошибка разблокировки: ${result.error}`);
      }
    } catch (error) {
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при разблокировке пользователя');
    }
  }

  // Обработка команды /reset_user
  async handleResetUser(chatId, args) {
    if (!args || args.length === 0) {
      await this.telegram.sendMessage(chatId, '❌ Укажите ID пользователя: /reset_user <ID>');
      return;
    }
    const userId = parseInt(args[0]);
    if (isNaN(userId)) {
      await this.telegram.sendMessage(chatId, '❌ Неверный ID пользователя');
      return;
    }
    try {
      const result = await this.users.resetUserProgress(userId);
      if (result.success) {
        await this.telegram.sendMessage(chatId, `🔄 Прогресс пользователя ${userId} сброшен.`);
      } else {
        await this.telegram.sendMessage(chatId, `❌ Ошибка сброса: ${result.error}`);
      }
    } catch (error) {
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при сбросе прогресса пользователя');
    }
  }

  // Массовая рассылка сообщений
  async handleBroadcast(chatId, args) {
    if (!args || args.length === 0) {
      await this.telegram.sendMessage(chatId, '❌ Укажите текст для рассылки: /broadcast <текст>');
      return;
    }
    const text = args.join(' ');
    try {
      const usersResult = await this.users.getUsersList(1000); // до 1000 пользователей
      if (!usersResult.success) {
        await this.telegram.sendMessage(chatId, `❌ Ошибка получения пользователей: ${usersResult.error}`);
        return;
      }
      const users = usersResult.data.filter(u => !u.is_blocked);
      let sent = 0, failed = 0;
      for (const user of users) {
        try {
          await this.telegram.sendMessage(user.chat_id, text);
          sent++;
        } catch (e) {
          failed++;
        }
        // Пауза для обхода лимитов Telegram
        await new Promise(r => setTimeout(r, 40));
      }
      await this.telegram.sendMessage(chatId, `✅ Рассылка завершена. Успешно: ${sent}, ошибок: ${failed}`);
    } catch (error) {
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при рассылке сообщений');
    }
  }

  // Добавить обработку команды /broadcast
  async handleMessage(chatId, text) {
    if (text.startsWith('/broadcast')) {
      const args = text.split(' ').slice(1);
      await this.handleBroadcast(chatId, args);
      return true;
    }
    // Обработка добавления приза
    if (await this.handleTextForReward(chatId, text)) return true;
    return false;
  }

  // Ответить на отзыв
  async handleReplyFeedback(chatId, args) {
    if (!args || args.length < 2) {
      await this.telegram.sendMessage(chatId, '❌ Используйте: /reply_feedback <feedback_id> <текст>');
      return;
    }
    const feedbackId = parseInt(args[0]);
    if (isNaN(feedbackId)) {
      await this.telegram.sendMessage(chatId, '❌ Неверный ID отзыва');
      return;
    }
    const text = args.slice(1).join(' ');
    try {
      const result = await this.feedback.replyToFeedback(feedbackId, text);
      if (result.success) {
        await this.telegram.sendMessage(chatId, `✅ Ответ отправлен пользователю.`);
      } else {
        await this.telegram.sendMessage(chatId, `❌ Ошибка отправки: ${result.error}`);
      }
    } catch (error) {
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при отправке ответа');
    }
  }

  // Отметить отзыв как обработанный
  async handleMarkFeedbackProcessed(chatId, args) {
    if (!args || args.length === 0) {
      await this.telegram.sendMessage(chatId, '❌ Укажите ID отзыва: /mark_feedback <feedback_id>');
      return;
    }
    const feedbackId = parseInt(args[0]);
    if (isNaN(feedbackId)) {
      await this.telegram.sendMessage(chatId, '❌ Неверный ID отзыва');
      return;
    }
    try {
      const result = await this.feedback.markFeedbackProcessed(feedbackId);
      if (result.success) {
        await this.telegram.sendMessage(chatId, `✅ Отзыв ${feedbackId} отмечен как обработанный.`);
      } else {
        await this.telegram.sendMessage(chatId, `❌ Ошибка: ${result.error}`);
      }
    } catch (error) {
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при отметке отзыва');
    }
  }

  // Обработка callback query
  async handleCallbackQuery(chatId, callbackData, messageId) {
    try {
      console.log('[COMMANDS] handleCallbackQuery called with:', callbackData);
      
      // Парсим callback data правильно
      const parts = callbackData.split('_');
      const prefix = parts[0];
      
      if (prefix !== 'admin') {
        console.log('[COMMANDS] Not admin callback, ignoring');
        return;
      }

      // Получаем полное действие (все части после admin_)
      const fullAction = parts.slice(1).join('_');
      console.log('[COMMANDS] Full action:', fullAction);

      // Новый switch (true) для startsWith
      switch (true) {
        case fullAction === 'main_menu':
          await this.handleStart(chatId);
          break;
        case fullAction === 'analytics':
          await this.handleAnalytics(chatId);
          break;
        case fullAction === 'analytics_users':
          await this.handleAnalyticsUsers(chatId);
          break;
        case fullAction === 'analytics_time':
          await this.handleAnalyticsTime(chatId);
          break;
        case fullAction === 'feedback':
          await this.handleFeedback(chatId);
          break;
        case fullAction === 'feedback_detailed':
          await this.handleFeedbackDetailed(chatId);
          break;
        case fullAction === 'feedback_likes':
          await this.handleFeedbackByType(chatId, 'like');
          break;
        case fullAction === 'feedback_hard':
          await this.handleFeedbackByType(chatId, 'hard');
          break;
        case fullAction === 'feedback_easy':
          await this.handleFeedbackByType(chatId, 'easy');
          break;
        case fullAction === 'users':
          await this.handleUsers(chatId);
          break;
        case fullAction === 'users_top':
          await this.handleUsersTop(chatId);
          break;
        case fullAction === 'users_inactive':
          await this.handleUsersInactive(chatId);
          break;
        case fullAction === 'users_all':
          await this.handleUsersAll(chatId);
          break;
        case fullAction === 'search':
          await this.handleSearchMenu(chatId);
          break;
        case fullAction === 'search_user':
          await this.handleSearchUserPrompt(chatId);
          break;
        case fullAction.startsWith('user_info_'):
          const userId = fullAction.replace('user_info_', '');
          if (userId) {
            await this.handleUserInfo(chatId, [userId]);
          } else {
            await this.telegram.sendMessage(chatId, '❌ ID пользователя не указан');
          }
          break;
        case fullAction.startsWith('block_user_'):
          await this.handleBlockUser(chatId, [fullAction.replace('block_user_', '')]);
          break;
        case fullAction.startsWith('unblock_user_'):
          await this.handleUnblockUser(chatId, [fullAction.replace('unblock_user_', '')]);
          break;
        case fullAction.startsWith('reset_user_'):
          await this.handleResetUser(chatId, [fullAction.replace('reset_user_', '')]);
          break;
        case fullAction.startsWith('reply_feedback_'):
          await this.handleReplyFeedback(chatId, [fullAction.replace('reply_feedback_', '')]);
          break;
        case fullAction.startsWith('mark_feedback_'):
          await this.handleMarkFeedbackProcessed(chatId, [fullAction.replace('mark_feedback_', '')]);
          break;
        case fullAction === 'rewards':
          await this.handleRewards(chatId);
          break;
        case fullAction === 'add_reward':
          await this.handleAddReward(chatId);
          break;
        case fullAction.startsWith('delete_reward_'):
          await this.handleDeleteReward(chatId, fullAction.replace('delete_reward_', ''));
          break;
        case fullAction === 'help':
          await this.handleHelp(chatId);
          break;
        default:
          console.log(`[COMMANDS] Unknown callback data: ${callbackData}`);
          await this.handleStart(chatId);
      }
    } catch (error) {
      console.error('[COMMANDS] Error in handleCallbackQuery:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при обработке команды');
    }
  }

  // Дополнительные методы для callback обработчиков
  async handleAnalyticsUsers(chatId) {
    try {
      const analytics = await this.analytics.getUserAnalytics();
      
      if (!analytics.success) {
        await this.telegram.sendMessage(chatId, `❌ Ошибка получения аналитики пользователей: ${analytics.error}`);
        return;
      }

      const message = this.analytics.formatUserAnalytics(analytics.data);
      
      const keyboard = this.telegram.createInlineKeyboard([
        [
          { text: '🔙 Назад к аналитике', callback_data: 'admin_analytics' }
        ]
      ]);

      await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
    } catch (error) {
      console.error('[COMMANDS] Error in handleAnalyticsUsers:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при получении аналитики пользователей');
    }
  }

  async handleAnalyticsTime(chatId) {
    try {
      const analytics = await this.analytics.getTimeAnalytics();
      
      if (!analytics.success) {
        await this.telegram.sendMessage(chatId, `❌ Ошибка получения временной аналитики: ${analytics.error}`);
        return;
      }

      const message = this.analytics.formatTimeAnalytics(analytics.data);
      
      const keyboard = this.telegram.createInlineKeyboard([
        [
          { text: '🔙 Назад к аналитике', callback_data: 'admin_analytics' }
        ]
      ]);

      await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
    } catch (error) {
      console.error('[COMMANDS] Error in handleAnalyticsTime:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при получении временной аналитики');
    }
  }

  // В детальном просмотре отзыва добавить кнопки
  async handleFeedbackDetailed(chatId) {
    try {
      const feedback = await this.feedback.getDetailedFeedback(10);
      if (!feedback.success) {
        await this.telegram.sendMessage(chatId, `❌ Ошибка получения детальных отзывов: ${feedback.error}`);
        return;
      }
      // Для каждого отзыва добавить кнопки "Ответить" и "Обработано"
      for (const item of feedback.data) {
        const message = this.feedback.formatDetailedFeedback([item]);
        const keyboard = this.telegram.createInlineKeyboard([
          [
            { text: '✉️ Ответить', callback_data: `admin_reply_feedback_${item.id}` },
            { text: '✅ Обработано', callback_data: `admin_mark_feedback_${item.id}` }
          ]
        ]);
        await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
      }
    } catch (error) {
      console.error('[COMMANDS] Error in handleFeedbackDetailed:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при получении детальных отзывов');
    }
  }

  async handleFeedbackByType(chatId, type) {
    try {
      const feedback = await this.feedback.getFeedbackByType(type);
      
      if (!feedback.success) {
        await this.telegram.sendMessage(chatId, `❌ Ошибка получения отзывов: ${feedback.error}`);
        return;
      }

      const message = this.feedback.formatDetailedFeedback(feedback.data);
      
      const keyboard = this.telegram.createInlineKeyboard([
        [
          { text: '🔙 Назад к отзывам', callback_data: 'admin_feedback' }
        ]
      ]);

      await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
    } catch (error) {
      console.error('[COMMANDS] Error in handleFeedbackByType:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при получении отзывов');
    }
  }

  async handleUsersTop(chatId) {
    try {
      const users = await this.users.getTopUsers(10, 'total_score');
      
      if (!users.success) {
        await this.telegram.sendMessage(chatId, `❌ Ошибка получения топ пользователей: ${users.error}`);
        return;
      }

      const message = this.users.formatTopUsers(users.data, 'total_score');
      
      const keyboard = this.telegram.createInlineKeyboard([
        [
          { text: '🔙 Назад к пользователям', callback_data: 'admin_users' }
        ]
      ]);

      await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
    } catch (error) {
      console.error('[COMMANDS] Error in handleUsersTop:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при получении топ пользователей');
    }
  }

  async handleUsersInactive(chatId) {
    try {
      const users = await this.users.getInactiveUsers(7);
      
      if (!users.success) {
        await this.telegram.sendMessage(chatId, `❌ Ошибка получения неактивных пользователей: ${users.error}`);
        return;
      }

      const message = this.users.formatUsersList(users.data);
      
      const keyboard = this.telegram.createInlineKeyboard([
        [
          { text: '🔙 Назад к пользователям', callback_data: 'admin_users' }
        ]
      ]);

      await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
    } catch (error) {
      console.error('[COMMANDS] Error in handleUsersInactive:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при получении неактивных пользователей');
    }
  }

  async handleUsersAll(chatId) {
    try {
      const users = await this.users.getUsersList(50); // Больше пользователей для полного списка
      
      if (!users.success) {
        await this.telegram.sendMessage(chatId, `❌ Ошибка получения всех пользователей: ${users.error}`);
        return;
      }

      const message = this.users.formatUsersList(users.data);
      
      const keyboard = this.telegram.createInlineKeyboard([
        [
          { text: '🔙 Назад к пользователям', callback_data: 'admin_users' }
        ]
      ]);

      await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
    } catch (error) {
      console.error('[COMMANDS] Error in handleUsersAll:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при получении всех пользователей');
    }
  }

  async handleSearchMenu(chatId) {
    const message = `🔍 <b>Поиск</b>

Выберите тип поиска:`;

    const keyboard = this.telegram.createInlineKeyboard([
      [
        { text: '👥 Поиск пользователя', callback_data: 'admin_search_user' }
      ],
      [
        { text: '🔙 Назад', callback_data: 'admin_main_menu' }
      ]
    ]);

    await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
  }

  async handleSearchUserPrompt(chatId) {
    try {
      console.log('[COMMANDS] handleSearchUserPrompt called for chatId:', chatId);
      
      // Получаем список всех пользователей
      const users = await this.users.getUsersList(10);
      console.log('[COMMANDS] getUsersList result:', users);
      
      if (!users.success) {
        console.log('[COMMANDS] getUsersList failed:', users.error);
        await this.telegram.sendMessage(chatId, `❌ Ошибка получения пользователей: ${users.error}`);
        return;
      }

      console.log('[COMMANDS] Users found:', users.data.length);
      console.log('[COMMANDS] Users data:', users.data);

      const message = `🔍 <b>Выберите пользователя для просмотра:</b>`;

      // Создаем кнопки для каждого пользователя
      const buttons = users.data.map(user => {
        const displayName = this.users.formatUserName(user);
        console.log('[COMMANDS] Creating button for user:', user.chat_id, displayName);
        return [{ text: displayName, callback_data: `admin_user_info_${user.chat_id}` }];
      });

      console.log('[COMMANDS] Created buttons:', buttons);

      // Добавляем кнопку "Назад"
      buttons.push([{ text: '🔙 Назад', callback_data: 'admin_search' }]);

      const keyboard = this.telegram.createInlineKeyboard(buttons);

      await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
      console.log('[COMMANDS] Message sent successfully');
    } catch (error) {
      console.error('[COMMANDS] Error in handleSearchUserPrompt:', error);
      await this.telegram.sendMessage(chatId, '❌ Произошла ошибка при получении списка пользователей');
    }
  }

  async handleHelp(chatId) {
    const message = `❓ <b>Справка по админ-панели</b>

🔧 <b>Основные команды:</b>
• /start - главное меню
• /analytics - аналитика системы
• /feedback - отзывы пользователей
• /users - управление пользователями
• /help - эта справка

🔍 <b>Поиск и информация:</b>
• /user_info &lt;ID&gt; - информация о пользователе
• /search_user &lt;имя&gt; - поиск пользователя

💡 <b>Советы:</b>
• Используйте кнопки для быстрой навигации
• Все данные обновляются в реальном времени
• Для возврата в главное меню нажмите "🔙 Назад"`;

    const keyboard = this.telegram.createInlineKeyboard([
      [
        { text: '🔙 Назад в меню', callback_data: 'admin_main_menu' }
      ]
    ]);

    await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
  }

  // Просмотр всех призов
  async handleRewards(chatId) {
    const db = this.env.DB;
    const rewards = await db.prepare('SELECT * FROM reward_shop ORDER BY price_xp ASC').all();
    let message = '<b>🎁 Магазин призов</b>\n\n';
    if (rewards.results.length === 0) {
      message += 'Нет доступных призов.';
    } else {
      for (const r of rewards.results) {
        message += `• <b>${r.name}</b> — ${r.price_xp} XP\n` +
          `ID: ${r.id} | Всего: ${r.quantity} | Осталось: ${r.quantity_left} | Активен: ${r.is_active ? 'Да' : 'Нет'}\n` +
          `${r.description || ''}\n\n`;
      }
    }
    const keyboard = this.telegram.createInlineKeyboard([
      [{ text: '➕ Добавить приз', callback_data: 'admin_add_reward' }],
      [{ text: '🔙 Назад', callback_data: 'admin_main_menu' }]
    ]);
    await this.telegram.sendMessageWithKeyboard(chatId, message, keyboard);
  }

  // Добавление нового приза (многошагово)
  async handleAddReward(chatId) {
    await setUserState(chatId, { step: 'awaiting_reward_name' }, this.env);
    await this.telegram.sendMessage(chatId, 'Введите название нового приза:');
  }

  // Обработка текстовых сообщений для добавления приза
  async handleTextForReward(chatId, text) {
    const state = await getUserState(chatId, this.env);
    if (!state) return false;
    const db = this.env.DB;
    if (state.step === 'awaiting_reward_name') {
      state.name = text;
      state.step = 'awaiting_reward_price';
      await setUserState(chatId, state, this.env);
      await this.telegram.sendMessage(chatId, 'Введите стоимость приза в XP:');
      return true;
    }
    if (state.step === 'awaiting_reward_price') {
      const price = parseInt(text);
      if (isNaN(price) || price <= 0) {
        await this.telegram.sendMessage(chatId, 'Стоимость должна быть положительным числом. Введите снова:');
        return true;
      }
      state.price_xp = price;
      state.step = 'awaiting_reward_quantity';
      await setUserState(chatId, state, this.env);
      await this.telegram.sendMessage(chatId, 'Введите количество призов (целое число > 0):');
      return true;
    }
    if (state.step === 'awaiting_reward_quantity') {
      const quantity = parseInt(text);
      if (isNaN(quantity) || quantity <= 0) {
        await this.telegram.sendMessage(chatId, 'Количество должно быть положительным целым числом. Введите снова:');
        return true;
      }
      state.quantity = quantity;
      state.step = 'awaiting_reward_desc';
      await setUserState(chatId, state, this.env);
      await this.telegram.sendMessage(chatId, 'Введите описание приза (или - для пропуска):');
      return true;
    }
    if (state.step === 'awaiting_reward_desc') {
      const desc = text === '-' ? '' : text;
      await db.prepare('INSERT INTO reward_shop (name, description, price_xp, quantity, quantity_left, is_active) VALUES (?, ?, ?, ?, ?, 1)')
        .bind(state.name, desc, state.price_xp, state.quantity, state.quantity).run();
      await clearUserState(chatId, this.env);
      await this.telegram.sendMessage(chatId, '✅ Приз добавлен!');
      await this.handleRewards(chatId);
      return true;
    }
    return false;
  }

  // Удаление (деактивация) приза
  async handleDeleteReward(chatId, rewardId) {
    const db = this.env.DB;
    await db.prepare('UPDATE reward_shop SET is_active = 0 WHERE id = ?').bind(rewardId).run();
    await this.telegram.sendMessage(chatId, 'Приз удалён.');
    await this.handleRewards(chatId);
  }
} 