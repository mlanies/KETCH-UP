# 🔧 Руководство по устранению неполадок

## 🚨 Кнопки не работают

### Быстрая диагностика

1. **Запустите диагностику:**
   ```bash
   node diagnose-bot.js
   ```

2. **Проверьте логи в Cloudflare Dashboard:**
   - Ищите ошибки 404 "Not Found"
   - Проверьте статус ответов Telegram API

3. **Запустите тесты:**
   ```bash
   node test-buttons.js
   node test-webhook.js
   ```

### Возможные причины и решения

#### 1. Ошибка 404 "Not Found"
**Признаки:** В логах видна ошибка `Telegram API error: Not Found`

**Причины:**
- Неверный токен бота
- Бот заблокирован или удален
- Проблемы с сетевым подключением

**Решение:**
1. Проверьте правильность `TELEGRAM_BOT_TOKEN`
2. Убедитесь, что бот активен в @BotFather
3. Проверьте сетевое подключение к api.telegram.org

#### 2. Callback query не обрабатываются
**Признаки:** Кнопки нажимаются, но ничего не происходит

**Причины:**
- Webhook не установлен
- Система безопасности блокирует запросы
- Ошибки в обработчике callback query

**Решение:**
1. Установите webhook: `/set-webhook`
2. Проверьте исключения для Telegram в системе безопасности
3. Проверьте логи обработки callback query

#### 3. Сообщения не отправляются
**Признаки:** Бот получает запросы, но не отвечает

**Причины:**
- Бот не добавлен в чат
- Недостаточно прав у бота
- Ошибки в функциях отправки сообщений

**Решение:**
1. Добавьте бота в чат
2. Проверьте права бота (отправка сообщений, чтение сообщений)
3. Проверьте функции `sendMessage` и `sendMessageWithKeyboard`

#### 4. Система безопасности блокирует
**Признаки:** Запросы блокируются с ошибкой 403

**Причины:**
- IP адрес заблокирован
- Rate limiting сработал
- User-Agent заблокирован

**Решение:**
1. Проверьте исключения для Telegram в `security.js`
2. Убедитесь, что webhook URL исключен из проверок
3. Проверьте whitelist IP адресов Telegram

## 🔍 Пошаговая диагностика

### Шаг 1: Проверка переменных окружения
```bash
# Проверьте наличие токена
echo $TELEGRAM_BOT_TOKEN

# Запустите диагностику
node diagnose-bot.js
```

### Шаг 2: Проверка состояния бота
```bash
# Проверьте бота через API
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"
```

### Шаг 3: Проверка webhook
```bash
# Проверьте информацию о webhook
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

### Шаг 4: Установка webhook
```bash
# Установите webhook (замените URL на ваш)
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-worker.your-subdomain.workers.dev/webhook"}'
```

### Шаг 5: Тестирование функций
```bash
# Запустите все тесты
node test-buttons.js
node test-webhook.js
node test-daily-challenges.js
```

## 🛠️ Исправления в коде

### 1. Проверка токена бота
```javascript
// В telegramApi.js
if (!botToken) {
  console.error('TELEGRAM_BOT_TOKEN not found in env');
  return;
}
```

### 2. Исключения для Telegram в системе безопасности
```javascript
// В security.js
if (url.pathname === '/webhook') {
  return { allowed: true, reason: 'Telegram webhook - allowed' };
}
```

### 3. Обработка ошибок callback query
```javascript
// В telegram.js
try {
  await answerCallbackQuery(callbackQuery.id, env);
} catch (callbackError) {
  console.error('Failed to answer callback query:', callbackError);
  // Не прерываем выполнение
}
```

## 📊 Мониторинг

### Ключевые метрики для отслеживания:
- Количество успешных callback query
- Количество ошибок 404
- Время ответа Telegram API
- Количество заблокированных запросов системой безопасности

### Логи для анализа:
- `Callback query received: [data]`
- `Bot token exists: [true/false]`
- `Response status: [status]`
- `Telegram API response: [data]`

## 🚀 Профилактика

### Регулярные проверки:
1. Еженедельная диагностика бота
2. Мониторинг логов Cloudflare
3. Проверка состояния webhook
4. Тестирование основных функций

### Резервные планы:
1. Автоматическое переустановление webhook при ошибках
2. Fallback ответы при недоступности Telegram API
3. Кэширование последних ответов для быстрого восстановления

## 📞 Поддержка

Если проблемы не решаются:

1. **Соберите информацию:**
   - Результаты `diagnose-bot.js`
   - Логи Cloudflare Dashboard
   - Результаты тестов

2. **Проверьте документацию:**
   - [FIXES_SUMMARY.md](FIXES_SUMMARY.md)
   - [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
   - [SECURITY_GUIDE.md](SECURITY_GUIDE.md)

3. **Обратитесь к ресурсам:**
   - Telegram Bot API документация
   - Cloudflare Workers документация
   - Логи ошибок в GitHub Issues 