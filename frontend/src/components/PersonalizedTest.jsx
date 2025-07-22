import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTelegramUser } from '../utils/telegram';
import { 
  fetchUserDetailedStats, 
  generateAIQuestions, 
  submitAnswer, 
  finishTest,
  getPersonalizedRecommendations 
} from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

export default function PersonalizedTest() {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45); // Больше времени для сложных вопросов
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testCompleted, setTestCompleted] = useState(false);
  const [results, setResults] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [weakAreas, setWeakAreas] = useState([]);
  const [user, setUser] = useState(null);
  
  const navigate = useNavigate();

  // Инициализация персонализированного теста
  useEffect(() => {
    const initPersonalizedTest = async () => {
      try {
        const telegramUser = getTelegramUser();
        setUser(telegramUser);
        
        if (!telegramUser?.chat_id) {
          setError('Необходимо открыть приложение через Telegram');
          setLoading(false);
          return;
        }

        // Получаем детальную статистику пользователя
        const statsResponse = await fetchUserDetailedStats(telegramUser.chat_id);
        if (!statsResponse.success) {
          throw new Error('Не удалось загрузить статистику пользователя');
        }

        setUserStats(statsResponse.data);
        
        // Анализируем слабые места
        const weakAreas = analyzeWeakAreas(statsResponse.data);
        setWeakAreas(weakAreas);
        
        // Генерируем персонализированные вопросы
        await generatePersonalizedQuestions(telegramUser.chat_id, weakAreas);
        
      } catch (error) {
        setError('Ошибка инициализации персонализированного теста');
        console.error('Error initializing personalized test:', error);
      } finally {
        setLoading(false);
      }
    };

    initPersonalizedTest();
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

  const analyzeWeakAreas = (stats) => {
    const weakAreas = [];
    
    // Анализируем статистику по категориям
    if (stats.categoryStats && stats.categoryStats.length > 0) {
      const categoryStats = stats.categoryStats;
      const lowAccuracyCategories = categoryStats
        .filter(cat => cat.accuracy < 70)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 3);
      
      weakAreas.push(...lowAccuracyCategories.map(cat => ({
        type: 'category',
        name: cat.category,
        accuracy: cat.accuracy,
        priority: 'high'
      })));
    }
    
    // Анализируем типы вопросов
    if (stats.questionTypeStats && stats.questionTypeStats.length > 0) {
      const questionStats = stats.questionTypeStats;
      const lowAccuracyTypes = questionStats
        .filter(q => q.accuracy < 70)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 2);
      
      weakAreas.push(...lowAccuracyTypes.map(q => ({
        type: 'questionType',
        name: q.question_type,
        accuracy: q.accuracy,
        priority: 'medium'
      })));
    }
    
    // Если нет слабых мест, добавляем общие области
    if (weakAreas.length === 0) {
      weakAreas.push(
        { type: 'category', name: 'Вина', accuracy: 50, priority: 'medium' },
        { type: 'questionType', name: 'wine_pairing', accuracy: 50, priority: 'medium' }
      );
    }
    
    return weakAreas;
  };

  const generatePersonalizedQuestions = async (chatId, weakAreas) => {
    try {
      setLoading(true);
      
      const generatedQuestions = [];
      const totalQuestions = 10; // Больше вопросов для персонализированного теста
      
      // Генерируем вопросы на основе слабых мест
      for (let i = 0; i < totalQuestions; i++) {
        const weakArea = weakAreas[i % weakAreas.length];
        
        let question;
        if (weakArea.type === 'category') {
          // Генерируем вопрос по слабой категории
          question = await generateCategoryQuestion(weakArea.name, i + 1);
        } else {
          // Генерируем вопрос по слабому типу
          question = await generateTypeQuestion(weakArea.name, i + 1);
        }
        
        if (question) {
          generatedQuestions.push(question);
        }
      }
      
      // Если не удалось сгенерировать достаточно вопросов, добавляем общие
      while (generatedQuestions.length < totalQuestions) {
        const fallbackQuestion = generateFallbackQuestion(generatedQuestions.length + 1);
        generatedQuestions.push(fallbackQuestion);
      }
      
      setQuestions(generatedQuestions);
    } catch (error) {
      console.error('Error generating personalized questions:', error);
      // Fallback - генерируем простые вопросы
      const fallbackQuestions = Array.from({ length: 10 }, (_, i) => 
        generateFallbackQuestion(i + 1)
      );
      setQuestions(fallbackQuestions);
    } finally {
      setLoading(false);
    }
  };

  const generateCategoryQuestion = async (category, questionNumber) => {
    try {
      const response = await generateAIQuestions(user.chat_id, category, 1);
      if (response.success && response.data && response.data.length > 0) {
        const aiQuestion = response.data[0];
        return {
          id: questionNumber,
          question: aiQuestion.question,
          options: aiQuestion.options,
          correct: aiQuestion.correct,
          explanation: aiQuestion.explanation,
          category: category,
          questionType: 'ai_generated',
          difficulty: 'personalized',
          userAnswer: null,
          isCorrect: false,
          timeSpent: 0
        };
      }
    } catch (error) {
      console.error('Error generating category question:', error);
    }
    
    return generateFallbackQuestion(questionNumber, category);
  };

  const generateTypeQuestion = async (questionType, questionNumber) => {
    try {
      const response = await generateAIQuestions(user.chat_id, null, 1);
      if (response.success && response.data && response.data.length > 0) {
        const aiQuestion = response.data[0];
        return {
          id: questionNumber,
          question: aiQuestion.question,
          options: aiQuestion.options,
          correct: aiQuestion.correct,
          explanation: aiQuestion.explanation,
          category: 'Общие',
          questionType: questionType,
          difficulty: 'personalized',
          userAnswer: null,
          isCorrect: false,
          timeSpent: 0
        };
      }
    } catch (error) {
      console.error('Error generating type question:', error);
    }
    
    return generateFallbackQuestion(questionNumber);
  };

  const generateFallbackQuestion = (questionNumber, category = null) => {
    const questionTypes = [
      {
        question: `Какой напиток лучше всего подходит к ${category || 'красному мясу'}?`,
        options: ['Красное вино', 'Белое вино', 'Шампанское', 'Крепкий алкоголь'],
        correct: 0,
        explanation: 'Красное вино традиционно сочетается с красным мясом'
      },
      {
        question: `При какой температуре подается ${category || 'красное вино'}?`,
        options: ['4-6°C', '8-12°C', '16-18°C', '20-22°C'],
        correct: 2,
        explanation: 'Красное вино подается при комнатной температуре'
      },
      {
        question: `В каком бокале подается ${category || 'вино'}?`,
        options: ['В флейте', 'В бокале для вина', 'В стакане', 'В рюмке'],
        correct: 1,
        explanation: 'Вино подается в специальном бокале для вина'
      }
    ];
    
    const selectedType = questionTypes[questionNumber % questionTypes.length];
    
    return {
      id: questionNumber,
      question: selectedType.question,
      options: selectedType.options,
      correct: selectedType.correct,
      explanation: selectedType.explanation,
      category: category || 'Общие',
      questionType: 'fallback',
      difficulty: 'personalized',
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
    const timeBonus = Math.max(0, 45 - timeLeft) * 1.5; // Бонус за скорость
    const questionScore = isCorrect ? 25 + timeBonus : 0; // Больше очков за персонализированные вопросы
    
    // Обновляем вопрос
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex] = {
      ...currentQuestion,
      userAnswer: answerIndex,
      isCorrect: isCorrect,
      timeSpent: 45 - timeLeft
    };
    setQuestions(updatedQuestions);
    
    setScore(prev => prev + questionScore);

    // Отправляем ответ в backend
    try {
      await submitAnswer(user.chat_id, {
        answer: answerIndex,
        isCorrect: isCorrect,
        timeSpent: 45 - timeLeft,
        questionData: currentQuestion
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const handleTimeout = () => {
    if (!isAnswered) {
      handleAnswerSelect(-1); // -1 означает "время истекло"
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimeLeft(45);
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
      weakAreas: weakAreas,
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
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setTimeLeft(45);
    setTestCompleted(false);
    setResults(null);
    if (user?.chat_id && weakAreas.length > 0) {
      generatePersonalizedQuestions(user.chat_id, weakAreas);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <LoadingSpinner message="Анализируем ваши слабые места и генерируем персонализированные вопросы..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <ErrorMessage 
          message={error} 
          onRetry={() => user?.chat_id && generatePersonalizedQuestions(user.chat_id, weakAreas)} 
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
            <h1 className="text-2xl font-bold mb-2">🧠 Результаты персонализированного теста</h1>
            <p className="text-slate-300">Тест на основе ваших слабых мест завершен!</p>
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

            {/* Анализ слабых мест */}
            {weakAreas.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">📊 Анализ слабых мест</h3>
                <div className="space-y-2">
                  {weakAreas.map((area, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-slate-700/30 rounded">
                      <span className="text-sm text-slate-300">
                        {area.type === 'category' ? 'Категория' : 'Тип вопроса'}: {area.name}
                      </span>
                      <span className="text-sm text-slate-400">
                        Точность: {area.accuracy}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    <span className="text-xs text-slate-500">[{question.category}]</span>
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
              🔄 Пройти еще раз
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

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">🧠 Персонализированный тест</h1>
          <p className="text-slate-300 mb-6">Не удалось загрузить вопросы</p>
          <button onClick={() => user?.chat_id && generatePersonalizedQuestions(user.chat_id, weakAreas)} className="btn-primary">
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
          <h1 className="text-2xl font-bold mb-2">🧠 Персонализированный тест</h1>
          <p className="text-slate-300">Вопрос {currentQuestionIndex + 1} из {questions.length}</p>
          <p className="text-sm text-slate-400">Вопросы адаптированы под ваши слабые места</p>
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
              <div className={`text-lg font-bold ${timeLeft <= 15 ? 'text-red-400' : 'text-wine-400'}`}>
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
              {currentQuestion.category}
            </span>
            <span className="text-xs bg-wine-900/50 px-2 py-1 rounded text-wine-300">
              Персонализированный
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
              Счет за вопрос: {currentQuestion.isCorrect ? 25 + Math.max(0, 45 - currentQuestion.timeSpent) * 1.5 : 0}
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