# Техническое задание: Telegram Web App для обучения официантов

## Описание проекта

**Beverage Learning Bot** - это Telegram бот для обучения официантов ресторана KETCH UP по ассортименту вин и других напитков. Проект включает в себя:

- **Основной бот** - для официантов с функциями обучения, тестирования, поиска напитков
- **Web App** - веб-интерфейс с расширенными возможностями
- **Админ-бот** - для администраторов с полной статистикой и управлением доступом

## Архитектура проекта

### Технологический стек
- **Backend**: Cloudflare Workers (JavaScript/Node.js)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **External APIs**: Telegram Bot API, Google Sheets API, Cloudflare AI
- **Frontend**: HTML5, CSS3, JavaScript, Telegram Web App API

### Структура файлов

```
telegram-wine-bot/
├── src/
│   ├── index.js                    # Основной worker (роутинг, API)
│   ├── handlers/                   # Обработчики функций
│   │   ├── telegram.js            # Telegram бот логика
│   │   ├── database.js            # Работа с БД
│   │   ├── learning.js            # Система обучения
│   │   ├── achievements.js        # Достижения
│   │   ├── data.js                # Работа с Google Sheets
│   │   ├── ai.js                  # ИИ интеграция
│   │   └── security.js            # Безопасность
│   ├── miniweb/                   # Web App страницы
│   │   ├── index.html             # Главная страница
│   │   ├── learning.html          # Обучение
│   │   ├── wines.html             # База напитков
│   │   ├── menu.html              # Меню
│   │   ├── alcohol.html           # Алкоголь
│   │   ├── search.html            # Поиск
│   │   ├── achievements.html      # Достижения
│   │   ├── challenges.html        # Задания
│   │   └── ai.html                # ИИ помощник
│   └── utils/                     # Утилиты
├── db/                           # База данных
│   ├── schema.sql                # Схема БД
│   └── init-db.js                # Инициализация
├── docs/                         # Документация
└── scripts/                      # Скрипты
```

## Задание 1: Главная страница Web App

### Требования к главной странице

**Файл**: `src/miniweb/index.html`

#### Функциональность:
1. **Авторизация через Telegram**
   - Автоматическое получение данных пользователя из `tg.initDataUnsafe.user`
   - Проверка существования пользователя в БД
   - Создание нового пользователя при первом входе

2. **Отображение профиля пользователя**
   - Аватар пользователя
   - Имя и фамилия
   - Уровень и прогресс опыта
   - Статистика: очки, вопросы, правильные ответы, серия

3. **Главное меню с функциями**
   - 🎓 Обучение - переход к системе тестирования
   - 🍷 База напитков - каталог всех напитков
   - 🍽️ Меню - раздел меню ресторана
   - 🥃 Алкоголь - алкогольные напитки
   - 🔍 Поиск - поиск по названию
   - 🏆 Достижения - система достижений
   - 🎯 Задания - ежедневные задания
   - 🤖 ИИ Помощник - AI консультант

#### Дизайн:
- Современный UI с градиентным фоном
- Адаптивная верстка для мобильных устройств
- Интеграция с Telegram Web App API
- Поддержка темной/светлой темы Telegram

#### API эндпоинты:
- `GET /user-stats?chat_id={id}` - получение статистики пользователя
- `POST /create-user` - создание нового пользователя

## Задание 2: Система авторизации

### Требования к авторизации

#### В файле `src/index.js`:
1. **API эндпоинт создания пользователя**
   ```javascript
   if (url.pathname === '/create-user' && request.method === 'POST') {
     return createUser(request, env);
   }
   ```

2. **Функция createUser**
   - Принимает данные пользователя (chat_id, username, first_name, last_name)
   - Проверяет существование пользователя в БД
   - Создает нового пользователя через DatabaseManager

#### В файле `src/handlers/database.js`:
1. **Метод createUser**
   ```javascript
   async createUser(userData) {
     const { chat_id, username, first_name, last_name } = userData;
     // SQL запрос для создания пользователя
   }
   ```

## Задание 3: Страницы Web App

### Требования к страницам

#### 1. Страница обучения (`learning.html`)
- **Функции**: тесты, уроки, прогресс обучения
- **API**: `/learning/start`, `/learning/question`, `/learning/answer`
- **Особенности**: адаптивная сложность, персонализация

#### 2. База напитков (`wines.html`)
- **Функции**: каталог, фильтры, поиск, детальная информация
- **API**: `/wines`, `/wines/{id}`, `/wines/search`
- **Особенности**: категории, изображения, описания

#### 3. Меню (`menu.html`)
- **Функции**: меню ресторана, коктейли, безалкогольные напитки
- **API**: `/menu`, `/menu/cocktails`, `/menu/non-alcohol`
- **Особенности**: структурированное меню, рецепты

#### 4. Алкоголь (`alcohol.html`)
- **Функции**: вина, крепкие напитки, пиво
- **API**: `/alcohol/wines`, `/alcohol/spirits`, `/alcohol/beer`
- **Особенности**: классификация, характеристики

