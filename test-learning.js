// Тестовый файл для проверки системы обучения

import { startLearning, handleLearningCallback } from './src/handlers/learning.js';
import { generatePersonalizedReport, updateAnalytics, startLearningSession } from './src/handlers/learningAnalytics.js';

// Мок окружения для тестирования
const mockEnv = {
  CLOUDFLARE_ACCOUNT_ID: 'test_account_id',
  CLOUDFLARE_AI_TOKEN: 'test_ai_token',
  GOOGLE_SHEETS_API_KEY: 'test_api_key',
  GOOGLE_SHEETS_SPREADSHEET_ID: 'test_spreadsheet_id'
};

// Мок функции отправки сообщений
const mockSendMessage = async (chatId, message) => {
  console.log(`[MOCK] Отправка сообщения в чат ${chatId}:`);
  console.log(message);
  console.log('---');
};

const mockSendMessageWithKeyboard = async (chatId, message, keyboard) => {
  console.log(`[MOCK] Отправка сообщения с клавиатурой в чат ${chatId}:`);
  console.log(message);
  console.log('Клавиатура:', JSON.stringify(keyboard, null, 2));
  console.log('---');
};

// Подменяем функции отправки сообщений
global.sendMessage = mockSendMessage;
global.sendMessageWithKeyboard = mockSendMessageWithKeyboard;

// Тестовые функции
async function testLearningSystem() {
  console.log('🧪 Тестирование системы обучения...\n');
  
  const testChatId = 123456789;
  
  try {
    // Тест 1: Начало обучения
    console.log('📝 Тест 1: Начало обучения');
    await startLearning(testChatId, mockEnv);
    
    // Тест 2: Аналитика
    console.log('\n📊 Тест 2: Аналитика');
    startLearningSession(testChatId);
    updateAnalytics(testChatId, 'Вина', 'wine_pairing', true);
    updateAnalytics(testChatId, 'Коктейли', 'method', false);
    updateAnalytics(testChatId, 'Вина', 'serving_temp', true);
    
    const report = await generatePersonalizedReport(testChatId, mockEnv);
    console.log('Персонализированный отчет:');
    console.log(report);
    
    // Тест 3: Обработка callback query
    console.log('\n🔄 Тест 3: Обработка callback query');
    await handleLearningCallback('learning_quick_test', testChatId, 1, mockEnv);
    
    console.log('\n✅ Все тесты завершены успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка в тестах:', error);
  }
}

// Запуск тестов
if (import.meta.url === `file://${process.argv[1]}`) {
  testLearningSystem();
}

export { testLearningSystem }; 