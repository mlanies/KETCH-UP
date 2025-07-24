# 📁 Руководство по структуре проекта Telegram Wine Bot

## Обзор архитектуры

Проект состоит из двух основных частей:
- **Backend** - Cloudflare Workers с D1 базой данных
- **Frontend** - React приложение с Vite

## 🏗️ Backend структура

### Основные файлы

```
src/
├── index.js                    # 🚀 Главный роутер API
├── handlers/                   # 📦 Обработчики логики
│   ├── database.js            # 🗄️ Управление базой данных
│   ├── learning.js            # 🎓 Система обучения
│   ├── achievements.js        # 🏆 Система достижений
│   ├── dailyChallenges.js     # 📅 Ежедневные задания
│   ├── ai.js                  # 🤖 ИИ интеграция
│   ├── telegram.js            # 📱 Telegram API
│   ├── telegramApi.js         # 📡 Telegram HTTP клиент
│   ├── data.js                # 📊 Работа с данными напитков
│   ├── menu.js                # 🍽️ Обработка меню
│   ├── alcohol.js             # 🍷 Алкогольные напитки
│   ├── filters.js             # 🔍 Фильтры и поиск
│   ├── security.js            # 🔒 Безопасность
│   └── webhook.js             # 🔗 Webhook управление
├── utils/                      # 🛠️ Утилиты
│   ├── cors.js                # 🌐 CORS настройки
│   └── categories.js          # 📂 Категории напитков
└── db/                        # 🗃️ SQL схемы
    ├── schema.sql             # 📋 Основная схема БД
    └── init-db.js             # ⚡ Инициализация БД
```

### Ключевые компоненты

#### 1. `src/index.js` - Главный API роутер
**Назначение:** Обработка всех HTTP запросов

**Основные эндпоинты:**
```javascript
// Telegram webhook
/webhook (POST) → handleWebhook()

// Пользовательские данные
/user-stats (GET) → getUserStats()
/user-achievements (GET) → getUserStats()
/user-detailed-stats (GET) → getUserDetailedStats()

// Система тестирования
/start-quick-test (POST) → startQuickTest()
/get-test-question (POST) → getTestQuestion()
/submit-test-answer (POST) → submitTestAnswer()

// Напитки и ИИ
/drinks (GET) → getDrinks()
/ai-consultation (POST) → handleAIConsultation()
/daily-challenges (GET) → getDailyChallenges()

// Управление webhook
/set-webhook (POST) → setWebhook()
/delete-webhook (POST) → deleteWebhook()
/bot-status (GET) → getBotStatus()
```

#### 2. `src/handlers/database.js` - DatabaseManager
**Назначение:** Централизованное управление базой данных

**Основные методы:**
```javascript
class DatabaseManager {
  // Пользователи
  async initUser(chatId, telegramUser)
  async getUser(chatId)
  async updateUserStats(chatId, stats)
  async getUserStats(chatId)
  
  // Сессии обучения
  async createLearningSession(chatId, sessionType)
  async startQuickTestSession(chatId)
  async finishLearningSession(sessionId, stats)
  
  // Ответы и аналитика
  async saveAnswer(chatId, sessionId, answerData)
  async updateCategoryStats(chatId, category, isCorrect)
  async updateQuestionTypeStats(chatId, questionType, isCorrect)
  
  // Достижения
  async getAchievements(chatId)
  async checkAndAwardAchievements(chatId, stats)
  
  // Активность
  async logActivity(chatId, activityType, description, points, experience)
  async getActivityHistory(chatId, limit)
}
```

#### 3. `src/handlers/learning.js` - Система обучения
**Назначение:** Управление тестами и обучением

**Ключевые функции:**
```javascript
// Инициализация обучения
export async function startLearning(chatId, env)
export async function startQuickTest(chatId, env)
export async function startAIMode(chatId, env)

// Обработка ответов
export async function handleLearningAnswer(chatId, answer, env)
export async function handleLearningCallback(data, chatId, messageId, env)

// Генерация вопросов
async function generateAIQuestion(wines, questionType, difficulty, env)
function generateFallbackQuestion(wine, questionType)
```

