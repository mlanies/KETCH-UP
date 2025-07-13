// Система достижений и геймификации
import { DatabaseManager, ACHIEVEMENT_TYPES } from './database.js';
import { sendMessage } from './telegramApi.js';

export class AchievementSystem {
  constructor(database, env) {
    this.database = database;
    this.env = env;
  }

  // Система уровней
  static LEVEL_SYSTEM = {
    levels: [
      { level: 1, name: 'Новичок', minPoints: 0, icon: '🥉' },
      { level: 2, name: 'Ученик', minPoints: 50, icon: '🥈' },
      { level: 3, name: 'Знаток', minPoints: 150, icon: '🥇' },
      { level: 4, name: 'Эксперт', minPoints: 300, icon: '💎' },
      { level: 5, name: 'Мастер', minPoints: 500, icon: '👑' },
      { level: 6, name: 'Гуру', minPoints: 800, icon: '🌟' },
      { level: 7, name: 'Легенда', minPoints: 1200, icon: '🏆' }
    ],
    
    getLevel(points) {
      return this.levels.reduce((current, level) => {
        return points >= level.minPoints ? level : current;
      });
    },
    
    getProgress(points) {
      const currentLevel = this.getLevel(points);
      const nextLevel = this.levels.find(l => l.minPoints > points);
      
      if (!nextLevel) return 100;
      
      const currentLevelPoints = currentLevel.minPoints;
      const nextLevelPoints = nextLevel.minPoints;
      const userProgress = points - currentLevelPoints;
      const levelRange = nextLevelPoints - currentLevelPoints;
      
      return Math.round((userProgress / levelRange) * 100);
    }
  };

  // Система опыта
  static EXPERIENCE_SYSTEM = {
    rewards: {
      correctAnswer: 5,
      streakBonus: 2, // за каждый ответ в серии
      perfectTest: 50,
      dailyChallenge: 20,
      achievement: 10
    },
    
    multipliers: {
      weekend: 1.5,
      firstSessionOfDay: 2.0,
      consecutiveDay: 1.1
    },
    
    calculateExperience(action, context = {}) {
      let baseExp = this.rewards[action] || 0;
      
      // Применяем множители
      if (context.isWeekend) baseExp *= this.multipliers.weekend;
      if (context.isFirstSession) baseExp *= this.multipliers.firstSessionOfDay;
      if (context.consecutiveDays > 1) {
        baseExp *= Math.pow(this.multipliers.consecutiveDay, Math.min(context.consecutiveDays - 1, 7));
      }
      
      return Math.round(baseExp);
    }
  };

