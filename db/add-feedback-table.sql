-- Добавление таблицы для отзывов пользователей
-- Выполнить: npx wrangler d1 execute DB --file=./db/add-feedback-table.sql

-- Таблица для отзывов пользователей
CREATE TABLE IF NOT EXISTS user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    feedback_type TEXT NOT NULL, -- 'like', 'hard', 'easy', 'comment'
    feedback_text TEXT, -- текст комментария пользователя
    session_type TEXT, -- тип сессии, на которую оставлен отзыв
    question_count INTEGER DEFAULT 0, -- количество вопросов в сессии
    correct_answers INTEGER DEFAULT 0, -- количество правильных ответов
    session_duration_minutes INTEGER DEFAULT 0, -- длительность сессии в минутах
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES users(chat_id)
);

-- Индекс для быстрого поиска по типу отзыва
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(feedback_type);

-- Индекс для поиска по времени создания
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);

-- Индекс для поиска по пользователю
CREATE INDEX IF NOT EXISTS idx_user_feedback_chat_id ON user_feedback(chat_id);

-- Индекс для поиска по типу сессии
CREATE INDEX IF NOT EXISTS idx_user_feedback_session_type ON user_feedback(session_type); 