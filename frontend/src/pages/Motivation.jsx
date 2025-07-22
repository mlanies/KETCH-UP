import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTelegramUser } from '../utils/telegram';
import { getMotivationMessages, analyzeUserMotivation } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import MotivationMessage from '../components/MotivationMessage';

export default function Motivation() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const loadMotivationData = async () => {
      try {
        setLoading(true);
        const telegramUser = getTelegramUser();
        setUser(telegramUser);
        
        if (!telegramUser?.chat_id) {
          setError('Необходимо открыть приложение через Telegram');
          setLoading(false);
          return;
        }

        // Загружаем мотивационные сообщения
        const messagesResponse = await getMotivationMessages(telegramUser.chat_id);
        if (messagesResponse.success) {
          setMessages(messagesResponse.data.messages || []);
        } else {
          setError('Ошибка загрузки мотивационных сообщений');
        }
      } catch (error) {
        setError('Ошибка загрузки данных');
        console.error('Error loading motivation data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMotivationData();
  }, []);

  const handleRefresh = async () => {
    if (!user?.chat_id || refreshing) return;
    
    setRefreshing(true);
    try {
      // Анализируем мотивацию пользователя
      const motivationResponse = await analyzeUserMotivation(user.chat_id);
      if (motivationResponse.success) {
        console.log('Новый анализ мотивации:', motivationResponse.data);
      }

      // Обновляем список сообщений
      const messagesResponse = await getMotivationMessages(user.chat_id);
      if (messagesResponse.success) {
        setMessages(messagesResponse.data.messages || []);
      }
    } catch (error) {
      console.error('Error refreshing motivation data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMessageRead = (messageId) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, is_read: true } : msg
    ));
  };

  const filterMessages = (type) => {
    if (type === 'all') return messages;
    if (type === 'unread') return messages.filter(m => !m.is_read);
    return messages.filter(m => m.message_type === type);
  };

  const getMessageTypeLabel = (type) => {
    switch (type) {
      case 'praise': return 'Похвала';
      case 'encouragement': return 'Поддержка';
      case 'challenge': return 'Вызов';
      case 'reminder': return 'Напоминание';
      case 'motivation': return 'Мотивация';
      default: return 'Все';
    }
  };

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'praise': return '🏆';
      case 'encouragement': return '💪';
      case 'challenge': return '🎯';
      case 'reminder': return '⏰';
      case 'motivation': return '🌟';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <LoadingSpinner message="Загружаем мотивационные сообщения..." />
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

  const filteredMessages = filterMessages(activeTab);
  const unreadCount = messages.filter(m => !m.is_read).length;
  const totalCount = messages.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">🧠 Мотивационные сообщения</h1>
          <p className="text-slate-300">Персонализированные сообщения для поддержки вашего обучения</p>
        </div>

        {/* Статистика */}
        <div className="card mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-wine-400">{totalCount}</div>
              <div className="text-xs text-slate-400">Всего сообщений</div>
            </div>
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-orange-400">{unreadCount}</div>
              <div className="text-xs text-slate-400">Непрочитанных</div>
            </div>
            <div className="text-center p-3 bg-slate-700/50 rounded-lg">
              <div className="text-2xl font-bold text-green-400">
                {totalCount > 0 ? Math.round(((totalCount - unreadCount) / totalCount) * 100) : 0}%
              </div>
              <div className="text-xs text-slate-400">Прочитано</div>
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
              📋 Все
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'unread' 
                  ? 'bg-wine-500 text-white' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              ⏰ Непрочитанные
            </button>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {['praise', 'encouragement', 'challenge', 'reminder', 'motivation'].map(type => (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === type 
                    ? 'bg-wine-500 text-white' 
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                }`}
              >
                {getMessageTypeIcon(type)} {getMessageTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        {/* Кнопка обновления */}
        <div className="card mb-6">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full py-3 bg-wine-600 hover:bg-wine-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {refreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Обновляем...
              </>
            ) : (
              <>
                <span className="mr-2">🔄</span>
                Обновить мотивацию
              </>
            )}
          </button>
        </div>

        {/* Список сообщений */}
        <div className="space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {activeTab === 'unread' ? 'Нет непрочитанных сообщений' : 'Нет мотивационных сообщений'}
              </h3>
              <p className="text-slate-400">
                {activeTab === 'unread' 
                  ? 'Все сообщения прочитаны! Продолжайте обучение для получения новых мотивационных сообщений.'
                  : 'Продолжайте обучение для получения персонализированных мотивационных сообщений.'
                }
              </p>
            </div>
          ) : (
            filteredMessages.map(message => (
              <MotivationMessage
                key={message.id}
                message={message}
                onRead={handleMessageRead}
              />
            ))
          )}
        </div>

        {/* Кнопка возврата */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            ← Вернуться на главную
          </button>
        </div>
      </div>
    </div>
  );
} 