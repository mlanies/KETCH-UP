// Утилиты для работы с backend API

const API_BASE_URL = 'https://telegram-wine-bot.2gc.workers.dev';

export async function fetchUserStats(chatId) {
  try {
    const response = await fetch(`${API_BASE_URL}/user-stats?chatId=${chatId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
}

export async function fetchUserAchievements(chatId) {
  try {
    const response = await fetch(`${API_BASE_URL}/user-achievements?chatId=${chatId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    throw error;
  }
}

export async function fetchDailyChallenges(chatId) {
  try {
    const response = await fetch(`${API_BASE_URL}/daily-challenges?chatId=${chatId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching daily challenges:', error);
    throw error;
  }
}

export async function fetchWineData() {
  try {
    const response = await fetch(`${API_BASE_URL}/wine-data`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching wine data:', error);
    throw error;
  }
}

// Получение ассортимента напитков
export async function fetchDrinks(category = null, search = null) {
  try {
    const params = new URLSearchParams();
    if (category && category !== 'all') {
      params.append('category', category);
    }
    if (search) {
      params.append('search', search);
    }
    
    const url = `${API_BASE_URL}/drinks${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching drinks:', error);
    throw error;
  }
}

// ИИ консультации
export async function askAI(question, wineId = null, chatId = null, userContext = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-consultation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        wineId,
        chatId,
        userContext
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error asking AI:', error);
    throw error;
  }
}

// Получение детальной статистики из D1
export async function fetchUserDetailedStats(chatId) {
  try {
    const response = await fetch(`${API_BASE_URL}/user-detailed-stats?chatId=${chatId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user detailed stats:', error);
    throw error;
  }
}

// === НОВЫЕ API ФУНКЦИИ ДЛЯ СИСТЕМЫ ТЕСТИРОВАНИЯ ===

// Начало быстрого теста
export async function startQuickTest(chatId) {
  try {
    const response = await fetch(`${API_BASE_URL}/start-quick-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error starting quick test:', error);
    throw error;
  }
}

// Получение вопроса для теста
export async function getTestQuestion(sessionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/get-test-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting test question:', error);
    throw error;
  }
}

// Отправка ответа на вопрос теста
export async function submitTestAnswer(sessionId, questionId, answer, isCorrect) {
  try {
    const response = await fetch(`${API_BASE_URL}/submit-test-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        questionId,
        answer,
        isCorrect
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error submitting test answer:', error);
    throw error;
  }
}

// Отправка ответа на вопрос
export async function submitAnswer(chatId, answer, questionData) {
  try {
    const response = await fetch(`${API_BASE_URL}/submit-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        answer,
        questionData
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error submitting answer:', error);
    throw error;
  }
}

// Завершение теста
export async function finishTest(chatId, testResults) {
  try {
    const response = await fetch(`${API_BASE_URL}/finish-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        testResults
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error finishing test:', error);
    throw error;
  }
}

// === API ДЛЯ СИСТЕМЫ ОБУЧЕНИЯ ===

// Получение уроков
export async function fetchLessons(category = null) {
  try {
    const params = new URLSearchParams();
    if (category) {
      params.append('category', category);
    }
    
    const url = `${API_BASE_URL}/lessons${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching lessons:', error);
    throw error;
  }
}

// Завершение урока
export async function completeLesson(chatId, lessonId, results) {
  try {
    const response = await fetch(`${API_BASE_URL}/complete-lesson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        lessonId,
        results
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error completing lesson:', error);
    throw error;
  }
}

// Получение прогресса обучения
export async function fetchLearningProgress(chatId) {
  try {
    const response = await fetch(`${API_BASE_URL}/learning-progress?chatId=${chatId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching learning progress:', error);
    throw error;
  }
}

// === API ДЛЯ ИИ ===

// Генерация вопросов ИИ
export async function generateAIQuestions(chatId, category = null, count = 5) {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        category,
        count
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating AI questions:', error);
    throw error;
  }
}

// Анализ ответа ИИ
export async function analyzeAnswer(chatId, question, userAnswer, correctAnswer) {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-analyze-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        question,
        userAnswer,
        correctAnswer
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error analyzing answer:', error);
    throw error;
  }
}

// Получение персональных рекомендаций
export async function getPersonalizedRecommendations(chatId) {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-get-recommendations?chatId=${chatId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    throw error;
  }
}

// === API ДЛЯ ГЕЙМИФИКАЦИИ ===

// Получение рейтинга пользователей
export async function fetchLeaderboard(limit = 10) {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
}

// Получение прогресса достижений
export async function fetchAchievementsProgress(chatId) {
  try {
    const response = await fetch(`${API_BASE_URL}/achievements-progress?chatId=${chatId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching achievements progress:', error);
    throw error;
  }
}

// Получение достижения
export async function claimAchievement(chatId, achievementType) {
  try {
    const response = await fetch(`${API_BASE_URL}/claim-achievement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        achievementType
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error claiming achievement:', error);
    throw error;
  }
}

// === УТИЛИТЫ ДЛЯ РАБОТЫ С ДАННЫМИ ===

// Получение данных о напитках для тестирования
export async function fetchWineDataForTesting() {
  try {
    const response = await fetch(`${API_BASE_URL}/wine-data`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching wine data for testing:', error);
    throw error;
  }
}

// Получение категорий напитков
export async function fetchCategories() {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

// Проверка статуса сервера
export async function checkServerStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking server status:', error);
    throw error;
  }
}

// ===== НОВЫЕ API ФУНКЦИИ ДЛЯ СИСТЕМЫ ГЕЙМИФИКАЦИИ =====

// Проверка достижений
export async function checkAchievements(chatId, stats) {
  try {
    const response = await fetch(`${API_BASE_URL}/achievements/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, stats })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking achievements:', error);
    throw error;
  }
}

// Получение достижений пользователя
export async function getUserAchievements(chatId) {
  try {
    const response = await fetch(`${API_BASE_URL}/achievements/user?chatId=${chatId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    throw error;
  }
}

// Получение уровня пользователя
export async function getUserLevel(chatId) {
  try {
    const response = await fetch(`${API_BASE_URL}/user/level?chatId=${chatId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user level:', error);
    throw error;
  }
}

// Добавление опыта пользователю
export async function addUserExperience(chatId, action, context = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/user/experience/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, action, context })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error adding user experience:', error);
    throw error;
  }
}

// Получение ежедневных заданий пользователя
export async function getUserDailyChallenges(chatId) {
  try {
    const response = await fetch(`${API_BASE_URL}/daily-challenges/user?chatId=${chatId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user daily challenges:', error);
    throw error;
  }
}

// Завершение ежедневного задания
export async function completeDailyChallenge(chatId, challengeId) {
  try {
    const response = await fetch(`${API_BASE_URL}/daily-challenges/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, challengeId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error completing daily challenge:', error);
    throw error;
  }
}

// Логирование действий пользователя
export async function logUserAction(chatId, actionType, description = '', pointsEarned = 0, experienceEarned = 0) {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        actionType,
        description,
        pointsEarned,
        experienceEarned
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error logging user action:', error);
    throw error;
  }
}

// === НОВЫЕ API ФУНКЦИИ ДЛЯ СИСТЕМЫ СТИМУЛИРОВАНИЯ ===

// Анализ мотивации пользователя
export async function analyzeUserMotivation(chatId) {
  try {
    const response = await fetch(`${API_BASE_URL}/motivation/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error analyzing user motivation:', error);
    throw error;
  }
}

// Получение мотивационных сообщений
export async function getMotivationMessages(chatId, unreadOnly = false) {
  try {
    const params = new URLSearchParams({ chatId });
    if (unreadOnly) {
      params.append('unreadOnly', 'true');
    }
    
    const response = await fetch(`${API_BASE_URL}/motivation/messages?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching motivation messages:', error);
    throw error;
  }
}

// Отметить мотивационное сообщение как прочитанное
export async function markMotivationMessageRead(chatId, messageId) {
  try {
    const response = await fetch(`${API_BASE_URL}/motivation/messages/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, messageId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error marking motivation message as read:', error);
    throw error;
  }
}

// Получение наград пользователя
export async function getUserRewards(chatId, unclaimedOnly = false) {
  try {
    const params = new URLSearchParams({ chatId });
    if (unclaimedOnly) {
      params.append('unclaimedOnly', 'true');
    }
    
    const response = await fetch(`${API_BASE_URL}/rewards/user?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user rewards:', error);
    throw error;
  }
}

// Получение награды
export async function claimReward(chatId, rewardId) {
  try {
    const response = await fetch(`${API_BASE_URL}/rewards/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, rewardId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error claiming reward:', error);
    throw error;
  }
}

// Получение уведомлений пользователя
export async function getUserNotifications(chatId, unreadOnly = false) {
  try {
    const params = new URLSearchParams({ chatId });
    if (unreadOnly) {
      params.append('unreadOnly', 'true');
    }
    
    const response = await fetch(`${API_BASE_URL}/notifications/user?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    throw error;
  }
}

// Отметить уведомление как прочитанное
export async function markNotificationRead(chatId, notificationId) {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/mark-read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, notificationId })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
} 