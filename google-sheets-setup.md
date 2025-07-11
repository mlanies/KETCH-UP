# Настройка Google Sheets API

## Пошаговая инструкция

### 1. Создание проекта в Google Cloud Console

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Нажмите "Выбрать проект" в верхней панели
3. Нажмите "Новый проект"
4. Введите название проекта (например, "Wine Bot API")
5. Нажмите "Создать"

### 2. Включение Google Sheets API

1. В меню слева выберите "APIs & Services" > "Library"
2. Найдите "Google Sheets API"
3. Нажмите на результат
4. Нажмите "Enable" (Включить)

### 3. Создание учетных данных

1. В меню слева выберите "APIs & Services" > "Credentials"
2. Нажмите "Create Credentials" > "API Key"
3. Скопируйте созданный API ключ
4. Нажмите "Restrict Key" для безопасности

### 4. Ограничение API ключа (рекомендуется)

1. В разделе "Application restrictions" выберите "HTTP referrers"
2. Добавьте домены, с которых будет доступ:
   - `*.workers.dev`
   - `*.cloudflare.com`
3. В разделе "API restrictions" выберите "Restrict key"
4. Выберите "Google Sheets API"
5. Нажмите "Save"

### 5. Создание Google Sheets

1. Перейдите на [Google Sheets](https://sheets.google.com)
2. Создайте новую таблицу
3. Назовите лист "Вина"
4. Добавьте заголовки в первой строке:
   ```
   A1: Название
   B1: Сахар
   C1: Крепость
   D1: Страна
   E1: Описание
   F1: Изображение
   ```

### 6. Настройка доступа к таблице

1. Нажмите кнопку "Share" (Поделиться) в правом верхнем углу
2. Нажмите "Change to anyone with the link"
3. Убедитесь, что установлено "Viewer" (Просмотр)
4. Нажмите "Done"

### 7. Получение ID таблицы

1. Скопируйте URL таблицы из адресной строки
2. ID находится между `/d/` и `/edit`:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```

### 8. Тестирование API

Проверьте доступность данных:

```bash
curl "https://sheets.googleapis.com/v4/spreadsheets/YOUR_SPREADSHEET_ID/values/A1:F10?key=YOUR_API_KEY"
```

Должен вернуться JSON с данными.

## Альтернативный способ: Service Account

Для более безопасного доступа можно использовать Service Account:

### 1. Создание Service Account

1. В Google Cloud Console перейдите в "APIs & Services" > "Credentials"
2. Нажмите "Create Credentials" > "Service Account"
3. Заполните форму:
   - Name: "Wine Bot Service Account"
   - Description: "Service account for Wine Bot"
4. Нажмите "Create and Continue"
5. Пропустите роли (Skip)
6. Нажмите "Done"

### 2. Создание ключа

1. Найдите созданный Service Account в списке
2. Нажмите на email
3. Перейдите на вкладку "Keys"
4. Нажмите "Add Key" > "Create new key"
5. Выберите "JSON"
6. Нажмите "Create"
7. Скачайте файл `credentials.json`

### 3. Предоставление доступа

1. Откройте Google Sheets
2. Нажмите "Share"
3. Добавьте email Service Account (из файла credentials.json)
4. Установите права "Editor"

### 4. Использование в коде

```javascript
// Для Service Account потребуется дополнительная настройка
// В данном боте используется простой API ключ
```

## Безопасность

### Рекомендации

1. **Ограничьте API ключ** по доменам и API
2. **Не публикуйте ключи** в публичных репозиториях
3. **Используйте переменные окружения** для хранения ключей
4. **Регулярно ротируйте ключи**
5. **Мониторьте использование** в Google Cloud Console

### Мониторинг

1. В Google Cloud Console перейдите в "APIs & Services" > "Dashboard"
2. Просматривайте статистику использования API
3. Настройте алерты при превышении лимитов

## Лимиты и квоты

### Бесплатные лимиты

- **Google Sheets API**: 300 запросов в минуту
- **Queries per day**: 300 запросов в день
- **Read requests**: 300 в минуту

### Платные планы

При превышении лимитов можно перейти на платный план:
1. Включите биллинг в Google Cloud Console
2. Настройте квоты в "APIs & Services" > "Quotas"

## Устранение проблем

### Ошибка "API key not valid"

1. Проверьте правильность API ключа
2. Убедитесь, что API включен
3. Проверьте ограничения ключа

### Ошибка "Access denied"

1. Проверьте права доступа к таблице
2. Убедитесь, что таблица доступна по ссылке
3. Проверьте ID таблицы

### Ошибка "Quota exceeded"

1. Проверьте лимиты в Google Cloud Console
2. Увеличьте квоты или перейдите на платный план
3. Оптимизируйте количество запросов

### Ошибка "Range not found"

1. Проверьте диапазон в коде (M1:R65)
2. Убедитесь, что данные есть в указанном диапазоне
3. Проверьте названия листов

## Тестирование

### Проверка доступа

```bash
# Проверка API ключа
curl "https://sheets.googleapis.com/v4/spreadsheets/YOUR_SPREADSHEET_ID?key=YOUR_API_KEY"

# Проверка данных
curl "https://sheets.googleapis.com/v4/spreadsheets/YOUR_SPREADSHEET_ID/values/A1:F5?key=YOUR_API_KEY"
```

### Проверка бота

1. Разверните бота
2. Отправьте `/start`
3. Проверьте загрузку данных
4. Протестируйте фильтры

## Дополнительные ресурсы

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Cloud Console](https://console.cloud.google.com/)
- [API Explorer](https://developers.google.com/apis-explorer/)
- [Quotas and Pricing](https://developers.google.com/sheets/api/limits) 