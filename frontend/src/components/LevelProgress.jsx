import React from 'react';

const LevelProgress = ({ levelInfo, showDetails = false }) => {
  if (!levelInfo) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-slate-600 rounded mb-2"></div>
        <div className="h-2 bg-slate-600 rounded"></div>
      </div>
    );
  }

  const { currentLevel, progress, nextLevel, experiencePoints } = levelInfo;

  const getLevelColor = (level) => {
    switch (level) {
      case 1:
        return 'text-slate-400 bg-slate-700/50';
      case 2:
        return 'text-blue-400 bg-blue-900/30';
      case 3:
        return 'text-green-400 bg-green-900/30';
      case 4:
        return 'text-yellow-400 bg-yellow-900/30';
      case 5:
        return 'text-red-400 bg-red-900/30';
      case 6:
        return 'text-purple-400 bg-purple-900/30';
      case 7:
        return 'text-indigo-400 bg-indigo-900/30';
      default:
        return 'text-slate-400 bg-slate-700/50';
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 90) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-slate-600';
  };

  // Функция для перевода технических ID в человекочитаемые названия
  const translateFeatureName = (featureId) => {
    const translations = {
      'basic_tests': 'Базовые тесты',
      'daily_challenges': 'Ежедневные задания',
      'advanced_tests': 'Продвинутые тесты',
      'ai_consultations': 'ИИ-консультации',
      'mentor_mode': 'Режим наставника',
      'custom_tests': 'Кастомные тесты',
      'all_features': 'Все возможности'
    };
    return translations[featureId] || featureId;
  };

  return (
    <div className="card">
      {/* Текущий уровень */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`text-2xl ${getLevelColor(currentLevel.level)} p-2 rounded-full`}>
            {currentLevel.icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">
              Уровень {currentLevel.level}
            </h3>
            <p className="text-sm text-slate-300">
              {currentLevel.name}
            </p>
          </div>
        </div>
        
        {showDetails && (
          <div className="text-right">
            <div className="text-sm text-slate-400">Опыт</div>
            <div className="font-semibold text-lg text-wine-400">{experiencePoints} XP</div>
          </div>
        )}
      </div>

      {/* Прогресс-бар */}
      <div className="mb-3">
        <div className="flex justify-between text-sm text-slate-300 mb-1">
          <span>Прогресс до следующего уровня</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3 relative overflow-hidden">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(progress)} relative`}
            style={{ width: `${progress}%` }}
          >
            {/* Анимация блеска */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Информация о следующем уровне */}
      {nextLevel && showDetails && (
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{nextLevel.icon}</span>
              <div>
                <div className="text-sm font-medium text-white">
                  Следующий уровень: {nextLevel.name}
                </div>
                <div className="text-xs text-slate-400">
                  Нужно еще {nextLevel.minExperience - experiencePoints} XP
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-400">
              {nextLevel.minExperience} XP
            </div>
          </div>
        </div>
      )}

      {/* Награды текущего уровня */}
      {showDetails && currentLevel.rewards && (
        <div className="mt-3 pt-3 border-t border-slate-600">
          <div className="text-sm font-medium text-slate-200 mb-2">
            Доступные возможности:
          </div>
          <div className="flex flex-wrap gap-1">
            {currentLevel.rewards.unlockFeatures?.map((feature, index) => (
              <span 
                key={index}
                className="inline-block px-2 py-1 text-xs bg-green-900/30 text-green-400 rounded-full border border-green-500/30"
              >
                {translateFeatureName(feature)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Анимация при достижении 100% */}
      {progress === 100 && (
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 opacity-20 animate-pulse rounded-lg"></div>
      )}
    </div>
  );
};

export default LevelProgress; 