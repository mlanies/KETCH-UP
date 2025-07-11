#!/bin/bash

# Telegram Wine Bot Setup Script
# Скрипт для автоматической настройки и развертывания бота

set -e

echo "🍷 Telegram Wine Bot Setup"
echo "=========================="

# Проверка наличия wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI не установлен. Устанавливаем..."
    npm install -g wrangler
fi

# Проверка авторизации в Cloudflare
echo "🔐 Проверка авторизации в Cloudflare..."
if ! wrangler whoami &> /dev/null; then
    echo "⚠️  Необходима авторизация в Cloudflare"
    wrangler login
fi

# Создание KV namespace
echo "🗄️  Создание KV namespace для кеширования..."
PRODUCTION_NAMESPACE=$(wrangler kv:namespace create "WINE_CACHE" --preview=false 2>&1 | grep -o 'id="[^"]*"' | cut -d'"' -f2)
PREVIEW_NAMESPACE=$(wrangler kv:namespace create "WINE_CACHE" --preview 2>&1 | grep -o 'id="[^"]*"' | cut -d'"' -f2)

echo "✅ Production namespace ID: $PRODUCTION_NAMESPACE"
echo "✅ Preview namespace ID: $PREVIEW_NAMESPACE"

# Обновление wrangler.toml
echo "📝 Обновление конфигурации..."
sed -i.bak "s/your-kv-namespace-id/$PRODUCTION_NAMESPACE/g" wrangler.toml
sed -i.bak "s/your-preview-kv-namespace-id/$PREVIEW_NAMESPACE/g" wrangler.toml

# Запрос переменных окружения
echo ""
echo "🔧 Настройка переменных окружения"
echo "=================================="

read -p "Введите Telegram Bot Token: " TELEGRAM_TOKEN
read -p "Введите Google Sheets API Key: " GOOGLE_API_KEY
read -p "Введите Google Sheets Spreadsheet ID: " SPREADSHEET_ID
read -p "Введите URL вашего Worker (например, https://your-bot.your-subdomain.workers.dev): " WORKER_URL

# Установка секретов
echo "🔒 Установка секретных переменных..."
echo "$TELEGRAM_TOKEN" | wrangler secret put TELEGRAM_BOT_TOKEN
echo "$GOOGLE_API_KEY" | wrangler secret put GOOGLE_SHEETS_API_KEY
echo "$SPREADSHEET_ID" | wrangler secret put GOOGLE_SHEETS_SPREADSHEET_ID
echo "$WORKER_URL" | wrangler secret put WORKER_URL

# Развертывание
echo "🚀 Развертывание бота..."
wrangler deploy

# Установка вебхука
echo "🔗 Установка вебхука..."
curl "$WORKER_URL/set-webhook"

echo ""
echo "✅ Настройка завершена!"
echo "=========================="
echo "🌐 Worker URL: $WORKER_URL"
echo "📊 Статус бота: $WORKER_URL/status"
echo "🔄 Обновление данных: POST $WORKER_URL/refresh-data"
echo ""
echo "📱 Теперь можете протестировать бота в Telegram!"
echo "💡 Используйте команду /start для начала работы" 