# Руководство по миграции на новую систему обучения

## Обзор изменений

Новая система обучения включает:
- ✅ Постоянное хранение данных в Cloudflare D1
- ✅ Система достижений и уровней
- ✅ Ежедневные задания
- ✅ Расширенная аналитика
- ✅ API эндпоинты для внешних систем

## Этапы миграции

### Этап 1: Подготовка

1. **Создание резервной копии**
   ```bash
   # Экспорт текущих данных (если есть)
   curl "https://your-worker.workers.dev/export-data" \
     -H "Content-Type: application/json" \
     -d '{"chatId": "all"}'
   ```

2. **Обновление зависимостей**
   ```bash
   npm install
   ```

### Этап 2: Настройка базы данных

1. **Создание D1 базы данных**
   ```bash
   npx wrangler d1 create wine-bot-db
   ```

2. **Обновление wrangler.toml**
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "wine-bot-db"
   database_id = "your-database-id-here"
   ```

3. **Применение схемы**
   ```bash
   npx wrangler d1 execute wine-bot-db --file=schema.sql
   ```

### Этап 3: Развертывание

1. **Тестирование локально**
   ```bash
   npm run dev
   ```

2. **Развертывание в production**
   ```bash
   npm run deploy
   ```

### Этап 4: Проверка

1. **Проверка API эндпоинтов**
   ```bash
   # Статистика
   curl "https://your-worker.workers.dev/user-stats?chatId=123456789"
   
   # Достижения
   curl "https://your-worker.workers.dev/user-achievements?chatId=123456789"
   ```

2. **Проверка базы данных**
   ```bash
   npx wrangler d1 execute wine-bot-db --command="SELECT COUNT(*) FROM users;"
   ```

## Изменения в коде

### Новые модули
- `src/handlers/database.js` - управление базой данных
- `src/handlers/achievements.js` - система достижений
- `src/handlers/dailyChallenges.js` - ежедневные задания

### Обновленные модули
- `src/handlers/learning.js` - интеграция с базой данных
- `src/index.js` - новые API эндпоинты

### Новые файлы
- `schema.sql` - схема базы данных
- `init-db.js` - скрипт инициализации

## Обратная совместимость

### Сохраненные функции
- ✅ Все существующие команды бота
- ✅ Система обучения с ИИ
- ✅ Поиск и фильтрация
- ✅ Интеграция с Google Sheets

### Новые функции
- 🆕 Постоянное хранение прогресса
- 🆕 Система достижений
- 🆕 Ежедневные задания
- 🆕 API эндпоинты

## Устранение неполадок

### Ошибка подключения к базе данных
```bash
# Проверка конфигурации
npx wrangler d1 list

# Проверка таблиц
npx wrangler d1 execute wine-bot-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

### Ошибки в коде
```bash
# Локальное тестирование
npm run dev

# Просмотр логов
npx wrangler tail
```

### Проблемы с производительностью
1. Проверьте индексы в базе данных
2. Мониторьте время выполнения запросов
3. Оптимизируйте запросы при необходимости

## Откат изменений

### В случае проблем
1. **Откат к предыдущей версии**
   ```bash
   git checkout <previous-commit>
   npm run deploy
   ```

2. **Восстановление данных**
   ```bash
   # Если есть резервная копия
   npx wrangler d1 execute wine-bot-db --file=backup.sql
   ```

## Мониторинг после миграции

### Ключевые метрики
- Время ответа API
- Количество активных пользователей
- Процент выполнения ежедневных заданий
- Количество полученных достижений

### Алерты
- Ошибки подключения к базе данных
- Высокое время ответа
- Ошибки в API эндпоинтах

## Поддержка

При возникновении проблем:
1. Проверьте логи: `npx wrangler tail`
2. Проверьте базу данных: `npx wrangler d1 execute wine-bot-db --command="PRAGMA integrity_check;"`
3. Создайте issue в GitHub
4. Обратитесь к документации: [docs/](docs/) 