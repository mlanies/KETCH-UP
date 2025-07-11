// Диагностика состояния бота и webhook

console.log('🔍 Диагностика Telegram бота\n');

// Проверяем переменные окружения
console.log('📋 Проверка переменных окружения:');
console.log('- TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✅ Установлен' : '❌ Отсутствует');
console.log('- CLOUDFLARE_ACCOUNT_ID:', process.env.CLOUDFLARE_ACCOUNT_ID ? '✅ Установлен' : '❌ Отсутствует');
console.log('- CLOUDFLARE_AI_TOKEN:', process.env.CLOUDFLARE_AI_TOKEN ? '✅ Установлен' : '❌ Отсутствует');
console.log('');

// Функция для проверки бота
async function checkBot(token) {
  if (!token) {
    console.log('❌ Токен бота не найден');
    return false;
  }
  
  try {
    console.log('🔍 Проверка бота...');
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Бот активен:');
      console.log(`   - ID: ${data.result.id}`);
      console.log(`   - Имя: ${data.result.first_name}`);
      console.log(`   - Username: @${data.result.username}`);
      console.log(`   - Может присоединяться к группам: ${data.result.can_join_groups}`);
      console.log(`   - Может читать сообщения групп: ${data.result.can_read_all_group_messages}`);
      console.log(`   - Поддерживает inline режим: ${data.result.supports_inline_queries}`);
      return true;
    } else {
      console.log('❌ Ошибка бота:', data.description);
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка подключения к Telegram API:', error.message);
    return false;
  }
}

// Функция для проверки webhook
async function checkWebhook(token) {
  if (!token) {
    console.log('❌ Токен бота не найден');
    return false;
  }
  
  try {
    console.log('🔍 Проверка webhook...');
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Информация о webhook:');
      console.log(`   - URL: ${data.result.url || 'Не установлен'}`);
      console.log(`   - Имеет сертификат: ${data.result.has_custom_certificate}`);
      console.log(`   - Ожидающие обновления: ${data.result.pending_update_count}`);
      console.log(`   - Последняя ошибка: ${data.result.last_error_message || 'Нет'}`);
      console.log(`   - Последняя ошибка времени: ${data.result.last_error_date || 'Нет'}`);
      console.log(`   - Максимальное количество соединений: ${data.result.max_connections || 'Не указано'}`);
      
      if (data.result.url) {
        console.log('✅ Webhook установлен');
        return true;
      } else {
        console.log('❌ Webhook не установлен');
        return false;
      }
    } else {
      console.log('❌ Ошибка получения информации о webhook:', data.description);
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка подключения к Telegram API:', error.message);
    return false;
  }
}

// Функция для тестирования отправки сообщения
async function testSendMessage(token) {
  if (!token) {
    console.log('❌ Токен бота не найден');
    return false;
  }
  
  try {
    console.log('🔍 Тестирование отправки сообщения...');
    const testChatId = 123456789; // Тестовый chat ID
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: testChatId,
        text: 'Тестовое сообщение от бота'
      })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Сообщение отправлено успешно');
      return true;
    } else {
      console.log('❌ Ошибка отправки сообщения:', data.description);
      console.log('   Код ошибки:', data.error_code);
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка подключения к Telegram API:', error.message);
    return false;
  }
}

// Функция для тестирования callback query
async function testCallbackQuery(token) {
  if (!token) {
    console.log('❌ Токен бота не найден');
    return false;
  }
  
  try {
    console.log('🔍 Тестирование callback query...');
    const testCallbackId = 'test_callback_123';
    const response = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: testCallbackId
      })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      console.log('✅ Callback query обработан успешно');
      return true;
    } else {
      console.log('❌ Ошибка обработки callback query:', data.description);
      console.log('   Код ошибки:', data.error_code);
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка подключения к Telegram API:', error.message);
    return false;
  }
}

// Основная функция диагностики
async function diagnoseBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  console.log('🚀 Начинаем диагностику...\n');
  
  // Проверяем бота
  const botOk = await checkBot(token);
  console.log('');
  
  // Проверяем webhook
  const webhookOk = await checkWebhook(token);
  console.log('');
  
  // Тестируем отправку сообщения
  const messageOk = await testSendMessage(token);
  console.log('');
  
  // Тестируем callback query
  const callbackOk = await testCallbackQuery(token);
  console.log('');
  
  // Выводим итоговый результат
  console.log('📊 Результаты диагностики:');
  console.log(`- Бот: ${botOk ? '✅ Работает' : '❌ Проблемы'}`);
  console.log(`- Webhook: ${webhookOk ? '✅ Установлен' : '❌ Не установлен'}`);
  console.log(`- Отправка сообщений: ${messageOk ? '✅ Работает' : '❌ Проблемы'}`);
  console.log(`- Callback query: ${callbackOk ? '✅ Работает' : '❌ Проблемы'}`);
  console.log('');
  
  if (botOk && webhookOk && messageOk && callbackOk) {
    console.log('🎉 Все системы работают корректно!');
  } else {
    console.log('🔧 Рекомендации по исправлению:');
    
    if (!botOk) {
      console.log('1. Проверьте правильность токена бота');
      console.log('2. Убедитесь, что бот не заблокирован');
      console.log('3. Проверьте сетевое подключение');
    }
    
    if (!webhookOk) {
      console.log('4. Установите webhook командой: /set-webhook');
      console.log('5. Проверьте доступность URL webhook');
    }
    
    if (!messageOk) {
      console.log('6. Проверьте права бота на отправку сообщений');
      console.log('7. Убедитесь, что бот добавлен в чат');
    }
    
    if (!callbackOk) {
      console.log('8. Проверьте обработку callback query в коде');
    }
  }
}

// Запускаем диагностику
diagnoseBot().catch(error => {
  console.error('❌ Ошибка диагностики:', error);
}); 