# Описание проекта: Beverage Learning Bot

## Обзор проекта

**Beverage Learning Bot** - это комплексная система обучения официантов ресторана KETCH UP по ассортименту вин и других напитков. Проект состоит из трех основных компонентов:

1. **Основной Telegram бот** - для ежедневного использования официантами
2. **Telegram Web App** - расширенный веб-интерфейс с дополнительными возможностями
3. **Админ-бот** - для администраторов с полной статистикой и управлением

## Архитектура и технологии

### Backend (Cloudflare Workers)
- **Платформа**: Cloudflare Workers
- **Язык**: JavaScript/Node.js
- **Основной файл**: `src/index.js` - точка входа, роутинг, API эндпоинты

### База данных (Cloudflare D1)
- **Тип**: SQLite через Cloudflare D1
- **Схема**: `db/schema.sql`
- **Инициализация**: `db/init-db.js`

### Кэш (Cloudflare KV)
- **Назначение**: кэширование данных, сессии, временные данные
- **Конфигурация**: `wrangler.toml`

### Внешние API
- **Telegram Bot API** - взаимодействие с ботом
- **Google Sheets API** - источник данных о напитках
- **Cloudflare AI** - ИИ консультант

## Структура проекта и хранение данных

### 📁 Основные файлы

#### `src/index.js`
**Назначение**: Главный файл приложения
**Содержит**:
- Роутинг всех запросов
- API эндпоинты
- Обработка webhook от Telegram
- Интеграция всех модулей

#### `src/handlers/` - Обработчики функций
- **`telegram.js`** - логика Telegram бота, команды, callback queries
- **`database.js`** - работа с базой данных, CRUD операции
- **`learning.js`** - система обучения, тесты, прогресс
- **`achievements.js`** - система достижений и наград
- **`data.js`** - работа с Google Sheets, загрузка данных о напитках
- **`ai.js`** - интеграция с Cloudflare AI
- **`security.js`** - проверки безопасности, rate limiting
- **`menu.js`** - обработка меню ресторана
- **`alcohol.js`** - обработка алкогольных напитков
- **`filters.js`** - система фильтрации
- **`webhook.js`** - управление webhook
- **`telegramApi.js`** - API для отправки сообщений в Telegram

#### `src/miniweb/` - Web App страницы
- **`index.html`** - главная страница с авторизацией
- **`learning.html`** - страница обучения
- **`wines.html`** - база данных напитков
- **`menu.html`** - меню ресторана
- **`alcohol.html`** - алкогольные напитки
- **`search.html`** - поиск
- **`achievements.html`** - достижения
- **`challenges.html`** - ежедневные задания
- **`ai.html`** - ИИ помощник

#### `src/utils/` - Утилиты
- **`categories.js`** - категории напитков
- **`fallbackData.js`** - резервные данные

### 📊 База данных (Cloudflare D1)

#### Основные таблицы:

**`users`** - Пользователи системы
```sql
- chat_id (PRIMARY KEY) - Telegram ID пользователя
- username - Telegram username
- first_name, last_name - имя пользователя
- total_score - общий счет
- total_questions - количество вопросов
- total_correct - правильные ответы
- learning_streak - серия правильных ответов
- difficulty_level - уровень сложности
- experience_points - опыт
- consecutive_days - дни подряд
- last_learning_date - последняя дата обучения
```

**`learning_sessions`** - Сессии обучения
```sql
- id (PRIMARY KEY)
- chat_id - ID пользователя
- session_type - тип сессии
- start_time, end_time - время начала/окончания
- total_questions - количество вопросов
- correct_answers - правильные ответы
- score - счет
- experience_gained - полученный опыт
```

**`user_answers`** - Ответы пользователей
```sql
- id (PRIMARY KEY)
- chat_id - ID пользователя
- session_id - ID сессии
- question_text - текст вопроса
- user_answer - ответ пользователя
- correct_answer - правильный ответ
- is_correct - правильность
- category - категория
- question_type - тип вопроса
- wine_id - ID напитка
- response_time_ms - время ответа
```

**`achievements`** - Достижения
```sql
- id (PRIMARY KEY)
- chat_id - ID пользователя
- achievement_type - тип достижения
- achievement_name - название
- description - описание
- unlocked_at - дата получения
- progress_value - прогресс
- icon - иконка
- points - очки
```

**`daily_challenges`** - Ежедневные задания
```sql
- id (PRIMARY KEY)
- chat_id - ID пользователя
- challenge_id - ID задания
- challenge_type - тип задания
- challenge_name - название
- description - описание
- target_value - целевое значение
- current_progress - текущий прогресс
- is_completed - выполнено
- reward_points - награда в очках
- reward_experience - награда в опыте
```

