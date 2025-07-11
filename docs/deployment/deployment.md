# Развертывание системы обучения с базой данных

## Предварительные требования

1. Установленный Wrangler CLI
2. Настроенный Cloudflare аккаунт
3. Доступ к Cloudflare D1

## Шаг 1: Создание базы данных D1

```bash
# Создание новой базы данных
npx wrangler d1 create wine-bot-db

# Скопируйте полученный database_id в wrangler.toml
```

## Шаг 2: Обновление конфигурации

Обновите `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "wine-bot-db"
database_id = "your-database-id-here"
```

## Шаг 3: Инициализация схемы базы данных

```bash
# Применение схемы базы данных
npx wrangler d1 execute wine-bot-db --file=schema.sql

# Проверка создания таблиц
npx wrangler d1 execute wine-bot-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

## Шаг 4: Установка секретов

```bash
# Установка токенов (если еще не установлены)
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put GOOGLE_SHEETS_API_KEY
npx wrangler secret put GOOGLE_SHEETS_SPREADSHEET_ID
npx wrangler secret put GOOGLE_SHEETS_COCKTAIL_SPREADSHEET_ID
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_AI_TOKEN
```

## Шаг 5: Развертывание

```bash
# Локальное тестирование
npm run dev

# Развертывание в production
npm run deploy
```

## Шаг 6: Проверка работоспособности

### Проверка API эндпоинтов:

```bash
# Статистика пользователя
curl "https://your-worker.workers.dev/user-stats?chatId=123456789"

# Достижения пользователя
curl "https://your-worker.workers.dev/user-achievements?chatId=123456789"

# Ежедневные задания
curl "https://your-worker.workers.dev/daily-challenges?chatId=123456789"

# Экспорт данных
curl -X POST "https://your-worker.workers.dev/export-data" \
  -H "Content-Type: application/json" \
  -d '{"chatId": 123456789}'
```

## Шаг 7: Мониторинг

### Просмотр логов:

```bash
# Просмотр логов в реальном времени
npx wrangler tail

# Просмотр логов за определенный период
npx wrangler tail --format=pretty
```

### Проверка базы данных:

```bash
# Просмотр всех таблиц
npx wrangler d1 execute wine-bot-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# Проверка пользователей
npx wrangler d1 execute wine-bot-db --command="SELECT COUNT(*) as user_count FROM users;"

# Проверка достижений
npx wrangler d1 execute wine-bot-db --command="SELECT COUNT(*) as achievement_count FROM achievements;"
```

## Устранение неполадок

### Ошибка подключения к базе данных:

1. Проверьте правильность `database_id` в `wrangler.toml`
2. Убедитесь, что база данных создана и доступна
3. Проверьте права доступа к Cloudflare D1

### Ошибки в схеме базы данных:

```bash
# Проверка синтаксиса SQL
npx wrangler d1 execute wine-bot-db --file=schema.sql --dry-run
```

### Проблемы с производительностью:

1. Проверьте индексы в базе данных
2. Мониторьте время выполнения запросов
3. Оптимизируйте запросы при необходимости

## Резервное копирование

### Экспорт данных:

```bash
# Экспорт всей базы данных
npx wrangler d1 execute wine-bot-db --command=".dump" > backup.sql
```

### Восстановление данных:

```bash
# Восстановление из резервной копии
npx wrangler d1 execute wine-bot-db --file=backup.sql
```

## Масштабирование

### Увеличение производительности:

1. Оптимизация запросов
2. Добавление индексов
3. Кэширование часто запрашиваемых данных

### Мониторинг ресурсов:

```bash
# Просмотр использования ресурсов
npx wrangler d1 execute wine-bot-db --command="PRAGMA stats;"
```

## Безопасность

### Рекомендации:

1. Регулярно обновляйте секреты
2. Используйте HTTPS для всех API вызовов
3. Валидируйте все входные данные
4. Ограничивайте доступ к API эндпоинтам

### Аудит безопасности:

```bash
# Проверка прав доступа
npx wrangler d1 execute wine-bot-db --command="PRAGMA integrity_check;"
``` 