import React, { useState } from 'react';
import { markMotivationMessageRead } from '../utils/api';

const MotivationMessage = ({ message, onRead }) => {
  const [isRead, setIsRead] = useState(message.is_read);
  const [loading, setLoading] = useState(false);

  const getMessageIcon = (type) => {
    switch (type) {
      case 'praise': return '🏆';
      case 'encouragement': return '💪';
      case 'challenge': return '🎯';
      case 'reminder': return '⏰';
      case 'motivation': return '🌟';
      default: return '💬';
    }
  };

  const getMessageColor = (type) => {
    switch (type) {
      case 'praise': return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
      case 'encouragement': return 'from-blue-500/20 to-indigo-500/20 border-blue-500/30';
      case 'challenge': return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
      case 'reminder': return 'from-slate-500/20 to-gray-500/20 border-slate-500/30';
      case 'motivation': return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
      default: return 'from-wine-500/20 to-pink-500/20 border-wine-500/30';
    }
  };

  const getMessageTitle = (type) => {
    switch (type) {
      case 'praise': return 'Отличная работа!';
      case 'encouragement': return 'Держим курс!';
      case 'challenge': return 'Новый вызов!';
      case 'reminder': return 'Напоминание';
      case 'motivation': return 'Мотивация';
      default: return 'Сообщение';
    }
  };

  const handleMarkAsRead = async () => {
    if (isRead || loading) return;
    
    setLoading(true);
    try {
      const response = await markMotivationMessageRead(message.chat_id, message.id);
      if (response.success) {
        setIsRead(true);
        if (onRead) {
          onRead(message.id);
        }
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`card bg-gradient-to-r ${getMessageColor(message.message_type)} ${!isRead ? 'ring-2 ring-wine-500/50' : ''}`}>
      <div className="flex items-start space-x-4">
        <div className="text-3xl">{getMessageIcon(message.message_type)}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg text-white">
              {getMessageTitle(message.message_type)}
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">
                {formatDate(message.created_at)}
              </span>
              {!isRead && (
                <span className="inline-block w-2 h-2 bg-wine-500 rounded-full"></span>
              )}
            </div>
          </div>
          
          <p className="text-slate-200 leading-relaxed mb-3">
            {message.message_text}
          </p>

          {/* Контекст сообщения */}
          {message.context_data && (
            <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Контекст:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {message.context_data.userLevel && (
                  <div>
                    <span className="text-slate-400">Уровень:</span>
                    <span className="text-wine-400 ml-1">{message.context_data.userLevel}</span>
                  </div>
                )}
                {message.context_data.experiencePoints && (
                  <div>
                    <span className="text-slate-400">Опыт:</span>
                    <span className="text-wine-400 ml-1">{message.context_data.experiencePoints} XP</span>
                  </div>
                )}
                {message.context_data.streak && (
                  <div>
                    <span className="text-slate-400">Streak:</span>
                    <span className="text-wine-400 ml-1">{message.context_data.streak} дней</span>
                  </div>
                )}
                {message.points_awarded > 0 && (
                  <div>
                    <span className="text-slate-400">Награда:</span>
                    <span className="text-green-400 ml-1">+{message.points_awarded} очков</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Действия */}
          <div className="flex justify-between items-center">
            {!isRead && (
              <button
                onClick={handleMarkAsRead}
                disabled={loading}
                className="px-4 py-2 bg-wine-600 hover:bg-wine-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Отмечаю...
                  </div>
                ) : (
                  'Отметить как прочитанное'
                )}
              </button>
            )}
            
            {isRead && (
              <span className="text-sm text-green-400 flex items-center">
                <span className="mr-1">✓</span>
                Прочитано
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotivationMessage; 