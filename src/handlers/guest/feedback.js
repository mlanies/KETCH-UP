// src/handlers/guest/feedback.js
// Модуль отзывов для гостевого бота

import { DatabaseManager } from '../../handlers/database.js';
import { sendMessage } from '../../handlers/telegramApi.js';

// Состояние ожидания отзыва для каждого пользователя (in-memory)
const awaitingGuestFeedback = new Set();

export function isAwaitingFeedback(chatId) {
  return awaitingGuestFeedback.has(chatId);
}

export function setAwaitingFeedback(chatId) {
  awaitingGuestFeedback.add(chatId);
}

export function clearAwaitingFeedback(chatId) {
  awaitingGuestFeedback.delete(chatId);
}

export async function handleGuestFeedbackMessage(message, env) {
  const chatId = message.chat.id;
  const text = message.text || '';
  try {
    const database = new DatabaseManager(env);
    const db = database.db;
    if (message.from) {
      await database.initUser(chatId, message.from);
    } else {
      await database.initUser(chatId);
    }
    await db.prepare(`
      INSERT INTO user_feedback (
        chat_id, feedback_type, feedback_text, session_type, question_count, correct_answers, session_duration_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      chatId, 'guest_comment', text, 'guest', 0, 0, 0
    ).run();
    clearAwaitingFeedback(chatId);
    await sendMessage(chatId, 'Спасибо за ваш отзыв! Мы ценим ваше мнение. 😊', env);
  } catch (e) {
    clearAwaitingFeedback(chatId);
    await sendMessage(chatId, 'Ошибка при сохранении отзыва. Попробуйте позже.', env);
  }
} 