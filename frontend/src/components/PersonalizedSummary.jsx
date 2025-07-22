import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTelegramUser } from '../utils/telegram';
import { 
  fetchUserStats, 
  fetchUserAchievements, 
  startQuickTest,
  fetchCategories,
  askAI,
  getUserAchievements
} from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const PersonalizedSummary = ({ chatId, userStats, achievements, dailyChallenges }) => {
  const [motivationData, setMotivationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (chatId) {
      loadMotivationData();
    } else {
      const telegramUser = getTelegramUser();
      if (telegramUser?.chat_id) {
        setUser(telegramUser);
        loadMotivationData(telegramUser.chat_id);
      } else {
        setError('Необходимо открыть приложение через Telegram');
        setLoading(false);
      }
    }
  }, [chatId]);

  const loadMotivationData = async (userId = chatId) => {
    try {
      setLoading(true);
      const response = await fetch('https://telegram-wine-bot.2gc.workers.dev/motivation/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatId: userId })
      });

      if (!response.ok) {
        throw new Error('Failed to load motivation data');
      }

      const data = await response.json();
      if (data.success) {
        setMotivationData(data.data);
      } else {
        throw new Error(data.error || 'Failed to analyze motivation');
      }
    } catch (error) {
      console.error('Error loading motivation data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Обработчики быстрых действий
  const handleQuickTest = async () => {
    if (!user?.chat_id) return;
    
    setActionLoading(prev => ({ ...prev, quickTest: true }));
    try {
      const response = await startQuickTest(user.chat_id);
      if (response.success) {
        navigate('/quick-test');
      } else {
        alert('Ошибка запуска теста: ' + (response.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Error starting quick test:', error);
      alert('Ошибка запуска теста');
    } finally {
      setActionLoading(prev => ({ ...prev, quickTest: false }));
    }
  };

  const handleStudyCategory = async () => {
    if (!user?.chat_id) return;
    
    setActionLoading(prev => ({ ...prev, studyCategory: true }));
    try {
      const response = await fetchCategories();
      if (response.success) {
        navigate('/category-test');
      } else {
        alert('Ошибка загрузки категорий: ' + (response.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Ошибка загрузки категорий');
    } finally {
      setActionLoading(prev => ({ ...prev, studyCategory: false }));
    }
  };

  const handleAIChat = async () => {
    if (!user?.chat_id) return;
    
    setActionLoading(prev => ({ ...prev, aiChat: true }));
    try {
      navigate('/learning');
    } catch (error) {
      console.error('Error opening AI chat:', error);
      alert('Ошибка открытия AI чата');
    } finally {
      setActionLoading(prev => ({ ...prev, aiChat: false }));
    }
  };

  const handleAchievements = async () => {
    if (!user?.chat_id) return;
    
    setActionLoading(prev => ({ ...prev, achievements: true }));
    try {
      const response = await getUserAchievements(user.chat_id);
      if (response.success) {
        navigate('/achievements');
      } else {
        alert('Ошибка загрузки достижений: ' + (response.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
      alert('Ошибка загрузки достижений');
    } finally {
      setActionLoading(prev => ({ ...prev, achievements: false }));
    }
  };

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-slate-600 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-slate-600 rounded mb-2"></div>
            <div className="h-3 bg-slate-600 rounded w-2/3"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-600 rounded"></div>
          <div className="h-3 bg-slate-600 rounded w-4/5"></div>
          <div className="h-3 bg-slate-600 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-500/30 bg-red-900/20">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
            <span className="text-red-400 text-xl">⚠️</span>
          </div>
          <div>
            <h3 className="font-semibold text-red-300">Ошибка загрузки</h3>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
        <button 
          onClick={() => loadMotivationData()}
          className="text-sm text-red-400 hover:text-red-300 underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!motivationData) {
    return null;
  }

  const { motivation, analysis, rewards } = motivationData;
  const { user: userData } = userStats || {};

  const getMotivationIcon = (type) => {
    switch (type) {
      case 'praise': return '🏆';
      case 'encouragement': return '💪';
      case 'challenge': return '🎯';
      case 'reminder': return '⏰';
      case 'motivation': return '🌟';
      default: return '💬';
    }
  };

  const getMotivationColor = (type) => {
    switch (type) {
      case 'praise': return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
      case 'encouragement': return 'from-blue-500/20 to-indigo-500/20 border-blue-500/30';
      case 'challenge': return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
      case 'reminder': return 'from-slate-500/20 to-gray-500/20 border-slate-500/30';
      case 'motivation': return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
      default: return 'from-wine-500/20 to-pink-500/20 border-wine-500/30';
    }
  };

  const getProgressEmoji = (score) => {
    if (score >= 80) return '🚀';
    if (score >= 60) return '📈';
    if (score >= 40) return '📊';
    return '📉';
  };

  return (
    <div className="space-y-4">
      {/* Основное мотивационное сообщение */}
      <div className={`card bg-gradient-to-r ${getMotivationColor(motivation.type)}`}>
        <div className="flex items-start space-x-4">
          <div className="text-3xl">{getMotivationIcon(motivation.type)}</div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 text-white">
              {motivation.type === 'praise' && 'Отличная работа!'}
              {motivation.type === 'encouragement' && 'Держим курс!'}
              {motivation.type === 'challenge' && 'Новый вызов!'}
              {motivation.type === 'reminder' && 'Напоминание'}
              {motivation.type === 'motivation' && 'Мотивация'}
            </h3>
            <p className="text-slate-200 leading-relaxed">
              {motivation.text}
            </p>
          </div>
        </div>
      </div>

      {/* Новые награды */}
      {rewards && rewards.length > 0 && (
        <div className="card bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30">
          <h4 className="font-semibold text-yellow-300 mb-3 flex items-center">
            <span className="mr-2">🎁</span>
            Новые награды!
          </h4>
          <div className="space-y-2">
            {rewards.map((reward, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-slate-800/50 rounded-lg border border-yellow-500/30">
                <span className="text-2xl">{reward.data?.icon || '🏆'}</span>
                <div className="flex-1">
                  <div className="font-medium text-white">{reward.name}</div>
                  <div className="text-sm text-slate-300">{reward.description}</div>
                </div>
                <button className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition-colors">
                  Получить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalizedSummary; 