#### 4. `src/handlers/ai.js` - ИИ интеграция
**Назначение:** Работа с Cloudflare AI

**Основные функции:**
```javascript
// Основные ИИ функции
export async function askCloudflareAI(question, env, userContext)
export async function askCloudflareAIWithWineContext(question, wineId, env, userContext)

// Кэширование
function getCachedResponse(question, wineId)
function setCachedResponse(question, response, wineId)

// Fallback ответы
function generateFallbackResponse(question, wine)
```

## 🎨 Frontend структура

### Основные файлы

```
frontend/
├── src/
│   ├── main.jsx               # 🚀 Точка входа
│   ├── App.jsx                # 📱 Главный компонент
│   ├── index.css              # 🎨 Глобальные стили
│   ├── pages/                 # 📄 Страницы приложения
│   │   ├── Home.jsx           # 🏠 Главная страница
│   │   ├── Drinks.jsx         # 🍷 База напитков
│   │   ├── Learning.jsx       # 🎓 Обучение
│   │   ├── Achievements.jsx   # 🏆 Достижения
│   │   └── Profile.jsx        # 👤 Профиль
│   ├── components/            # 🧩 Компоненты
│   │   ├── QuickTest.jsx      # ⚡ Быстрый тест
│   │   ├── PersonalizedTest.jsx # 🧠 Персонализированный тест
│   │   ├── CategoryTest.jsx   # 📚 Тест по категориям
│   │   ├── DailyChallenges.jsx # 📅 Ежедневные задания
│   │   ├── StatsChartCard.jsx # 📊 Статистика
│   │   ├── LoadingSpinner.jsx # ⏳ Загрузка
│   │   └── ErrorMessage.jsx   # ❌ Ошибки
│   ├── utils/                 # 🛠️ Утилиты
│   │   ├── api.js             # 🌐 API функции
│   │   └── telegram.js        # 📱 Telegram интеграция
│   └── assets/                # 🎨 Ресурсы
│       └── logo.svg           # 🏷️ Логотип
├── package.json               # 📦 Зависимости
├── vite.config.js             # ⚡ Конфигурация Vite
└── tailwind.config.js         # 🎨 Конфигурация Tailwind
```

### Ключевые компоненты

#### 1. `frontend/src/App.jsx` - Главный компонент
**Назначение:** Роутинг и общая структура

```javascript
// Роуты приложения
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/drinks" element={<Drinks />} />
  <Route path="/learning" element={<Learning />} />
  <Route path="/quick-test" element={<QuickTest />} />
  <Route path="/personalized-test" element={<PersonalizedTest />} />
  <Route path="/category-test" element={<CategoryTest />} />
  <Route path="/daily-challenges" element={<DailyChallenges />} />
  <Route path="/achievements" element={<Achievements />} />
  <Route path="/profile" element={<Profile />} />
</Routes>
```

#### 2. `frontend/src/utils/api.js` - API интеграция
**Назначение:** Все HTTP запросы к backend

```javascript
// Пользовательские данные
export async function fetchUserStats(chatId)
export async function fetchUserAchievements(chatId)
export async function fetchUserDetailedStats(chatId)

// Система тестирования
export async function startQuickTest(chatId)
export async function getTestQuestion(sessionId)
export async function submitTestAnswer(sessionId, questionId, answer, isCorrect)

// Напитки и ИИ
export async function fetchDrinks(category, search)
export async function askAI(question, wineId, chatId, userContext)

// Ежедневные задания
export async function fetchDailyChallenges(chatId)
```

#### 3. `frontend/src/pages/Home.jsx` - Главная страница
**Назначение:** Центральная страница с навигацией и статистикой

**Основные элементы:**
- Приветствие пользователя
- График прогресса обучения
- Статистика пользователя
- Кнопки навигации
- Ежедневные задания
- Достижения

## 🗄️ База данных (D1)

### Основные таблицы

