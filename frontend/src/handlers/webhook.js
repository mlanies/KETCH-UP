// Функции для управления вебхуками и статусом бота
import { jsonResponse } from '../utils/cors.js';

// Установка веб-хука
export async function setWebhook(env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  // Используем ваш домен wine.2gc.ru
  const webhookUrl = `${env.WORKER_URL || 'https://wine.2gc.ru'}/webhook`;
  
  console.log('Setting webhook URL:', webhookUrl);
  
  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl })
  });

  const result = await response.json();
  console.log('Webhook set result:', result);
  
  return jsonResponse(result);
}

// Удаление веб-хука
export async function deleteWebhook(env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
  const result = await response.json();
  
  return jsonResponse(result);
}

// Получение статуса бота
export async function getBotStatus(env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const result = await response.json();
    
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

// Получение информации о webhook
export async function getWebhookInfo(env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const result = await response.json();
    
    return jsonResponse(result);
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
} 