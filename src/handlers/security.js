// Система защиты от ботов и парсинга

// Кэш для отслеживания запросов
const requestCache = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 минута
const MAX_REQUESTS_PER_MINUTE = 30;
const MAX_REQUESTS_PER_HOUR = 300;
const MAX_REQUESTS_PER_DAY = 1000;

// Подозрительные паттерны
const SUSPICIOUS_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python/i,
  /node/i,
  /java/i,
  /php/i,
  /\.ru$/i,
  /\.cn$/i,
  /\.tk$/i,
  /\.ml$/i,
  /\.ga$/i,
  /\.cf$/i
];

// Блокированные IP (можно расширить)
const BLOCKED_IPS = new Set([
  // Добавьте известные IP ботов
]);

// Разрешенные IP (Telegram, Cloudflare, etc.)
const ALLOWED_IPS = new Set([
  '127.0.0.1',
  '::1',
  // Telegram IP ranges (основные)
  '149.154.160.0/20',
  '91.108.4.0/22',
  '91.108.8.0/22',
  '91.108.12.0/22',
  '91.108.16.0/22',
  '91.108.56.0/22',
  '91.108.36.0/23',
  '91.108.38.0/23',
  '91.108.4.0/22',
  '91.108.8.0/22',
  '91.108.12.0/22',
  '91.108.16.0/22',
  '91.108.56.0/22',
  '91.108.36.0/23',
  '91.108.38.0/23'
]);

// Функция для проверки User-Agent
export function checkUserAgent(userAgent) {
  if (!userAgent) {
    return { suspicious: true, reason: 'No User-Agent' };
  }
  
  const lowerUA = userAgent.toLowerCase();
  
  // Исключения для Telegram
  if (lowerUA.includes('telegram') || lowerUA.includes('tgwebapp')) {
    return { suspicious: false, reason: 'Telegram User-Agent' };
  }
  
  // Проверяем подозрительные паттерны
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { suspicious: true, reason: `Suspicious User-Agent: ${userAgent}` };
    }
  }
  
  // Проверяем отсутствие браузерных признаков
  const browserSignals = [
    'mozilla', 'chrome', 'safari', 'firefox', 'edge', 'opera',
    'webkit', 'gecko', 'trident', 'msie'
  ];
  
  const hasBrowserSignal = browserSignals.some(signal => lowerUA.includes(signal));
  if (!hasBrowserSignal) {
    return { suspicious: true, reason: 'No browser signature' };
  }
  
  return { suspicious: false, reason: 'Valid User-Agent' };
}

// Функция для проверки IP
export function checkIP(ip) {
  if (BLOCKED_IPS.has(ip)) {
    return { blocked: true, reason: 'IP is in blacklist' };
  }
  
  // Проверяем локальные IP (для тестирования)
  if (ip === '127.0.0.1' || ip === '::1') {
    return { blocked: false, reason: 'Local IP' };
  }
  
  // Проверяем разрешенные IP (Telegram, Cloudflare)
  if (ALLOWED_IPS.has(ip)) {
    return { blocked: false, reason: 'IP is in whitelist' };
  }
  
  // Простая проверка на Telegram IP (149.154.x.x)
  if (ip.startsWith('149.154.')) {
    return { blocked: false, reason: 'Telegram IP' };
  }
  
  // Простая проверка на Telegram IP (91.108.x.x)
  if (ip.startsWith('91.108.')) {
    return { blocked: false, reason: 'Telegram IP' };
  }
  
  return { blocked: false, reason: 'IP is allowed' };
}

