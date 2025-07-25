# Гостевой бот: структура меню и навигация (2024)

## Главное меню
- 🍽️ Меню (callback_data: section_menu)
- 🍷 Алкоголь (callback_data: section_alcohol)
- ✍️ Оставить отзыв (callback_data: guest_feedback)
- 🤖 AI-подбор блюд (callback_data: guest_ai_food_chat)
- 🤖 Спросить у AI (callback_data: guest_ask_ai)
- 🏪 О заведении (callback_data: guest_about)

## Навигация по категориям
- Все callback_data для категорий и напитков теперь без guest_ префикса:
  - category_cocktails, category_wines, category_beer и т.д.
  - drink_<id> — детали напитка
- Для возврата используются:
  - main_menu — главное меню
  - section_menu — список безалкогольных категорий
  - section_alcohol — список алкогольных категорий
  - back — возврат к предыдущему уровню (опционально)

## Унификация логики
- Все функции показа категорий, напитков и деталей вынесены в src/handlers/guest/menu-common.js.
- В src/handlers/guest/menu.js экспортируются только обертки для обратной совместимости.
- Данные о напитках берутся через getWineData, категории через getCategoryName.
- Стиль кнопок и callback_data полностью унифицирован с обучающим ботом.

## UX/Навигация
- На каждом уровне есть кнопки "Назад" (section_menu/section_alcohol) и "Главное меню" (main_menu).
- Пользователь всегда понимает, где он находится, по заголовку и кнопкам.
- Структура меню легко расширяется через menu-common.js.

## Пример структуры callback_data
```
section_menu
  └─ category_cocktails
      └─ drink_123
  └─ category_tea
      └─ drink_456
section_alcohol
  └─ category_wines
      └─ drink_789
```

## Где менять меню и навигацию?
- Основная логика: src/handlers/guest/menu-common.js
- Главное меню: функция sendGuestMainMenu в src/guest-bot.js

## Прочее
- Для отзывов, AI и справки используются отдельные callback_data (guest_feedback, guest_ai_food_chat и т.д.).
- Вся логика отзывов — в src/handlers/guest/feedback.js

---

_Документ обновлен для новой структуры меню и навигации гостевого бота. Все вопросы — к разработчику._ 