// Система ежедневных заданий
import { DatabaseManager } from './database.js';
import { sendMessage, sendMessageWithKeyboard } from './telegramApi.js';

export class DailyChallengeSystem {
  constructor(database, env) {
    this.database = database;
    this.env = env;
  }

  // Типы ежедневных заданий
  static CHALLENGE_TYPES = {
    DAILY_QUESTIONS: {
      id: 'daily_questions',
      name: 'Ежедневные вопросы',
      description: 'Ответьте на 5 вопросов сегодня',
      target: 5,
      reward: { points: 20, experience: 10 }
    },
    DAILY_STREAK: {
      id: 'daily_streak',
      name: 'Серия дня',
      description: 'Получите серию из 3 правильных ответов',
      target: 3,
      reward: { points: 15, experience: 8 }
    },
    DAILY_CATEGORY: {
      id: 'daily_category',
      name: 'Категория дня',
      description: 'Изучите категорию "Вина"',
      target: 'Вина',
      reward: { points: 25, experience: 12 }
    },
    DAILY_ACCURACY: {
      id: 'daily_accuracy',
      name: 'Точность дня',
      description: 'Достигните 80% точности в тесте из 5+ вопросов',
      target: 80,
      reward: { points: 30, experience: 15 }
    },
    DAILY_AI: {
      id: 'daily_ai',
      name: 'ИИ-задание',
      description: 'Пройдите 3 ИИ-вопроса',
      target: 3,
      reward: { points: 35, experience: 18 }
    }
  };

