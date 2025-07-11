# Структура проекта Telegram Wine Bot

## Обзор
Проект был рефакторирован для улучшения поддерживаемости и масштабируемости. Код разделен на логические модули.

## Структура файлов

### Основные файлы
- `src/index.js` - Точка входа, роутинг и обработка HTTP-запросов
- `wrangler.toml` - Конфигурация Cloudflare Worker

### Модули обработчиков (`src/handlers/`)

#### `telegram.js` - Основная логика Telegram
- `handleWebhook()` - Обработка входящих сообщений от Telegram
- `handleMessage()` - Обработка текстовых сообщений
- `handleCallbackQuery()` - Обработка нажатий на кнопки
- `sendWelcomeMessage()` - Приветственное сообщение
- `sendMainMenu()` - Главное меню
- `handleSectionSelection()` - Выбор раздела (меню/алкоголь)
- `showWineDetails()` - Показать детали напитка
- `searchWineByName()` - Поиск по названию
- `sendHelpMessage()` - Справка
- `showAllWines()` - Показать все напитки
- `handleSearchByName()` - Обработка поиска
- `handleRefreshData()` - Обновление данных

#### `menu.js` - Логика раздела "Меню"
- `handleMenuSection()` - Обработка раздела меню (блюда ресторана)
- *Заготовка для будущего расширения функционала блюд*

#### `alcohol.js` - Логика раздела "Алкоголь"
- `handleAlcoholSection()` - Обработка раздела алкогольных напитков
- `handleCategorySelection()` - Выбор категории алкоголя
- `handleShowCategory()` - Показать все напитки в категории

#### `data.js` - Работа с данными
- `getWineData()` - Получение данных о винах (кеш + Google Sheets)
- `getSelectedSheetId()` - Получить выбранный sheetId
- `getSheetNameById()` - Получить название листа по ID
- `loadWinesFromGoogleSheets()` - Загрузка из Google Sheets
- `refreshWineData()` - Обновление данных
- `getWineNames()` - Получение названий вин
- `getAllWineData()` - Получение всех данных
- `getCurrentSheet()` - Информация о текущем листе

#### `telegramApi.js` - API Telegram
- `sendMessage()` - Отправка простого сообщения
- `sendMessageWithKeyboard()` - Отправка с клавиатурой
- `editMessage()` - Редактирование сообщения
- `sendPhotoWithCaption()` - Отправка фото с подписью
- `answerCallbackQuery()` - Ответ на callback query

#### `ai.js` - Работа с ИИ
- `askCloudflareAI()` - Обращение к Cloudflare AI
- `askCloudflareAIWithWineContext()` - ИИ с контекстом конкретного напитка
- `testAI()` - Тестирование ИИ

#### `filters.js` - Фильтры
- `handleFilterSelection()` - Выбор типа фильтра
- `handleFilterValueSelection()` - Выбор значения фильтра
- `testFilters()` - Тестирование фильтров

#### `webhook.js` - Управление вебхуками
- `setWebhook()` - Установка вебхука
- `deleteWebhook()` - Удаление вебхука
- `getBotStatus()` - Статус бота
- `getWebhookInfo()` - Информация о вебхуке

### Утилиты (`src/utils/`)

#### `categories.js` - Работа с категориями
- `getCategoryType()` - Получить тип категории по названию
- `getCategoryName()` - Получить название категории по типу

#### `fallbackData.js` - Тестовые данные
- `getFallbackWineData()` - Fallback данные для случаев недоступности Google Sheets

## Преимущества новой структуры

### 1. Модульность
- Каждый файл отвечает за конкретную область функциональности
- Легко добавлять новые функции
- Простое тестирование отдельных модулей

### 2. Разделение логики меню и алкоголя
- `menu.js` - отдельный модуль для блюд ресторана
- `alcohol.js` - отдельный модуль для алкогольных напитков
- Возможность независимого развития каждого раздела

### 3. Переиспользование кода
- Общие функции вынесены в отдельные модули
- Утилиты доступны для всех обработчиков

### 4. Масштабируемость
- Легко добавлять новые категории напитков
- Простое расширение функционала меню
- Возможность добавления новых типов фильтров

## API Endpoints

### Основные
- `GET /` - Статус бота
- `POST /webhook` - Webhook от Telegram
- `GET /set-webhook` - Установка webhook
- `GET /delete-webhook` - Удаление webhook

### Тестирование
- `GET /status` - Статус бота
- `GET /webhook-info` - Информация о webhook
- `GET /test-sheets` - Тест Google Sheets API
- `POST /test-ai` - Тест ИИ
- `GET /test-filters` - Тест фильтров

### Данные
- `POST /refresh-data` - Обновление данных
- `GET /wine-names` - Названия вин
- `GET /wine-data` - Все данные вин
- `GET /sheet` - Информация о текущем листе

## Команды бота

### Основные
- `/start` - Главное меню
- `/help` - Справка
- `/refresh` - Обновить данные (админ)

### Административные
- `/set_sheet <id>` - Установить sheetId
- `/sheet` - Показать текущий лист
- `/ai <вопрос>` - Задать вопрос ИИ

### Поиск
- Текстовый поиск по названию напитка
- Фильтры по сахару, крепости, стране
- Категории алкогольных напитков 