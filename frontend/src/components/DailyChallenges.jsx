import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTelegramUser } from '../utils/telegram';
import { fetchDailyChallenges } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

export default function DailyChallenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('daily');
  
  const navigate = useNavigate();

  useEffect(() => {
    const loadChallenges = async () => {
      try {
        setLoading(true);
        const telegramUser = getTelegramUser();
        setUser(telegramUser);
        
        if (!telegramUser?.chat_id) {
          setError('Необходимо открыть приложение через Telegram');
          setLoading(false);
          return;
        }

        const challengesResponse = await fetchDailyChallenges(telegramUser.chat_id);
        if (challengesResponse.success) {
          setChallenges(challengesResponse.data || []);
        } else {
          setError('Ошибка загрузки ежедневных заданий');
        }
      } catch (error) {
        setError('Ошибка загрузки данных');
        console.error('Error loading challenges:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChallenges();
  }, []);

  const getChallengeIcon = (challengeType) => {
    const icons = {
      'daily_questions': '🎯',
      'daily_streak': '🔥',
      'daily_category': '📚',
      'daily_accuracy': '🎯',
      'daily_ai': '🤖',
      'quick_test': '⚡',
      'category_study': '📖',
      'ai_consultation': '💬'
    };
    return icons[challengeType] || '📋';
  };

  const getChallengeColor = (isCompleted) => {
    return isCompleted 
      ? 'bg-green-900/30 border-green-500/30' 
      : 'bg-slate-700/30 border-slate-600/50';
  };

  const getProgressColor = (progress, target) => {
    const percentage = (progress / target) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 70) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleChallengeClick = (challenge) => {
    if (challenge.is_completed) return;

    // Перенаправляем на соответствующий раздел в зависимости от типа задания
    switch (challenge.challenge_type) {
      case 'quick_test':
        navigate('/quick-test');
        break;
      case 'category_study':
        navigate('/category-test');
        break;
      case 'ai_consultation':
        navigate('/learning');
        break;
      default:
        // Для других типов заданий показываем информацию
        alert(`Задание: ${challenge.challenge_name}\n\n${challenge.description}\n\nПрогресс: ${challenge.current_progress || 0}/${challenge.target_value || 1}`);
    }
  };

  const filterChallenges = (type) => {
    if (type === 'all') return challenges;
    if (type === 'daily') return challenges.filter(c => c.challenge_type?.startsWith('daily_'));
    if (type === 'weekly') return challenges.filter(c => c.challenge_type?.startsWith('weekly_'));
    if (type === 'special') return challenges.filter(c => !c.challenge_type?.startsWith('daily_') && !c.challenge_type?.startsWith('weekly_'));
    return challenges;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <LoadingSpinner message="Загружаем ежедневные задания..." />
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

  const filteredChallenges = filterChallenges(activeTab);
  const completedChallenges = challenges.filter(c => c.is_completed).length;
  const totalChallenges = challenges.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">📅 Ежедневные задания</h1>
          <p className="text-slate-300">Выполняйте задания и получайте награды</p>
        </div>

        {/* Статистика */}
        <div className="card mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-wine-400">{totalChallenges}</div>
              <div className="text-xs text-slate-400">Всего заданий</div>
            </div>
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{completedChallenges}</div>
              <div className="text-xs text-slate-400">Выполнено</div>
            </div>
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-wine-400">
                {totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0}%
              </div>
              <div className="text-xs text-slate-400">Прогресс</div>
            </div>
          </div>
        </div>

        {/* Вкладки */}
        <div className="card mb-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'all' 
                  ? 'bg-wine-500 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'daily' 
                  ? 'bg-wine-500 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Ежедневные
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'weekly' 
                  ? 'bg-wine-500 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Еженедельные
            </button>
            <button
              onClick={() => setActiveTab('special')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'special' 
                  ? 'bg-wine-500 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Особые
            </button>
          </div>
        </div>

        {/* Список заданий */}
        <div className="space-y-4">
          {filteredChallenges.length === 0 ? (
            <div className="card text-center py-8">
              <div className="text-4xl mb-4">📭</div>
              <div className="text-lg font-medium mb-2">Нет заданий</div>
              <div className="text-slate-400">В выбранной категории пока нет заданий</div>
            </div>
          ) : (
            filteredChallenges.map((challenge, index) => (
              <div
                key={index}
                onClick={() => handleChallengeClick(challenge)}
                className={`card cursor-pointer transition-all duration-200 hover:scale-[1.02] ${getChallengeColor(challenge.is_completed)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl">
                    {getChallengeIcon(challenge.challenge_type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-sm">{challenge.challenge_name}</h3>
                      {challenge.is_completed && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                          ✅ Выполнено
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-400 mb-3">
                      {challenge.description}
                    </p>
                    
                    {/* Прогресс */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-400">Прогресс</span>
                        <span className="text-xs text-slate-400">
                          {challenge.current_progress || 0}/{challenge.target_value || 1}
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(challenge.current_progress || 0, challenge.target_value || 1)}`}
                          style={{
                            width: `${Math.min(((challenge.current_progress || 0) / (challenge.target_value || 1)) * 100, 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Награды */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-wine-400">💎</span>
                        <span className="text-slate-300">+{challenge.reward_points || 0} очков</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-slate-300">+{challenge.reward_experience || 0} XP</span>
                      </div>
                    </div>
                  </div>
                  
                  {!challenge.is_completed && (
                    <div className="text-xs text-slate-400">
                      {challenge.created_date ? new Date(challenge.created_date).toLocaleDateString('ru-RU') : 'Сегодня'}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Кнопка возврата */}
        <div className="mt-8">
          <button 
            onClick={() => navigate('/')}
            className="btn-secondary w-full"
          >
            🔙 Назад на главную
          </button>
        </div>
      </div>
    </div>
  );
} 