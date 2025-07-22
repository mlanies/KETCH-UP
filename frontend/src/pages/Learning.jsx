import React, { useState, useEffect } from 'react';
import { askAI } from '../utils/api.js';
import { fetchDrinks } from '../utils/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function Learning() {
  const [activeTab, setActiveTab] = useState('menu'); // menu, ai-chat
  const [question, setQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [drinks, setDrinks] = useState([]);
  const [showDrinkSelector, setShowDrinkSelector] = useState(false);

  // Загрузка списка напитков для контекста
  useEffect(() => {
    if (activeTab === 'ai-chat') {
      loadDrinks();
    }
  }, [activeTab]);

  const loadDrinks = async () => {
    try {
      const response = await fetchDrinks();
      if (response.success) {
        setDrinks(response.data.drinks || []);
      }
    } catch (err) {
      console.error('Error loading drinks for AI context:', err);
    }
  };

  const handleAskAI = async () => {
    if (!question.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      // Добавляем вопрос в историю
      const newQuestion = {
        id: Date.now(),
        type: 'question',
        content: question,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, newQuestion]);

      // Получаем chatId из Telegram WebApp
      const chatId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

      // Формируем контекст пользователя
      const userContext = {
        difficulty: 'beginner', // Можно получать из профиля пользователя
        preferences: selectedDrink ? [selectedDrink.category] : [],
        previousQuestions: chatHistory
          .filter(msg => msg.type === 'question')
          .slice(-3)
          .map(msg => msg.content)
      };

      const response = await askAI(
        question, 
        selectedDrink?.id, 
        chatId, 
        userContext
      );

      if (response.success) {
        const newAnswer = {
          id: Date.now() + 1,
          type: 'answer',
          content: response.data.answer,
          timestamp: new Date().toISOString(),
          drinkContext: selectedDrink ? selectedDrink.name : null
        };
        setChatHistory(prev => [...prev, newAnswer]);
        setAiResponse(response.data.answer);
      } else {
        throw new Error(response.message || 'Ошибка получения ответа');
      }
    } catch (err) {
      console.error('Error asking AI:', err);
      setError(err.message);
      
      // Добавляем сообщение об ошибке в историю
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Извините, произошла ошибка при получении ответа. Попробуйте еще раз.',
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setQuestion('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskAI();
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    setAiResponse('');
    setSelectedDrink(null);
  };

  const getDrinkIcon = (category) => {
    const icons = {
      'Вина': '🍷',
      'Виски': '🥃',
      'Коктейли': '🍸',
      'Пиво': '🍺',
      'Ром, Текила': '🥃',
      'Джин, Водка, Ликеры': '🍸',
      'Граппа, Порто, Коньяк, Вермут': '🥃',
      'Лимонады и Милкшейки': '🥤',
      'Чай': '🍵',
      'Кофе': '☕',
      'Премиксы': '🧃',
      'ПФ': '🥤',
      'Микс дринк': '🍹',
      'нет в меню': '🍷'
    };
    return icons[category] || '🍷';
  };

  if (activeTab === 'ai-chat') {
    return (
      <div className="max-w-md mx-auto p-6">
        {/* Заголовок с кнопкой назад */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => setActiveTab('menu')}
            className="flex items-center gap-2 text-wine-400 hover:text-wine-300"
          >
            <span>←</span>
            <span>Назад</span>
          </button>
          <h2 className="text-xl font-bold">ИИ-консультант</h2>
          <button 
            onClick={clearChat}
            className="text-slate-400 hover:text-slate-300 text-sm"
          >
            Очистить
          </button>
        </div>

        {/* Выбор контекста напитка */}
        <div className="mb-4">
          <div className="text-sm font-medium text-slate-300 mb-2">
            Контекст напитка (опционально):
          </div>
          {selectedDrink ? (
            <div className="flex items-center gap-3 p-3 bg-wine-600/20 border border-wine-500/50 rounded-lg">
              <span className="text-xl">{getDrinkIcon(selectedDrink.category)}</span>
              <div className="flex-1">
                <div className="font-medium text-sm">{selectedDrink.name}</div>
                <div className="text-xs text-slate-400">{selectedDrink.category}</div>
              </div>
              <button 
                onClick={() => setSelectedDrink(null)}
                className="text-slate-400 hover:text-slate-300"
              >
                ✕
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowDrinkSelector(!showDrinkSelector)}
              className="w-full p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all text-left"
            >
              <div className="text-slate-400 text-sm">
                {showDrinkSelector ? 'Скрыть список' : 'Выбрать напиток для контекста'}
              </div>
            </button>
          )}
        </div>

        {/* Список напитков для выбора */}
        {showDrinkSelector && (
          <div className="mb-4 max-h-40 overflow-y-auto">
            <div className="text-sm font-medium text-slate-300 mb-2">Выберите напиток:</div>
            <div className="space-y-2">
              {drinks.slice(0, 10).map(drink => (
                <button
                  key={drink.id}
                  onClick={() => {
                    setSelectedDrink(drink);
                    setShowDrinkSelector(false);
                  }}
                  className="w-full flex items-center gap-3 p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all text-left"
                >
                  <span className="text-lg">{getDrinkIcon(drink.category)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{drink.name}</div>
                    <div className="text-xs text-slate-400 truncate">{drink.category}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* История чата */}
        <div className="mb-4 max-h-60 overflow-y-auto space-y-3">
          {chatHistory.map(message => (
            <div 
              key={message.id}
              className={`flex ${message.type === 'question' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.type === 'question' 
                    ? 'bg-wine-600/20 border border-wine-500/50' 
                    : message.type === 'error'
                    ? 'bg-red-600/20 border border-red-500/50'
                    : 'bg-slate-800/50 border border-slate-700/50'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                {message.drinkContext && (
                  <div className="text-xs text-wine-400 mt-1">
                    Контекст: {message.drinkContext}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                <LoadingSpinner size="sm" />
              </div>
            </div>
          )}
        </div>

        {/* Форма вопроса */}
        <div className="space-y-3">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Задайте вопрос о напитках, их подаче, приготовлении..."
            className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent resize-none"
            rows="3"
            disabled={isLoading}
          />
          
          <button
            onClick={handleAskAI}
            disabled={!question.trim() || isLoading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Получение ответа...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>🤖</span>
                <span>Спросить ИИ</span>
              </div>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorMessage message={error} onRetry={() => setError(null)} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-wine-600 to-wine-800 rounded-2xl mb-4 shadow-lg">
          <span className="text-2xl">🎓</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Обучение</h2>
        <p className="text-slate-300">Выберите режим обучения</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button className="btn-primary flex flex-col items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="text-sm">Быстрый тест</span>
          <span className="text-xs text-slate-300">5 вопросов</span>
        </button>
        
        <button className="btn-secondary flex flex-col items-center gap-2">
          <span className="text-xl">📚</span>
          <span className="text-sm">Уроки</span>
          <span className="text-xs text-slate-300">По категориям</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('ai-chat')}
          className="btn-secondary flex flex-col items-center gap-2"
        >
          <span className="text-xl">🤖</span>
          <span className="text-sm">ИИ-консультант</span>
          <span className="text-xs text-slate-300">Задайте вопрос</span>
        </button>
        
        <button className="btn-secondary flex flex-col items-center gap-2">
          <span className="text-xl">🎯</span>
          <span className="text-sm">Тест</span>
          <span className="text-xs text-slate-300">По слабостям</span>
        </button>
      </div>

      <div className="card mt-6">
        <div className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>Прогресс обучения</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
            <div>
              <div className="font-medium text-sm">Вина</div>
              <div className="text-xs text-slate-400">Изучено: 8 из 15</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-wine-400">53%</div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
            <div>
              <div className="font-medium text-sm">Крепкий алкоголь</div>
              <div className="text-xs text-slate-400">Изучено: 12 из 20</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-wine-400">60%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 