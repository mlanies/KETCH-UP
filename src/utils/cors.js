// Утилитарные функции для работы с CORS-заголовками

// Функция для добавления CORS-заголовков к ответам
export function withCorsHeaders(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

// Функция для создания JSON-ответа с CORS-заголовками
export function jsonResponse(data, status = 200) {
  const json = JSON.stringify(data);
  console.log('[jsonResponse] status:', status, 'json:', json);
  return withCorsHeaders(new Response(json, {
    status,
    headers: { 'Content-Type': 'application/json' }
  }));
}

// Функция для создания текстового ответа с CORS-заголовками
export function textResponse(text, status = 200) {
  return withCorsHeaders(new Response(text, {
    status,
    headers: { 'Content-Type': 'text/plain' }
  }));
} 