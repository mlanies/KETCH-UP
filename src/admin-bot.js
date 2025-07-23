// src/admin-bot.js

const ADMIN_IDS = [123456789]; // Замените на реальные chat_id админов

async function sendMessage(chatId, text, env) {
  const token = env.ADMIN_BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    });
    const responseText = await response.text();
    console.log(`[ADMIN BOT] Telegram API response status: ${response.status}`);
    console.log(`[ADMIN BOT] Telegram API response body: ${responseText}`);
    console.log(`[ADMIN BOT] Sent message to ${chatId}: ${text}`);
  } catch (err) {
    console.error(`[ADMIN BOT] Error sending message to ${chatId}:`, err);
  }
}

async function handleAdminMessage(message, env) {
  const chatId = message.chat.id;
  const text = message.text || '';
  // TODO: Включить проверку ADMIN_IDS после тестирования
  // if (!ADMIN_IDS.includes(chatId)) {
  //   await sendMessage(chatId, '⛔️ Нет доступа', env);
  //   return;
  // }
  if (text === '/start') {
    await sendMessage(chatId, '👋 Привет! Это админ-бот. Доступные команды: /feedback, /analytics', env);
  } else if (text === '/feedback') {
    // TODO: Реализовать просмотр отзывов пользователей
    await sendMessage(chatId, '📝 Отзывы пользователей (заглушка)', env);
  } else if (text === '/analytics') {
    // TODO: Реализовать аналитику
    await sendMessage(chatId, '📊 Аналитика (заглушка)', env);
  } else {
    await sendMessage(chatId, 'Неизвестная команда. Доступные: /feedback, /analytics', env);
  }
}

export async function handleAdminWebhook(request, env) {
  try {
    const update = await request.json();
    console.log('[ADMIN BOT] Incoming update:', JSON.stringify(update));
    if (update.message) {
      console.log('[ADMIN BOT] chatId:', update.message.chat.id, 'text:', update.message.text);
      await handleAdminMessage(update.message, env);
    } else {
      console.log('[ADMIN BOT] No message in update');
    }
    return new Response('OK');
  } catch (err) {
    console.error('[ADMIN BOT] Error in handleAdminWebhook:', err);
    return new Response('ERROR', { status: 500 });
  }
}

export default { fetch: handleAdminWebhook }; 