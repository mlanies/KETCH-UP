# 🚀 Быстрый старт Telegram Wine Bot

## Что нужно сделать за 15 минут

### 1. Создать Telegram бота (2 мин)
1. Напишите @BotFather в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. **Сохраните токен**

### 2. Настроить Google Sheets API (5 мин)
1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект
3. Включите Google Sheets API
4. Создайте API ключ
5. **Сохраните API ключ**

### 3. Создать Google Sheets (3 мин)
1. Создайте новую таблицу на [sheets.google.com](https://sheets.google.com)
2. Добавьте заголовки: `Название | Сахар | Крепость | Страна | Описание | Изображение`
3. Добавьте несколько тестовых записей
4. Настройте доступ "Доступно всем с ссылкой"
5. **Скопируйте ID таблицы из URL**

### 4. Развернуть бота (5 мин)
```bash
# Клонируйте или скачайте проект
cd telegram-wine-bot

# Установите Wrangler
npm install -g wrangler

# Войдите в Cloudflare
wrangler login

# Запустите автоматическую настройку
./setup.sh
```

## Минимальная настройка

Если у вас нет времени на полную настройку:

### 1. Установите переменные окружения
```bash
wrangler secret put TELEGRAM_BOT_TOKEN
# Введите ваш токен

wrangler secret put GOOGLE_SHEETS_API_KEY  
# Введите ваш API ключ

wrangler secret put GOOGLE_SHEETS_SPREADSHEET_ID
# Введите ID таблицы
```

### 2. Разверните бота
```bash
wrangler deploy
```

### 3. Установите вебхук
```bash
curl "https://your-bot.your-subdomain.workers.dev/set-webhook"
```

## Тестирование

1. Найдите вашего бота в Telegram
2. Отправьте `/start`
3. Протестируйте фильтры

## Структура данных

Минимальный пример для Google Sheets:

| Название | Сахар | Крепость | Страна | Описание | Изображение |
|----------|-------|----------|--------|----------|-------------|
| Rioja | Сухое | 13% | Испания | Классическое испанское вино | https://example.com/rioja.jpg |

## Полезные команды

```bash
# Статус бота
curl "https://your-bot.your-subdomain.workers.dev/status"

# Обновить данные
curl -X POST "https://your-bot.your-subdomain.workers.dev/refresh-data"

# Удалить вебхук
curl "https://your-bot.your-subdomain.workers.dev/delete-webhook"
```

## Устранение проблем

### Бот не отвечает
1. Проверьте вебхук: `curl "https://your-bot.your-subdomain.workers.dev/status"`
2. Убедитесь, что токен правильный
3. Проверьте логи в Cloudflare Dashboard

### Данные не загружаются
1. Проверьте API ключ
2. Убедитесь, что таблица доступна по ссылке
3. Проверьте диапазон данных (M1:R65)

### Ошибки в логах
1. Откройте Cloudflare Workers Dashboard
2. Найдите ваш воркер
3. Проверьте логи в разделе "Logs"

## Следующие шаги

После успешного запуска:

1. **Добавьте реальные данные** в Google Sheets
2. **Настройте изображения** (загрузите в Google Drive)
3. **Протестируйте все функции** бота
4. **Настройте мониторинг** и алерты

## Поддержка

- 📖 [Полная документация](README.md)
- 🔧 [Настройка Google Sheets API](google-sheets-setup.md)
- 📊 [Миграция из Excel](excel-migration.md)
- 🐛 [Устранение проблем](README.md#поддержка) 