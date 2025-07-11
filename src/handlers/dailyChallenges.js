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
      console.log('=== generateDailyChallenge START ===');
      console.log('chatId:', chatId);
      
      const today = new Date().toDateString();
      console.log('Today:', today);
      
      const challengeType = this.getRandomChallengeType();
      console.log('Selected challenge type:', challengeType);
      
      const challengeId = `${challengeType.id}_${today}`;
      console.log('Generated challenge ID:', challengeId);
      
      // Проверяем, не существует ли уже задание на сегодня
      const checkQuery = `
        SELECT id FROM daily_challenges 
        WHERE chat_id = ? AND challenge_id = ? AND created_date = CURRENT_DATE
      `;
      console.log('Checking existing challenge with query:', checkQuery);
      
      const existing = await this.database.db.prepare(checkQuery).bind(chatId, challengeId).first();
      console.log('Existing challenge check result:', existing);

      if (existing) {
        console.log('Challenge already exists, skipping generation');
        return null; // Задание уже существует
      }

      // Создаем новое задание
      const insertQuery = `
        INSERT INTO daily_challenges (
          chat_id, challenge_id, challenge_type, challenge_name, 
          description, target_value, reward_points, reward_experience
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const insertParams = [
        chatId, challengeId, challengeType.id, challengeType.name,
        challengeType.description, challengeType.target,
        challengeType.reward.points, challengeType.reward.experience
      ];
      
      console.log('Inserting new challenge with query:', insertQuery);
      console.log('Insert parameters:', insertParams);
      
      const result = await this.database.db.prepare(insertQuery).bind(...insertParams).run();
      console.log('Insert result:', result);

      const generatedChallenge = {
        id: challengeId,
        type: challengeType,
        date: today,
        progress: 0,
        completed: false
      };
      
      console.log('Generated challenge object:', generatedChallenge);
      console.log('=== generateDailyChallenge END ===');
      
      return generatedChallenge;
    } catch (error) {
      console.error('Error generating daily challenge:', error);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      return null;
    }
  }

  // Получение случайного типа задания
  getRandomChallengeType() {
    console.log('=== getRandomChallengeType START ===');
    const types = Object.values(DailyChallengeSystem.CHALLENGE_TYPES);
    console.log('Available challenge types:', types);
    console.log('Types count:', types.length);
    
    const selectedType = types[Math.floor(Math.random() * types.length)];
    console.log('Selected challenge type:', selectedType);
    console.log('=== getRandomChallengeType END ===');
    
    return selectedType;
  }

  // Получение активных заданий пользователя
  async getActiveChallenges(chatId) {
    try {
      console.log('=== getActiveChallenges START ===');
      console.log('chatId:', chatId);
      console.log('Database instance exists:', !!this.database);
      console.log('Database.db exists:', !!this.database?.db);
      
      const query = `
        SELECT challenge_id, challenge_type, challenge_name, description,
               target_value, current_progress, is_completed,
               reward_points, reward_experience, created_date
        FROM daily_challenges 
        WHERE chat_id = ? AND created_date = CURRENT_DATE
        ORDER BY created_date DESC
      `;
      
      console.log('Executing query:', query);
      console.log('Query parameters:', [chatId]);
      
      const challenges = await this.database.db.prepare(query).bind(chatId).all();
      console.log('Query result:', challenges);
      console.log('Challenges results:', challenges.results);
      console.log('Challenges count:', challenges.results?.length || 0);
      
      console.log('=== getActiveChallenges END ===');
      return challenges.results || [];
    } catch (error) {
      console.error('Error getting active challenges:', error);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
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
      console.log('=== DailyChallengeSystem.showDailyChallenges START ===');
      console.log('chatId:', chatId);
      console.log('Database instance exists:', !!this.database);
      console.log('Env keys:', Object.keys(this.env));
      
      // Проверяем подключение к базе данных
      if (!this.database || !this.database.db) {
        throw new Error('Database connection not available');
      }
      
      console.log('Getting active challenges...');
      const challenges = await this.getActiveChallenges(chatId);
      console.log('Active challenges retrieved:', challenges);
      console.log('Challenges count:', challenges.length);
      
      if (challenges.length === 0) {
        console.log('No active challenges, generating new ones...');
        
        // Генерируем новые задания
        console.log('Generating challenge 1...');
        const challenge1 = await this.generateDailyChallenge(chatId);
        console.log('Generated challenge 1:', challenge1);
        
        console.log('Generating challenge 2...');
        const challenge2 = await this.generateDailyChallenge(chatId);
        console.log('Generated challenge 2:', challenge2);
        
        console.log('Generating challenge 3...');
        const challenge3 = await this.generateDailyChallenge(chatId);
        console.log('Generated challenge 3:', challenge3);
        
        console.log('Getting newly generated challenges...');
        const newChallenges = await this.getActiveChallenges(chatId);
        console.log('New challenges generated:', newChallenges);
        console.log('New challenges count:', newChallenges.length);
        
        if (newChallenges.length === 0) {
          throw new Error('Failed to generate daily challenges');
        }
        
        console.log('Displaying newly generated challenges...');
        await this.displayChallenges(chatId, newChallenges);
      } else {
        console.log('Displaying existing challenges...');
        await this.displayChallenges(chatId, challenges);
      }
      
      console.log('=== DailyChallengeSystem.showDailyChallenges END ===');
    } catch (error) {
      console.error('Error showing daily challenges:', error);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      // Отправляем более информативное сообщение об ошибке
      const errorMessage = `❌ Ошибка загрузки ежедневных заданий

🔍 Детали ошибки:
• Тип: ${error.name}
• Сообщение: ${error.message}

Попробуйте позже или обратитесь к администратору.`;
      
      await sendMessage(chatId, errorMessage, this.env);
    }
  }

  // Отображение списка заданий
  async displayChallenges(chatId, challenges) {
    try {
      console.log('=== displayChallenges START ===');
      console.log('chatId:', chatId);
      console.log('challenges count:', challenges.length);
      console.log('challenges:', challenges);
      
      if (!challenges || challenges.length === 0) {
        console.log('No challenges to display');
        await sendMessage(chatId, '📅 У вас пока нет ежедневных заданий. Попробуйте позже!', this.env);
        return;
      }
      
      let message = `📅 *Ежедневные задания*\n\n`;
      
      let totalRewards = { points: 0, experience: 0 };
      let completedCount = 0;

      for (const challenge of challenges) {
        console.log('Processing challenge:', challenge);
        
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

      console.log('Message length:', message.length);
      console.log('Keyboard:', JSON.stringify(keyboard, null, 2));
      console.log('Env keys:', Object.keys(this.env));
      
      console.log('Sending message with keyboard...');
      await sendMessageWithKeyboard(chatId, message, keyboard, this.env);
      console.log('Message sent successfully');
      console.log('=== displayChallenges END ===');
    } catch (error) {
      console.error('Error in displayChallenges:', error);
      console.error('Error stack:', error.stack);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      // Отправляем более информативное сообщение об ошибке
      const errorMessage = `❌ Ошибка отображения заданий

🔍 Детали ошибки:
• Тип: ${error.name}
• Сообщение: ${error.message}

Попробуйте позже или обратитесь к администратору.`;
      
      await sendMessage(chatId, errorMessage, this.env);
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