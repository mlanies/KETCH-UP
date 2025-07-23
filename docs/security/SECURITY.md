# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 5.1.x   | :white_check_mark: |
| 5.0.x   | :x:                |
| 4.0.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

Use this section to tell people how to report a vulnerability.

Tell them where to go, how often they can expect to get an update on a
reported vulnerability, what to expect if the vulnerability is accepted or
declined, etc.

## Анонимизация данных для аналитики

- Для всех аналитических отчетов и логов используются только обезличенные идентификаторы: `chat_id` или внутренний `user_id`.
- Имя пользователя, username и фамилия не сохраняются и не используются в аналитике.
- В логах ошибок и отчетах исключены любые персональные данные, кроме технических идентификаторов.
