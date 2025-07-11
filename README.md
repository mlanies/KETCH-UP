# Telegram Wine Bot для Cloudflare Workers

Бот для обучения официантов по ассортименту вин. Интегрируется с Google Sheets для получения данных о винах и предоставляет удобный интерфейс для поиска и фильтрации.

## Функциональность

- 🔍 Поиск вин по названию
- 🍯 Фильтрация по сахару (сухое, полусухое и т.д.)
- 🥃 Фильтрация по крепости (11%, 11.5% и т.д.)
- 🌍 Фильтрация по стране (Испания, Италия и т.д.)
- 📸 Отображение изображений вин
- 📋 Просмотр всех вин в каталоге
- 🔄 Автоматическое обновление данных из Google Sheets
- 💾 Кеширование данных для быстрой работы

## Технические требования

- Cloudflare Workers аккаунт
- Telegram Bot Token (получить у @BotFather)
- Google Sheets API ключ
- Google Sheets с данными о винах

## Структура Google Sheets

Бот ожидает данные в следующем формате (диапазон M1:R65):

| Название | Сахар | Крепость | Страна | Описание | Изображение |
|----------|-------|----------|--------|----------|-------------|
| Вино 1   | Сухое | 11%      | Испания| Описание| URL картинки|
| Вино 2   | Полусухое| 11.5% | Италия | Описание| URL картинки|

## Установка и настройка

### 1. Подготовка Google Sheets

1. Создайте Google Sheets с данными о винах
2. Настройте доступ к API:
   - Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
   - Создайте новый проект или выберите существующий
   - Включите Google Sheets API
   - Создайте API ключ
   - Скопируйте ID таблицы из URL

### 2. Создание Telegram бота

1. Напишите @BotFather в Telegram
2. Выполните команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Скопируйте полученный токен

### 3. Настройка Cloudflare Workers

1. Установите Wrangler CLI:
```bash
npm install -g wrangler
```

2. Войдите в аккаунт Cloudflare:
```bash
wrangler login
```

3. Создайте KV namespace для кеширования:
```bash
wrangler kv:namespace create "WINE_CACHE"
wrangler kv:namespace create "WINE_CACHE" --preview
```

4. Обновите `wrangler.toml` с полученными ID namespace:
```toml
[[kv_namespaces]]
binding = "WINE_CACHE"
id = "ваш-production-id"
preview_id = "ваш-preview-id"
```

### 4. Настройка переменных окружения

Установите секретные переменные:

```bash
# Telegram Bot Token
wrangler secret put TELEGRAM_BOT_TOKEN

# Google Sheets API Key
wrangler secret put GOOGLE_SHEETS_API_KEY

# Google Sheets Spreadsheet ID
wrangler secret put GOOGLE_SHEETS_SPREADSHEET_ID

# Worker URL (опционально, для вебхуков)
wrangler secret put WORKER_URL
```

### 5. Развертывание

```bash
# Развертывание в production
wrangler deploy

# Развертывание в preview
wrangler deploy --env preview
```

### 6. Настройка вебхука

После развертывания установите вебхук:

```bash
# Получите URL вашего воркера и выполните:
curl "https://your-worker.your-subdomain.workers.dev/set-webhook"
```

## Использование

### Команды бота

- `/start` - Главное меню
- `/help` - Справка по использованию
- `/refresh` - Обновить данные (только для администраторов)

### API Endpoints

- `GET /status` - Статус бота
- `GET /set-webhook` - Установка вебхука
- `GET /delete-webhook` - Удаление вебхука
- `POST /refresh-data` - Принудительное обновление данных
- `POST /webhook` - Входящие сообщения от Telegram

## Структура проекта

```
telegram-wine-bot/
├── src/
│   └── index.js          # Основной код бота
├── wrangler.toml         # Конфигурация Cloudflare Workers
├── package.json          # Зависимости проекта
└── README.md            # Документация
```

## Разработка

### Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
wrangler dev

# Тестирование
wrangler dev --local
```

### Логирование

Бот использует `console.log` для логирования. Логи доступны в Cloudflare Workers Dashboard.

## Безопасность

- Все токены хранятся как секреты в Cloudflare Workers
- API ключи не попадают в код
- Валидация входящих данных
- Обработка ошибок

## Мониторинг

- Проверка статуса: `GET /status`
- Логи в Cloudflare Workers Dashboard
- Метрики производительности

## Обновление данных

Данные автоматически кешируются на 1 час. Для принудительного обновления:

1. Используйте команду `/refresh` в боте (только для администраторов)
2. Выполните POST запрос к `/refresh-data`

## Поддержка

При возникновении проблем:

1. Проверьте логи в Cloudflare Workers Dashboard
2. Убедитесь, что все переменные окружения установлены
3. Проверьте доступность Google Sheets API
4. Убедитесь, что вебхук установлен корректно

## Лицензия

MIT License 