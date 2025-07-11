// Вспомогательные функции для работы с Telegram API

// Отправка простого сообщения
export async function sendMessage(chatId, text, env) {
  console.log('=== sendMessage START ===');
  console.log('chatId:', chatId);
  console.log('text length:', text.length);
  console.log('env keys:', Object.keys(env));
  
  const botToken = env.TELEGRAM_BOT_TOKEN;
  console.log('Bot token exists:', !!botToken);
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not found in env');
    return;
  }
  
  try {
    const requestBody = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const data = await response.json();
    console.log('Telegram API response:', data);
    
    if (!data.ok) {
      console.error('sendMessage error:', data);
      throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
    }
    
    console.log('Message sent successfully');
    console.log('=== sendMessage END ===');
  } catch (e) {
    console.error('sendMessage exception:', e);
    console.error('Exception stack:', e.stack);
    throw e;
  }
}

// Отправка сообщения с клавиатурой
export async function sendMessageWithKeyboard(chatId, text, keyboard, env) {
  console.log('=== sendMessageWithKeyboard START ===');
  console.log('chatId:', chatId);
  console.log('text length:', text.length);
  console.log('keyboard:', JSON.stringify(keyboard, null, 2));
  console.log('env keys:', Object.keys(env));
  
  const botToken = env.TELEGRAM_BOT_TOKEN;
  console.log('Bot token exists:', !!botToken);
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not found in env');
    return;
  }
  
  try {
    const requestBody = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const data = await response.json();
    console.log('Telegram API response:', data);
    
    if (!data.ok) {
      console.error('sendMessageWithKeyboard error:', data);
      throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
    }
    
    console.log('Message with keyboard sent successfully');
    console.log('=== sendMessageWithKeyboard END ===');
  } catch (e) {
    console.error('sendMessageWithKeyboard exception:', e);
    console.error('Exception stack:', e.stack);
    throw e;
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
  console.log('=== answerCallbackQuery START ===');
  console.log('callbackQueryId:', callbackQueryId);
  console.log('env keys:', Object.keys(env));
  
  const botToken = env.TELEGRAM_BOT_TOKEN;
  console.log('Bot token exists:', !!botToken);
  
  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN not found in env');
    return;
  }
  
  try {
    const requestBody = {
      callback_query_id: callbackQueryId
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    const data = await response.json();
    console.log('Telegram API response:', data);
    
    if (!data.ok) {
      console.error('answerCallbackQuery error:', data);
      throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
    }
    
    console.log('Callback query answered successfully');
    console.log('=== answerCallbackQuery END ===');
  } catch (e) {
    console.error('answerCallbackQuery exception:', e);
    console.error('Exception stack:', e.stack);
    throw e;
  }
} 