// Вспомогательные функции для работы с Telegram API

// Отправка простого сообщения
export async function sendMessage(chatId, text, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
    const data = await response.json();
    if (!data.ok) {
      console.log('sendMessage error:', data);
    }
  } catch (e) {
    console.log('sendMessage exception:', e);
  }
}

// Отправка сообщения с клавиатурой
export async function sendMessageWithKeyboard(chatId, text, keyboard, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      })
    });
    const data = await response.json();
    if (!data.ok) {
      console.log('sendMessageWithKeyboard error:', data);
    }
  } catch (e) {
    console.log('sendMessageWithKeyboard exception:', e);
  }
}

// Редактирование сообщения
export async function editMessage(chatId, messageId, text, keyboard, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      })
    });
    const data = await response.json();
    if (!data.ok) {
      console.log('editMessage error:', data);
      throw new Error('editMessage failed');
    }
  } catch (e) {
    console.log('editMessage exception:', e);
    throw e;
  }
}

// Отправка фото с подписью
export async function sendPhotoWithCaption(chatId, photoUrl, caption, keyboard, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption: caption,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    })
  });
}

// Ответ на callback query
export async function answerCallbackQuery(callbackQueryId, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId
    })
  });
} 