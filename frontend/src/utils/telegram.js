// Утилиты для работы с Telegram WebApp API

export function initTelegramWebApp() {
  // Проверяем, что мы в браузере
  if (typeof window === 'undefined') {
    console.log('Not in browser environment');
    return null;
  }

  // Проверяем, что Telegram WebApp API доступен
  if (!window.Telegram || !window.Telegram.WebApp) {
    console.log('Telegram WebApp API not available');
    return null;
  }

  try {
    const tg = window.Telegram.WebApp;
    
    // Инициализация
    tg.ready();
    tg.expand();
    
    // Установка темы
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#0f172a');
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#f1f5f9');
    document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#ec4899');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
    
    console.log('Telegram WebApp initialized successfully');
    return tg;
  } catch (error) {
    console.error('Error initializing Telegram WebApp:', error);
    return null;
  }
}

export function getTelegramUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!window.Telegram || !window.Telegram.WebApp) {
    console.log('Telegram WebApp API not available');
    return null;
  }

  try {
    const tg = window.Telegram.WebApp;
    const user = {
      id: tg.initDataUnsafe?.user?.id,
      username: tg.initDataUnsafe?.user?.username,
      first_name: tg.initDataUnsafe?.user?.first_name,
      last_name: tg.initDataUnsafe?.user?.last_name,
      chat_id: tg.initDataUnsafe?.user?.id // chat_id = user_id для личных чатов
    };
    
    console.log('Telegram user data:', user);
    return user;
  } catch (error) {
    console.error('Error getting Telegram user:', error);
    return null;
  }
}

export function showTelegramAlert(message) {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    window.Telegram.WebApp.showAlert(message);
  }
}

export function showTelegramConfirm(message, callback) {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    window.Telegram.WebApp.showConfirm(message, callback);
  }
} 