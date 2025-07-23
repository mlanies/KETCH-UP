-- Motivation history: хранение последних мотивационных сообщений пользователя
CREATE TABLE IF NOT EXISTS motivation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Advice history: AI-советы по улучшению обучения
CREATE TABLE IF NOT EXISTS advice_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    topic TEXT,
    advice TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feedback AI responses: AI-ответы на обратную связь
CREATE TABLE IF NOT EXISTS feedback_ai_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    feedback_comment TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI error log: лог ошибок AI и рассылки
CREATE TABLE IF NOT EXISTS ai_error_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    user_id INTEGER,
    error_message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Challenges: описание челленджей
CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    period TEXT NOT NULL, -- 'weekly' или 'monthly'
    reward TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL
);

-- Challenge progress: прогресс пользователя по челленджам
CREATE TABLE IF NOT EXISTS challenge_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    challenge_id INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    completed_at DATETIME,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id)
);

-- Дополнительные поля для профиля пользователя (пример для users)
ALTER TABLE users ADD COLUMN preferred_motivation_time TEXT;
ALTER TABLE users ADD COLUMN motivation_enabled BOOLEAN DEFAULT 1; 