  // Генерация ежедневного задания
  async generateDailyChallenge(chatId) {
    try {
      const today = new Date().toDateString();
      const challengeType = this.getRandomChallengeType();
      
      const challengeId = `${challengeType.id}_${today}`;
      
      // Проверяем, не существует ли уже задание на сегодня
      const existing = await this.database.db.prepare(`
        SELECT id FROM daily_challenges 
        WHERE chat_id = ? AND challenge_id = ? AND created_date = CURRENT_DATE
      `).bind(chatId, challengeId).first();

      if (existing) {
        return null; // Задание уже существует
      }

      // Создаем новое задание
      await this.database.db.prepare(`
        INSERT INTO daily_challenges (
          chat_id, challenge_id, challenge_type, challenge_name, 
          description, target_value, reward_points, reward_experience
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        chatId, challengeId, challengeType.id, challengeType.name,
        challengeType.description, challengeType.target,
        challengeType.reward.points, challengeType.reward.experience
      ).run();

      return {
        id: challengeId,
        type: challengeType,
        date: today,
        progress: 0,
        completed: false
      };
    } catch (error) {
      console.error('Error generating daily challenge:', error);
      return null;
    }
  }

  // Получение случайного типа задания
  getRandomChallengeType() {
    const types = Object.values(DailyChallengeSystem.CHALLENGE_TYPES);
    return types[Math.floor(Math.random() * types.length)];
  }

  // Получение активных заданий пользователя
  async getActiveChallenges(chatId) {
    try {
      const challenges = await this.database.db.prepare(`
        SELECT challenge_id, challenge_type, challenge_name, description,
               target_value, current_progress, is_completed,
               reward_points, reward_experience, created_date
        FROM daily_challenges 
        WHERE chat_id = ? AND created_date = CURRENT_DATE
        ORDER BY created_date DESC
      `).bind(chatId).all();

      return challenges.results;
    } catch (error) {
      console.error('Error getting active challenges:', error);
      return [];
    }
  }

  // Обновление прогресса задания
  async updateChallengeProgress(chatId, challengeType, progress) {
    try {
      const today = new Date().toDateString();
      const challengeId = `${challengeType}_${today}`;

      await this.database.db.prepare(`
        UPDATE daily_challenges SET 
          current_progress = ?
        WHERE chat_id = ? AND challenge_id = ? AND created_date = CURRENT_DATE
      `).bind(progress, chatId, challengeId).run();

      return true;
    } catch (error) {
      console.error('Error updating challenge progress:', error);
      return false;
    }
  }

  // Завершение задания
  async completeChallenge(chatId, challengeId) {
    try {
      const challenge = await this.database.db.prepare(`
        SELECT * FROM daily_challenges 
        WHERE chat_id = ? AND challenge_id = ? AND created_date = CURRENT_DATE
      `).bind(chatId, challengeId).first();

      if (!challenge || challenge.is_completed) {
        return false;
      }

      // Отмечаем задание как завершенное
      await this.database.db.prepare(`
        UPDATE daily_challenges SET 
          is_completed = TRUE,
          completed_date = CURRENT_DATE
        WHERE chat_id = ? AND challenge_id = ?
      `).bind(chatId, challengeId).run();

      // Награждаем пользователя
      await this.database.updateUserStats(chatId, {
        experiencePoints: challenge.reward_experience
      });

      // Логируем активность
      await this.database.logActivity(
        chatId,
        'daily_challenge_completed',
        `Завершено задание: ${challenge.challenge_name}`,
        challenge.reward_points,
        challenge.reward_experience
      );

      return {
        challenge,
        rewards: {
          points: challenge.reward_points,
          experience: challenge.reward_experience
        }
      };
    } catch (error) {
      console.error('Error completing challenge:', error);
      return false;
    }
  }

  // Проверка и обновление прогресса заданий
  async checkAndUpdateProgress(chatId, action, value) {
    try {
      const activeChallenges = await this.getActiveChallenges(chatId);
      
      for (const challenge of activeChallenges) {
        if (challenge.is_completed) continue;

        let shouldUpdate = false;
        let newProgress = challenge.current_progress;

        switch (challenge.challenge_type) {
          case 'daily_questions':
            if (action === 'answer_question') {
              newProgress = challenge.current_progress + 1;
              shouldUpdate = true;
            }
            break;

          case 'daily_streak':
            if (action === 'streak_achieved' && value >= challenge.target_value) {
              newProgress = challenge.target_value;
              shouldUpdate = true;
            }
            break;

          case 'daily_category':
            if (action === 'category_studied' && value === challenge.target_value) {
              newProgress = 1;
              shouldUpdate = true;
            }
            break;

          case 'daily_accuracy':
            if (action === 'test_completed' && value >= challenge.target_value) {
              newProgress = challenge.target_value;
              shouldUpdate = true;
            }
            break;

          case 'daily_ai':
            if (action === 'ai_question_answered') {
              newProgress = challenge.current_progress + 1;
              shouldUpdate = true;
            }
            break;
        }

        if (shouldUpdate) {
          await this.updateChallengeProgress(chatId, challenge.challenge_type, newProgress);
          
          // Проверяем, завершено ли задание
          if (newProgress >= challenge.target_value) {
            const completion = await this.completeChallenge(chatId, challenge.challenge_id);
            if (completion) {
              await this.notifyChallengeCompleted(chatId, completion);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking challenge progress:', error);
    }
  }

  // Уведомление о завершении задания
  async notifyChallengeCompleted(chatId, completion) {
    const { challenge, rewards } = completion;
    
    const message = `🎉 *Ежедневное задание выполнено!*

✅ **${challenge.challenge_name}**
${challenge.description}

💎 +${rewards.experience} XP
🏆 +${rewards.points} баллов

Отличная работа! Продолжайте в том же духе! 🚀`;

    await sendMessage(chatId, message, this.env);
  }

  // Отображение ежедневных заданий
  async showDailyChallenges(chatId) {
    try {
      console.log('DailyChallengeSystem.showDailyChallenges called for chatId:', chatId);
      console.log('Database instance:', this.database);
      console.log('Env passed to DailyChallengeSystem:', this.env);
      
      const challenges = await this.getActiveChallenges(chatId);
      console.log('Active challenges retrieved:', challenges);
      
      if (challenges.length === 0) {
        console.log('No active challenges, generating new ones...');
        // Генерируем новые задания
        const challenge1 = await this.generateDailyChallenge(chatId);
        console.log('Generated challenge 1:', challenge1);
        const challenge2 = await this.generateDailyChallenge(chatId);
        console.log('Generated challenge 2:', challenge2);
        const challenge3 = await this.generateDailyChallenge(chatId);
        console.log('Generated challenge 3:', challenge3);
        
        const newChallenges = await this.getActiveChallenges(chatId);
        console.log('New challenges generated:', newChallenges);
        await this.displayChallenges(chatId, newChallenges);
      } else {
        console.log('Displaying existing challenges...');
        await this.displayChallenges(chatId, challenges);
      }
      console.log('showDailyChallenges completed successfully');
    } catch (error) {
      console.error('Error showing daily challenges:', error);
      console.error('Error stack:', error.stack);
      await sendMessage(chatId, '❌ Ошибка загрузки ежедневных заданий', this.env);
    }
  }

  // Отображение списка заданий
  async displayChallenges(chatId, challenges) {
    try {
      console.log('displayChallenges called with chatId:', chatId, 'challenges:', challenges);
      
      let message = `📅 *Ежедневные задания*\n\n`;
      
      let totalRewards = { points: 0, experience: 0 };
      let completedCount = 0;

      for (const challenge of challenges) {
        const status = challenge.is_completed ? '✅' : '⏳';
        const progress = challenge.is_completed ? 
          `${challenge.target_value}/${challenge.target_value}` : 
          `${challenge.current_progress}/${challenge.target_value}`;

        message += `${status} **${challenge.challenge_name}**\n`;
        message += `└ ${challenge.description}\n`;
        message += `└ 📊 Прогресс: ${progress}\n`;
        message += `└ 💎 Награда: +${challenge.reward_experience} XP\n\n`;

        if (challenge.is_completed) {
          completedCount++;
          totalRewards.points += challenge.reward_points;
          totalRewards.experience += challenge.reward_experience;
        }
      }

      message += `📈 *Прогресс дня:* ${completedCount}/${challenges.length} заданий выполнено\n`;
      message += `🎁 *Награды за сегодня:* +${totalRewards.experience} XP`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Обновить', callback_data: 'daily_challenges_refresh' },
            { text: '📊 Статистика', callback_data: 'daily_challenges_stats' }
          ],
          [
            { text: '🔙 Назад', callback_data: 'learning_start' }
          ]
        ]
      };

      console.log('About to send message with keyboard. Message length:', message.length);
      console.log('Keyboard:', keyboard);
      console.log('Env passed to sendMessageWithKeyboard:', this.env);
      
      await sendMessageWithKeyboard(chatId, message, keyboard, this.env);
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error in displayChallenges:', error);
      console.error('Error stack:', error.stack);
      await sendMessage(chatId, '❌ Ошибка отображения заданий', this.env);
    }
  }

  // Получение статистики ежедневных заданий
  async getChallengeStats(chatId) {
    try {
      const stats = await this.database.db.prepare(`
        SELECT 
          COUNT(*) as total_challenges,
          SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed_challenges,
          SUM(CASE WHEN is_completed THEN reward_points ELSE 0 END) as total_points_earned,
          SUM(CASE WHEN is_completed THEN reward_experience ELSE 0 END) as total_experience_earned
        FROM daily_challenges 
        WHERE chat_id = ? AND created_date >= date('now', '-7 days')
      `).bind(chatId).first();

      return stats;
    } catch (error) {
      console.error('Error getting challenge stats:', error);
      return null;
    }
  }

  // Отображение статистики заданий
  async showChallengeStats(chatId) {
    try {
      const stats = await this.getChallengeStats(chatId);
      if (!stats) {
        await sendMessage(chatId, '❌ Ошибка загрузки статистики', this.env);
        return;
      }

      const completionRate = stats.total_challenges > 0 ? 
        Math.round((stats.completed_challenges / stats.total_challenges) * 100) : 0;

      const message = `📊 *Статистика ежедневных заданий*

📅 *За последние 7 дней:*
• Всего заданий: ${stats.total_challenges}
• Выполнено: ${stats.completed_challenges}
• Процент выполнения: ${completionRate}%
• Заработано баллов: ${stats.total_points_earned}
• Заработано опыта: ${stats.total_experience_earned} XP

🎯 *Рекомендации:*
${completionRate >= 80 ? '✅ Отличная работа! Вы регулярно выполняете задания.' : 
  completionRate >= 50 ? '🟡 Хорошо! Попробуйте выполнять больше заданий.' : 
  '🔴 Рекомендуем чаще выполнять ежедневные задания для лучшего прогресса.'}`;

      await sendMessage(chatId, message, this.env);
    } catch (error) {
      console.error('Error showing challenge stats:', error);
      await sendMessage(chatId, '❌ Ошибка отображения статистики', this.env);
    }
  }
} 