  // Проверка всех достижений
  async checkAchievements(chatId, stats) {
    try {
      const newAchievements = await this.database.checkAndAwardAchievements(chatId, stats);
      
      // Отправляем уведомления о новых достижениях
      for (const achievement of newAchievements) {
        await this.notifyAchievement(chatId, achievement);
      }
      
      return newAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  // Уведомление о достижении
  async notifyAchievement(chatId, achievement) {
    const message = `🎉 *Новое достижение!*

${achievement.icon} *${achievement.name}*
${achievement.description}

💎 +${achievement.points} очков опыта

Поздравляем! Продолжайте в том же духе! 🚀`;

    await sendMessage(chatId, message, this.env);
  }

  // Получение прогресса по достижениям
  async getAchievementProgress(chatId) {
    try {
      const user = await this.database.getUser(chatId);
      if (!user) return null;

      const achievements = await this.database.getAchievements(chatId);
      const unlockedTypes = achievements.map(a => a.achievement_type);

      const progress = [];
      
      for (const [type, achievement] of Object.entries(ACHIEVEMENT_TYPES)) {
        const isUnlocked = unlockedTypes.includes(type);
        const currentValue = this.getCurrentProgressValue(type, user);
        const targetValue = this.getTargetValue(type);
        const progressPercent = Math.min(Math.round((currentValue / targetValue) * 100), 100);

        progress.push({
          type,
          achievement,
          isUnlocked,
          currentValue,
          targetValue,
          progressPercent
        });
      }

      return progress;
    } catch (error) {
      console.error('Error getting achievement progress:', error);
      return [];
    }
  }

  // Получение текущего значения прогресса для достижения
  getCurrentProgressValue(type, user) {
    switch (type) {
      case 'FIRST_STEPS':
        return user.total_questions || 0;
      case 'STREAK_MASTER':
        return user.max_streak || 0;
      case 'SCORE_100':
        return user.total_score || 0;
      case 'AI_MASTER':
        return user.ai_questions || 0;
      case 'CATEGORY_EXPERT':
        return user.categories_studied || 0;
      case 'CHAMPION':
        return user.total_score || 0;
      default:
        return 0;
    }
  }

  // Получение целевого значения для достижения
  getTargetValue(type) {
    switch (type) {
      case 'FIRST_STEPS':
        return 10;
      case 'STREAK_MASTER':
        return 5;
      case 'SCORE_100':
        return 100;
      case 'AI_MASTER':
        return 10;
      case 'CATEGORY_EXPERT':
        return 8;
      case 'CHAMPION':
        return 1000;
      default:
        return 1;
    }
  }

  // Отображение достижений пользователя
  async showAchievements(chatId) {
    try {
      const progress = await this.getAchievementProgress(chatId);
      if (!progress || progress.length === 0) {
        await sendMessage(chatId, '🏆 У вас пока нет достижений. Продолжайте обучение, чтобы их получить!', this.env);
        return;
      }

      let message = `🏆 *Ваши достижения*\n\n`;
      
      const unlocked = progress.filter(p => p.isUnlocked);
      const locked = progress.filter(p => !p.isUnlocked);

      if (unlocked.length > 0) {
        message += `✅ *Разблокированные:*\n`;
        for (const item of unlocked) {
          message += `${item.achievement.icon} **${item.achievement.name}**\n`;
          message += `└ ${item.achievement.description}\n`;
          message += `└ 💎 +${item.achievement.points} XP\n\n`;
        }
      }

      if (locked.length > 0) {
        message += `🔒 *В процессе:*\n`;
        for (const item of locked) {
          message += `${item.achievement.icon} **${item.achievement.name}**\n`;
          message += `└ ${item.achievement.description}\n`;
          message += `└ 📊 Прогресс: ${item.currentValue}/${item.targetValue} (${item.progressPercent}%)\n\n`;
        }
      }

      const totalUnlocked = unlocked.length;
      const totalAchievements = progress.length;
      message += `\n📈 *Общий прогресс:* ${totalUnlocked}/${totalAchievements} достижений`;

      await sendMessage(chatId, message, this.env);
    } catch (error) {
      console.error('Error showing achievements:', error);
      await sendMessage(chatId, '❌ Ошибка отображения достижений', this.env);
    }
  }

  // Отображение профиля пользователя
  async showUserProfile(chatId) {
    try {
      const user = await this.database.getUser(chatId);
      if (!user) {
        await sendMessage(chatId, '❌ Ошибка загрузки профиля', this.env);
        return;
      }

      const currentLevel = AchievementSystem.LEVEL_SYSTEM.getLevel(user.experience_points || 0);
      const progress = AchievementSystem.LEVEL_SYSTEM.getProgress(user.experience_points || 0);
      const accuracy = (user.total_questions || 0) > 0 ? 
        Math.round(((user.total_correct || 0) / (user.total_questions || 1)) * 100) : 0;

      const message = `👤 *Ваш профиль*

🏆 Уровень: ${currentLevel.level} ${currentLevel.name} (${progress}%)
📊 Общий счет: ${user.total_score || 0} баллов
💎 Очки опыта: ${user.experience_points || 0} XP
📝 Всего вопросов: ${user.total_questions || 0}
✅ Правильных ответов: ${user.total_correct || 0}
🎯 Точность: ${accuracy}%
🔥 Лучшая серия: ${user.max_streak || 0} ответов
📅 Дней подряд: ${user.consecutive_days || 0}
🎓 Сложность: ${this.getDifficultyName(user.difficulty_level || 'beginner')}

📈 *Статистика за все время*
• Сессий обучения: ${user.total_sessions || 0}
• Последняя активность: ${this.formatDate(user.last_activity)}`;

      await sendMessage(chatId, message, this.env);
    } catch (error) {
      console.error('Error showing user profile:', error);
      await sendMessage(chatId, '❌ Ошибка загрузки профиля', this.env);
    }
  }

  // Получение названия сложности
  getDifficultyName(difficulty) {
    const names = {
      'beginner': 'Начинающий',
      'intermediate': 'Средний',
      'advanced': 'Продвинутый'
    };
    return names[difficulty] || difficulty;
  }

  // Форматирование даты
  formatDate(dateString) {
    if (!dateString) return 'Неизвестно';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Проверка повышения уровня
  async checkLevelUp(chatId, oldExperience, newExperience) {
    const oldLevel = AchievementSystem.LEVEL_SYSTEM.getLevel(oldExperience);
    const newLevel = AchievementSystem.LEVEL_SYSTEM.getLevel(newExperience);

    if (newLevel.level > oldLevel.level) {
      const message = `🎉 *Поздравляем с повышением уровня!*

🏆 Вы достигли уровня ${newLevel.level}: ${newLevel.name} ${newLevel.icon}

💎 Очки опыта: ${newExperience} XP
📊 Прогресс до следующего уровня: ${AchievementSystem.LEVEL_SYSTEM.getProgress(newExperience)}%

Продолжайте развиваться! 🚀`;

      await sendMessage(chatId, message, this.env);
      
      // Логируем повышение уровня
      await this.database.logActivity(
        chatId, 
        'level_up', 
        `Повышение до уровня ${newLevel.level}: ${newLevel.name}`,
        0,
        0
      );

      return newLevel;
    }

    return null;
  }

  // Расчет наград за ответ
  calculateAnswerRewards(isCorrect, streak, context = {}) {
    let points = 0;
    let experience = 0;

    if (isCorrect) {
      points = 10;
      experience = AchievementSystem.EXPERIENCE_SYSTEM.calculateExperience('correctAnswer', context);
      
      // Бонус за серию
      if (streak > 1) {
        const streakBonus = Math.min(streak * 2, 20); // максимум 20 бонусных очков
        points += streakBonus;
        experience += AchievementSystem.EXPERIENCE_SYSTEM.calculateExperience('streakBonus', context);
      }
    } else {
      points = 1; // минимальные очки за попытку
      experience = 1;
    }

    return { points, experience };
  }

  // Расчет наград за идеальный тест
  calculatePerfectTestRewards(questionsCount) {
    const baseReward = 50;
    const bonusPerQuestion = 5;
    const totalReward = baseReward + (questionsCount * bonusPerQuestion);

    return {
      points: totalReward,
      experience: AchievementSystem.EXPERIENCE_SYSTEM.rewards.perfectTest
    };
  }
} 