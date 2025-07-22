import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTelegramUser } from '../utils/telegram';
import { 
  startQuickTest, 
  getTestQuestion,
  submitTestAnswer,
  fetchWineDataForTesting,
  addUserExperience,
  logUserAction,
  checkAchievements
} from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

export default function QuickTest() {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testCompleted, setTestCompleted] = useState(false);
  const [results, setResults] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [user, setUser] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions] = useState(5);
  
  const navigate = useNavigate();

  // Инициализация пользователя и теста
  useEffect(() => {
    const initTest = async () => {
      try {
        const telegramUser = getTelegramUser();
        setUser(telegramUser);
        
        if (!telegramUser?.chat_id) {
          setError('Необходимо открыть приложение через Telegram');
          setLoading(false);
          return;
        }

        // Начинаем тест через backend
        const testResponse = await startQuickTest(telegramUser.chat_id);
        if (testResponse.success) {
          setSessionId(testResponse.data.sessionId);
          await loadNextQuestion();
        } else {
          setError('Ошибка запуска теста');
        }
      } catch (error) {
        setError('Ошибка инициализации теста');
        console.error('Error initializing test:', error);
      } finally {
        setLoading(false);
      }
    };

    initTest();
  }, []);

  // Загрузка следующего вопроса
  const loadNextQuestion = async () => {
    try {
      if (!sessionId) return;
      
      const questionResponse = await getTestQuestion(sessionId);
      if (questionResponse.success) {
        setCurrentQuestion(questionResponse.data.question);
        setQuestionNumber(prev => prev + 1);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setTimeLeft(30);
      } else {
        setError('Ошибка загрузки вопроса');
      }
    } catch (error) {
      setError('Ошибка загрузки вопроса');
      console.error('Error loading question:', error);
    }
  };

  // Таймер для каждого вопроса
  useEffect(() => {
    if (currentQuestion && !isAnswered && !testCompleted) {
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
  }, [currentQuestion, isAnswered, testCompleted]);

  const handleAnswerSelect = async (answer) => {
    if (isAnswered || !sessionId || !currentQuestion) return;
    
    setSelectedAnswer(answer);
    setIsAnswered(true);
    
    const isCorrect = answer === currentQuestion.correctAnswer;
    const timeBonus = Math.max(0, 30 - timeLeft) * 2; // Бонус за скорость
    const questionScore = isCorrect ? 20 + timeBonus : 0;
    
    setScore(prev => prev + questionScore);
    
    // Отправляем ответ на backend
    try {
      await submitTestAnswer(
        sessionId, 
        currentQuestion.id, 
        answer, 
        isCorrect
      );

      // Добавляем опыт за правильный ответ
      if (user?.chat_id && isCorrect) {
        const responseTime = 30 - timeLeft;
        await addUserExperience(user.chat_id, 'correct_answer', {
          responseTime: responseTime,
          questionType: currentQuestion.category
        });

        // Логируем быстрый ответ
        if (responseTime < 10) {
          await logUserAction(
            user.chat_id,
            'fast_answer',
            `Быстрый ответ: ${responseTime} сек`,
            0,
            2
          );
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
    
    // Обновляем вопрос с результатом
    setCurrentQuestion(prev => ({
      ...prev,
      userAnswer: answer,
      isCorrect: isCorrect,
      timeSpent: 30 - timeLeft
    }));
  };

  const handleTimeout = () => {
    if (!isAnswered && currentQuestion) {
      handleAnswerSelect(null); // null означает таймаут
    }
  };

  const handleNextQuestion = () => {
    if (questionNumber >= totalQuestions) {
      finishTestSession();
    } else {
      loadNextQuestion();
    }
  };

  const finishTestSession = async () => {
    setTestCompleted(true);
    const accuracy = Math.round((score / (totalQuestions * 20)) * 100);
    const timeSpent = (totalQuestions * 30) - timeLeft;
    
    setResults({
      score,
      totalQuestions,
      accuracy,
      timeSpent
    });

    // Добавляем опыт и проверяем достижения
    if (user?.chat_id) {
      try {
        // Добавляем опыт за завершение теста
        const experienceResult = await addUserExperience(user.chat_id, 'test_completed', {
          questionsCount: totalQuestions,
          accuracy: accuracy,
          timeSpent: timeSpent
        });

        // Логируем действие
        await logUserAction(
          user.chat_id, 
          'test_completed', 
          `Завершен быстрый тест: ${accuracy}% точность, ${score} очков`,
          score,
          experienceResult.data?.experienceGained || 0
        );

        // Проверяем достижения
        const achievementsResult = await checkAchievements(user.chat_id, {
          totalQuestions: totalQuestions,
          accuracy: accuracy,
          score: score,
          timeSpent: timeSpent
        });

        // Показываем уведомления о новых достижениях
        if (achievementsResult.success && achievementsResult.data.newAchievements.length > 0) {
          const newAchievements = achievementsResult.data.newAchievements;
          setTimeout(() => {
            alert(`🎉 Новые достижения!\n\n${newAchievements.map(a => `${a.icon} ${a.name}`).join('\n')}`);
          }, 1000);
        }

        // Показываем уведомление о повышении уровня
        if (experienceResult.data?.levelUp) {
          setTimeout(() => {
            alert(`🎊 Поздравляем! Вы достигли уровня ${experienceResult.data.newLevel.level} - ${experienceResult.data.newLevel.name}!`);
          }, 2000);
        }
      } catch (error) {
        console.error('Error updating user progress:', error);
      }
    }
  };

  const restartTest = () => {
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setTimeLeft(30);
    setTestCompleted(false);
    setResults(null);
    setSessionId(null);
    setError(null);
    setLoading(true);
    setQuestionNumber(0);
    
    // Перезапускаем тест
    if (user?.chat_id) {
      initTest();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <LoadingSpinner message="Загружаем тест..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <ErrorMessage 
          message={error} 
          onRetry={() => user?.chat_id && initTest()} 
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
            <h1 className="text-2xl font-bold mb-2">🎯 Результаты теста</h1>
            <p className="text-slate-300">Быстрый тест завершен!</p>
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
                <div className="text-3xl font-bold text-wine-400">{Math.round(results.score / 20)}/{results.totalQuestions}</div>
                <div className="text-sm text-slate-400">Правильных ответов</div>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-3xl font-bold text-wine-400">{results.timeSpent}с</div>
                <div className="text-sm text-slate-400">Общее время</div>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-4">
            <button 
              onClick={() => window.location.reload()}
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

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">🎯 Быстрый тест</h1>
          <p className="text-slate-300 mb-6">Не удалось загрузить вопрос</p>
          <button onClick={() => loadNextQuestion()} className="btn-primary">
            🔄 Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const progress = (questionNumber / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">🎯 Быстрый тест</h1>
          <p className="text-slate-300">Вопрос {questionNumber} из {totalQuestions}</p>
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
                {Math.round(score / 20)}
              </span>
            </div>
          </div>
        </div>

        {/* Вопрос */}
        <div className="card mb-6">
          <div className="text-lg font-medium mb-6">{currentQuestion.question}</div>
          
          <div className="space-y-3">
            {Object.entries(currentQuestion.options).map(([key, option]) => (
              <button
                key={key}
                onClick={() => handleAnswerSelect(key)}
                disabled={isAnswered}
                className={`w-full p-4 text-left rounded-lg border transition-all duration-200 ${
                  isAnswered
                    ? key === currentQuestion.correctAnswer
                      ? 'bg-green-900/30 border-green-500/50 text-green-300'
                      : key === selectedAnswer && key !== currentQuestion.correctAnswer
                      ? 'bg-red-900/30 border-red-500/50 text-red-300'
                      : 'bg-slate-700/30 border-slate-600/50 text-slate-400'
                    : selectedAnswer === key
                    ? 'bg-wine-900/30 border-wine-500/50 text-wine-300'
                    : 'bg-slate-700/30 border-slate-600/50 text-slate-300 hover:bg-slate-600/30'
                }`}
              >
                <span className="font-medium mr-3">{key}.</span>
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
              Счет за вопрос: {currentQuestion.isCorrect ? 20 + Math.max(0, 30 - currentQuestion.timeSpent) * 2 : 0}
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
              {questionNumber < totalQuestions ? 'Следующий вопрос' : 'Завершить тест'}
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