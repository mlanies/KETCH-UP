// Система еженедельных и ежемесячных челленджей
import { sendMessage } from './telegramApi.js';

export const CHALLENGE_PERIODS = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
};

export class ChallengeSystem {
  constructor(database, env) {
    this.database = database;
    this.env = env;
  }

  // Генерация новых челленджей (раз в неделю/месяц)
  async generatePeriodicChallenges(period = CHALLENGE_PERIODS.WEEKLY) {
    // Примеры челленджей
    const challengeTemplates = [
      {
        type: 'lessons',
        description: 'Пройди 3 урока за неделю',
        period: CHALLENGE_PERIODS.WEEKLY,
        reward: '50 XP',
        target: 3
      },
      {
        type: 'accuracy',
        description: 'Достигни 80% правильных ответов за месяц',
        period: CHALLENGE_PERIODS.MONTHLY,
        reward: '100 XP',
        target: 0.8
      },
      {
        type: 'streak',
        description: '7 дней подряд без пропусков',
        period: CHALLENGE_PERIODS.WEEKLY,
        reward: '70 XP',
        target: 7
      }
    ];
    const now = new Date();
    let startDate, endDate;
    if (period === CHALLENGE_PERIODS.WEEKLY) {
      // Начало недели (понедельник)
      const day = now.getDay() || 7;
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day + 1);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      // Месяц
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    // Для простоты: создаём по одному челленджу каждого типа
    for (const tpl of challengeTemplates.filter(t => t.period === period)) {
      await this.database.prepare(
        'INSERT INTO challenges (type, description, period, reward, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        tpl.type, tpl.description, tpl.period, tpl.reward,
        startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]
      ).run();
    }
  }

  // Назначить новые челленджи всем пользователям
  async autoAssignChallengesToAllUsers(period = CHALLENGE_PERIODS.WEEKLY) {
    const users = await this.database.getAllUserChatIds();
    const now = new Date();
    const challenges = await this.database.prepare(
      'SELECT * FROM challenges WHERE period = ? AND start_date <= ? AND end_date >= ?'
    ).bind(period, now.toISOString().split('T')[0], now.toISOString().split('T')[0]).all();
    for (const user of users) {
      for (const challenge of challenges.results) {
        // Проверяем, есть ли уже прогресс
        const exists = await this.database.prepare(
          'SELECT id FROM challenge_progress WHERE user_id = ? AND challenge_id = ?'
        ).bind(user.chatId, challenge.id).first();
        if (!exists) {
          await this.database.prepare(
            'INSERT INTO challenge_progress (user_id, challenge_id, progress, completed) VALUES (?, ?, 0, 0)'
          ).bind(user.chatId, challenge.id).run();
        }
      }
    }
  }

  // Получить челленджи пользователя за период
  async getUserChallenges(chatId, period = CHALLENGE_PERIODS.WEEKLY) {
    const now = new Date();
    const challenges = await this.database.prepare(
      `SELECT c.*, cp.progress, cp.completed, cp.completed_at
       FROM challenges c
       JOIN challenge_progress cp ON c.id = cp.challenge_id
       WHERE cp.user_id = ? AND c.period = ? AND c.start_date <= ? AND c.end_date >= ?`
    ).bind(chatId, period, now.toISOString().split('T')[0], now.toISOString().split('T')[0]).all();
    return challenges.results;
  }

  // Обновить прогресс по челленджу
  async updateChallengeProgress(chatId, challengeId, value) {
    await this.database.prepare(
      'UPDATE challenge_progress SET progress = ? WHERE user_id = ? AND challenge_id = ?'
    ).bind(value, chatId, challengeId).run();
  }

  // Завершить челлендж, выдать награду и уведомить
  async completeChallenge(chatId, challengeId) {
    await this.database.prepare(
      'UPDATE challenge_progress SET completed = 1, completed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND challenge_id = ?'
    ).bind(chatId, challengeId).run();
    // Получаем челлендж
    const challenge = await this.database.prepare(
      'SELECT * FROM challenges WHERE id = ?'
    ).bind(challengeId).first();
    // Выдаём награду (пример: опыт)
    if (challenge && challenge.reward) {
      // Можно интегрировать с системой опыта/ачивок
      await sendMessage(chatId, `🎉 Челлендж выполнен!\n${challenge.description}\n\n🏆 Награда: ${challenge.reward}`);
    }
  }
} 