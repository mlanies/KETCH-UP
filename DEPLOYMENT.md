# 🚀 Развертывание Telegram Wine Bot

## Предварительные требования

### 1. Cloudflare аккаунт
- Зарегистрируйтесь на [cloudflare.com](https://cloudflare.com)
- Активируйте Cloudflare Workers

### 2. Telegram Bot Token
- Получите у @BotFather в Telegram
- Сохраните токен

### 3. Google Sheets API
- Создайте проект в Google Cloud Console
- Включите Google Sheets API
- Получите API ключ

## Пошаговое развертывание

### Шаг 1: Подготовка проекта

```bash
# Клонируйте или скачайте проект
cd telegram-wine-bot

# Установите Wrangler CLI
npm install -g wrangler

# Войдите в Cloudflare
wrangler login
```

### Шаг 2: Автоматическая настройка

```bash
# Запустите скрипт настройки
./setup.sh
```

Скрипт автоматически:
- Создаст KV namespace
- Обновит конфигурацию
- Запросит необходимые данные
- Развернет бота
- Установит вебхук

### Шаг 3: Ручная настройка (альтернатива)

Если автоматическая настройка не работает:

```bash
# 1. Создайте KV namespace
wrangler kv:namespace create "WINE_CACHE"
wrangler kv:namespace create "WINE_CACHE" --preview

# 2. Обновите wrangler.toml с полученными ID
# Замените your-kv-namespace-id на реальные ID

# 3. Установите секреты
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put GOOGLE_SHEETS_API_KEY
wrangler secret put GOOGLE_SHEETS_SPREADSHEET_ID
wrangler secret put WORKER_URL

# 4. Разверните бота
wrangler deploy

# 5. Установите вебхук
curl "https://your-bot.your-subdomain.workers.dev/set-webhook"
```

## Проверка развертывания

### 1. Статус бота
```bash
curl "https://your-bot.your-subdomain.workers.dev/status"
```

Ожидаемый ответ:
```json
{
  "ok": true,
  "result": {
    "id": 123456789,
    "is_bot": true,
    "first_name": "Wine Bot",
    "username": "your_wine_bot"
  }
}
```

### 2. Тестирование в Telegram
1. Найдите вашего бота
2. Отправьте `/start`
3. Проверьте работу меню
4. Протестируйте фильтры

### 3. Проверка данных
```bash
# Обновите данные
curl -X POST "https://your-bot.your-subdomain.workers.dev/refresh-data"
```

## Настройка Google Sheets

### 1. Создание таблицы
1. Перейдите на [sheets.google.com](https://sheets.google.com)
2. Создайте новую таблицу
3. Добавьте заголовки: `Название | Сахар | Крепость | Страна | Описание | Изображение`
4. Добавьте тестовые данные

### 2. Настройка доступа
1. Нажмите "Share" (Поделиться)
2. Установите "Anyone with the link can view"
3. Скопируйте ID таблицы из URL

### 3. Добавление изображений
1. Загрузите изображения в Google Drive
2. Получите ссылки для общего доступа
3. Преобразуйте в формат: `https://drive.google.com/uc?id=FILE_ID`

## Мониторинг и логи

### 1. Cloudflare Workers Dashboard
1. Перейдите в [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Выберите "Workers & Pages"
3. Найдите ваш воркер
4. Проверьте логи в разделе "Logs"

### 2. Метрики производительности
- Время ответа
- Количество запросов
- Ошибки
- Использование KV

### 3. Алерты
Настройте уведомления при:
- Высоком времени ответа
- Большом количестве ошибок
- Превышении лимитов

## Обновление бота

### 1. Обновление кода
```bash
# Внесите изменения в код
# Разверните обновления
wrangler deploy
```

### 2. Обновление данных
```bash
# Принудительное обновление
curl -X POST "https://your-bot.your-subdomain.workers.dev/refresh-data"

# Или в боте
/refresh
```

### 3. Обновление переменных
```bash
# Изменить секрет
wrangler secret put TELEGRAM_BOT_TOKEN

# Удалить секрет
wrangler secret delete TELEGRAM_BOT_TOKEN
```

## Устранение проблем

### Бот не отвечает
1. Проверьте статус: `curl "https://your-bot.your-subdomain.workers.dev/status"`
2. Убедитесь, что вебхук установлен
3. Проверьте токен бота
4. Посмотрите логи в Cloudflare Dashboard

### Данные не загружаются
1. Проверьте API ключ Google Sheets
2. Убедитесь, что таблица доступна по ссылке
3. Проверьте диапазон данных (M1:R65)
4. Убедитесь, что Google Sheets API включен

### Ошибки в логах
1. Откройте Cloudflare Workers Dashboard
2. Найдите ваш воркер
3. Проверьте логи в разделе "Logs"
4. Ищите ошибки JavaScript или API

### Превышение лимитов
1. Проверьте лимиты Google Sheets API
2. Увеличьте квоты в Google Cloud Console
3. Оптимизируйте количество запросов
4. Используйте кеширование

## Безопасность

### Рекомендации
1. **Ограничьте API ключ** по доменам и API
2. **Не публикуйте токены** в публичных репозиториях
3. **Используйте переменные окружения** для секретов
4. **Регулярно ротируйте ключи**
5. **Мониторьте использование** API

### Мониторинг безопасности
1. Проверяйте логи на подозрительную активность
2. Мониторьте количество запросов
3. Настройте алерты при аномалиях
4. Регулярно обновляйте зависимости

## Масштабирование

### Увеличение производительности
1. Оптимизируйте код
2. Используйте кеширование
3. Увеличьте лимиты API
4. Добавьте CDN для изображений

### Увеличение функциональности
1. Добавьте новые фильтры
2. Реализуйте пагинацию
3. Добавьте поиск по описанию
4. Интегрируйте с другими API

## Поддержка

### Полезные ссылки
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Сообщество
- [Cloudflare Community](https://community.cloudflare.com/)
- [Telegram Bot Developers](https://t.me/botfather)
- [Google Cloud Community](https://cloud.google.com/community)

### Контакты
- **Заказчик**: Maksim Lanies (info@2gc.io)
- **Документация**: [README.md](README.md)
- **Быстрый старт**: [QUICKSTART.md](QUICKSTART.md) 