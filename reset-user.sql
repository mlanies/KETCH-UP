-- Скрипт для обнуления данных пользователя
-- Замените 194832010 на нужный chat_id

-- Обновляем данные пользователя
UPDATE users 
SET 
  total_score = 0,
  total_questions = 0,
  total_correct = 0,
  learning_streak = 0,
  max_streak = 0,
  difficulty_level = 'beginner',
  experience_points = 0,
  consecutive_days = 0,
  last_learning_date = NULL,
  last_activity = datetime('now')
WHERE chat_id = 194832010;

-- Удаляем все достижения пользователя
DELETE FROM achievements WHERE chat_id = 194832010;

-- Удаляем все сессии обучения
DELETE FROM learning_sessions WHERE chat_id = 194832010;

-- Удаляем все ответы пользователя
DELETE FROM user_answers WHERE chat_id = 194832010;

-- Удаляем статистику по категориям
DELETE FROM category_stats WHERE chat_id = 194832010;

-- Удаляем статистику по типам вопросов
DELETE FROM question_type_stats WHERE chat_id = 194832010;

-- Удаляем ежедневные задания
DELETE FROM daily_challenges WHERE chat_id = 194832010;

-- Удаляем активность пользователя
DELETE FROM activity_log WHERE chat_id = 194832010;

-- Проверяем результат
SELECT 
  chat_id,
  total_score,
  total_questions,
  total_correct,
  experience_points,
  difficulty_level
FROM users 
WHERE chat_id = 194832010; 