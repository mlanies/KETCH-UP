import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTelegramUser } from '../utils/telegram';
import { 
  fetchUserStats, 
  fetchUserAchievements, 
  fetchDailyChallenges,
  getUserLevel,
  getUserDailyChallenges,
  completeDailyChallenge,
  addUserExperience,
  logUserAction
} from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import Logo from '../assets/logo.svg';
import StatsChartCard from '../components/StatsChartCard';
import LevelProgress from '../components/LevelProgress';
import DailyChallengeCard from '../components/DailyChallengeCard';
import AchievementBadge from '../components/AchievementBadge';
import PersonalizedSummary from '../components/PersonalizedSummary';
import BurgerDrum from '../components/BurgerDrum';

export default function Home() {
  const [userStats, setUserStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [sessionsData, setSessionsData] = useState([]);
  const [levelInfo, setLevelInfo] = useState(null);
  const [dailyChallenges, setDailyChallenges] = useState([]);
  const [achievementProgress, setAchievementProgress] = useState([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const telegramUser = getTelegramUser();
        setUser(telegramUser);
        
        if (!telegramUser?.chat_id) {
          // Демо-данные для неавторизованных пользователей
          setUserStats({
            user: {
              id: 123456789,
              total_score: 150,
              total_questions: 25,
              total_correct: 20,
              experience_points: 75,
              difficulty_level: 'intermediate'
            },
            recentSessions: []
          });
          setLoading(false);
          return;
        }

        // Загружаем основную статистику пользователя
        const statsResponse = await fetchUserStats(telegramUser.chat_id);
        if (statsResponse.success) {
          setUserStats(statsResponse.data);
          setSessionsData(statsResponse.data.recentSessions || []);
        }

        // Загружаем достижения
        try {
          const achievementsResponse = await fetchUserAchievements(telegramUser.chat_id);
          if (achievementsResponse.success) {
            setAchievements(achievementsResponse.data.achievements || []);
            setAchievementProgress(achievementsResponse.data.progress || []);
          }
        } catch (error) {
          console.error('Error loading achievements:', error);
        }

        // Загружаем общие задания
        try {
          const challengesResponse = await fetchDailyChallenges(telegramUser.chat_id);
          if (challengesResponse.success) {
            setChallenges(challengesResponse.data || []);
          }
        } catch (error) {
          console.error('Error loading challenges:', error);
        }

        // Загружаем уровень пользователя
        try {
          const levelResponse = await getUserLevel(telegramUser.chat_id);
          if (levelResponse.success) {
            setLevelInfo(levelResponse.data);
          }
        } catch (error) {
          console.error('Error loading user level:', error);
        }

        // Загружаем ежедневные задания пользователя
        try {
          const dailyChallengesResponse = await getUserDailyChallenges(telegramUser.chat_id);
          if (dailyChallengesResponse.success) {
            setDailyChallenges(dailyChallengesResponse.data.challenges || []);
          }
        } catch (error) {
          console.error('Error loading daily challenges:', error);
        }

      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Готовим данные для главного графика прогресса
  const days = sessionsData.length > 0
    ? sessionsData.map(s => new Date(s.start_time).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }))
    : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  
  const progressData = sessionsData.length > 0
    ? sessionsData.map((s, i) => ({ 
        label: days[i], 
        value: s.correct_answers,
        score: s.score 
      }))
    : [5, 7, 6, 8, 10, 9, 12].map((v, i) => ({ 
        label: days[i], 
        value: v,
        score: v * 10 
      }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <LoadingSpinner message="Загрузка данных..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <ErrorMessage 
          message={error} 
          onRetry={() => window.location.reload()} 
        />
      </div>
    );
  }

  const stats = userStats?.user || {};
  const totalScore = stats.total_score || 0;
  const totalQuestions = stats.total_questions || 0;
  const totalCorrect = stats.total_correct || 0;
  const experiencePoints = stats.experience_points || 0;
  const difficultyLevel = stats.difficulty_level || 'beginner';

  // Вычисляем прогресс за неделю
  const currentProgress = progressData[progressData.length - 1]?.value || 0;
  const previousProgress = progressData.length > 1 ? progressData[0]?.value || 0 : 0;
  const progressChange = currentProgress - previousProgress;

  // Обработка завершения ежедневного задания
  const handleChallengeComplete = async (challengeId) => {
    if (!user?.chat_id) return;
    
    try {
      const response = await completeDailyChallenge(user.chat_id, challengeId);
      if (response.success) {
        // Обновляем список заданий
        const updatedChallenges = dailyChallenges.map(challenge => 
          challenge.id === challengeId 
            ? { ...challenge, isCompleted: true }
            : challenge
        );
        setDailyChallenges(updatedChallenges);
        
        // Логируем действие
        await logUserAction(user.chat_id, 'daily_challenge_completed', `Завершено задание: ${challengeId}`);
        
        // Показываем уведомление
        alert(`🎉 Задание выполнено! Получено ${response.data.reward.experience} XP`);
      }
    } catch (error) {
      console.error('Error completing challenge:', error);
    }
  };

  // Обработка клика по достижению
  const handleAchievementClick = (achievement) => {
    if (achievement.isUnlocked) {
      alert(`🏆 ${achievement.achievement.name}\n${achievement.achievement.description}\n\nПолучено ${achievement.achievement.points} XP`);
    } else {
      alert(`🔒 ${achievement.achievement.name}\n${achievement.achievement.description}\n\nПрогресс: ${achievement.currentValue}/${achievement.targetValue} (${achievement.progressPercent}%)`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-2xl mx-auto p-6">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-2xl mb-4 shadow-lg">
            <img src={Logo} alt="KB Logo" className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Beverage Learning</h1>
          <p className="text-slate-300 mb-2">Обучение официантов по ассортименту напитков</p>
          {user ? (
            <p className="text-sm text-slate-400">
              Привет, {user.first_name || user.username || 'пользователь'}!
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              Демо-режим (откройте через Telegram для полного функционала)
            </p>
          )}
        </div>

        {/* ИИ-сводка и мотивация */}
        {user?.chat_id && (
          <div className="mb-8">
            <PersonalizedSummary 
              chatId={user.chat_id}
              userStats={userStats}
              achievements={achievements}
              dailyChallenges={dailyChallenges}
            />
          </div>
        )}

        {/* Уровень и прогресс - улучшенный дизайн */}
        {levelInfo && (
          <div className="mb-6">
            <LevelProgress levelInfo={levelInfo} showDetails={true} />
          </div>
        )}

        {/* Статистика пользователя - если нет levelInfo */}
        {!levelInfo && userStats && (
          <div className="card mb-6">
            <div className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📊</span>
              <span>Ваша статистика</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                <div className="text-2xl font-bold text-wine-400">{totalScore}</div>
                <div className="text-xs text-slate-400">Общий счет</div>
              </div>
              <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                <div className="text-2xl font-bold text-wine-400">{experiencePoints}</div>
                <div className="text-xs text-slate-400">Опыт</div>
              </div>
              <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                <div className="text-2xl font-bold text-wine-400">{totalQuestions}</div>
                <div className="text-xs text-slate-400">Вопросов</div>
              </div>
              <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                <div className="text-2xl font-bold text-wine-400">
                  {totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0}%
                </div>
                <div className="text-xs text-slate-400">Точность</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <span className="text-sm text-slate-400">Уровень: </span>
              <span className="text-sm font-semibold text-wine-400 capitalize">{difficultyLevel}</span>
            </div>
          </div>
        )}

        {/* Режимы тестирования - заменили быстрые действия */}
        <div className="card mb-6">
          <div className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🧠</span>
            <span>Режимы тестирования</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={() => navigate('/quick-test')}
              className="flex items-center gap-3 p-4 bg-wine-600/20 border border-wine-500/30 rounded-lg hover:bg-wine-600/30 transition-all duration-200"
            >
              <span className="text-xl">⚡</span>
              <div className="text-left flex-1">
                <div className="font-medium text-sm">Быстрый тест</div>
                <div className="text-xs text-slate-400">5 вопросов на время</div>
              </div>
              <span className="text-xs text-slate-400">5 вопросов</span>
            </button>
            
            <button 
              onClick={() => navigate('/personalized-test')}
              className="flex items-center gap-3 p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg hover:bg-slate-600/30 transition-all duration-200"
            >
              <span className="text-xl">🧠</span>
              <div className="text-left flex-1">
                <div className="font-medium text-sm">Персонализированный тест</div>
                <div className="text-xs text-slate-400">Вопросы на основе ваших слабых мест</div>
              </div>
              <span className="text-xs text-slate-400">10 вопросов</span>
            </button>
            
            <button 
              onClick={() => navigate('/category-test')}
              className="flex items-center gap-3 p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg hover:bg-slate-600/30 transition-all duration-200"
            >
              <span className="text-xl">📚</span>
              <div className="text-left flex-1">
                <div className="font-medium text-sm">Тест по категориям</div>
                <div className="text-xs text-slate-400">Специализированные вопросы по категориям</div>
              </div>
              <span className="text-xs text-slate-400">12 вопросов</span>
            </button>
          </div>
        </div>

        {/* Ежедневные задания - только один блок */}
        {dailyChallenges.length > 0 && (
          <div className="card mb-6">
            <div className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📅</span>
              <span>Ежедневные задания</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {dailyChallenges.slice(0, 3).map((challenge, index) => (
                <DailyChallengeCard
                  key={index}
                  challenge={challenge}
                  onComplete={handleChallengeComplete}
                />
              ))}
            </div>
            {dailyChallenges.length > 3 && (
              <button 
                onClick={() => navigate('/daily-challenges')}
                className="w-full mt-3 p-2 text-sm text-slate-400 hover:text-white transition-colors duration-200"
              >
                Показать все задания ({dailyChallenges.length})
              </button>
            )}
          </div>
        )}

        {/* Достижения - только один блок */}
        {achievementProgress.length > 0 && (
          <div className="card mb-6">
            <div className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>🏆</span>
              <span>Достижения</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {achievementProgress.slice(0, 6).map((achievement, index) => (
                <AchievementBadge
                  key={index}
                  achievement={achievement.achievement}
                  isUnlocked={achievement.isUnlocked}
                  progress={achievement.progressPercent}
                  onClick={() => handleAchievementClick(achievement)}
                />
              ))}
            </div>
            {achievementProgress.length > 6 && (
              <button 
                onClick={() => navigate('/achievements')}
                className="w-full mt-3 p-2 text-sm text-slate-400 hover:text-white transition-colors duration-200"
              >
                Показать все достижения ({achievementProgress.length})
              </button>
            )}
          </div>
        )}

        {/* Дополнительные разделы */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button 
            onClick={() => navigate('/drinks')}
            className="btn-secondary flex flex-col items-center gap-2 hover:scale-105 transition-transform duration-200"
          >
            <span className="text-xl">🍷</span>
            <span className="text-sm">База напитков</span>
          </button>
          {/*
          <button 
            onClick={() => navigate('/learning')}
            className="btn-secondary flex flex-col items-center gap-2 hover:scale-105 transition-transform duration-200"
          >
            <span className="text-xl">🤖</span>
            <span className="text-sm">ИИ-обучение</span>
          </button>
          */}
          <button 
            onClick={() => navigate('/motivation')}
            className="btn-secondary flex flex-col items-center gap-2 hover:scale-105 transition-transform duration-200"
          >
            <span className="text-xl">🧠</span>
            <span className="text-sm">Мотивация</span>
          </button>
          <button 
            onClick={() => navigate('/achievements')}
            className="btn-secondary flex flex-col items-center gap-2 hover:scale-105 transition-transform duration-200"
          >
            <span className="text-xl">🏆</span>
            <span className="text-sm">Достижения</span>
          </button>
        </div>
      </div>
      {/* Центрированный бургер-драм и кнопка 'Назад' */}
      <section className="w-full flex flex-col items-center justify-center min-h-[420px] py-2">
        <div className="w-full flex flex-col items-center justify-center">
          <div className="w-full max-w-xs mx-auto">
            <BurgerDrum />
          </div>
        </div>
      </section>
    </div>
  );
} 