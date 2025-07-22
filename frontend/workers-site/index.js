import { getAssetFromKV } from '@cloudflare/kv-asset-handler'

/**
 * The DEBUG flag will do two things that help during development:
 * 1. we will skip caching on the edge, which makes it easier to
 *    debug.
 * 2. we will return an error message on exception in your Response rather
 *    than the default 404.html page.
 */
const DEBUG = false

addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname === '/test-reminder') {
    event.respondWith(testReminder(event));
    return;
  }
  try {
    event.respondWith(handleEvent(event))
  } catch (e) {
    if (DEBUG) {
      return event.respondWith(
        new Response(e.message || e.toString(), {
          status: 500,
        }),
      )
    }
    event.respondWith(new Response('Internal Error', { status: 500 }))
  }
})

async function handleEvent(event) {
  const url = new URL(event.request.url)
  let options = {}

  /**
   * You can add custom logic to how we fetch your assets
   * by configuring the function `mapRequestToAsset`
   */
  // options.mapRequestToAsset = req => new Request(`${new URL(req.url).origin}/index.html`, req)

  try {
    if (DEBUG) {
      // customize caching
      options.cacheControl = {
        bypassCache: true,
      }
    }
    return await getAssetFromKV(event, options)
  } catch (e) {
    // if an error is thrown try to serve the asset at 404.html
    if (!DEBUG) {
      try {
        let notFoundResponse = await getAssetFromKV(event, {
          mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/index.html`, req),
        })

        return new Response(notFoundResponse.body, { ...notFoundResponse, status: 200 })
      } catch (e) {}
    }

    return new Response(e.message || e.toString(), { status: 500 })
  }
}

async function testReminder(event) {
  await handleScheduled(event);
  return new Response('Test reminder sent!', { status: 200 });
}

// Cloudflare Worker: обработчик по расписанию (cron)
addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled(event));
});

async function handleScheduled(event) {
  // === TODO: Получить список пользователей из БД или KV ===
  // Пример: const users = await getAllUsers();
  // Здесь просто пример с одним пользователем:
  const users = [
    { chatId: '123456789', level: 1, lastLearningDate: '2024-06-10' },
    // ...
  ];

  // Получить сегодняшнюю дату
  const today = new Date().toISOString().split('T')[0];

  for (const user of users) {
    // === Пример фильтрации: не учился сегодня или низкий уровень ===
    if (user.level < 3 || user.lastLearningDate !== today) {
      const message = generateReminderMessage(user);
      await sendTelegramMessage(user.chatId, message, event);
    }
  }
}

function generateReminderMessage(user) {
  // Пример: user = { level, lastLearningDate, lastActiveDate, streak, errors, nextLevelXp, currentXp }
  const today = new Date().toISOString().split('T')[0];
  const daysSinceLastLearning = user.lastLearningDate ? Math.floor((Date.now() - new Date(user.lastLearningDate).getTime()) / (1000 * 60 * 60 * 24)) : 99;
  const daysSinceLastActive = user.lastActiveDate ? Math.floor((Date.now() - new Date(user.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)) : 99;

  // 1. Давно не заходил
  if (daysSinceLastActive > 7) {
    return '⏰ Мы скучаем по вам! Возвращайтесь к обучению — новые задания уже ждут!';
  }
  // 2. Давно не учился
  if (daysSinceLastLearning > 3) {
    return '📚 Вы давно не обучались! Давайте продолжим обучение?';
  }
  // 3. Низкий уровень
  if (user.level < 3) {
    return '👋 Пора пройти обучение и повысить свой уровень! Начните прямо сейчас!';
  }
  // 4. Близко к новому уровню
  if (user.nextLevelXp && user.currentXp && (user.nextLevelXp - user.currentXp) <= 10) {
    return '🚀 До следующего уровня осталось совсем немного! Пройдите ещё один урок!';
  }
  // 5. Часто ошибается
  if (user.errors && user.errors > 3) {
    return '💡 Не сдавайтесь! Ошибки — это путь к успеху. Давайте попробуем ещё раз?';
  }
  // 6. Длинная серия правильных ответов (streak)
  if (user.streak && user.streak >= 5) {
    return `🔥 У вас серия из ${user.streak} правильных ответов! Не останавливайтесь, продолжайте обучение!`;
  }
  // 7. По умолчанию
  return '🎯 Не забывайте прокачиваться! Новые задания ждут вас!';
}

async function sendTelegramMessage(chatId, text, event) {
  // === TODO: Получить токен из env или секрета ===
  const TELEGRAM_BOT_TOKEN = event.env ? event.env.TELEGRAM_BOT_TOKEN : 'YOUR_BOT_TOKEN';
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  });
} 