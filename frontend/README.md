# 🍷 Wine Frontend - React WebApp

Frontend приложение для Telegram Wine Bot, дублирующее функционал бота в веб-версии.

## 🚀 Быстрый старт

### Установка зависимостей
```bash
npm install
```

### Разработка
```bash
npm run dev
```
Приложение будет доступно по адресу: http://localhost:3000

### Сборка для продакшена
```bash
npm run build
```

### Деплой на Cloudflare Workers
```bash
npm run deploy
```

## 📁 Структура проекта

```
frontend/
├── src/
│   ├── components/          # Переиспользуемые компоненты
│   │   ├── LoadingSpinner.jsx
│   │   └── ErrorMessage.jsx
│   ├── pages/              # Страницы приложения
│   │   ├── Home.jsx        # Главная страница
│   │   ├── Learning.jsx    # Обучение
│   │   ├── Drinks.jsx      # База напитков
│   │   ├── Achievements.jsx # Достижения
│   │   └── Profile.jsx     # Профиль
│   ├── utils/              # Утилиты
│   │   ├── api.js          # API запросы к backend
│   │   └── telegram.js     # Telegram WebApp API
│   ├── App.jsx             # Основной компонент
│   ├── main.jsx            # Точка входа
│   └── index.css           # Стили Tailwind
├── index.html              # HTML шаблон
├── vite.config.js          # Конфигурация Vite
├── tailwind.config.js      # Конфигурация Tailwind
└── package.json            # Зависимости
```

## 🔧 Технологии

- **React 18** - Основной фреймворк
- **React Router** - Роутинг
- **Tailwind CSS** - Стилизация
- **Vite** - Сборщик и dev сервер
- **Telegram WebApp API** - Интеграция с Telegram

## 🌐 API интеграция

Приложение использует backend API для получения данных:

- `/user-stats` - Статистика пользователя
- `/user-achievements` - Достижения
- `/daily-challenges` - Ежедневные задания
- `/wine-data` - Данные о напитках

## 📱 Telegram WebApp

Приложение интегрировано с Telegram WebApp API для:
- Авторизации пользователя
- Получения chat_id
- Адаптации под тему Telegram
- Использования нативных компонентов

## 🎨 Дизайн

- Темная тема с винными акцентами
- Адаптивный дизайн
- Анимации и переходы
- Интеграция с темой Telegram

## 🔄 Разработка

1. Запустите dev сервер: `npm run dev`
2. Откройте http://localhost:3000
3. Для тестирования Telegram WebApp используйте BotFather и настройте Web App URL

## 📦 Деплой

Приложение деплоится на Cloudflare Workers через wrangler:
```bash
npm run deploy
```

URL после деплоя: https://your-domain 