import React, { useState, useEffect, useRef } from 'react';
import { fetchDrinks, askAI } from '../utils/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function Drinks() {
  const [drinks, setDrinks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredDrinks, setFilteredDrinks] = useState([]);
  
  // Состояние для модального окна напитка
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [showDrinkModal, setShowDrinkModal] = useState(false);
  
  // Состояние для ИИ-чата
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);

  // Состояние для управления отображением всех категорий
  const [showAllCategories, setShowAllCategories] = useState(false);
  const drinksListRef = useRef(null);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadDrinks();
  }, []);

  // Фильтрация напитков при изменении поиска или категории
  useEffect(() => {
    let filtered = drinks;

    // Фильтр по категории
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(drink => drink.category === selectedCategory);
    }

    // Фильтр по поиску
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(drink => 
        drink.name.toLowerCase().includes(query)
      );
    }

    setFilteredDrinks(filtered);
  }, [drinks, selectedCategory, searchQuery]);

  const loadDrinks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchDrinks();
      
      if (response.success) {
        setDrinks(response.data.drinks || []);
        setCategories(response.data.categories || []);
      } else {
        throw new Error(response.message || 'Ошибка загрузки данных');
      }
    } catch (err) {
      console.error('Error loading drinks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
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

  const getDrinkDetails = (drink) => {
    const details = [];
    
    if (drink.alcohol) {
      details.push(`${drink.alcohol}%`);
    }
    if (drink.country) {
      details.push(drink.country);
    }
    if (drink.sugar) {
      details.push(`Сахар: ${drink.sugar}`);
    }
    if (drink.type) {
      details.push(drink.type);
    }
    
    return details.join(' • ');
  };

  const getCategoryCount = (category) => {
    if (category === 'all') {
      return drinks.length;
    }
    return drinks.filter(drink => drink.category === category).length;
  };

  // Функция для получения информации о напитке для модального окна
  const getDrinkInfo = (drink) => {
    if (!drink) return [];
    return [
      drink.description && { label: 'Описание', value: getShortDescription(drink.description) },
      drink.alcohol && { label: 'Крепость', value: drink.alcohol + '%' },
      drink.country && { label: 'Страна', value: drink.country },
      drink.sugar && { label: 'Сахар', value: drink.sugar },
      drink.type && { label: 'Тип', value: drink.type },
    ].filter(Boolean);
  };

  // Функции для работы с модальным окном
  const openDrinkModal = (drink) => {
    setSelectedDrink(drink);
    setShowDrinkModal(true);
    setChatHistory([]);
    setAiResponse('');
    setAiError(null);
  };

  const closeDrinkModal = () => {
    setShowDrinkModal(false);
    setSelectedDrink(null);
    setAiQuestion('');
    setAiResponse('');
    setChatHistory([]);
    setAiError(null);
  };

  // Функция для получения краткого описания (только первая строка или до первой точки)
  const getShortDescription = (desc) => {
    if (!desc) return '';
    const dotIdx = desc.indexOf('.');
    if (dotIdx > 0) return desc.slice(0, dotIdx + 1);
    return desc.split(/[\n\r]/)[0];
  };

  // Функция для форматирования состава (каждый ингредиент с новой строки)
  const formatIngredients = (ingredients) => {
    if (!ingredients) return '';
    return ingredients
      .split(/, ?/)
      .map((item, idx) => <div key={idx}>• {item.trim()}</div>);
  };

  // Функция для отправки вопроса ИИ
  const handleAskAI = async () => {
    if (!aiQuestion.trim() || !selectedDrink) return;

    try {
      setAiLoading(true);
      setAiError(null);

      // Добавляем вопрос в историю
      const newQuestion = {
        id: Date.now(),
        type: 'question',
        content: aiQuestion,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, newQuestion]);

      // Получаем chatId из Telegram WebApp
      const chatId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

      // Формируем контекст пользователя
      const userContext = {
        difficulty: 'beginner',
        preferences: [selectedDrink.category],
        previousQuestions: chatHistory
          .filter(msg => msg.type === 'question')
          .slice(-3)
          .map(msg => msg.content)
      };

      const response = await askAI(
        aiQuestion, 
        selectedDrink.id, 
        chatId, 
        userContext
      );

      if (response.success) {
        const newAnswer = {
          id: Date.now() + 1,
          type: 'answer',
          content: response.data.answer,
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => [...prev, newAnswer]);
        setAiResponse(response.data.answer);
      } else {
        throw new Error(response.message || 'Ошибка получения ответа');
      }
    } catch (err) {
      console.error('Error asking AI:', err);
      setAiError(err.message);
      
      // Добавляем сообщение об ошибке в историю
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Извините, произошла ошибка при получении ответа. Попробуйте еще раз.',
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setAiLoading(false);
      setAiQuestion('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskAI();
    }
  };

  // При выборе категории — показываем только выбранную и кнопку "Показать все"
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowAllCategories(false);
    // Автоскролл к списку напитков
    setTimeout(() => {
      drinksListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-wine-600 to-wine-800 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl">🍷</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">База напитков</h2>
          <p className="text-slate-300">Загрузка данных...</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-wine-600 to-wine-800 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl">🍷</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">База напитков</h2>
          <p className="text-slate-300">Ошибка загрузки</p>
        </div>
        <ErrorMessage message={error} onRetry={loadDrinks} />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-md mx-auto p-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-wine-600 to-wine-800 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl">🍷</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">База напитков</h2>
          <p className="text-slate-300">
            {filteredDrinks.length} из {drinks.length} напитков
          </p>
        </div>

        {/* Поиск */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Поиск по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Категории */}
        <div className="mb-6">
          <div className="text-sm font-medium text-slate-300 mb-3">Категории:</div>
          <div className="flex flex-wrap gap-2">
            {showAllCategories ? (
              // Показываем все категории
              [
                <button
                  key="all"
                  onClick={() => handleCategorySelect('all')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium border transition-all ${selectedCategory === 'all' ? 'bg-wine-600/20 border-wine-500/50 text-wine-400' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-300'}`}
                >
                  🍷 Все
                  <span className="text-xs text-slate-400">{getCategoryCount('all')}</span>
                </button>,
                ...categories.map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategorySelect(category)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium border transition-all ${selectedCategory === category ? 'bg-wine-600/20 border-wine-500/50 text-wine-400' : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 text-slate-300'}`}
                  >
                    {getCategoryIcon(category)} {category}
                    <span className="text-xs text-slate-400">{getCategoryCount(category)}</span>
                  </button>
                )),
                <button
                  key="hide"
                  onClick={() => setShowAllCategories(false)}
                  className="ml-2 px-3 py-1 rounded-md text-xs font-medium border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:bg-slate-700/50"
                >
                  Скрыть категории
                </button>
              ]
            ) : (
              // Показываем только выбранную категорию и кнопку "Показать все"
              [
                <button
                  key={selectedCategory}
                  onClick={() => handleCategorySelect(selectedCategory)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium border bg-wine-600/20 border-wine-500/50 text-wine-400`}
                >
                  {getCategoryIcon(selectedCategory)} {selectedCategory === 'all' ? 'Все' : selectedCategory}
                  <span className="text-xs text-slate-400">{getCategoryCount(selectedCategory)}</span>
                </button>,
                <button
                  key="show"
                  onClick={() => setShowAllCategories(true)}
                  className="ml-2 px-3 py-1 rounded-md text-xs font-medium border border-slate-700/50 bg-slate-800/50 text-slate-400 hover:bg-slate-700/50"
                >
                  Показать все категории
                </button>
              ]
            )}
          </div>
        </div>

        {/* Список напитков */}
        <div ref={drinksListRef} className="space-y-3">
          {filteredDrinks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🍷</div>
              <div className="text-slate-300 mb-2">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'Напитки не найдены' 
                  : 'Нет доступных напитков'
                }
              </div>
              <div className="text-sm text-slate-400">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'Попробуйте изменить поиск или категорию' 
                  : 'Попробуйте обновить страницу'
                }
              </div>
            </div>
          ) : (
            filteredDrinks.slice(0, 20).map(drink => (
              <button
                key={drink.id} 
                onClick={() => openDrinkModal(drink)}
                className="w-full flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all text-left"
              >
                <div className="w-12 h-12 bg-wine-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">{getCategoryIcon(drink.category)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{drink.name}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {getDrinkDetails(drink)}
                  </div>
                  {drink.category && (
                    <div className="text-xs text-wine-400 mt-1">{drink.category}</div>
                  )}
                </div>
                <div className="text-slate-400 text-sm">→</div>
              </button>
            ))
          )}
          
          {filteredDrinks.length > 20 && (
            <div className="text-center py-4">
              <div className="text-sm text-slate-400">
                Показано 20 из {filteredDrinks.length} напитков
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно напитка */}
      {showDrinkModal && selectedDrink && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getCategoryIcon(selectedDrink.category)}</span>
                <div>
                  <h3 className="font-bold text-lg">{selectedDrink.name}</h3>
                  <p className="text-sm text-slate-400">{selectedDrink.category}</p>
                </div>
              </div>
              <button 
                onClick={closeDrinkModal}
                className="text-slate-400 hover:text-slate-300 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Контент */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Информация о напитке */}
              <div className="p-4 border-b border-slate-700">
                <h4 className="font-semibold mb-3 text-wine-400">📋 Информация</h4>
                <div className="space-y-2">
                  {getDrinkInfo(selectedDrink).map((info, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-sm text-slate-400">{info.label}:</span>
                      <span className="text-sm font-medium whitespace-pre-line">{info.value}</span>
                    </div>
                  ))}
                  {selectedDrink.method && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Метод:</span>
                      <span className="text-sm font-medium whitespace-pre-line">{selectedDrink.method}</span>
                    </div>
                  )}
                  {selectedDrink.glassware && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Посуда:</span>
                      <span className="text-sm font-medium whitespace-pre-line">{selectedDrink.glassware}</span>
                    </div>
                  )}
                  {selectedDrink.ice && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-400">Лед:</span>
                      <span className="text-sm font-medium whitespace-pre-line">{selectedDrink.ice}</span>
                    </div>
                  )}
                  {selectedDrink.ingredients && (
                    <div className="flex items-start gap-2">
                      <span className="text-sm text-slate-400 min-w-[70px]">Состав:</span>
                      <span className="text-sm font-medium whitespace-pre-line">{formatIngredients(selectedDrink.ingredients)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ИИ-чат */}
              <div className="p-4">
                <h4 className="font-semibold mb-3 text-wine-400">🤖 Спросить ИИ</h4>
                
                {/* История чата */}
                <div className="mb-4 max-h-40 overflow-y-auto space-y-2">
                  {chatHistory.map(message => (
                    <div 
                      key={message.id}
                      className={`flex ${message.type === 'question' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] p-2 rounded-lg text-sm ${
                          message.type === 'question' 
                            ? 'bg-wine-600/20 border border-wine-500/50' 
                            : message.type === 'error'
                            ? 'bg-red-600/20 border border-red-500/50'
                            : 'bg-slate-800/50 border border-slate-700/50'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </div>
                  ))}
                  
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2">
                        <LoadingSpinner size="sm" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Форма вопроса */}
                <div className="space-y-3">
                  <textarea
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Задайте вопрос о ${selectedDrink.name}...`}
                    className="w-full bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent resize-none text-sm"
                    rows="2"
                    disabled={aiLoading}
                  />
                  
                  <button
                    onClick={handleAskAI}
                    disabled={!aiQuestion.trim() || aiLoading}
                    className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-sm py-2"
                  >
                    {aiLoading ? (
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

                {aiError && (
                  <div className="mt-3">
                    <ErrorMessage message={aiError} onRetry={() => setAiError(null)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 