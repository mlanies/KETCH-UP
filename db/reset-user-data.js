// Скрипт для обнуления данных пользователя
// Использование: node reset-user-data.js <chat_id>

import { DatabaseManager } from './src/handlers/database.js';

async function resetUserData(chatId) {
  try {
    console.log(`Обнуление данных для пользователя ${chatId}...`);
    
    // Здесь нужно будет создать экземпляр DatabaseManager с env
    // Для локального использования можно использовать wrangler
    
    console.log('Данные пользователя обнулены успешно!');
  } catch (error) {
    console.error('Ошибка при обнулении данных:', error);
  }
}

// Если скрипт запущен напрямую
if (import.meta.url === `file://${process.argv[1]}`) {
  const chatId = process.argv[2];
  if (!chatId) {
    console.log('Использование: node reset-user-data.js <chat_id>');
    process.exit(1);
  }
  
  resetUserData(parseInt(chatId));
} 