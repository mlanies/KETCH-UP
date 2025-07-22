-- Схема базы данных для Telegram Wine Bot
-- Система обучения и достижений

-- Пользователи
CREATE TABLE IF NOT EXISTS users (
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
    max_streak INTEGER DEFAULT 0,
    difficulty_level TEXT DEFAULT 'beginner',
    experience_points INTEGER DEFAULT 0,
    consecutive_days INTEGER DEFAULT 0,
    last_learning_date DATE,
    motivation_level INTEGER DEFAULT 50, -- 0-100, уровень мотивации
    preferred_learning_time TEXT, -- 'morning', 'afternoon', 'evening'
    learning_style TEXT, -- 'visual', 'practical', 'theoretical'
    weak_categories TEXT, -- JSON массив слабых категорий
    strong_categories TEXT, -- JSON массив сильных категорий
    ai_personality TEXT -- JSON с настройками ИИ-персонализации
    last_motivation_sent TIMESTAMP DEFAULT NULL,
);

-- Сессии обучения
CREATE TABLE IF NOT EXISTS learning_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    session_type TEXT NOT NULL, -- 'quick_test', 'ai_mode', 'personalized', 'category'
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    experience_gained INTEGER DEFAULT 0,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);

-- Ответы пользователей
CREATE TABLE IF NOT EXISTS user_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    session_id INTEGER,
    question_text TEXT NOT NULL,
    user_answer TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    category TEXT,
    question_type TEXT,
    wine_id TEXT,
    response_time_ms INTEGER,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id),
    FOREIGN KEY (session_id) REFERENCES learning_sessions(id)
);

-- Достижения
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    achievement_type TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    description TEXT,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress_value INTEGER, -- например, количество правильных ответов
    icon TEXT,
    points INTEGER DEFAULT 0,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);

-- Статистика по категориям
CREATE TABLE IF NOT EXISTS category_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    category TEXT NOT NULL,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, category),
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);

-- Статистика по типам вопросов
CREATE TABLE IF NOT EXISTS question_type_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    question_type TEXT NOT NULL,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, question_type),
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);

-- Ежедневные задания
CREATE TABLE IF NOT EXISTS daily_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    challenge_id TEXT NOT NULL,
    challenge_type TEXT NOT NULL,
    challenge_name TEXT NOT NULL,
    description TEXT,
    target_value INTEGER,
    current_progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    reward_points INTEGER DEFAULT 0,
    reward_experience INTEGER DEFAULT 0,
    created_date DATE DEFAULT CURRENT_DATE,
    completed_date DATE,
    UNIQUE(chat_id, challenge_id, created_date),
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);

-- История активности
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    activity_type TEXT NOT NULL,
    description TEXT,
    points_earned INTEGER DEFAULT 0,
    experience_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);

-- === НОВЫЕ ТАБЛИЦЫ ДЛЯ СИСТЕМЫ СТИМУЛИРОВАНИЯ ===

-- ИИ-анализ и персонализация
CREATE TABLE IF NOT EXISTS ai_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    analysis_type TEXT NOT NULL, -- 'motivation', 'progress', 'recommendation', 'personality'
    analysis_data JSON NOT NULL, -- Детальные данные анализа
    confidence_score REAL DEFAULT 0.0, -- Уверенность ИИ в анализе (0-1)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);

-- Мотивационные сообщения и призы
CREATE TABLE IF NOT EXISTS motivation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    message_type TEXT NOT NULL, -- 'praise', 'encouragement', 'challenge', 'reward', 'reminder'
    message_text TEXT NOT NULL,
    ai_generated BOOLEAN DEFAULT TRUE,
    context_data JSON, -- Контекст, на основе которого сгенерировано сообщение
    points_awarded INTEGER DEFAULT 0,
    experience_awarded INTEGER DEFAULT 0,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Когда сообщение устаревает
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);

-- Система призов и наград
CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    reward_type TEXT NOT NULL, -- 'badge', 'title', 'bonus_xp', 'special_access', 'custom'
    reward_name TEXT NOT NULL,
    description TEXT,
    reward_data JSON, -- Детали награды (иконка, цвет, эффекты и т.д.)
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP,
    expires_at TIMESTAMP, -- Когда награда истекает
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);

-- Поведенческие паттерны пользователя
CREATE TABLE IF NOT EXISTS user_behavior_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    pattern_type TEXT NOT NULL, -- 'learning_time', 'session_duration', 'preferred_categories', 'response_speed'
    pattern_data JSON NOT NULL, -- Детали паттерна
    confidence REAL DEFAULT 0.0, -- Уверенность в паттерне
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);

-- Система уведомлений и напоминаний
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    notification_type TEXT NOT NULL, -- 'achievement', 'level_up', 'daily_challenge', 'streak_reminder', 'motivation'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority INTEGER DEFAULT 1, -- 1-5, где 5 - высший приоритет
    is_read BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE, -- Отправлено ли в Telegram
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_for TIMESTAMP, -- Когда отправить
    sent_at TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);

-- Прогресс обучения по времени
CREATE TABLE IF NOT EXISTS learning_progress_timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    date DATE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    experience_gained INTEGER DEFAULT 0,
    motivation_level INTEGER DEFAULT 50,
    learning_duration_minutes INTEGER DEFAULT 0,
    preferred_time_slot TEXT, -- 'morning', 'afternoon', 'evening'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, date),
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_user_answers_chat_id ON user_answers(chat_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_session_id ON user_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_achievements_chat_id ON achievements(chat_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_chat_id ON learning_sessions(chat_id);
CREATE INDEX IF NOT EXISTS idx_category_stats_chat_id ON category_stats(chat_id);
CREATE INDEX IF NOT EXISTS idx_question_type_stats_chat_id ON question_type_stats(chat_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_chat_id ON daily_challenges(chat_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_chat_id ON activity_log(chat_id);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_start_time ON learning_sessions(start_time);

-- Новые индексы для системы стимулирования
CREATE INDEX IF NOT EXISTS idx_ai_analysis_chat_id ON ai_analysis(chat_id);
CREATE INDEX IF NOT EXISTS idx_motivation_messages_chat_id ON motivation_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_rewards_chat_id ON rewards(chat_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_patterns_chat_id ON user_behavior_patterns(chat_id);
CREATE INDEX IF NOT EXISTS idx_notifications_chat_id ON notifications(chat_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_timeline_chat_id ON learning_progress_timeline(chat_id);
CREATE INDEX IF NOT EXISTS idx_motivation_messages_unread ON motivation_messages(chat_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_unsent ON notifications(chat_id, is_sent) WHERE is_sent = FALSE; 