// Система ежедневных заданий
import { DatabaseManager, EXPERIENCE_SYSTEM } from './database.js';
import { sendMessage } from './telegramApi.js';

// Типы ежедневных заданий
export const DAILY_CHALLENGE_TYPES = {
  COMPLETE_TESTS: {
    id: 'complete_3_tests',
    name: 'Три теста в день',
    description: 'Пройдите 3 теста за сегодня',
    target: 3,
    reward: { experience: 50, points: 25 },
    type: 'completion'
  },
  
  HIGH_ACCURACY: {
    id: 'high_accuracy',
    name: 'Точность',
    description: 'Получите 80%+ правильных ответов',
    target: 0.8,
    reward: { experience: 75, points: 40 },
    type: 'quality'
  },
  
  NEW_CATEGORY: {
    id: 'new_category',
    name: 'Новая категория',
    description: 'Изучите новую категорию напитков',
    target: 1,
    reward: { experience: 100, points: 50 },
    type: 'exploration'
  },
  
  FAST_RESPONSES: {
    id: 'fast_responses',
    name: 'Быстрые ответы',
    description: 'Ответьте на 5 вопросов быстрее 15 секунд',
    target: 5,
    reward: { experience: 60, points: 30 },
    type: 'speed'
  },
  
  PERFECT_SESSION: {
    id: 'perfect_session',
    name: 'Идеальная сессия',
    description: 'Пройдите тест с 100% точностью (минимум 5 вопросов)',
    target: 1,
    reward: { experience: 150, points: 75 },
    type: 'perfection'
  },
  
  STREAK_MAINTAIN: {
    id: 'streak_maintain',
    name: 'Поддержание серии',
    description: 'Поддерживайте серию правильных ответов 5 раз подряд',
    target: 5,
    reward: { experience: 80, points: 40 },
    type: 'streak'
  },
  
  LEARNING_TIME: {
    id: 'learning_time',
    name: 'Время обучения',
    description: 'Проведите в обучении минимум 10 минут',
    target: 600, // в секундах
    reward: { experience: 90, points: 45 },
    type: 'time'
  }
};

export class DailyChallengeSystem {
  constructor(database, env) {
    this.database = database;
    this.env = env;
  }

