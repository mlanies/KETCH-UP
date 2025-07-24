// src/guest-bot.js
// Гостевой бот для посетителей ресторана

import { sendMessage } from './handlers/telegramApi.js';
import { sendGuestMainMenu, sendGuestMenu, sendGuestDrinks, startGuestAIFoodChat, handleGuestAIPrefsMessage, guestMenuCategoryList, guestMenuCategoryDrinks, guestShowDrinkDetails, guestAlcoholCategoryList, guestAlcoholCategoryDrinks } from './handlers/guest/menu.js';
import {
  isAwaitingFeedback,
  setAwaitingFeedback,
  handleGuestFeedbackMessage
} from './handlers/guest/feedback.js';

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

  if (data === 'guest_menu') {
    await guestMenuCategoryList(chatId, env);
    return;
  }
  if (data === 'guest_alcohol') {
    await guestAlcoholCategoryList(chatId, env);
    return;
  }
  if (data.startsWith('guest_category_')) {
    const categoryType = data.replace('guest_category_', '');
    await guestMenuCategoryDrinks(categoryType, chatId, env);
    return;
  }
  if (data.startsWith('guest_alc_category_')) {
    const categoryType = data.replace('guest_alc_category_', '');
    await guestAlcoholCategoryDrinks(categoryType, chatId, env);
    return;
  }
  if (data.startsWith('guest_drink_')) {
    const drinkId = data.replace('guest_drink_', '');
    await guestShowDrinkDetails(drinkId, chatId, env);
    return;
  }

  switch (data) {
    case 'guest_drinks':
      await sendGuestDrinks(chatId, env);
      break;
    case 'guest_feedback':
      setAwaitingFeedback(chatId);
      await sendMessage(chatId, '✍️ Напишите ваш отзыв о визите одним сообщением. Мы ценим ваше мнение!', env);
      break;
    case 'guest_ai_food_chat':
      await startGuestAIFoodChat(chatId, env);
      break;
    case 'guest_ask_ai':
      await sendMessage(chatId, '🤖 Задайте вопрос о напитках или сочетаниях — наш AI-ассистент ответит!', env);
      break;
    case 'guest_about':
      await sendMessage(chatId, '🏪 Ресторан KETCH UP\nАдрес: ...\nВремя работы: ...\nАкции: ...', env);
      break;
    case 'guest_main_menu':
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