```sql
-- Пользователи
CREATE TABLE users (
  chat_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_score INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  learning_streak INTEGER DEFAULT 0,
  experience_points INTEGER DEFAULT 0,
  difficulty_level TEXT DEFAULT 'beginner'
);

-- Сессии обучения
CREATE TABLE learning_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  session_type TEXT NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  experience_gained INTEGER DEFAULT 0
);

-- Ответы пользователей
CREATE TABLE user_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  session_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  user_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  category TEXT,
  question_type TEXT,
  wine_id TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Достижения
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'common'
);

-- Прогресс достижений
CREATE TABLE user_achievements (
  chat_id INTEGER NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress INTEGER DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (chat_id, achievement_id)
);

-- Ежедневные задания
CREATE TABLE daily_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  challenge_id TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  challenge_name TEXT NOT NULL,
  description TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  reward_points INTEGER DEFAULT 0,
  reward_experience INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  created_date DATE DEFAULT CURRENT_DATE,
  completed_at TIMESTAMP
);

-- Статистика по категориям
CREATE TABLE category_stats (
  chat_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (chat_id, category)
);

-- Статистика по типам вопросов
CREATE TABLE question_type_stats (
  chat_id INTEGER NOT NULL,
  question_type TEXT NOT NULL,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (chat_id, question_type)
);
```

## 🔄 Поток данных

### 1. Инициализация пользователя
```
Frontend → API /user-stats → DatabaseManager.initUser() → D1 Database
```

### 2. Прохождение теста
```
Frontend → API /start-quick-test → DatabaseManager.startQuickTestSession()
Frontend → API /get-test-question → DatabaseManager.getTestQuestion()
Frontend → API /submit-test-answer → DatabaseManager.submitTestAnswer()
```

### 3. ИИ консультации
```
Frontend → API /ai-consultation → askCloudflareAI() → Cloudflare AI API
```

### 4. Получение данных о напитках
```
Frontend → API /drinks → getWineData() → Google Sheets API
```

## 📊 Источники данных для аналитики

### 1. Поведенческие данные
- **Таблица `user_answers`** - все ответы пользователей
- **Таблица `learning_sessions`** - сессии обучения
- **Таблица `users`** - активность и прогресс

### 2. Академические данные
- **Таблица `category_stats`** - успеваемость по категориям
- **Таблица `question_type_stats`** - успеваемость по типам вопросов
- **Время ответов** - из поля `response_time_ms`

### 3. Мотивационные данные
- **Таблица `user_achievements`** - прогресс достижений
- **Таблица `daily_challenges`** - выполнение заданий
- **Серии обучения** - из поля `learning_streak`

### 4. Временные паттерны
- **Время активности** - из `last_activity`
- **Длительность сессий** - разность `start_time` и `end_time`
- **Частота использования** - количество записей в `learning_sessions`

## 🎯 Рекомендации по разработке

### 1. Для добавления новых функций
1. **Backend:** Добавить эндпоинт в `src/index.js`
2. **Database:** Создать методы в `DatabaseManager`
3. **Frontend:** Добавить API функцию в `utils/api.js`
4. **UI:** Создать компонент в `components/` или `pages/`

### 2. Для работы с данными
- Используйте `DatabaseManager` для всех операций с БД
- Логируйте действия через `logActivity()`
- Обновляйте статистику через соответствующие методы

### 3. Для ИИ интеграции
- Используйте `askCloudflareAI()` для общих вопросов
- Используйте `askCloudflareAIWithWineContext()` для вопросов о конкретных напитках
- Кэшируйте ответы для производительности

### 4. Для аналитики
- Собирайте данные через `user_answers` и `learning_sessions`
- Анализируйте паттерны через `category_stats` и `question_type_stats`
- Отслеживайте мотивацию через `user_achievements` и `daily_challenges`

## 🔧 Отладка и мониторинг

### Логирование
- Все важные действия логируются в `user_actions`
- Ошибки записываются в консоль Cloudflare Workers
- Аналитика доступна через Cloudflare Analytics

### Тестирование
- Используйте `/health` эндпоинт для проверки работоспособности
- Тестируйте API через `test-api.html`
- Проверяйте локально через `test-local.html`

Эта структура обеспечивает модульность, масштабируемость и легкость поддержки кода. 