# 🍷 Telegram Wine Bot - Система обучения с достижениями

Telegram бот для обучения официантов ресторана KETCH UP с расширенной системой геймификации, достижений и аналитики.

## 📁 Структура проекта

```
telegram-wine-bot/
  db/                # Скрипты и файлы базы данных (schema.sql, reset-user.sql, init-db.js, ...)
  docs/              # Документация по категориям
    ai/              # Документация по ИИ
    security/        # Документация по безопасности
    deployment/      # Руководство по развертыванию
    migration/       # Миграции и структура данных
    learning/        # Система обучения
    overview/        # Общая структура и описание
    changelog/       # История изменений и фиксов
    troubleshooting/ # Руководства по устранению неполадок
  scripts/           # Все тестовые и вспомогательные скрипты
  src/               # Исходный код бота
  package.json       # Зависимости
  README.md          # Этот файл
```

## ✨ Новые возможности

### 🏆 Система достижений
- **10 типов достижений** с прогрессивной системой наград
- **Система уровней** от Новичка до Легенды
- **История достижений** с датами получения
- **Уведомления** о новых достижениях

### 📊 Расширенная аналитика
- **Постоянное хранение** всех данных в Cloudflare D1
- **Статистика по категориям** и типам вопросов
- **Детальная аналитика** сессий обучения
- **Экспорт данных** пользователя

### 📅 Ежедневные задания
- **5 типов заданий** с автоматической генерацией
- **Система наград** за выполнение
- **Прогресс-трекинг** в реальном времени
- **Статистика выполнения** за неделю

### 💎 Система опыта
- **Очки опыта** за каждый ответ
- **Множители** для выходных и серий
- **Бонусы** за идеальные тесты
- **Прогресс уровней** с визуализацией

## 🏗️ Архитектура

### База данных (Cloudflare D1)
Файлы и скрипты для работы с базой данных находятся в папке [`db/`](db/).

### Модули системы
- **`src/handlers/database.js`** - Управление базой данных
- **`src/handlers/achievements.js`** - Система достижений и уровней
- **`src/handlers/dailyChallenges.js`** - Ежедневные задания
- **`src/handlers/learning.js`** - Обновленная система обучения

## 🚀 Быстрый старт

### 1. Клонирование и установка
```bash
git clone <repository-url>
cd telegram-wine-bot
npm install
```

### 2. Настройка базы данных
```bash
# Создание базы данных D1
npx wrangler d1 create wine-bot-db

# Обновление wrangler.toml с полученным database_id
# Применение схемы
npx wrangler d1 execute wine-bot-db --file=db/schema.sql
```

### 3. Настройка секретов
```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put GOOGLE_SHEETS_API_KEY
npx wrangler secret put GOOGLE_SHEETS_SPREADSHEET_ID
npx wrangler secret put GOOGLE_SHEETS_COCKTAIL_SPREADSHEET_ID
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_AI_TOKEN
```

### 4. Развертывание
```bash
npm run deploy
```

## 📱 Использование

### Главное меню
```
🍽️ Меню          🍷 Алкоголь
🎓 Обучение      🔍 Поиск
👤 Профиль       🏆 Достижения
📅 Задания       📊 Статистика
🤖 ИИ
```

### Система обучения
- **🎯 Быстрый тест** - 5 вопросов для быстрой проверки
- **📚 Урок по категории** - изучение конкретных категорий
- **🧠 ИИ-обучение** - персонализированные вопросы с ИИ
- **🎯 Персонализированный тест** - на основе вашего прогресса

### Профиль пользователя
```
👤 Ваш профиль

🏆 Уровень: 3 Знаток (75%)
📊 Общий счет: 450 баллов
💎 Очки опыта: 1,250 XP
📝 Всего вопросов: 89
✅ Правильных ответов: 67
🎯 Точность: 75%
🔥 Лучшая серия: 8 ответов
📅 Дней подряд: 5
```

### Достижения
- **🎯 Первые шаги** - 10 правильных ответов
- **🔥 Серия побед** - 5 ответов подряд
- **💎 Стобалльник** - 100 баллов
- **🤖 ИИ-мастер** - 10 ИИ-вопросов
- **📚 Категорийный эксперт** - все категории
- **🏆 Чемпион** - 1000 баллов

## 🔧 API эндпоинты

### Статистика пользователя
```bash
GET /user-stats?chatId=123456789
```

### Достижения пользователя
```bash
GET /user-achievements?chatId=123456789
```

### Ежедневные задания
```bash
GET /daily-challenges?chatId=123456789
```

### Экспорт данных
```bash
POST /export-data
Content-Type: application/json
{"chatId": 123456789}
```

## 📊 Мониторинг

### Просмотр логов
```bash
npx wrangler tail
```

### Проверка базы данных
```bash
# Все таблицы
npx wrangler d1 execute wine-bot-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# Статистика пользователей
npx wrangler d1 execute wine-bot-db --command="SELECT COUNT(*) as users FROM users;"
```

## 🛠️ Разработка

### Локальное тестирование
```bash
npm run dev
```

### Тестирование и скрипты
Все тестовые и вспомогательные скрипты теперь находятся в папке [`scripts/`](scripts/):
```bash
node scripts/test-buttons.js
node scripts/test-webhook.js
node scripts/test-security.js
node scripts/test-ai-improvements.js
node scripts/test-daily-challenges.js
node scripts/test-learning.js
```

## 📈 Производительность

- **Время ответа**: < 500ms
- **Поддержка**: 1000+ одновременных пользователей
- **Доступность**: 99.9%
- **Хранение**: Cloudflare D1 (SQLite)

## 🔒 Безопасность

- Валидация всех входных данных
- Защита от SQL-инъекций
- Rate limiting для API
- Шифрование секретов
- [Документация по безопасности](docs/security/SECURITY_GUIDE.md)

## 📚 Документация

- [Руководство по развертыванию](docs/deployment/DEPLOYMENT_GUIDE.md)
- [AI/ИИ-система](docs/ai/AI_IMPROVEMENTS.md)
- [Безопасность](docs/security/SECURITY_GUIDE.md)
- [Миграции и структура данных](docs/migration/)
- [Система обучения](docs/learning/)
- [Обзор и структура](docs/overview/)
- [История изменений и фиксов](docs/changelog/FIXES_SUMMARY.md)
- [Тесты и диагностика](docs/troubleshooting/)

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📄 Лицензия

MIT License - см. [LICENSE](LICENSE) файл

## 🆘 Поддержка

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Документация**: [docs/](docs/)
- **Telegram**: @your-support-bot

---

**Разработано для ресторана KETCH UP** 🍷✨ 