// Функция для rate limiting
export function checkRateLimit(identifier, env) {
  const now = Date.now();
  const key = `rate_limit_${identifier}`;
  
  // Получаем текущие данные из кэша
  let requestData = requestCache.get(key) || {
    requests: [],
    blocked: false,
    blockUntil: 0
  };
  
  // Проверяем, не заблокирован ли пользователь
  if (requestData.blocked && now < requestData.blockUntil) {
    const remainingTime = Math.ceil((requestData.blockUntil - now) / 1000);
    return {
      allowed: false,
      reason: `Rate limit exceeded. Try again in ${remainingTime} seconds.`,
      remainingTime
    };
  }
  
  // Удаляем старые запросы (старше 1 минуты)
  requestData.requests = requestData.requests.filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW
  );
  
  // Добавляем текущий запрос
  requestData.requests.push(now);
  
  // Проверяем лимиты
  if (requestData.requests.length > MAX_REQUESTS_PER_MINUTE) {
    requestData.blocked = true;
    requestData.blockUntil = now + (5 * 60 * 1000); // Блокировка на 5 минут
    
    requestCache.set(key, requestData);
    
    return {
      allowed: false,
      reason: 'Too many requests per minute. Blocked for 5 minutes.',
      remainingTime: 300
    };
  }
  
  // Сохраняем обновленные данные
  requestCache.set(key, requestData);
  
  return { allowed: true, reason: 'Rate limit OK' };
}

// Функция для проверки подозрительной активности
export function checkSuspiciousActivity(request, env) {
  const headers = request.headers;
  const url = new URL(request.url);
  
  // Исключения для Telegram
  if (url.pathname === '/webhook') {
    return { allowed: true, reason: 'Telegram webhook - allowed' };
  }
  
  // Получаем IP (может быть в заголовках Cloudflare)
  const ip = headers.get('cf-connecting-ip') || 
             headers.get('x-forwarded-for') || 
             headers.get('x-real-ip') || 
             'unknown';
  
  // Получаем User-Agent
  const userAgent = headers.get('user-agent') || '';
  
  // Проверяем IP
  const ipCheck = checkIP(ip);
  if (ipCheck.blocked) {
    return {
      allowed: false,
      reason: ipCheck.reason,
      type: 'ip_blocked'
    };
  }
  
  // Проверяем User-Agent
  const uaCheck = checkUserAgent(userAgent);
  if (uaCheck.suspicious) {
    return {
      allowed: false,
      reason: uaCheck.reason,
      type: 'suspicious_ua'
    };
  }
  
  // Проверяем rate limit
  const rateCheck = checkRateLimit(ip, env);
  if (!rateCheck.allowed) {
    return {
      allowed: false,
      reason: rateCheck.reason,
      type: 'rate_limit',
      remainingTime: rateCheck.remainingTime
    };
  }
  
  // Проверяем подозрительные заголовки
  const suspiciousHeaders = [
    'x-requested-with',
    'x-forwarded-proto',
    'x-forwarded-host',
    'x-forwarded-port'
  ];
  
  for (const header of suspiciousHeaders) {
    const value = headers.get(header);
    if (value && value.includes('bot')) {
      return {
        allowed: false,
        reason: `Suspicious header: ${header}`,
        type: 'suspicious_header'
      };
    }
  }
  
  // Проверяем подозрительные параметры URL
  const suspiciousParams = ['bot', 'crawler', 'spider', 'scraper'];
  for (const param of suspiciousParams) {
    if (url.searchParams.has(param)) {
      return {
        allowed: false,
        reason: `Suspicious URL parameter: ${param}`,
        type: 'suspicious_param'
      };
    }
  }
  
  return { allowed: true, reason: 'All checks passed' };
}

// Функция для логирования подозрительной активности
export function logSuspiciousActivity(checkResult, request, env) {
  const headers = request.headers;
  const ip = headers.get('cf-connecting-ip') || 
             headers.get('x-forwarded-for') || 
             headers.get('x-real-ip') || 
             'unknown';
  const userAgent = headers.get('user-agent') || '';
  const url = request.url;
  
  console.log('🚨 SUSPICIOUS ACTIVITY DETECTED:');
  console.log('IP:', ip);
  console.log('User-Agent:', userAgent);
  console.log('URL:', url);
  console.log('Reason:', checkResult.reason);
  console.log('Type:', checkResult.type);
  console.log('Timestamp:', new Date().toISOString());
  console.log('---');
  
  // Можно добавить отправку уведомлений администратору
  // await sendAdminAlert(checkResult, ip, userAgent, url, env);
}

