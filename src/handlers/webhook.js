// Функции для управления вебхуками и статусом бота

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
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Удаление веб-хука
export async function deleteWebhook(env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
  const result = await response.json();
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Получение статуса бота
export async function getBotStatus(env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const result = await response.json();
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Получение информации о webhook
export async function getWebhookInfo(env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const result = await response.json();
    
    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 