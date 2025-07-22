import React from 'react';

const DailyChallengeCard = ({ challenge, onComplete }) => {
  const {
    id,
    name,
    description,
    target,
    currentProgress,
    reward,
    isCompleted
  } = challenge;

  const progressPercent = Math.min(Math.round((currentProgress / target) * 100), 100);

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-gray-300';
  };

  const getChallengeIcon = (id) => {
    switch (id) {
      case 'complete_3_tests':
        return '📝';
      case 'high_accuracy':
        return '🎯';
      case 'new_category':
        return '🔍';
      case 'fast_responses':
        return '⚡';
      case 'perfect_session':
        return '⭐';
      case 'streak_maintain':
        return '🔥';
      case 'learning_time':
        return '⏰';
      default:
        return '📋';
    }
  };

  const formatProgress = (current, target) => {
    if (typeof target === 'number' && target <= 1) {
      // Для процентов (например, 0.8 = 80%)
      return `${Math.round(current * 100)}% / ${Math.round(target * 100)}%`;
    }
    return `${current} / ${target}`;
  };

  return (
    <div className={`
      relative bg-white rounded-lg p-4 shadow-sm border-2 transition-all duration-300
      ${isCompleted 
        ? 'border-green-300 bg-green-50' 
        : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
      }
    `}>
      {/* Статус выполнения */}
      {isCompleted && (
        <div className="absolute top-2 right-2">
          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
            ✓ Выполнено
          </span>
        </div>
      )}

      {/* Заголовок */}
      <div className="flex items-center space-x-3 mb-3">
        <div className="text-2xl">
          {getChallengeIcon(id)}
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${isCompleted ? 'text-green-700' : 'text-gray-800'}`}>
            {name}
          </h3>
          <p className="text-sm text-gray-600">
            {description}
          </p>
        </div>
      </div>

      {/* Прогресс */}
      {!isCompleted && (
        <div className="mb-3">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Прогресс</span>
            <span>{formatProgress(currentProgress, target)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(progressPercent)}`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Награда */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-yellow-500">💎</span>
          <span className="text-sm font-medium text-gray-700">
            +{reward.experience} XP
          </span>
        </div>
        
        {!isCompleted && progressPercent >= 100 && (
          <button
            onClick={() => onComplete && onComplete(id)}
            className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-full transition-colors duration-200"
          >
            Получить награду
          </button>
        )}
        
        {isCompleted && (
          <span className="text-green-600 text-sm font-medium">
            Награда получена
          </span>
        )}
      </div>

      {/* Анимация при выполнении */}
      {isCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-green-500 to-green-600 opacity-5 animate-pulse rounded-lg"></div>
      )}

      {/* Эффект при наведении */}
      {!isCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 opacity-0 hover:opacity-5 transition-opacity duration-300 rounded-lg"></div>
      )}
    </div>
  );
};

export default DailyChallengeCard; 