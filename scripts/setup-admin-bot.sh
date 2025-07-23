#!/bin/bash

# Скрипт для настройки админ-бота
# Использование: ./scripts/setup-admin-bot.sh

set -e

echo "🚀 Настройка админ-бота для Telegram Wine Bot"
echo "=============================================="

# Проверяем наличие wrangler
if ! command -v npx &> /dev/null; then
    echo "❌ Ошибка: npx не найден. Установите Node.js и npm."
    exit 1
fi

# Проверяем наличие wrangler
if ! npx wrangler --version &> /dev/null; then
    echo "❌ Ошибка: wrangler не найден. Установите Cloudflare Workers CLI."
    exit 1
fi

echo "✅ Проверка зависимостей завершена"

# Запрашиваем токен бота
echo ""
echo "📝 Введите токен админ-бота (получите у @BotFather):"
read -s ADMIN_BOT_TOKEN

if [ -z "$ADMIN_BOT_TOKEN" ]; then
    echo "❌ Ошибка: токен не может быть пустым"
    exit 1
fi

echo "✅ Токен получен"

# Запрашиваем chat_id администратора
echo ""
echo "📝 Введите ваш chat_id (ID пользователя в Telegram):"
read ADMIN_CHAT_ID

if [ -z "$ADMIN_CHAT_ID" ] || ! [[ "$ADMIN_CHAT_ID" =~ ^[0-9]+$ ]]; then
    echo "❌ Ошибка: chat_id должен быть числом"
    exit 1
fi

echo "✅ Chat ID получен: $ADMIN_CHAT_ID"

# Создаем таблицу отзывов
echo ""
echo "🗄️ Создание таблицы отзывов в базе данных..."
if npx wrangler d1 execute DB --file=./db/add-feedback-table.sql; then
    echo "✅ Таблица отзывов создана"
else
    echo "❌ Ошибка при создании таблицы отзывов"
    exit 1
fi

# Устанавливаем секрет
echo ""
echo "🔐 Установка токена в секреты..."
if echo "$ADMIN_BOT_TOKEN" | npx wrangler secret put ADMIN_BOT_TOKEN --env admin; then
    echo "✅ Токен сохранен в секретах"
else
    echo "❌ Ошибка при сохранении токена"
    exit 1
fi

# Деплоим бота
echo ""
echo "🚀 Деплой админ-бота..."
if npx wrangler deploy --env admin; then
    echo "✅ Админ-бот успешно развернут"
else
    echo "❌ Ошибка при деплое"
    exit 1
fi

# Устанавливаем webhook
echo ""
echo "🔗 Установка webhook..."
WEBHOOK_URL="https://telegram-wine-bot-admin.2gc.workers.dev"
WEBHOOK_RESPONSE=$(curl -s "https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}")

if echo "$WEBHOOK_RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Webhook установлен"
else
    echo "❌ Ошибка при установке webhook:"
    echo "$WEBHOOK_RESPONSE"
    exit 1
fi

# Проверяем webhook
echo ""
echo "🔍 Проверка webhook..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/getWebhookInfo")
echo "$WEBHOOK_INFO"

# Обновляем chat_id в коде
echo ""
echo "📝 Обновление chat_id в коде..."
sed -i.bak "s/const ADMIN_IDS = \[123456789\];/const ADMIN_IDS = [$ADMIN_CHAT_ID];/" src/admin-bot.js
echo "✅ Chat ID обновлен в коде"

# Создаем файл конфигурации
echo ""
echo "📄 Создание файла конфигурации..."
cat > admin-bot-config.json << EOF
{
  "admin_chat_id": $ADMIN_CHAT_ID,
  "webhook_url": "$WEBHOOK_URL",
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "1.0.0"
}
EOF
echo "✅ Файл конфигурации создан: admin-bot-config.json"

echo ""
echo "🎉 Настройка админ-бота завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Найдите вашего бота в Telegram"
echo "2. Отправьте команду /start"
echo "3. Проверьте доступ к админ-панели"
echo ""
echo "🔧 Полезные команды:"
echo "- Просмотр логов: npx wrangler tail telegram-wine-bot-admin"
echo "- Обновление бота: npx wrangler deploy --env admin"
echo "- Проверка webhook: curl \"https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/getWebhookInfo\""
echo ""
echo "📚 Документация: docs/admin-bot/README.md"
echo ""
echo "⚠️  Важно: После тестирования включите проверку доступа в src/admin-bot.js" 