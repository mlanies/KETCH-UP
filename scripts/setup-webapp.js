#!/usr/bin/env node

/**
 * Скрипт для настройки Web App в BotFather
 * Автоматизирует процесс создания Web App для Telegram бота
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Конфигурация Web App
const WEBAPP_CONFIG = {
  name: "Wine Learning Bot",
  description: "Обучение официантов по ассортименту напитков ресторана KETCH UP",
  icon: "🍷",
  url: "https://telegram-wine-bot.2gc.workers.dev/miniweb",
  commands: [
    { command: "start", description: "Запустить бота" },
    { command: "webapp", description: "Открыть Web App" },
    { command: "help", description: "Показать справку" }
  ]
};

// Шаблон для кнопки Web App
const WEBAPP_BUTTON_TEMPLATE = `
// Добавьте эту кнопку в главное меню бота
const keyboard = {
  inline_keyboard: [
    [
      { 
        text: '🌐 Открыть Web App', 
        web_app: { url: '${WEBAPP_CONFIG.url}' } 
      }
    ],
    // ... другие кнопки
  ]
};
`;

// Инструкции по настройке
const SETUP_INSTRUCTIONS = `
# 🍷 Настройка Web App для Wine Learning Bot

## 📋 Шаг 1: Создание Web App в BotFather

1. Откройте @BotFather в Telegram
2. Отправьте команду: /newapp
3. Выберите вашего бота
4. Заполните информацию:

   **Название:** ${WEBAPP_CONFIG.name}
   **Описание:** ${WEBAPP_CONFIG.description}
   **URL:** ${WEBAPP_CONFIG.url}
   **Иконка:** Загрузите иконку 512x512px

## 📋 Шаг 2: Настройка команд бота

Отправьте BotFather команду /setcommands и выберите вашего бота:

${WEBAPP_CONFIG.commands.map(cmd => `${cmd.command} - ${cmd.description}`).join('\n')}

## 📋 Шаг 3: Добавление кнопки Web App

Добавьте следующий код в ваш бот:

${WEBAPP_BUTTON_TEMPLATE}

## 📋 Шаг 4: Проверка работоспособности

1. Разверните бота: npm run deploy
2. Отправьте /start боту
3. Нажмите кнопку "🌐 Открыть Web App"
4. Убедитесь, что Web App открывается корректно

## 🔧 Дополнительные настройки

### Настройка меню бота
Отправьте BotFather команду /setmenubutton:

**Текст кнопки:** 🌐 Web App
**URL:** ${WEBAPP_CONFIG.url}

### Настройка описания бота
Отправьте BotFather команду /setdescription:

${WEBAPP_CONFIG.description}

### Настройка информации о боте
Отправьте BotFather команду /setabouttext:

🍷 Wine Learning Bot - Интерактивная система обучения официантов по ассортименту напитков ресторана KETCH UP.

🌐 Web App: ${WEBAPP_CONFIG.url}

## 🚀 Готово!

После выполнения всех шагов ваш Web App будет доступен пользователям через кнопку в боте.
`;

// Функция для сохранения конфигурации
function saveConfig() {
  const configPath = path.join(__dirname, '..', 'webapp-config.json');
  const config = {
    ...WEBAPP_CONFIG,
    createdAt: new Date().toISOString(),
    version: '1.0.0'
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✅ Конфигурация сохранена в webapp-config.json');
}

// Функция для создания HTML-файла с инструкциями
function createInstructionsHTML() {
  const htmlPath = path.join(__dirname, '..', 'docs', 'miniweb', 'setup-instructions.html');
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Настройка Web App - Wine Learning Bot</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f8f9fa;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        h2 {
            color: #333;
            margin-top: 30px;
        }
        .step {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
        }
        .code {
            background: #2d3748;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            overflow-x: auto;
        }
        .highlight {
            background: #fff3cd;
            padding: 10px;
            border-radius: 5px;
            border-left: 4px solid #ffc107;
        }
        .success {
            background: #d4edda;
            padding: 10px;
            border-radius: 5px;
            border-left: 4px solid #28a745;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🍷 Настройка Web App для Wine Learning Bot</h1>
        
        <div class="highlight">
            <strong>Внимание:</strong> Этот файл содержит пошаговые инструкции по настройке Web App в BotFather.
        </div>

        <h2>📋 Шаг 1: Создание Web App в BotFather</h2>
        <div class="step">
            <ol>
                <li>Откройте @BotFather в Telegram</li>
                <li>Отправьте команду: <code>/newapp</code></li>
                <li>Выберите вашего бота</li>
                <li>Заполните информацию:</li>
            </ol>
            
            <div class="code">
<strong>Название:</strong> ${WEBAPP_CONFIG.name}
<strong>Описание:</strong> ${WEBAPP_CONFIG.description}
<strong>URL:</strong> ${WEBAPP_CONFIG.url}
<strong>Иконка:</strong> Загрузите иконку 512x512px
            </div>
        </div>

        <h2>📋 Шаг 2: Настройка команд бота</h2>
        <div class="step">
            <p>Отправьте BotFather команду <code>/setcommands</code> и выберите вашего бота:</p>
            <div class="code">
${WEBAPP_CONFIG.commands.map(cmd => `${cmd.command} - ${cmd.description}`).join('\n')}
            </div>
        </div>

        <h2>📋 Шаг 3: Добавление кнопки Web App</h2>
        <div class="step">
            <p>Добавьте следующий код в ваш бот:</p>
            <div class="code">
const keyboard = {
  inline_keyboard: [
    [
      { 
        text: '🌐 Открыть Web App', 
        web_app: { url: '${WEBAPP_CONFIG.url}' } 
      }
    ],
    // ... другие кнопки
  ]
};
            </div>
        </div>

        <h2>📋 Шаг 4: Проверка работоспособности</h2>
        <div class="step">
            <ol>
                <li>Разверните бота: <code>npm run deploy</code></li>
                <li>Отправьте <code>/start</code> боту</li>
                <li>Нажмите кнопку "🌐 Открыть Web App"</li>
                <li>Убедитесь, что Web App открывается корректно</li>
            </ol>
        </div>

        <h2>🔧 Дополнительные настройки</h2>
        
        <h3>Настройка меню бота</h3>
        <div class="step">
            <p>Отправьте BotFather команду <code>/setmenubutton</code>:</p>
            <div class="code">
<strong>Текст кнопки:</strong> 🌐 Web App
<strong>URL:</strong> ${WEBAPP_CONFIG.url}
            </div>
        </div>

        <h3>Настройка описания бота</h3>
        <div class="step">
            <p>Отправьте BotFather команду <code>/setdescription</code>:</p>
            <div class="code">
${WEBAPP_CONFIG.description}
            </div>
        </div>

        <h3>Настройка информации о боте</h3>
        <div class="step">
            <p>Отправьте BotFather команду <code>/setabouttext</code>:</p>
            <div class="code">
🍷 Wine Learning Bot - Интерактивная система обучения официантов по ассортименту напитков ресторана KETCH UP.

🌐 Web App: ${WEBAPP_CONFIG.url}
            </div>
        </div>

        <div class="success">
            <h2>🚀 Готово!</h2>
            <p>После выполнения всех шагов ваш Web App будет доступен пользователям через кнопку в боте.</p>
        </div>
    </div>
</body>
</html>`;

  // Создаем директорию, если её нет
  const dir = path.dirname(htmlPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(htmlPath, html);
  console.log('✅ HTML-инструкции созданы в docs/miniweb/setup-instructions.html');
}

// Функция для проверки конфигурации
function validateConfig() {
  console.log('🔍 Проверка конфигурации...');
  
  const requiredFields = ['name', 'description', 'url'];
  const missingFields = requiredFields.filter(field => !WEBAPP_CONFIG[field]);
  
  if (missingFields.length > 0) {
    console.error('❌ Отсутствуют обязательные поля:', missingFields.join(', '));
    return false;
  }
  
  if (!WEBAPP_CONFIG.url.startsWith('https://')) {
    console.error('❌ URL должен начинаться с https://');
    return false;
  }
  
  console.log('✅ Конфигурация корректна');
  return true;
}

// Главная функция
async function main() {
  console.log('🍷 Настройка Web App для Wine Learning Bot\n');
  
  if (!validateConfig()) {
    process.exit(1);
  }
  
  console.log('📋 Конфигурация Web App:');
  console.log(`   Название: ${WEBAPP_CONFIG.name}`);
  console.log(`   Описание: ${WEBAPP_CONFIG.description}`);
  console.log(`   URL: ${WEBAPP_CONFIG.url}\n`);
  
  // Сохраняем конфигурацию
  saveConfig();
  
  // Создаем HTML-инструкции
  createInstructionsHTML();
  
  // Выводим инструкции
  console.log('\n' + SETUP_INSTRUCTIONS);
  
  console.log('\n🎯 Следующие шаги:');
  console.log('1. Выполните инструкции выше');
  console.log('2. Разверните бота: npm run deploy');
  console.log('3. Протестируйте Web App');
  
  rl.close();
}

// Обработка ошибок
process.on('unhandledRejection', (error) => {
  console.error('❌ Необработанная ошибка:', error);
  process.exit(1);
});

// Запуск скрипта
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  WEBAPP_CONFIG,
  SETUP_INSTRUCTIONS,
  saveConfig,
  createInstructionsHTML,
  validateConfig
}; 