// Функция для генерации CAPTCHA (простая математическая задача)
export function generateCaptcha() {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operators = ['+', '-', '*'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  
  let answer;
  switch (operator) {
    case '+':
      answer = num1 + num2;
      break;
    case '-':
      answer = num1 - num2;
      break;
    case '*':
      answer = num1 * num2;
      break;
  }
  
  return {
    question: `Решите: ${num1} ${operator} ${num2} = ?`,
    answer: answer.toString(),
    expires: Date.now() + (5 * 60 * 1000) // 5 минут
  };
}

// Функция для проверки CAPTCHA
export function verifyCaptcha(userAnswer, correctAnswer) {
  return userAnswer.trim() === correctAnswer;
}

// Функция для создания токена сессии
export function createSessionToken(userId) {
  const token = Math.random().toString(36).substring(2) + 
                Date.now().toString(36) + 
                userId.toString(36);
  return token;
}

// Функция для проверки токена сессии
export function validateSessionToken(token, userId) {
  if (!token || !userId) return false;
  
  // Простая проверка (можно улучшить с помощью JWT)
  return token.includes(userId.toString(36));
}

// Функция для добавления задержки (защита от ботов)
export function addArtificialDelay(minDelay = 100, maxDelay = 500) {
  const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Функция для проверки геолокации (опционально)
export function checkGeolocation(headers) {
  const country = headers.get('cf-ipcountry');
  const timezone = headers.get('cf-timezone');
  
  // Можно добавить блокировку по странам
  const blockedCountries = ['XX', 'YY']; // Замените на реальные коды стран
  
  if (blockedCountries.includes(country)) {
    return {
      allowed: false,
      reason: `Access denied from country: ${country}`
    };
  }
  
  return { allowed: true, country, timezone };
}

// Основная функция защиты
export async function applySecurityChecks(request, env) {
  try {
    // Проверяем подозрительную активность
    const securityCheck = checkSuspiciousActivity(request, env);
    
    if (!securityCheck.allowed) {
      logSuspiciousActivity(securityCheck, request, env);
      
      // Возвращаем ошибку 403 для заблокированных запросов
      return {
        allowed: false,
        response: new Response('Access Denied', { 
          status: 403,
          headers: {
            'Content-Type': 'text/plain',
            'X-Blocked-Reason': securityCheck.reason
          }
        })
      };
    }
    
    // Проверяем геолокацию
    const geoCheck = checkGeolocation(request.headers);
    if (!geoCheck.allowed) {
      return {
        allowed: false,
        response: new Response('Access Denied', { 
          status: 403,
          headers: {
            'Content-Type': 'text/plain',
            'X-Blocked-Reason': geoCheck.reason
          }
        })
      };
    }
    
    // Добавляем небольшую задержку для защиты от ботов
    await addArtificialDelay(50, 200);
    
    return { allowed: true };
    
  } catch (error) {
    console.error('Security check error:', error);
    // В случае ошибки безопасности, разрешаем запрос
    return { allowed: true };
  }
}

// Функция для очистки старых записей кэша
export function cleanupSecurityCache() {
  const now = Date.now();
  
  for (const [key, data] of requestCache.entries()) {
    // Удаляем записи старше 1 часа
    if (now - Math.max(...data.requests) > 60 * 60 * 1000) {
      requestCache.delete(key);
    }
  }
}

// Функция для получения статистики безопасности
export function getSecurityStats() {
  const now = Date.now();
  const stats = {
    totalRequests: 0,
    blockedRequests: 0,
    activeBlocks: 0,
    cacheSize: requestCache.size
  };
  
  for (const [key, data] of requestCache.entries()) {
    stats.totalRequests += data.requests.length;
    
    if (data.blocked && now < data.blockUntil) {
      stats.activeBlocks++;
    }
    
    if (data.blocked) {
      stats.blockedRequests++;
    }
  }
  
  return stats;
} 