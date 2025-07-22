// Генерация текста напоминания для обучения
function generateReminderMessage(user) {
  // user = { level, lastLearningDate, lastActiveDate, streak, errors, nextLevelXp, currentXp }
  const today = new Date().toISOString().split('T')[0];
  const daysSinceLastLearning = user.lastLearningDate ? Math.floor((Date.now() - new Date(user.lastLearningDate).getTime()) / (1000 * 60 * 60 * 24)) : 99;
  const daysSinceLastActive = user.lastActiveDate ? Math.floor((Date.now() - new Date(user.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)) : 99;

  if (daysSinceLastActive > 7) {
    return '⏰ Мы скучаем по вам! Возвращайтесь к обучению — новые задания уже ждут!';
  }
  if (daysSinceLastLearning > 3) {
    return '📚 Вы давно не обучались! Давайте продолжим обучение?';
  }
  if (user.level < 3) {
    return '👋 Пора пройти обучение и повысить свой уровень! Начните прямо сейчас!';
  }
  if (user.nextLevelXp && user.currentXp && (user.nextLevelXp - user.currentXp) <= 10) {
    return '🚀 До следующего уровня осталось совсем немного! Пройдите ещё один урок!';
  }
  if (user.errors && user.errors > 3) {
    return '💡 Не сдавайтесь! Ошибки — это путь к успеху. Давайте попробуем ещё раз?';
  }
  if (user.streak && user.streak >= 5) {
    return `🔥 У вас серия из ${user.streak} правильных ответов! Не останавливайтесь, продолжайте обучение!`;
  }
  return '🎯 Не забывайте прокачиваться! Новые задания ждут вас!';
}

// Отправка сообщения в Telegram
async function sendTelegramMessage(chatId, text, env) {
  const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set in env');
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  });
}

module.exports = {
  generateReminderMessage,
  sendTelegramMessage,
}; 