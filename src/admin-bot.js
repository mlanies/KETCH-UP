// src/admin-bot.js
// Админ-бот для Telegram Wine Bot

import { CommandsHandler } from './admin/handlers/commands.js';
import { TelegramHandler } from './admin/handlers/telegram.js';

// Ключ для KV
const KV_AUTH_KEY = 'admin_authorized_ids';

// Проверка авторизации пользователя через KV
async function isAuthorized(chatId, env) {
  const kv = env.WINE_CACHE;
  const idsRaw = await kv.get(KV_AUTH_KEY);
  if (!idsRaw) return false;
  try {
    const ids = JSON.parse(idsRaw);
    return ids.includes(chatId);
  } catch {
    return false;
  }
}

// Добавление chatId в KV
async function authorizeUser(chatId, env) {
  const kv = env.WINE_CACHE;
  let ids = [];
  const idsRaw = await kv.get(KV_AUTH_KEY);
  if (idsRaw) {
    try { ids = JSON.parse(idsRaw); } catch {}
  }
  if (!ids.includes(chatId)) {
    ids.push(chatId);
    await kv.put(KV_AUTH_KEY, JSON.stringify(ids));
  }
}

// Ожидание пароля (in-memory, сбрасывается при рестарте worker)
const awaitingPassword = new Set();

// Защита от перебора пароля
const passwordAttempts = new Map(); // chatId -> { count, firstAttemptTs }
const MAX_ATTEMPTS = 5;
const BLOCK_TIME_MS = 10 * 60 * 1000; // 10 минут

function isPasswordBlocked(chatId) {
  const entry = passwordAttempts.get(chatId);
  if (!entry) return false;
  if (entry.count < MAX_ATTEMPTS) return false;
  const now = Date.now();
  if (now - entry.firstAttemptTs < BLOCK_TIME_MS) return true;
  // Сбросить счетчик после блокировки
  passwordAttempts.delete(chatId);
  return false;
}

function recordPasswordAttempt(chatId) {
  const now = Date.now();
  let entry = passwordAttempts.get(chatId);
  if (!entry) {
    entry = { count: 1, firstAttemptTs: now };
  } else {
    if (now - entry.firstAttemptTs > BLOCK_TIME_MS) {
      // Сбросить счетчик после истечения времени
      entry = { count: 1, firstAttemptTs: now };
    } else {
      entry.count++;
    }
  }
  passwordAttempts.set(chatId, entry);
}

// Обработка сообщений от администраторов
async function handleAdminMessage(message, env) {
  const chatId = message.chat.id;
  const text = message.text || '';
  const telegram = new TelegramHandler(env);

  console.log(`[ADMIN BOT] Received message from ${chatId}: ${text}`);

  // Проверка авторизации
  if (!(await isAuthorized(chatId, env))) {
    if (!awaitingPassword.has(chatId)) {
      // Первый вход — спрашиваем пароль
      awaitingPassword.add(chatId);
      await telegram.sendMessage(chatId, '🔒 Введите пароль для доступа:');
      return;
    } else {
      // Защита от перебора пароля
      if (isPasswordBlocked(chatId)) {
        await telegram.sendMessage(chatId, '⏳ Слишком много попыток. Попробуйте снова через 10 минут.');
        return;
      }
      // Ожидаем ввод пароля
      if (text.trim() === env.ADMIN_BOT_PASSWORD) {
        await authorizeUser(chatId, env); // Сохраняем chat_id как авторизованный
        awaitingPassword.delete(chatId);
        passwordAttempts.delete(chatId); // сбросить счетчик
        // Удаляем сообщение пользователя с паролем
        try { await telegram.deleteMessage(chatId, message.message_id); } catch (e) { console.error('Failed to delete password message:', e); }
        await telegram.sendMessage(chatId, '✅ Доступ разрешён!');
        // Показываем меню
        const commands = new CommandsHandler(env);
        await commands.handleStart(chatId);
        return;
      } else {
        recordPasswordAttempt(chatId);
        // Удаляем сообщение пользователя с паролем
        try { await telegram.deleteMessage(chatId, message.message_id); } catch (e) { console.error('Failed to delete password message:', e); }
        const entry = passwordAttempts.get(chatId);
        const attemptsLeft = Math.max(0, MAX_ATTEMPTS - (entry ? entry.count : 0));
        if (attemptsLeft === 0) {
          await telegram.sendMessage(chatId, '⏳ Слишком много попыток. Попробуйте снова через 10 минут.');
        } else {
          await telegram.sendMessage(chatId, `❌ Неверный пароль. Осталось попыток: ${attemptsLeft}. Попробуйте ещё раз:`);
        }
        return;
      }
    }
  }

  try {
    const commands = new CommandsHandler(env);
    // Обработка массовых команд (например, /broadcast)
    const handled = await commands.handleMessage(chatId, text);
    if (handled) return;
    // Обработка команд
    if (text === '/start' || text === '/help') {
      await commands.handleStart(chatId);
    } else if (text === '/analytics') {
      await commands.handleAnalytics(chatId);
    } else if (text === '/feedback') {
      await commands.handleFeedback(chatId);
    } else if (text === '/users') {
      await commands.handleUsers(chatId);
    } else if (text.startsWith('/user_info')) {
      const args = text.split(' ').slice(1);
      await commands.handleUserInfo(chatId, args);
    } else if (text.startsWith('/search_user')) {
      const args = text.split(' ').slice(1);
      await commands.handleSearchUser(chatId, args);
    } else {
      // Неизвестная команда - показываем главное меню
      await commands.handleStart(chatId);
    }
  } catch (error) {
    console.error('[ADMIN BOT] Error handling message:', error);
    await telegram.sendMessage(chatId, '❌ Произошла ошибка при обработке команды');
  }
}

