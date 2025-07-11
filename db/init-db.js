// Скрипт для инициализации базы данных Cloudflare D1
// Запуск: npx wrangler d1 execute wine-bot-db --file=schema.sql

import { readFileSync } from 'fs';

// Читаем схему базы данных
const schema = readFileSync('./schema.sql', 'utf8');

console.log('Схема базы данных:');
console.log(schema);

console.log('\nДля инициализации базы данных выполните:');
console.log('npx wrangler d1 execute wine-bot-db --file=schema.sql');

console.log('\nДля создания базы данных выполните:');
console.log('npx wrangler d1 create wine-bot-db');

console.log('\nДля просмотра информации о базе данных:');
console.log('npx wrangler d1 list');

console.log('\nДля выполнения SQL запросов:');
console.log('npx wrangler d1 execute wine-bot-db --command="SELECT name FROM sqlite_master WHERE type=\'table\';"'); 