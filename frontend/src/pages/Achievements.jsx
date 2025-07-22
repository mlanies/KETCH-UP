import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTelegramUser } from '../utils/telegram';
import { fetchUserAchievements, fetchAchievementsProgress } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function Achievements() {
  const [achievements, setAchievements] = useState([]);
  const [achievementsProgress, setAchievementsProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const loadAchievements = async () => {
      try {
        setLoading(true);
        const telegramUser = getTelegramUser();
        setUser(telegramUser);
        
        if (!telegramUser?.chat_id) {
          setError('Необходимо открыть приложение через Telegram');
          setLoading(false);
          return;
        }

        // Загружаем достижения и прогресс
        const [achievementsResponse, progressResponse] = await Promise.all([
          fetchUserAchievements(telegramUser.chat_id),
          fetchAchievementsProgress(telegramUser.chat_id)
        ]);

        if (achievementsResponse.success) {
          setAchievements(achievementsResponse.data || []);
        }

        if (progressResponse.success) {
          setAchievementsProgress(progressResponse.data || []);
        }

      } catch (error) {
        setError('Ошибка загрузки достижений');
        console.error('Error loading achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();
  }, []);

  const getAchievementIcon = (achievementType) => {
    const icons = {
      'first_steps': '🎯',
      'streak_master': '🔥',
      'score_100': '💎',
      'ai_master': '🤖',
      'category_expert': '📚',
      'champion': '🏆',
      'perfect_accuracy': '🎯',
      'daily_streak': '📅',
      'speed_demon': '⚡',
      'knowledge_seeker': '🔍'
    };
    return icons[achievementType] || '🏆';
  };

  const getAchievementRarity = (achievementType) => {
    const rarity = {
      'first_steps': 'common',
      'streak_master': 'uncommon',
      'score_100': 'rare',
      'ai_master': 'epic',
      'category_expert': 'epic',
      'champion': 'legendary',
      'perfect_accuracy': 'legendary',
      'daily_streak': 'rare',
      'speed_demon': 'epic',
      'knowledge_seeker': 'uncommon'
    };
    return rarity[achievementType] || 'common';
  };

  const getRarityColor = (rarity) => {
    const colors = {
      'common': 'text-slate-400',
      'uncommon': 'text-green-400',
      'rare': 'text-blue-400',
      'epic': 'text-purple-400',
      'legendary': 'text-yellow-400'
    };
    return colors[rarity] || 'text-slate-400';
  };

  const getRarityBg = (rarity) => {
    const colors = {
      'common': 'bg-slate-700/30',
      'uncommon': 'bg-green-900/30',
      'rare': 'bg-blue-900/30',
      'epic': 'bg-purple-900/30',
      'legendary': 'bg-yellow-900/30'
    };
    return colors[rarity] || 'bg-slate-700/30';
  };

  const filterAchievements = (type) => {
    if (type === 'all') return achievementsProgress;
    if (type === 'unlocked') return achievementsProgress.filter(a => a.isUnlocked);
    if (type === 'locked') return achievementsProgress.filter(a => !a.isUnlocked);
    if (type === 'learning') return achievementsProgress.filter(a => a.achievement.id?.includes('steps') || a.achievement.id?.includes('streak'));
    if (type === 'mastery') return achievementsProgress.filter(a => a.achievement.id?.includes('master') || a.achievement.id?.includes('expert'));
    if (type === 'special') return achievementsProgress.filter(a => a.achievement.id?.includes('perfect') || a.achievement.id?.includes('champion'));
    return achievementsProgress;
  };

  const handleAchievementClick = (achievement) => {
    setSelectedAchievement(achievement);
  };

  const closeAchievementModal = () => {
    setSelectedAchievement(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <LoadingSpinner message="Загружаем достижения..." />
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

  const filteredAchievements = filterAchievements(activeTab);
  const unlockedCount = achievementsProgress.filter(a => a.isUnlocked).length;
  const totalCount = achievementsProgress.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">🏆 Достижения</h1>
          <p className="text-slate-300">Ваш прогресс и награды</p>
        </div>

        {/* Статистика */}
        <div className="card mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-wine-400">{totalCount}</div>
              <div className="text-xs text-slate-400">Всего достижений</div>
            </div>
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{unlockedCount}</div>
              <div className="text-xs text-slate-400">Разблокировано</div>
            </div>
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-wine-400">
                {totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}%
              </div>
              <div className="text-xs text-slate-400">Прогресс</div>
            </div>
          </div>
        </div>

        {/* Вкладки */}
        <div className="card mb-6">
          <div className="flex gap-2 mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-shrink-0 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'all' 
                  ? 'bg-wine-500 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setActiveTab('unlocked')}
              className={`flex-shrink-0 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'unlocked' 
                  ? 'bg-wine-500 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Разблокированные
            </button>
            <button
              onClick={() => setActiveTab('locked')}
              className={`flex-shrink-0 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'locked' 
                  ? 'bg-wine-500 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Заблокированные
            </button>
            <button
              onClick={() => setActiveTab('learning')}
              className={`flex-shrink-0 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'learning' 
                  ? 'bg-wine-500 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Обучение
            </button>
            <button
              onClick={() => setActiveTab('mastery')}
              className={`flex-shrink-0 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'mastery' 
                  ? 'bg-wine-500 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Мастерство
            </button>
            <button
              onClick={() => setActiveTab('special')}
              className={`flex-shrink-0 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'special' 
                  ? 'bg-wine-500 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              Особые
            </button>
          </div>
        </div>

        {/* Список достижений */}
        <div className="space-y-4">
          {filteredAchievements.length === 0 ? (
            <div className="card text-center py-8">
              <div className="text-4xl mb-4">📭</div>
              <div className="text-lg font-medium mb-2">Нет достижений</div>
              <div className="text-slate-400">В выбранной категории пока нет достижений</div>
            </div>
          ) : (
            filteredAchievements.map((achievement, index) => {
              const rarity = getAchievementRarity(achievement.achievement.id);
              const rarityColor = getRarityColor(rarity);
              const rarityBg = getRarityBg(rarity);
              
              return (
                <div
                  key={index}
                  onClick={() => handleAchievementClick(achievement)}
                  className={`card cursor-pointer transition-all duration-200 hover:scale-[1.02] ${rarityBg} ${achievement.isUnlocked ? 'border-green-500/30' : 'border-slate-600/50'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`text-3xl ${achievement.isUnlocked ? 'animate-pulse' : 'opacity-50'}`}>
                      {getAchievementIcon(achievement.achievement.id)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className={`font-medium text-sm ${achievement.isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                          {achievement.achievement.name}
                        </h3>
                        {achievement.isUnlocked && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                            ✅ Разблокировано
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded ${rarityColor} bg-slate-700/50`}>
                          {rarity.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-400 mb-3">
                        {achievement.achievement.description}
                      </p>
                      
                      {/* Прогресс */}
                      {!achievement.isUnlocked && (
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-400">Прогресс</span>
                            <span className="text-xs text-slate-400">
                              {achievement.currentValue}/{achievement.targetValue}
                            </span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-wine-400 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${achievement.progressPercent}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {/* Награды */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-wine-400">💎</span>
                          <span className="text-slate-300">+{achievement.achievement.points || 0} очков</span>
                        </div>
                        {achievement.isUnlocked && (
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-400">⭐</span>
                            <span className="text-slate-300">Получено!</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {achievement.isUnlocked && (
                      <div className="text-xs text-slate-400">
                        {achievement.unlockedAt ? new Date(achievement.unlockedAt).toLocaleDateString('ru-RU') : 'Недавно'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
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

      {/* Модальное окно с деталями достижения */}
      {selectedAchievement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">
                {getAchievementIcon(selectedAchievement.achievement.id)}
              </div>
              <h2 className="text-xl font-bold mb-2">{selectedAchievement.achievement.name}</h2>
              <p className="text-slate-300 text-sm">{selectedAchievement.achievement.description}</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Редкость:</span>
                <span className={`font-medium ${getRarityColor(getAchievementRarity(selectedAchievement.achievement.id))}`}>
                  {getAchievementRarity(selectedAchievement.achievement.id).toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Награда:</span>
                <span className="text-wine-400 font-medium">+{selectedAchievement.achievement.points || 0} очков</span>
              </div>
              
              {selectedAchievement.isUnlocked ? (
                <div className="text-center p-4 bg-green-900/30 rounded-lg">
                  <div className="text-green-400 font-medium mb-2">✅ Достижение разблокировано!</div>
                  <div className="text-sm text-slate-400">
                    {selectedAchievement.unlockedAt ? 
                      `Получено ${new Date(selectedAchievement.unlockedAt).toLocaleDateString('ru-RU')}` : 
                      'Получено недавно'
                    }
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                  <div className="text-slate-400 font-medium mb-2">🔒 Достижение заблокировано</div>
                  <div className="text-sm text-slate-500">
                    Прогресс: {selectedAchievement.currentValue}/{selectedAchievement.targetValue}
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                    <div
                      className="bg-wine-400 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${selectedAchievement.progressPercent}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <button 
                onClick={closeAchievementModal}
                className="btn-secondary w-full"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 