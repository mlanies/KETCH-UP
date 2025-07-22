import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTelegramUser } from '../utils/telegram';
import { 
  fetchCategories, 
  fetchWineDataForTesting, 
  submitAnswer, 
  finishTest 
} from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

export default function CategoryTest() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testCompleted, setTestCompleted] = useState(false);
  const [results, setResults] = useState(null);
  const [user, setUser] = useState(null);
  const [wineData, setWineData] = useState([]);
  
  const navigate = useNavigate();

  // Инициализация
  useEffect(() => {
    const initCategoryTest = async () => {
      try {
        const telegramUser = getTelegramUser();
        setUser(telegramUser);
        
        if (!telegramUser?.chat_id) {
          setError('Необходимо открыть приложение через Telegram');
          setLoading(false);
          return;
        }

        // Загружаем категории и данные о напитках
        const [categoriesResponse, wineDataResponse] = await Promise.all([
          fetchCategories(),
          fetchWineDataForTesting()
        ]);

        if (categoriesResponse.success) {
          setCategories(categoriesResponse.data || []);
        }

        if (wineDataResponse.success) {
          setWineData(wineDataResponse.data || []);
        }

      } catch (error) {
        setError('Ошибка загрузки данных');
        console.error('Error initializing category test:', error);
      } finally {
        setLoading(false);
      }
    };

    initCategoryTest();
  }, []);

  // Таймер для каждого вопроса
  useEffect(() => {
    if (questions.length > 0 && !isAnswered && !testCompleted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [questions, isAnswered, testCompleted]);

  const startCategoryTest = async (category) => {
    try {
      setLoading(true);
      setSelectedCategory(category);
      
      // Фильтруем напитки по выбранной категории
      const categoryWines = wineData.filter(wine => wine.category === category);
      
      if (categoryWines.length === 0) {
        throw new Error(`Нет данных для категории "${category}"`);
      }

      // Генерируем вопросы для выбранной категории
      const generatedQuestions = generateCategoryQuestions(categoryWines, category);
      setQuestions(generatedQuestions);
      
      // Сбрасываем состояние теста
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setTimeLeft(40);
      setTestCompleted(false);
      setResults(null);
      
    } catch (error) {
      setError(`Ошибка запуска теста по категории "${category}"`);
      console.error('Error starting category test:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCategoryQuestions = (wines, category) => {
    const questions = [];
    const totalQuestions = 12; // Больше вопросов для категорийного теста
    
    // Специализированные вопросы для разных категорий
    const categorySpecificQuestions = {
      'Вина': generateWineQuestions,
      'Крепкие напитки': generateSpiritsQuestions,
      'Коктейли': generateCocktailQuestions,
      'Пиво': generateBeerQuestions,
      'Шампанское': generateChampagneQuestions,
      'Безалкогольные': generateNonAlcoholicQuestions
    };

    const questionGenerator = categorySpecificQuestions[category] || generateGeneralQuestions;
    
    for (let i = 0; i < totalQuestions; i++) {
      const randomWine = wines[Math.floor(Math.random() * wines.length)];
      const question = questionGenerator(randomWine, i + 1, category);
      questions.push(question);
    }

    return questions;
  };

  const generateWineQuestions = (wine, questionNumber, category) => {
    const questionTypes = [
      {
        question: `С какими блюдами лучше всего сочетается ${wine.name}?`,
        options: [
          'С красным мясом и пастой',
          'С морепродуктами и рыбой',
          'С десертами и сладостями',
          'С острыми блюдами'
        ],
        correct: wine.sugar === 'Сухое' ? 0 : 2,
        explanation: 'Выбор зависит от типа вина и его характеристик'
      },
      {
        question: `При какой температуре подается ${wine.name}?`,
        options: [
          '4-6°C',
          '8-12°C',
          '16-18°C',
          '20-22°C'
        ],
        correct: wine.sugar === 'Сухое' ? 2 : 1,
        explanation: 'Температура подачи зависит от типа вина'
      },
      {
        question: `В каком бокале подается ${wine.name}?`,
        options: [
          'В бокале для красного вина',
          'В бокале для белого вина',
          'В флейте',
          'В стакане для виски'
        ],
        correct: wine.color === 'Красное' ? 0 : 1,
        explanation: 'Выбор бокала зависит от цвета вина'
      },
      {
        question: `Какой регион известен производством ${wine.name}?`,
        options: [
          wine.country || 'Италия',
          'Франция',
          'Испания',
          'Германия'
        ],
        correct: 0,
        explanation: 'Регион указан в данных о вине'
      }
    ];

    const selectedType = questionTypes[questionNumber % questionTypes.length];
    
    return {
      id: questionNumber,
      question: selectedType.question,
      options: selectedType.options,
      correct: selectedType.correct,
      explanation: selectedType.explanation,
      wineId: wine.id,
      wineName: wine.name,
      category: category,
      questionType: 'wine_specific',
      difficulty: 'intermediate',
      userAnswer: null,
      isCorrect: false,
      timeSpent: 0
    };
  };

  const generateSpiritsQuestions = (wine, questionNumber, category) => {
    const questionTypes = [
      {
        question: `Какой крепости обычно бывает ${wine.name}?`,
        options: [
          '35-40%',
          '40-45%',
          '45-50%',
          '50-55%'
        ],
        correct: wine.alcohol ? (wine.alcohol.includes('40') ? 1 : 0) : 1,
        explanation: 'Крепость зависит от типа крепкого напитка'
      },
      {
        question: `Как правильно подавать ${wine.name}?`,
        options: [
          'Со льдом',
          'Без льда, комнатной температуры',
          'Подогретым',
          'С водой'
        ],
        correct: 1,
        explanation: 'Крепкие напитки обычно подаются комнатной температуры'
      },
      {
        question: `В каком стакане подается ${wine.name}?`,
        options: [
          'В рюмке',
          'В стакане для виски',
          'В бокале для вина',
          'В флейте'
        ],
        correct: 1,
        explanation: 'Крепкие напитки подаются в специальных стаканах'
      }
    ];

    const selectedType = questionTypes[questionNumber % questionTypes.length];
    
    return {
      id: questionNumber,
      question: selectedType.question,
      options: selectedType.options,
      correct: selectedType.correct,
      explanation: selectedType.explanation,
      wineId: wine.id,
      wineName: wine.name,
      category: category,
      questionType: 'spirits_specific',
      difficulty: 'intermediate',
      userAnswer: null,
      isCorrect: false,
      timeSpent: 0
    };
  };

  const generateCocktailQuestions = (wine, questionNumber, category) => {
    const questionTypes = [
      {
        question: `Какие ингредиенты входят в состав ${wine.name}?`,
        options: [
          wine.ingredients || 'Водка, лимонный сок, сахар',
          'Джин, тоник, лайм',
          'Ром, кола, лайм',
          'Текила, соль, лайм'
        ],
        correct: 0,
        explanation: 'Состав указан в данных о коктейле'
      },
      {
        question: `Какой метод приготовления используется для ${wine.name}?`,
        options: [
          wine.method || 'Взбалтывание',
          'Перемешивание',
          'Слоистое наливание',
          'Настаивание'
        ],
        correct: 0,
        explanation: 'Метод приготовления зависит от типа коктейля'
      },
      {
        question: `В каком бокале подается ${wine.name}?`,
        options: [
          wine.glassware || 'В коктейльном бокале',
          'В стакане для виски',
          'В бокале для вина',
          'В пивном бокале'
        ],
        correct: 0,
        explanation: 'Выбор бокала зависит от типа коктейля'
      }
    ];

    const selectedType = questionTypes[questionNumber % questionTypes.length];
    
    return {
      id: questionNumber,
      question: selectedType.question,
      options: selectedType.options,
      correct: selectedType.correct,
      explanation: selectedType.explanation,
      wineId: wine.id,
      wineName: wine.name,
      category: category,
      questionType: 'cocktail_specific',
      difficulty: 'intermediate',
      userAnswer: null,
      isCorrect: false,
      timeSpent: 0
    };
  };

  const generateBeerQuestions = (wine, questionNumber, category) => {
    const questionTypes = [
      {
        question: `Какой тип пива представляет ${wine.name}?`,
        options: [
          'Светлое лагер',
          'Темное стаут',
          'Пшеничное',
          'IPA'
        ],
        correct: 0,
        explanation: 'Тип пива зависит от сорта и способа приготовления'
      },
      {
        question: `При какой температуре подается ${wine.name}?`,
        options: [
          '4-6°C',
          '8-12°C',
          '16-18°C',
          '20-22°C'
        ],
        correct: 0,
        explanation: 'Пиво подается охлажденным'
      },
      {
        question: `В каком бокале подается ${wine.name}?`,
        options: [
          'В пивном бокале',
          'В стакане для виски',
          'В бокале для вина',
          'В флейте'
        ],
        correct: 0,
        explanation: 'Пиво подается в специальных пивных бокалах'
      }
    ];

    const selectedType = questionTypes[questionNumber % questionTypes.length];
    
    return {
      id: questionNumber,
      question: selectedType.question,
      options: selectedType.options,
      correct: selectedType.correct,
      explanation: selectedType.explanation,
      wineId: wine.id,
      wineName: wine.name,
      category: category,
      questionType: 'beer_specific',
      difficulty: 'intermediate',
      userAnswer: null,
      isCorrect: false,
      timeSpent: 0
    };
  };

  const generateChampagneQuestions = (wine, questionNumber, category) => {
    const questionTypes = [
      {
        question: `Как правильно открывать ${wine.name}?`,
        options: [
          'С громким хлопком',
          'Тихо, без хлопка',
          'С помощью штопора',
          'Разбивая горлышко'
        ],
        correct: 1,
        explanation: 'Шампанское следует открывать тихо и аккуратно'
      },
      {
        question: `При какой температуре подается ${wine.name}?`,
        options: [
          '4-6°C',
          '8-12°C',
          '16-18°C',
          '20-22°C'
        ],
        correct: 0,
        explanation: 'Шампанское подается хорошо охлажденным'
      },
      {
        question: `В каком бокале подается ${wine.name}?`,
        options: [
          'В флейте',
          'В бокале для вина',
          'В стакане для виски',
          'В пивном бокале'
        ],
        correct: 0,
        explanation: 'Шампанское подается в флейтах'
      }
    ];

    const selectedType = questionTypes[questionNumber % questionTypes.length];
    
    return {
      id: questionNumber,
      question: selectedType.question,
      options: selectedType.options,
      correct: selectedType.correct,
      explanation: selectedType.explanation,
      wineId: wine.id,
      wineName: wine.name,
      category: category,
      questionType: 'champagne_specific',
      difficulty: 'intermediate',
      userAnswer: null,
      isCorrect: false,
      timeSpent: 0
    };
  };

  const generateNonAlcoholicQuestions = (wine, questionNumber, category) => {
    const questionTypes = [
      {
        question: `Какой вкус у ${wine.name}?`,
        options: [
          wine.description || 'Освежающий',
          'Сладкий',
          'Горький',
          'Кислый'
        ],
        correct: 0,
        explanation: 'Вкус зависит от состава напитка'
      },
      {
        question: `При какой температуре подается ${wine.name}?`,
        options: [
          '4-6°C',
          '8-12°C',
          '16-18°C',
          '20-22°C'
        ],
        correct: 0,
        explanation: 'Безалкогольные напитки подаются охлажденными'
      },
      {
        question: `В каком бокале подается ${wine.name}?`,
        options: [
          'В высоком стакане',
          'В бокале для вина',
          'В стакане для виски',
          'В флейте'
        ],
        correct: 0,
        explanation: 'Безалкогольные напитки подаются в высоких стаканах'
      }
    ];

    const selectedType = questionTypes[questionNumber % questionTypes.length];
    
    return {
      id: questionNumber,
      question: selectedType.question,
      options: selectedType.options,
      correct: selectedType.correct,
      explanation: selectedType.explanation,
      wineId: wine.id,
      wineName: wine.name,
      category: category,
      questionType: 'non_alcoholic_specific',
      difficulty: 'intermediate',
      userAnswer: null,
      isCorrect: false,
      timeSpent: 0
    };
  };

  const generateGeneralQuestions = (wine, questionNumber, category) => {
    return {
      id: questionNumber,
      question: `Что вы знаете о ${wine.name}?`,
      options: [
        wine.description || 'Классический напиток',
        'Современный коктейль',
        'Традиционный ликер',
        'Экзотический напиток'
      ],
      correct: 0,
      explanation: 'Описание основано на характеристиках напитка',
      wineId: wine.id,
      wineName: wine.name,
      category: category,
      questionType: 'general',
      difficulty: 'intermediate',
      userAnswer: null,
      isCorrect: false,
      timeSpent: 0
    };
  };

  const handleAnswerSelect = async (answerIndex) => {
    if (isAnswered || !user?.chat_id) return;
    
    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correct;
    const timeBonus = Math.max(0, 40 - timeLeft) * 1.5;
    const questionScore = isCorrect ? 22 + timeBonus : 0;
    
    // Обновляем вопрос
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex] = {
      ...currentQuestion,
      userAnswer: answerIndex,
      isCorrect: isCorrect,
      timeSpent: 40 - timeLeft
    };
    setQuestions(updatedQuestions);
    
    setScore(prev => prev + questionScore);

    // Отправляем ответ в backend
    try {
      await submitAnswer(user.chat_id, {
        answer: answerIndex,
        isCorrect: isCorrect,
        timeSpent: 40 - timeLeft,
        questionData: currentQuestion
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const handleTimeout = () => {
    if (!isAnswered) {
      handleAnswerSelect(-1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimeLeft(40);
    } else {
      finishTestSession();
    }
  };

  const finishTestSession = async () => {
    if (!user?.chat_id) return;

    const accuracy = Math.round((questions.filter(q => q.isCorrect).length / questions.length) * 100);
    const totalTime = questions.reduce((sum, q) => sum + q.timeSpent, 0);
    const averageTime = Math.round(totalTime / questions.length);
    
    const testResults = {
      totalQuestions: questions.length,
      correctAnswers: questions.filter(q => q.isCorrect).length,
      accuracy: accuracy,
      score: score,
      totalTime: totalTime,
      averageTime: averageTime,
      questions: questions,
      category: selectedCategory,
      completedAt: new Date().toISOString()
    };
    
    setResults(testResults);
    setTestCompleted(true);
    
    // Сохраняем результаты в backend
    try {
      await finishTest(user.chat_id, testResults);
    } catch (error) {
      console.error('Error saving test results:', error);
    }
  };

  const restartTest = () => {
    setSelectedCategory(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setTimeLeft(40);
    setTestCompleted(false);
    setResults(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <LoadingSpinner message={selectedCategory ? "Генерируем вопросы..." : "Загружаем категории..."} />
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

  if (testCompleted && results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">📚 Результаты теста по категории</h1>
            <p className="text-slate-300">Тест по категории "{selectedCategory}" завершен!</p>
          </div>

          {/* Результаты */}
          <div className="card mb-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-3xl font-bold text-wine-400">{results.score}</div>
                <div className="text-sm text-slate-400">Общий счет</div>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-3xl font-bold text-wine-400">{results.accuracy}%</div>
                <div className="text-sm text-slate-400">Точность</div>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-3xl font-bold text-wine-400">{results.correctAnswers}/{results.totalQuestions}</div>
                <div className="text-sm text-slate-400">Правильных ответов</div>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-3xl font-bold text-wine-400">{results.averageTime}с</div>
                <div className="text-sm text-slate-400">Среднее время</div>
              </div>
            </div>

            {/* Детали по вопросам */}
            <div className="space-y-3">
              {results.questions.map((question, index) => (
                <div key={index} className={`p-3 rounded-lg ${question.isCorrect ? 'bg-green-900/30 border border-green-500/30' : 'bg-red-900/30 border border-red-500/30'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-lg ${question.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {question.isCorrect ? '✅' : '❌'}
                    </span>
                    <span className="font-medium">Вопрос {index + 1}</span>
                    <span className="text-sm text-slate-400">({question.timeSpent}с)</span>
                  </div>
                  <div className="text-sm text-slate-300 mb-2">{question.question}</div>
                  <div className="text-xs text-slate-400">{question.explanation}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-4">
            <button 
              onClick={restartTest}
              className="btn-primary flex-1"
            >
              🔄 Выбрать другую категорию
            </button>
            <button 
              onClick={() => navigate('/')}
              className="btn-secondary flex-1"
            >
              🏠 На главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Заголовок */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">📚 Тест по категориям</h1>
            <p className="text-slate-300">Выберите категорию напитков для тестирования</p>
          </div>

          {/* Выбор категории */}
          <div className="card">
            <div className="grid grid-cols-2 gap-4">
              {categories.map((category, index) => (
                <button
                  key={index}
                  onClick={() => startCategoryTest(category)}
                  className="p-6 bg-slate-700/30 border border-slate-600/50 rounded-lg hover:bg-slate-600/30 transition-all duration-200 text-center"
                >
                  <div className="text-2xl mb-2">
                    {category === 'Вина' && '🍷'}
                    {category === 'Крепкие напитки' && '🥃'}
                    {category === 'Коктейли' && '🍹'}
                    {category === 'Пиво' && '🍺'}
                    {category === 'Шампанское' && '🍾'}
                    {category === 'Безалкогольные' && '🥤'}
                    {!['Вина', 'Крепкие напитки', 'Коктейли', 'Пиво', 'Шампанское', 'Безалкогольные'].includes(category) && '🍷'}
                  </div>
                  <div className="font-medium text-slate-300">{category}</div>
                  <div className="text-sm text-slate-400 mt-1">12 вопросов</div>
                </button>
              ))}
            </div>
          </div>

          {/* Кнопка возврата */}
          <div className="mt-6">
            <button 
              onClick={() => navigate('/')}
              className="btn-secondary w-full"
            >
              🔙 Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">📚 Тест по категории "{selectedCategory}"</h1>
          <p className="text-slate-300 mb-6">Не удалось загрузить вопросы</p>
          <button onClick={() => startCategoryTest(selectedCategory)} className="btn-primary">
            🔄 Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">📚 Тест по категории "{selectedCategory}"</h1>
          <p className="text-slate-300">Вопрос {currentQuestionIndex + 1} из {questions.length}</p>
        </div>

        {/* Прогресс и таймер */}
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Прогресс:</span>
              <div className="w-32 bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-wine-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-sm text-slate-400">{Math.round(progress)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Время:</span>
              <div className={`text-lg font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-wine-400'}`}>
                {timeLeft}с
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-400">
              Счет: <span className="text-wine-400 font-bold">{score}</span>
            </div>
            <div className="text-sm text-slate-400">
              Правильных: <span className="text-green-400 font-bold">
                {questions.filter(q => q.isCorrect).length}
              </span>
            </div>
          </div>
        </div>

        {/* Вопрос */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
              {selectedCategory}
            </span>
            <span className="text-xs bg-wine-900/50 px-2 py-1 rounded text-wine-300">
              Специализированный
            </span>
          </div>
          
          <div className="text-lg font-medium mb-6">{currentQuestion.question}</div>
          
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={isAnswered}
                className={`w-full p-4 text-left rounded-lg border transition-all duration-200 ${
                  isAnswered
                    ? index === currentQuestion.correct
                      ? 'bg-green-900/30 border-green-500/50 text-green-300'
                      : index === selectedAnswer && index !== currentQuestion.correct
                      ? 'bg-red-900/30 border-red-500/50 text-red-300'
                      : 'bg-slate-700/30 border-slate-600/50 text-slate-400'
                    : selectedAnswer === index
                    ? 'bg-wine-900/30 border-wine-500/50 text-wine-300'
                    : 'bg-slate-700/30 border-slate-600/50 text-slate-300 hover:bg-slate-600/30'
                }`}
              >
                <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Объяснение */}
        {isAnswered && (
          <div className="card mb-6">
            <div className="text-lg font-medium mb-3">
              {currentQuestion.isCorrect ? '✅ Правильно!' : '❌ Неправильно'}
            </div>
            <div className="text-slate-300 mb-4">{currentQuestion.explanation}</div>
            <div className="text-sm text-slate-400">
              Время ответа: {currentQuestion.timeSpent}с | 
              Счет за вопрос: {currentQuestion.isCorrect ? 22 + Math.max(0, 40 - currentQuestion.timeSpent) * 1.5 : 0}
            </div>
          </div>
        )}

        {/* Кнопка продолжения */}
        {isAnswered && (
          <div className="flex gap-4">
            <button 
              onClick={handleNextQuestion}
              className="btn-primary flex-1"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Следующий вопрос' : 'Завершить тест'}
            </button>
            <button 
              onClick={() => navigate('/')}
              className="btn-secondary"
            >
              Отменить
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 