**`activity_log`** - Лог активности
```sql
- id (PRIMARY KEY)
- chat_id - ID пользователя
- activity_type - тип активности
- description - описание
- points_earned - заработанные очки
- experience_earned - заработанный опыт
- created_at - дата создания
```

### 🔐 Кэш (Cloudflare KV)

#### Ключи и значения:

**Данные о напитках**:
- `wines_data` - кэшированные данные о напитках из Google Sheets
- `wines_timestamp` - время последнего обновления
- `selected_sheet_id` - выбранный лист Google Sheets

**Пользовательские данные**:
- `user_session_{chat_id}` - сессия пользователя
- `user_cache_{chat_id}` - кэш данных пользователя

**Системные данные**:
- `security_stats` - статистика безопасности
- `rate_limit_{ip}` - ограничения запросов
- `ai_cache_{query_hash}` - кэш ответов ИИ

### 📁 Конфигурационные файлы

#### `wrangler.toml`
**Назначение**: Конфигурация Cloudflare Workers
**Содержит**:
- Настройки проекта
- Привязки к D1 и KV
- Переменные окружения
- Настройки развертывания

#### `package.json`
**Назначение**: Зависимости и скрипты
**Содержит**:
- Список зависимостей
- Скрипты для разработки
- Информация о проекте

#### `webapp-config.json`
**Назначение**: Конфигурация Web App
**Содержит**:
- Настройки интерфейса
- Конфигурация функций
- Параметры безопасности

### 📚 Документация

#### `docs/` - Документация проекта
- **`overview/`** - обзор проекта
- **`deployment/`** - руководство по развертыванию
- **`learning/`** - документация системы обучения
- **`migration/`** - руководство по миграции данных
- **`security/`** - руководство по безопасности
- **`troubleshooting/`** - решение проблем
- **`miniweb/`** - документация Web App

### 🛠️ Скрипты и утилиты

#### `scripts/` - Скрипты
- **`setup-webapp.js`** - настройка Web App
- **`test-miniweb.js`** - тестирование Web App

#### `db/` - База данных
- **`init-db.js`** - инициализация БД
- **`reset-user-data.js`** - сброс данных пользователей
- **`reset-user.sql`** - SQL для сброса

## Поток данных

### 1. Загрузка данных о напитках
```
Google Sheets → data.js → Cloudflare KV → handlers
```

### 2. Обработка запросов пользователей
```
Telegram Bot → webhook → telegram.js → database.js → D1
```

### 3. Web App авторизация
```
Telegram Web App → index.html → /create-user → database.js → D1
```

### 4. Система обучения
```
learning.js → database.js → D1 → achievements.js → D1
```

## Безопасность

### Проверки безопасности (`security.js`)
- Валидация Telegram Web App данных
- Rate limiting по IP
- Проверка user-agent
- Блокировка подозрительных запросов

### Защита данных
- Шифрование чувствительных данных в KV
- Логирование всех действий в БД
- Валидация входных данных
- Проверка прав доступа

## Мониторинг и логирование

### Логирование
- Все действия пользователей в `activity_log`
- Ошибки в консоли Cloudflare Workers
- Административные действия в `admin_log`

### Метрики
- Количество активных пользователей
- Эффективность обучения
- Производительность API
- Использование ресурсов

## Развертывание

### Этапы развертывания
1. **Подготовка**: настройка Cloudflare D1 и KV
2. **Конфигурация**: настройка переменных окружения
3. **Развертывание**: `wrangler deploy`
4. **Настройка Telegram**: установка webhook и Web App
5. **Тестирование**: проверка всех функций

### Переменные окружения
```bash
# Обязательные
TELEGRAM_BOT_TOKEN=your_bot_token
GOOGLE_SHEETS_API_KEY=your_api_key
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id

# Опциональные
CLOUDFLARE_AI_TOKEN=your_ai_token
ADMIN_CHAT_IDS=123456,789012
```

## Масштабирование

### Горизонтальное масштабирование
- Cloudflare Workers автоматически масштабируются
- D1 поддерживает высокие нагрузки
- KV обеспечивает быстрый доступ к данным

### Оптимизация производительности
- Кэширование данных в KV
- Индексы в БД для быстрых запросов
- Минимизация API вызовов к Google Sheets
- Сжатие ответов API

## Поддержка и развитие

### Планы развития
1. **Мобильное приложение** - нативная версия для iOS/Android
2. **Аналитика** - расширенная аналитика обучения
3. **Интеграции** - подключение к CRM системам
4. **Мультиязычность** - поддержка других языков

### Поддержка
- Документация в `docs/`
- Скрипты диагностики в `scripts/`
- Руководство по решению проблем в `docs/troubleshooting/` 