// src/admin/handlers/telegram.js
// Работа с Telegram API для админ-бота

export class TelegramHandler {
  constructor(env) {
    this.env = env;
    this.token = env.ADMIN_BOT_TOKEN;
  }

  // Отправка сообщения
  async sendMessage(chatId, text, parseMode = 'Markdown') {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text, 
          parse_mode: parseMode 
        })
      });
      
      const responseText = await response.text();
      console.log(`[ADMIN TELEGRAM] Response status: ${response.status}`);
      console.log(`[ADMIN TELEGRAM] Response body: ${responseText}`);
      
      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status} ${responseText}`);
      }
      
      const result = JSON.parse(responseText);
      console.log(`[ADMIN TELEGRAM] Sent message to ${chatId}: ${text.substring(0, 100)}...`);
      
      return result;
    } catch (err) {
      console.error(`[ADMIN TELEGRAM] Error sending message to ${chatId}:`, err);
      throw err;
    }
  }

  // Отправка сообщения с клавиатурой
  async sendMessageWithKeyboard(chatId, text, keyboard, parseMode = 'HTML') {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text, 
          parse_mode: parseMode,
          reply_markup: keyboard
        })
      });
      
      const responseText = await response.text();
      console.log(`[ADMIN TELEGRAM] Keyboard response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status} ${responseText}`);
      }
      
      const result = JSON.parse(responseText);
      console.log(`[ADMIN TELEGRAM] Sent message with keyboard to ${chatId}`);
      
      return result;
    } catch (err) {
      console.error(`[ADMIN TELEGRAM] Error sending message with keyboard to ${chatId}:`, err);
      throw err;
    }
  }

  // Редактирование сообщения
  async editMessage(chatId, messageId, text, parseMode = 'Markdown') {
    const url = `https://api.telegram.org/bot${this.token}/editMessageText`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          message_id: messageId,
          text, 
          parse_mode: parseMode 
        })
      });
      
      const responseText = await response.text();
      console.log(`[ADMIN TELEGRAM] Edit response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status} ${responseText}`);
      }
      
      const result = JSON.parse(responseText);
      console.log(`[ADMIN TELEGRAM] Edited message ${messageId} for ${chatId}`);
      
      return result;
    } catch (err) {
      console.error(`[ADMIN TELEGRAM] Error editing message ${messageId} for ${chatId}:`, err);
      throw err;
    }
  }

  // Ответ на callback query
  async answerCallbackQuery(callbackQueryId, text = null, showAlert = false) {
    const url = `https://api.telegram.org/bot${this.token}/answerCallbackQuery`;
    try {
      const body = { callback_query_id: callbackQueryId };
      if (text) body.text = text;
      if (showAlert) body.show_alert = showAlert;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const responseText = await response.text();
      console.log(`[ADMIN TELEGRAM] Callback response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status} ${responseText}`);
      }
      
      const result = JSON.parse(responseText);
      console.log(`[ADMIN TELEGRAM] Answered callback query ${callbackQueryId}`);
      
      return result;
    } catch (err) {
      console.error(`[ADMIN TELEGRAM] Error answering callback query ${callbackQueryId}:`, err);
      throw err;
    }
  }

  // Удаление сообщения
  async deleteMessage(chatId, messageId) {
    const url = `https://api.telegram.org/bot${this.token}/deleteMessage`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: chatId, 
          message_id: messageId
        })
      });
      
      const responseText = await response.text();
      console.log(`[ADMIN TELEGRAM] Delete response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status} ${responseText}`);
      }
      
      const result = JSON.parse(responseText);
      console.log(`[ADMIN TELEGRAM] Deleted message ${messageId} for ${chatId}`);
      
      return result;
    } catch (err) {
      console.error(`[ADMIN TELEGRAM] Error deleting message ${messageId} for ${chatId}:`, err);
      throw err;
    }
  }

  // Получение информации о боте
  async getBotInfo() {
    const url = `https://api.telegram.org/bot${this.token}/getMe`;
    try {
      const response = await fetch(url);
      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status} ${responseText}`);
      }
      
      const result = JSON.parse(responseText);
      console.log(`[ADMIN TELEGRAM] Bot info: ${result.result.username}`);
      
      return result.result;
    } catch (err) {
      console.error(`[ADMIN TELEGRAM] Error getting bot info:`, err);
      throw err;
    }
  }

  // Создание inline клавиатуры
  createInlineKeyboard(buttons) {
    return {
      inline_keyboard: buttons
    };
  }

  // Создание обычной клавиатуры
  createReplyKeyboard(buttons, resizeKeyboard = true, oneTimeKeyboard = false) {
    return {
      keyboard: buttons,
      resize_keyboard: resizeKeyboard,
      one_time_keyboard: oneTimeKeyboard
    };
  }

  // Создание кнопки удаления клавиатуры
  createRemoveKeyboard() {
    return {
      remove_keyboard: true
    };
  }

  // Утилита для экранирования Markdown символов
  escapeMarkdown(text) {
    if (!text) return text;
    return text
      .replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
      .replace(/^#/, '\\#')
      .replace(/\\!/g, '!'); // Убираем лишнее экранирование восклицательного знака
  }

  // Утилита для экранирования текста пользователя (HTML)
  escapeUserText(text) {
    if (!text) return text;
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
} 