# 🚀 Руководство по развертыванию Web App

## Обзор

Это руководство поможет вам развернуть Telegram Web App для обучения официантов на платформе Cloudflare Workers.

## Предварительные требования

### 1. Установка инструментов

```bash
# Установка Node.js (версия 16 или выше)
# Скачайте с https://nodejs.org/

# Установка Wrangler CLI
npm install -g wrangler

# Проверка установки
wrangler --version
```

### 2. Настройка Cloudflare

1. Создайте аккаунт на [Cloudflare](https://cloudflare.com)
2. Перейдите в раздел Workers & Pages
3. Создайте новый Worker
4. Скопируйте Account ID и Zone ID

### 3. Настройка Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Получите токен бота
3. Настройте Web App в BotFather:
   ```
   /newapp
   Выберите вашего бота
   Введите название: Beverage Learning Bot
   Введите описание: Обучение официантов по напиткам
   Введите URL: https://your-worker.your-subdomain.workers.dev/miniweb
   ```

## Конфигурация проекта

### 1. Настройка wrangler.toml

Отредактируйте файл `wrangler.toml`:

```toml
name = "telegram-wine-bot"
main = "src/index.js"
compatibility_date = "2024-01-01"

# Переменные окружения
[vars]
ENVIRONMENT = "production"

# Привязки к D1 базе данных
[[d1_databases]]
binding = "DB"
database_name = "wine-bot-db"
database_id = "your-d1-database-id"

# Привязки к KV хранилищу
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
preview_id = "your-kv-preview-namespace-id"

# Секреты (установите через wrangler secret)
# TELEGRAM_BOT_TOKEN
# GOOGLE_SHEETS_API_KEY
# GOOGLE_SHEETS_SPREADSHEET_ID
# CLOUDFLARE_AI_TOKEN
```

### 2. Установка секретов

```bash
# Установка токена Telegram бота
wrangler secret put TELEGRAM_BOT_TOKEN

# Установка ключа Google Sheets API
wrangler secret put GOOGLE_SHEETS_API_KEY

# Установка ID Google Sheets документа
wrangler secret put GOOGLE_SHEETS_SPREADSHEET_ID

# Установка токена Cloudflare AI
wrangler secret put CLOUDFLARE_AI_TOKEN
```

### 3. Создание базы данных D1

```bash
# Создание базы данных
wrangler d1 create wine-bot-db

# Применение схемы
wrangler d1 execute wine-bot-db --file=./db/schema.sql

# Инициализация данных
wrangler d1 execute wine-bot-db --file=./db/init-db.js
```

### 4. Создание KV хранилища

```bash
# Создание KV namespace
wrangler kv:namespace create "CACHE"

# Создание preview namespace для разработки
wrangler kv:namespace create "CACHE" --preview
```

## Развертывание

### 1. Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск локального сервера
npx wrangler dev

# Тестирование
node scripts/test-miniweb.js
```

### 2. Развертывание в продакшн

```bash
# Сборка и развертывание
npx wrangler deploy

# Проверка статуса
npx wrangler tail
```

### 3. Настройка webhook

```bash
# Установка webhook для Telegram бота
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-worker.your-subdomain.workers.dev/webhook"
```

## Тестирование

### 1. Проверка Web App страниц

Откройте в браузере:
- `https://your-worker.your-subdomain.workers.dev/miniweb`
- `https://your-worker.your-subdomain.workers.dev/miniweb/learning`
- `https://your-worker.your-subdomain.workers.dev/miniweb/wines`
- И другие страницы...

### 2. Проверка API эндпоинтов

```bash
# Тестирование API
curl "https://your-worker.your-subdomain.workers.dev/user-stats?chat_id=123456789"
curl "https://your-worker.your-subdomain.workers.dev/wine-data"
curl "https://your-worker.your-subdomain.workers.dev/status"
```

### 3. Тестирование в Telegram

1. Откройте вашего бота в Telegram
2. Отправьте команду `/start`
3. Нажмите на кнопку "Web App" или "Открыть приложение"

## Мониторинг и логи

### 1. Просмотр логов

```bash
# Просмотр логов в реальном времени
npx wrangler tail

# Просмотр логов с фильтрацией
npx wrangler tail --format pretty
```

### 2. Мониторинг производительности

- Перейдите в Cloudflare Dashboard
- Выберите ваш Worker
- Просмотрите метрики в разделе "Analytics"

### 3. Алерты

Настройте алерты в Cloudflare Dashboard:
- Ошибки 5xx
- Высокое время ответа
- Превышение лимитов

## Обновления

### 1. Обновление кода

```bash
# Получение последних изменений
git pull origin main

# Развертывание обновлений
npx wrangler deploy
```

### 2. Обновление базы данных

```bash
# Применение миграций
wrangler d1 execute wine-bot-db --file=./db/migration.sql
```

### 3. Обновление переменных окружения

```bash
# Обновление секретов
wrangler secret put TELEGRAM_BOT_TOKEN

# Обновление переменных
wrangler secret put NEW_VARIABLE
```

## Устранение неполадок

### 1. Частые проблемы

**Ошибка 500 при загрузке страниц**
- Проверьте логи: `npx wrangler tail`
- Убедитесь, что все секреты установлены
- Проверьте подключение к базе данных

**Web App не открывается в Telegram**
- Проверьте URL в настройках BotFather
- Убедитесь, что webhook установлен
- Проверьте CORS настройки

**Ошибки базы данных**
- Проверьте схему: `wrangler d1 execute wine-bot-db --command="SELECT name FROM sqlite_master"`
- Пересоздайте базу при необходимости

### 2. Отладка

```bash
# Включение подробных логов
wrangler dev --log-level debug

# Проверка конфигурации
wrangler whoami
wrangler d1 list
wrangler kv:namespace list
```

### 3. Восстановление

```bash
# Откат к предыдущей версии
wrangler rollback

# Пересоздание базы данных
wrangler d1 delete wine-bot-db
wrangler d1 create wine-bot-db
wrangler d1 execute wine-bot-db --file=./db/schema.sql
```

## Безопасность

### 1. Проверки безопасности

- [ ] Все секреты установлены
- [ ] Webhook URL защищен
- [ ] CORS настроен правильно
- [ ] Rate limiting включен
- [ ] Валидация входных данных

### 2. Мониторинг безопасности

```bash
# Проверка статистики безопасности
curl "https://your-worker.your-subdomain.workers.dev/security-stats"

# Очистка кэша безопасности
curl -X POST "https://your-worker.your-subdomain.workers.dev/cleanup-security"
```

## Производительность

### 1. Оптимизация

- Используйте кэширование KV
- Минимизируйте запросы к базе данных
- Оптимизируйте размер HTML/CSS/JS
- Используйте CDN для статических ресурсов

### 2. Мониторинг

- Следите за временем ответа
- Мониторьте использование ресурсов
- Проверяйте количество запросов

## Поддержка

### 1. Документация

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Web App](https://core.telegram.org/bots/webapps)

### 2. Сообщество

- [Cloudflare Community](https://community.cloudflare.com/)
- [Telegram Bot Developers](https://t.me/botfather)

### 3. Логи и отладка

Все логи доступны в Cloudflare Dashboard и через `wrangler tail`.

---

**Успешного развертывания! 🚀** 