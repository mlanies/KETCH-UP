// src/guest-bot.js
// Гостевой бот для посетителей ресторана

import { sendMessage, sendMessageWithKeyboard } from './handlers/telegramApi.js';
import { startGuestAIFoodChat, handleGuestAIPrefsMessage, guestMenuCategoryList, guestMenuCategoryDrinks, guestShowDrinkDetails, guestAlcoholCategoryList, guestAlcoholCategoryDrinks } from './handlers/guest/menu.js';
import {
  isAwaitingFeedback,
  setAwaitingFeedback,
  handleGuestFeedbackMessage
} from './handlers/guest/feedback.js';
import { showMenuCategories, showCategoryDrinks, showDrinkDetails, showAlcoholCategories } from './handlers/guest/menu-common.js';

// Обработка входящих сообщений от Telegram
async function handleGuestMessage(message, env) {
  const chatId = message.chat.id;
  const text = message.text || '';

  // AI-чат по предпочтениям
  if (await handleGuestAIPrefsMessage(message, env)) {
    return;
  }

  if (isAwaitingFeedback(chatId)) {
    await handleGuestFeedbackMessage(message, env);
    return;
  }

  if (text === '/start') {
    await sendWelcomeMessage(chatId, env);
  } else if (text === '/help') {
    await sendHelpMessage(chatId, env);
  } else {
    await sendGuestMainMenu(chatId, env);
  }
}

// Обработка callback query (кнопки)
async function handleCallbackQuery(callbackQuery, env) {
  const chatId = callbackQuery.from.id;
  const data = callbackQuery.data;

  if (data === 'section_menu') {
    await showMenuCategories(chatId, env);
    return;
  }
  if (data === 'section_alcohol') {
    await showAlcoholCategories(chatId, env);
    return;
  }
  if (data.startsWith('category_')) {
    const categoryType = data.replace('category_', '');
    await showCategoryDrinks(categoryType, chatId, env);
    return;
  }
  if (data.startsWith('drink_')) {
    const drinkId = data.replace('drink_', '');
    await showDrinkDetails(drinkId, chatId, env);
    return;
  }
  if (data === 'refresh_data') {
    const { refreshWineData } = await import('./handlers/data.js');
    await refreshWineData(env);
    await sendMessageWithKeyboard(chatId, '✅ Данные обновлены из Google Sheets!', { inline_keyboard: [[{ text: '🏠 Главное меню', callback_data: 'main_menu' }]] }, env);
    return;
  }

  switch (data) {
    case 'main_menu':
      await sendGuestMainMenu(chatId, env);
      break;
    case 'guest_feedback':
      setAwaitingFeedback(chatId);
      await sendMessage(chatId, '✍️ Напишите ваш отзыв о визите одним сообщением. Мы ценим ваше мнение!', env, undefined);
      break;
    case 'guest_ai_food_chat':
      await startGuestAIFoodChat(chatId, env);
      break;
    case 'guest_ask_ai':
      await sendMessage(chatId, '🤖 Задайте вопрос о напитках или сочетаниях — наш AI-ассистент ответит!', env, undefined);
      break;
    case 'guest_about':
      await sendMessage(chatId, '🏪 Ресторан KETCH UP\nАдрес: ...\nВремя работы: ...\nАкции: ...', env, undefined);
      break;
    default:
      await sendGuestMainMenu(chatId, env);
      break;
  }
  // Ответ на callback query (чтобы убрать "часики")
  if (callbackQuery.id) {
    try {
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQuery.id })
      });
    } catch {}
  }
}

// Приветствие и главное меню
async function sendWelcomeMessage(chatId, env) {
  const text = '👋 Добро пожаловать в ресторан KETCH UP!\n\nВыберите интересующий раздел:';
  await sendGuestMainMenu(chatId, env, text);
}

async function sendHelpMessage(chatId, env) {
  const text = 'ℹ️ Этот бот создан для гостей ресторана KETCH UP.\n\nВы можете посмотреть меню, напитки, оставить отзыв или задать вопрос AI-ассистенту.';
  await sendGuestMainMenu(chatId, env, text);
}

async function sendGuestMainMenu(chatId, env, customText) {
  const text = customText || '🏠 Главное меню. Выберите раздел:';
  const keyboard = {
    inline_keyboard: [
      [ { text: '🍽️ Меню', callback_data: 'section_menu' }, { text: '🍷 Алкоголь', callback_data: 'section_alcohol' } ],
      [ { text: '✍️ Оставить отзыв', callback_data: 'guest_feedback' } ],
      [ { text: '🤖 AI-подбор блюд', callback_data: 'guest_ai_food_chat' } ],
      [ { text: '🤖 Спросить у AI', callback_data: 'guest_ask_ai' } ],
      [ { text: '🏪 О заведении', callback_data: 'guest_about' } ],
      [ { text: '🔄 Обновить данные', callback_data: 'refresh_data' } ]
    ]
  };
  await sendMessageWithKeyboard(chatId, text, keyboard, env);
}

// Основная функция обработки webhook
export async function handleGuestWebhook(request, env) {
  try {
    if (request.method !== 'POST') {
      return new Response('OK', { status: 200 });
    }
    const update = await request.json();
    if (update.message) {
      await handleGuestMessage(update.message, env);
    }
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query, env);
    }
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[GUEST BOT] Error in webhook handler:', error);
    return new Response('ERROR', { status: 500 });
  }
}

export default { fetch: handleGuestWebhook }; 