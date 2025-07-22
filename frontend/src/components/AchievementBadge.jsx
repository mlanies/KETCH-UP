import React from 'react';

const AchievementBadge = ({ achievement, isUnlocked = false, progress = 0, onClick }) => {
  const {
    icon,
    name,
    description,
    points,
    type = 'basic'
  } = achievement;

  const getTypeColor = (type) => {
    switch (type) {
      case 'basic':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'streak':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'quality':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'speed':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'mastery':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'social':
        return 'bg-pink-100 border-pink-300 text-pink-800';
      case 'level':
        return 'bg-indigo-100 border-indigo-300 text-indigo-800';
      case 'special':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-gray-300';
  };

  return (
    <div 
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer
        ${isUnlocked 
          ? `${getTypeColor(type)} hover:shadow-lg hover:scale-105` 
          : 'bg-gray-50 border-gray-200 text-gray-500 hover:shadow-md'
        }
        ${onClick ? 'hover:scale-105' : ''}
      `}
      onClick={onClick}
    >
      {/* Иконка и статус */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl">{icon}</div>
        <div className="flex items-center space-x-1">
          {isUnlocked ? (
            <span className="text-green-600 text-sm font-semibold">✓</span>
          ) : (
            <span className="text-gray-400 text-sm">🔒</span>
          )}
        </div>
      </div>

      {/* Название */}
      <h3 className={`font-semibold text-sm mb-1 ${isUnlocked ? '' : 'text-gray-400'}`}>
        {name}
      </h3>

      {/* Описание */}
      <p className={`text-xs mb-3 ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
        {description}
      </p>

      {/* Прогресс */}
      {!isUnlocked && progress > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Прогресс</span>
            <span>{Math.min(progress, 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Очки */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">
          +{points} XP
        </span>
        {isUnlocked && (
          <span className="text-xs text-green-600 font-semibold">
            Получено
          </span>
        )}
      </div>

      {/* Эффект блеска для разблокированных достижений */}
      {isUnlocked && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      )}
    </div>
  );
};

export default AchievementBadge; 