  // Генерация ежедневных заданий для пользователя
  async generateDailyChallenges(chatId) {
    try {
      const user = await this.database.getUser(chatId);
      if (!user) return [];

      const today = new Date().toISOString().split('T')[0];
      
      // Проверяем, есть ли уже задания на сегодня
      const existingChallenges = await this.database.prepare(`
        SELECT challenge_id FROM daily_challenges 
        WHERE chat_id = ? AND created_date = ?
      `).bind(chatId, today).all();

      if (existingChallenges.results.length > 0) {
        return await this.getUserDailyChallenges(chatId);
      }

      // Выбираем случайные задания (3-5 штук)
      const challengeTypes = Object.values(DAILY_CHALLENGE_TYPES);
      const selectedChallenges = this.selectChallengesForUser(challengeTypes, user);
      
      const createdChallenges = [];

      for (const challenge of selectedChallenges) {
        const result = await this.database.prepare(`
          INSERT INTO daily_challenges (
            chat_id, challenge_id, challenge_type, challenge_name, 
            description, target_value, reward_points, reward_experience
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          chatId, challenge.id, challenge.type, challenge.name,
          challenge.description, challenge.target, challenge.reward.points, challenge.reward.experience
        ).run();

        createdChallenges.push({
          id: challenge.id,
          name: challenge.name,
          description: challenge.description,
          target: challenge.target,
          currentProgress: 0,
          reward: challenge.reward,
          isCompleted: false
        });
      }

      return createdChallenges;
    } catch (error) {
      console.error('Error generating daily challenges:', error);
      return [];
    }
  }

  // Выбор подходящих заданий для пользователя
  selectChallengesForUser(challengeTypes, user) {
    const userLevel = user.experience_points || 0;
    const totalQuestions = user.total_questions || 0;
    
    // Фильтруем задания по уровню пользователя
    let availableChallenges = challengeTypes;
    
    if (userLevel < 100) {
      // Новички получают простые задания
      availableChallenges = challengeTypes.filter(c => 
        ['complete_3_tests', 'high_accuracy', 'fast_responses'].includes(c.id)
      );
    } else if (userLevel < 500) {
      // Средний уровень
      availableChallenges = challengeTypes.filter(c => 
        !['perfect_session'].includes(c.id)
      );
    }
    
    // Исключаем задания, которые пользователь не может выполнить
    if (totalQuestions < 10) {
      availableChallenges = availableChallenges.filter(c => 
        !['perfect_session', 'streak_maintain'].includes(c.id)
      );
    }

    // Выбираем случайные задания
    const shuffled = availableChallenges.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(4, shuffled.length));
  }

  // Получение ежедневных заданий пользователя
  async getUserDailyChallenges(chatId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const challenges = await this.database.prepare(`
        SELECT challenge_id, challenge_name, description, target_value,
               current_progress, is_completed, reward_points, reward_experience
        FROM daily_challenges 
        WHERE chat_id = ? AND created_date = ?
        ORDER BY is_completed ASC, challenge_id ASC
      `).bind(chatId, today).all();

      return challenges.results.map(challenge => ({
        id: challenge.challenge_id,
        name: challenge.challenge_name,
        description: challenge.description,
        target: challenge.target_value,
        currentProgress: challenge.current_progress,
        reward: {
          experience: challenge.reward_experience,
          points: challenge.reward_points
        },
        isCompleted: challenge.is_completed === 1
      }));
    } catch (error) {
      console.error('Error getting user daily challenges:', error);
      return [];
    }
  }

  // Обновление прогресса задания
  async updateChallengeProgress(chatId, challengeId, progress) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const result = await this.database.prepare(`
        UPDATE daily_challenges 
        SET current_progress = ?
        WHERE chat_id = ? AND challenge_id = ? AND created_date = ?
      `).bind(progress, chatId, challengeId, today).run();

      return result.meta.changes > 0;
    } catch (error) {
      console.error('Error updating challenge progress:', error);
      return false;
    }
  }

  // Завершение задания
  async completeChallenge(chatId, challengeId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Получаем информацию о задании
      const challenge = await this.database.prepare(`
        SELECT challenge_name, reward_points, reward_experience
        FROM daily_challenges 
        WHERE chat_id = ? AND challenge_id = ? AND created_date = ?
      `).bind(chatId, challengeId, today).first();

      if (!challenge) return false;

      // Отмечаем как завершенное
      await this.database.prepare(`
        UPDATE daily_challenges 
        SET is_completed = 1, completed_date = CURRENT_DATE
        WHERE chat_id = ? AND challenge_id = ? AND created_date = ?
      `).bind(chatId, challengeId, today).run();

      // Награждаем пользователя
      await this.database.addExperience(chatId, 'daily_challenge', {
        challengeName: challenge.challenge_name
      });

      // Логируем активность
      await this.database.logActivity(
        chatId,
        'daily_challenge_completed',
        `Завершено ежедневное задание: ${challenge.challenge_name}`,
        challenge.reward_points,
        challenge.reward_experience
      );

      return {
        success: true,
        reward: {
          experience: challenge.reward_experience,
          points: challenge.reward_points
        }
      };
    } catch (error) {
      console.error('Error completing challenge:', error);
      return { success: false };
    }
  }

  // Проверка и обновление прогресса всех заданий
  async checkAndUpdateProgress(chatId) {
    try {
      const user = await this.database.getUser(chatId);
      if (!user) return [];

      const today = new Date().toISOString().split('T')[0];
      const challenges = await this.getUserDailyChallenges(chatId);
      const completedChallenges = [];

      for (const challenge of challenges) {
        if (challenge.isCompleted) continue;

        let newProgress = 0;
        let shouldComplete = false;

        switch (challenge.id) {
          case 'complete_3_tests':
            // Подсчитываем тесты за сегодня
            const todayTests = await this.database.prepare(`
              SELECT COUNT(*) as count
              FROM learning_sessions 
              WHERE chat_id = ? AND session_type = 'quick_test' 
              AND DATE(start_time) = ?
            `).bind(chatId, today).first();
            newProgress = todayTests.count;
            shouldComplete = newProgress >= challenge.target;
            break;

          case 'high_accuracy':
            // Проверяем точность за сегодня
            const todayAnswers = await this.database.prepare(`
              SELECT COUNT(*) as total, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
              FROM user_answers 
              WHERE chat_id = ? AND DATE(answered_at) = ?
            `).bind(chatId, today).first();
            
            if (todayAnswers.total > 0) {
              newProgress = todayAnswers.correct / todayAnswers.total;
              shouldComplete = newProgress >= challenge.target;
            }
            break;

          case 'fast_responses':
            // Подсчитываем быстрые ответы за сегодня
            const fastAnswers = await this.database.prepare(`
              SELECT COUNT(*) as count
              FROM user_answers 
              WHERE chat_id = ? AND DATE(answered_at) = ? 
              AND response_time_ms < 15000 AND is_correct = 1
            `).bind(chatId, today).first();
            newProgress = fastAnswers.count;
            shouldComplete = newProgress >= challenge.target;
            break;

          case 'perfect_session':
            // Проверяем идеальную сессию
            const perfectSession = await this.database.prepare(`
              SELECT total_questions, correct_answers
              FROM learning_sessions 
              WHERE chat_id = ? AND DATE(start_time) = ? 
              AND total_questions >= 5
              ORDER BY start_time DESC
              LIMIT 1
            `).bind(chatId, today).first();
            
            if (perfectSession && perfectSession.total_questions > 0) {
              const accuracy = perfectSession.correct_answers / perfectSession.total_questions;
              newProgress = accuracy === 1 ? 1 : 0;
              shouldComplete = newProgress >= challenge.target;
            }
            break;

          case 'streak_maintain':
            // Проверяем серию правильных ответов
            const currentStreak = user.learning_streak || 0;
            newProgress = currentStreak;
            shouldComplete = newProgress >= challenge.target;
            break;

          default:
            continue;
        }

        // Обновляем прогресс
        await this.updateChallengeProgress(chatId, challenge.id, newProgress);

        // Если задание выполнено, завершаем его
        if (shouldComplete && !challenge.isCompleted) {
          const result = await this.completeChallenge(chatId, challenge.id);
          if (result.success) {
            completedChallenges.push({
              challenge,
              reward: result.reward
            });
          }
        }
      }

      return completedChallenges;
    } catch (error) {
      console.error('Error checking challenge progress:', error);
      return [];
    }
  }

  // Отображение ежедневных заданий
  async showDailyChallenges(chatId) {
    try {
      let challenges = await this.getUserDailyChallenges(chatId);
      
      if (challenges.length === 0) {
        challenges = await this.generateDailyChallenges(chatId);
      }

      if (challenges.length === 0) {
        await sendMessage(chatId, '📅 Сегодня нет доступных заданий. Загляните завтра!', this.env);
        return;
      }

      let message = `📅 *Ежедневные задания*\n\n`;
      
      const completed = challenges.filter(c => c.isCompleted);
      const inProgress = challenges.filter(c => !c.isCompleted);

      if (completed.length > 0) {
        message += `✅ *Завершенные:*\n`;
        for (const challenge of completed) {
          message += `🎯 **${challenge.name}**\n`;
          message += `└ ${challenge.description}\n`;
          message += `└ 💎 +${challenge.reward.experience} XP\n\n`;
        }
      }

      if (inProgress.length > 0) {
        message += `🔄 *В процессе:*\n`;
        for (const challenge of inProgress) {
          const progressPercent = Math.min(Math.round((challenge.currentProgress / challenge.target) * 100), 100);
          message += `🎯 **${challenge.name}**\n`;
          message += `└ ${challenge.description}\n`;
          message += `└ 📊 Прогресс: ${challenge.currentProgress}/${challenge.target} (${progressPercent}%)\n`;
          message += `└ 💎 Награда: +${challenge.reward.experience} XP\n\n`;
        }
      }

      const totalCompleted = completed.length;
      const totalChallenges = challenges.length;
      message += `📈 *Общий прогресс:* ${totalCompleted}/${totalChallenges} заданий выполнено`;

      await sendMessage(chatId, message, this.env);
    } catch (error) {
      console.error('Error showing daily challenges:', error);
      await sendMessage(chatId, '❌ Ошибка отображения ежедневных заданий', this.env);
    }
  }

  // Уведомление о завершении задания
  async notifyChallengeCompletion(chatId, challenge, reward) {
    const message = `🎉 *Задание выполнено!*

🎯 **${challenge.name}**
${challenge.description}

💎 +${reward.experience} очков опыта
🏆 +${reward.points} очков

Отличная работа! Продолжайте в том же духе! 🚀`;

    await sendMessage(chatId, message, this.env);
  }
} 