#### 5. Поиск (`search.html`)
- **Функции**: поиск по названию, фильтры, автодополнение
- **API**: `/search?q={query}`, `/search/filters`
- **Особенности**: быстрый поиск, подсказки

#### 6. Достижения (`achievements.html`)
- **Функции**: список достижений, прогресс, награды
- **API**: `/achievements`, `/achievements/progress`
- **Особенности**: геймификация, мотивация

#### 7. Задания (`challenges.html`)
- **Функции**: ежедневные задания, еженедельные цели
- **API**: `/challenges/daily`, `/challenges/weekly`
- **Особенности**: регулярность, разнообразие

#### 8. ИИ помощник (`ai.html`)
- **Функции**: чат с ИИ, вопросы о напитках
- **API**: `/ai/chat`, `/ai/question`
- **Особенности**: контекстные ответы, обучение

## Задание 4: Админ-бот

### Требования к админ-боту

#### Функциональность:
1. **Статистика обучения**
   - Общая статистика по всем пользователям
   - Прогресс по категориям
   - Активность пользователей
   - Эффективность обучения

2. **Управление доступом**
   - Предоставление доступа к Web App
   - Отзыв доступа
   - Управление ролями пользователей
   - Блокировка/разблокировка

3. **Управление контентом**
   - Обновление базы напитков
   - Редактирование вопросов для тестов
   - Управление достижениями
   - Настройка заданий

#### Команды админ-бота:
- `/stats` - общая статистика
- `/users` - список пользователей
- `/access {username} {role}` - управление доступом
- `/block {username}` - блокировка
- `/unblock {username}` - разблокировка
- `/refresh` - обновление данных

## Задание 5: База данных

### Структура БД (уже создана в `db/schema.sql`)

#### Основные таблицы:
1. **users** - пользователи
2. **learning_sessions** - сессии обучения
3. **user_answers** - ответы пользователей
4. **achievements** - достижения
5. **daily_challenges** - ежедневные задания
6. **activity_log** - лог активности

#### Дополнительные таблицы для админ-функций:
```sql
-- Управление доступом
CREATE TABLE IF NOT EXISTS user_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    role TEXT NOT NULL, -- 'user', 'admin', 'moderator'
    granted_by INTEGER,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id),
    FOREIGN KEY (granted_by) REFERENCES users(chat_id)
);

-- Лог административных действий
CREATE TABLE IF NOT EXISTS admin_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    action TEXT NOT NULL,
    target_user_id INTEGER,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(chat_id),
    FOREIGN KEY (target_user_id) REFERENCES users(chat_id)
);
```

## Задание 6: Безопасность

### Требования к безопасности

1. **Проверка авторизации**
   - Валидация Telegram Web App данных
   - Проверка подписи initData
   - Проверка времени жизни токена

2. **Защита API**
   - Rate limiting
   - Проверка прав доступа
   - Валидация входных данных

3. **Защита данных**
   - Шифрование чувствительных данных
   - Логирование действий
   - Резервное копирование

## Задание 7: Развертывание

### Требования к развертыванию

1. **Cloudflare Workers**
   - Настройка wrangler.toml
   - Переменные окружения
   - Привязка к D1 и KV

2. **Telegram Bot**
   - Настройка Web App в BotFather
   - Установка webhook
   - Настройка команд

3. **Мониторинг**
   - Логирование ошибок
   - Метрики производительности
   - Алерты при проблемах

## Критерии приемки

### Функциональные требования:
- [ ] Авторизация через Telegram работает корректно
- [ ] Все страницы Web App загружаются и функционируют
- [ ] API эндпоинты возвращают корректные данные
- [ ] Система обучения работает с персонализацией
- [ ] Админ-бот предоставляет полную статистику
- [ ] Управление доступом функционирует

### Нефункциональные требования:
- [ ] Время загрузки страниц < 2 секунд
- [ ] Поддержка мобильных устройств
- [ ] Безопасность данных
- [ ] Масштабируемость
- [ ] Документация API

## Временные рамки

- **Этап 1** (Главная страница + авторизация): 3-5 дней
- **Этап 2** (Основные страницы Web App): 7-10 дней
- **Этап 3** (Админ-бот): 5-7 дней
- **Этап 4** (Тестирование и оптимизация): 3-5 дней

**Общее время**: 18-27 дней

## Технические детали

### Переменные окружения
```bash
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_BOT_TOKEN=your_admin_bot_token

# Google Sheets
GOOGLE_SHEETS_API_KEY=your_api_key
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id

# Cloudflare
CLOUDFLARE_AI_TOKEN=your_ai_token

# Database
D1_DATABASE_ID=your_d1_database_id
KV_NAMESPACE_ID=your_kv_namespace_id
```

### API документация
Подробная документация API будет создана в отдельном файле `docs/api/API_DOCUMENTATION.md`

### Тестирование
- Автоматические тесты для API
- Ручное тестирование Web App
- Тестирование производительности
- Тестирование безопасности 