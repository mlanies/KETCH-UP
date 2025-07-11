// Тест для проверки новых кнопок "Следующий" и "Завершить"

import { handleLearningAnswer, handleLearningCallback } from './src/handlers/learning.js';

// Мок окружения для тестирования
const mockEnv = {
  CLOUDFLARE_ACCOUNT_ID: 'mock_account_id_for_testing',
  CLOUDFLARE_AI_TOKEN: 'mock_ai_token_for_testing',
  GOOGLE_SHEETS_API_KEY: 'mock_api_key_for_testing',
  GOOGLE_SHEETS_SPREADSHEET_ID: 'mock_spreadsheet_id_for_testing',
  DB: null // Мок базы данных для тестов
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
async function testNewButtons() {
  console.log('🧪 Тестирование новых кнопок "Следующий" и "Завершить"...\n');
  
  const testChatId = 123456789;
  
  try {
    // Тест 1: Правильный ответ
    console.log('✅ Тест 1: Правильный ответ');
    await handleLearningAnswer(testChatId, 'A', mockEnv);
    
    // Тест 2: Неправильный ответ
    console.log('\n❌ Тест 2: Неправильный ответ');
    await handleLearningAnswer(testChatId, 'B', mockEnv);
    
    // Тест 3: Обработка кнопки "Следующий вопрос"
    console.log('\n⏭️ Тест 3: Обработка кнопки "Следующий вопрос"');
    await handleLearningCallback('learning_next_question', testChatId, 1, mockEnv);
    
    // Тест 4: Обработка кнопки "Завершить тест"
    console.log('\n🏁 Тест 4: Обработка кнопки "Завершить тест"');
    await handleLearningCallback('learning_finish', testChatId, 1, mockEnv);
    
    console.log('\n✅ Все тесты кнопок завершены успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка в тестах кнопок:', error);
  }
}

// Запуск тестов
if (import.meta.url === `file://${process.argv[1]}`) {
  testNewButtons();
}

export { testNewButtons }; 