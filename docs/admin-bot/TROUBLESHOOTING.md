# Устранение неполадок админ-бота

## 🔍 Диагностика проблем

### 1. Бот не отвечает на команды

**Симптомы:**
- Бот не реагирует на команды
- Нет сообщений об ошибках

**Решение:**
```bash
# Проверить webhook
curl "https://api.telegram.org/bot<ADMIN_BOT_TOKEN>/getWebhookInfo"

# Установить webhook заново
curl "https://api.telegram.org/bot<ADMIN_BOT_TOKEN>/setWebhook?url=https://your-domain"

# Проверить логи
npx wrangler tail telegram-wine-bot-admin
```

### 2. Ошибка "База данных недоступна"

**Симптомы:**
- Сообщение "❌ База данных недоступна. Проверьте конфигурацию."
- Ошибки в логах о недоступности DB

**Решение:**
```bash
# Проверить конфигурацию wrangler.toml
cat wrangler.toml | grep -A 10 "env.admin"

# Передеплоить с правильной конфигурацией
npx wrangler deploy --env admin

# Проверить доступность базы
npx wrangler d1 execute DB --command "SELECT COUNT(*) FROM users"
```

### 3. Ошибка парсинга Markdown

**Симптомы:**
- Ошибка "Can't parse entities"
- Сообщения не отправляются

**Решение:**
- Проверить экранирование специальных символов в тексте
- Использовать `\\` для экранирования `-`, `_`, `!`, `(`, `)`
- Передеплоить бота после исправлений

### 4. Ошибка "Нет доступа"

**Симптомы:**
- Сообщение "⛔️ У вас нет доступа к админ-панели"
- Бот не отвечает на команды

**Решение:**
```javascript
// В src/admin-bot.js проверить список администраторов
const ADMIN_IDS = [194832010]; // Добавить ваш chat_id

// Временно отключить проверку для тестирования
function isAdmin(chatId) {
  return true; // Разрешить всем для тестирования
}
```

## 🛠️ Команды для диагностики

### Проверка состояния бота
```bash
# Информация о боте
curl "https://api.telegram.org/bot<ADMIN_BOT_TOKEN>/getMe"

# Статус webhook
curl "https://api.telegram.org/bot<ADMIN_BOT_TOKEN>/getWebhookInfo"

# Логи в реальном времени
npx wrangler tail telegram-wine-bot-admin --format pretty
```

### Проверка базы данных
```bash
# Проверить таблицы
npx wrangler d1 execute DB --command "SELECT name FROM sqlite_master WHERE type='table'"

# Проверить пользователей
npx wrangler d1 execute DB --command "SELECT COUNT(*) FROM users"

# Проверить отзывы
npx wrangler d1 execute DB --command "SELECT COUNT(*) FROM user_feedback"
```

### Проверка конфигурации
```bash
# Проверить переменные окружения
npx wrangler secret list --env admin

# Проверить конфигурацию wrangler
npx wrangler whoami
```

## 🔧 Частые проблемы и решения

### Проблема: Бот отвечает, но команды не работают

**Причина:** Неправильная обработка команд в коде

**Решение:**
1. Проверить логи на наличие ошибок
2. Убедиться, что все модули импортированы правильно
3. Проверить обработку callback query

### Проблема: Кнопки не работают

**Причина:** Неправильная обработка callback_data

**Решение:**
1. Проверить формат callback_data в коде
2. Убедиться, что обработчик callback query работает
3. Проверить логи на ошибки обработки

### Проблема: Данные не загружаются

**Причина:** Проблемы с базой данных или SQL запросами

**Решение:**
1. Проверить доступность базы данных
2. Проверить правильность SQL запросов
3. Добавить обработку ошибок в код

### Проблема: Сообщения слишком длинные

**Причина:** Telegram ограничивает длину сообщений

**Решение:**
1. Разбить длинные сообщения на части
2. Использовать пагинацию для списков
3. Ограничить количество элементов в списках

## 📊 Мониторинг и логирование

### Включение подробного логирования
```javascript
// В начале файлов добавить
console.log('[MODULE] Function called with params:', params);
```

### Просмотр логов
```bash
# Логи в реальном времени
npx wrangler tail telegram-wine-bot-admin

# Логи с фильтрацией
npx wrangler tail telegram-wine-bot-admin --format json | jq 'select(.level == "error")'

# Логи за определенный период
npx wrangler tail telegram-wine-bot-admin --since 1h
```

### Анализ ошибок
```bash
# Поиск ошибок в логах
npx wrangler tail telegram-wine-bot-admin | grep -i error

# Поиск конкретных ошибок
npx wrangler tail telegram-wine-bot-admin | grep "Database not available"
```

## 🚀 Восстановление после сбоев

### Полная переустановка
```bash
# 1. Удалить webhook
curl "https://api.telegram.org/bot<ADMIN_BOT_TOKEN>/deleteWebhook"

# 2. Передеплоить бота
npx wrangler deploy --env admin

# 3. Установить webhook заново
curl "https://api.telegram.org/bot<ADMIN_BOT_TOKEN>/setWebhook?url=https://your-domain"

# 4. Проверить работу
curl "https://api.telegram.org/bot<ADMIN_BOT_TOKEN>/getWebhookInfo"
```

### Восстановление базы данных
```bash
# Создать таблицу отзывов заново
npx wrangler d1 execute DB --file=./db/add-feedback-table.sql

# Проверить целостность данных
npx wrangler d1 execute DB --command "PRAGMA integrity_check"
```

## 📞 Получение помощи

### Информация для отчета о проблеме
1. **Описание проблемы** - что происходит и что ожидается
2. **Логи ошибок** - полные логи с ошибками
3. **Конфигурация** - версии wrangler, Node.js
4. **Шаги воспроизведения** - как воспроизвести проблему
5. **Окружение** - локальное или продакшн

### Полезные команды для диагностики
```bash
# Версия wrangler
npx wrangler --version

# Статус Cloudflare
npx wrangler whoami

# Проверка конфигурации
npx wrangler config list
```

### Контакты для поддержки
- **Документация:** `docs/admin-bot/README.md`
- **Исходный код:** `src/admin/`
- **Конфигурация:** `wrangler.toml`
- **Скрипты:** `scripts/setup-admin-bot.sh` 