// Обработка callback query
async function handleCallbackQuery(callbackQuery, env) {
  const chatId = callbackQuery.from.id;
  const callbackData = callbackQuery.data;
  const messageId = callbackQuery.message?.message_id;
  const telegram = new TelegramHandler(env);

  console.log(`[ADMIN BOT] Received callback from ${chatId}: ${callbackData}`);

  // Проверка авторизации
  if (!(await isAuthorized(chatId, env))) {
    if (!awaitingPassword.has(chatId)) {
      awaitingPassword.add(chatId);
      await telegram.sendMessage(chatId, '🔒 Введите пароль для доступа:');
      return;
    } else {
      await telegram.sendMessage(chatId, '❌ Сначала введите пароль в чате с ботом!');
      return;
    }
  }

  try {
    const commands = new CommandsHandler(env);
    // Обрабатываем callback
    await commands.handleCallbackQuery(chatId, callbackData, messageId);
    // Отвечаем на callback query
    await telegram.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('[ADMIN BOT] Error handling callback query:', error);
    await telegram.answerCallbackQuery(callbackQuery.id, '❌ Произошла ошибка', true);
  }
}

// Основная функция обработки webhook
export async function handleAdminWebhook(request, env) {
  try {
    console.log('[ADMIN BOT] Received webhook request');
    
    const update = await request.json();
    console.log('[ADMIN BOT] Update:', JSON.stringify(update, null, 2));
    
    // Обрабатываем сообщения
    if (update.message) {
      console.log('[ADMIN BOT] Processing message');
      await handleAdminMessage(update.message, env);
    }
    
    // Обрабатываем callback query
    if (update.callback_query) {
      console.log('[ADMIN BOT] Processing callback query');
      await handleCallbackQuery(update.callback_query, env);
    }
    
    // Обрабатываем другие типы обновлений
    if (update.edited_message) {
      console.log('[ADMIN BOT] Ignoring edited message');
    }
    
    if (update.channel_post) {
      console.log('[ADMIN BOT] Ignoring channel post');
    }
    
    if (update.edited_channel_post) {
      console.log('[ADMIN BOT] Ignoring edited channel post');
    }
    
    if (update.inline_query) {
      console.log('[ADMIN BOT] Ignoring inline query');
    }
    
    if (update.chosen_inline_result) {
      console.log('[ADMIN BOT] Ignoring chosen inline result');
    }
    
    if (update.shipping_query) {
      console.log('[ADMIN BOT] Ignoring shipping query');
    }
    
    if (update.pre_checkout_query) {
      console.log('[ADMIN BOT] Ignoring pre checkout query');
    }
    
    if (update.poll) {
      console.log('[ADMIN BOT] Ignoring poll');
    }
    
    if (update.poll_answer) {
      console.log('[ADMIN BOT] Ignoring poll answer');
    }
    
    if (update.my_chat_member) {
      console.log('[ADMIN BOT] Ignoring my chat member');
    }
    
    if (update.chat_member) {
      console.log('[ADMIN BOT] Ignoring chat member');
    }
    
    if (update.chat_join_request) {
      console.log('[ADMIN BOT] Ignoring chat join request');
    }
    
    console.log('[ADMIN BOT] Webhook processed successfully');
    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('[ADMIN BOT] Error in webhook handler:', error);
    return new Response('ERROR', { status: 500 });
  }
}

// Экспорт для Cloudflare Workers
export default { fetch: handleAdminWebhook };

// Экспортируемая функция для cron (Cloudflare Workers)
export async function scheduled(event, env, ctx) {
  console.log('[ADMIN BOT] scheduled() triggered by cron');
  // Здесь можно вызвать функцию рассылки, если потребуется
} 