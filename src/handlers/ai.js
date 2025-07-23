// Функции для работы с AI (Cloudflare AI)

import { getWineData } from './data.js';
import { jsonResponse } from '../utils/cors.js';

// Кэш для ответов ИИ
const aiResponseCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 минут

// Функция для получения кэшированного ответа
function getCachedResponse(question, wineId = null) {
  const cacheKey = wineId ? `${wineId}_${question}` : question;
  const cached = aiResponseCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.response;
  }
  
  return null;
}

// Функция для сохранения ответа в кэш
function setCachedResponse(question, response, wineId = null) {
  const cacheKey = wineId ? `${wineId}_${question}` : question;
  aiResponseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });
}

// Функция для очистки старых записей кэша
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of aiResponseCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      aiResponseCache.delete(key);
    }
  }
}

// Функция для создания персонализированного промпта
function createPersonalizedPrompt(basePrompt, userContext = {}) {
  let personalizedPrompt = '';
  if (userContext.first_name) {
    personalizedPrompt += `${userContext.first_name}, `;
  } else if (userContext.username) {
    personalizedPrompt += `${userContext.username}, `;
  }
  personalizedPrompt += basePrompt;
  // Добавляем контекст пользователя
  if (userContext.difficulty) {
    personalizedPrompt += `\n\nУровень знаний пользователя: ${userContext.difficulty}`;
  }
  if (userContext.preferences) {
    personalizedPrompt += `\n\nПредпочтения пользователя: ${userContext.preferences.join(', ')}`;
  }
  if (userContext.previousQuestions) {
    personalizedPrompt += `\n\nПредыдущие вопросы пользователя: ${userContext.previousQuestions.slice(-3).join(', ')}`;
  }
  return personalizedPrompt;
}

// Функция для оптимизации промпта
function optimizePrompt(prompt, maxLength = 4000) {
  if (prompt.length <= maxLength) {
    return prompt;
  }
  
  // Удаляем менее важные части промпта
  const lines = prompt.split('\n');
  const essentialLines = [];
  let currentLength = 0;
  
  for (const line of lines) {
    if (currentLength + line.length > maxLength) {
      break;
    }
    
    // Приоритизируем важные строки
    if (line.includes('Ты эксперт') || 
        line.includes('ОТВЕЧАЙ') || 
        line.includes('Информация о напитке') ||
        line.includes('Вопрос клиента')) {
      essentialLines.push(line);
      currentLength += line.length;
    }
  }
  
  return essentialLines.join('\n');
}

// Функция для обращения к ИИ с контекстом конкретного напитка
export async function askCloudflareAIWithWineContext(question, wineId, env, userContext = {}) {
  console.log('=== askCloudflareAIWithWineContext START ===');
  console.log('question:', question);
  console.log('wineId:', wineId);
  console.log('userContext:', userContext);
  
  // Проверяем кэш
  const cachedResponse = getCachedResponse(question, wineId);
  if (cachedResponse) {
    console.log('Using cached response');
    return cachedResponse;
  }
  
  try {
    // Получаем данные о конкретном напитке
    const wines = await getWineData(env);
    const wine = wines.find(w => w.id === wineId);
    
    if (!wine) {
      console.log('Wine not found');
      return 'Извините, информация о напитке не найдена.';
    }

    console.log('Wine found:', wine.name);

    // Создаем детальный контекст с информацией о конкретном напитке
    let wineContext = `Название: ${wine.name}\nКатегория: ${wine.category}\n`;
    
    if (wine.category === 'Виски') {
      wineContext += `Страна: ${wine.country || 'не указана'}\nКрепость: ${wine.alcohol || 'не указана'}\nТип: ${wine.type || 'не указан'}\nВыдержка: ${wine.aging || 'не указана'}\n`;
    } else if (wine.category === 'Пиво') {
      wineContext += `Страна: ${wine.country || 'не указана'}\nПлотность: ${wine.density || 'не указана'}\nКрепость: ${wine.alcohol || 'не указана'}\n`;
    } else if (wine.category === 'Коктейли' || wine.category === 'Микс дринк' || wine.category === 'Лимонады и Милкшейки' || wine.category === 'Кофе') {
      wineContext += `Метод: ${wine.method || 'не указан'}\nПосуда: ${wine.glassware || 'не указана'}\nЛед: ${wine.ice || 'не указан'}\nСостав: ${wine.ingredients || 'не указан'}\n`;
    } else if (wine.category === 'Чай') {
      wineContext += `Состав: ${wine.ingredients || 'не указан'}\nМетод: ${wine.method || 'не указан'}\n`;
    } else if (wine.category === 'Премиксы') {
      wineContext += `Состав: ${wine.ingredients || 'не указан'}\n`;
    } else if (wine.category === 'ПФ') {
      wineContext += `Подкатегория: ${wine.subcategory || 'не указана'}\nСостав: ${wine.ingredients || 'не указан'}\n`;
    } else if (wine.category === 'нет в меню') {
      wineContext += `Подкатегория: ${wine.subcategory || 'не указана'}\nМетод: ${wine.method || 'не указан'}\nПосуда: ${wine.glassware || 'не указана'}\nЛед: ${wine.ice || 'не указан'}\nСостав: ${wine.ingredients || 'не указан'}\n`;
    } else {
      wineContext += `Сахар: ${wine.sugar || 'не указан'}\nКрепость: ${wine.alcohol || 'не указана'}\nСтрана: ${wine.country || 'не указана'}\n`;
    }
    
    wineContext += `Описание: ${wine.description || 'Описание отсутствует'}`;

    // Улучшенный промпт с контекстом конкретного напитка
    let systemPrompt = `Ты эксперт-сомелье и бармен с 20-летним опытом работы в ресторанах высокой кухни. Ты специализируешься на напитках всех категорий и знаешь все о правильной подаче, хранении, приготовлении и сочетании с блюдами.

ОТВЕЧАЙ ИСКЛЮЧИТЕЛЬНО НА РУССКОМ ЯЗЫКЕ. Будь дружелюбным, но профессиональным. Используй эмодзи для лучшего восприятия.

Информация о напитке:
${wineContext}

Твоя задача - дать экспертную консультацию по этому конкретному напитку.`;

    // Добавляем специфичные знания в зависимости от категории
    if (wine.category === 'Коктейли' || wine.category === 'Микс дринк') {
      systemPrompt += `

СПЕЦИАЛИЗАЦИЯ ПО КОКТЕЙЛЯМ:
- Знаешь все методы приготовления: Build, Shake, Stir, Muddle, Layer, Roll
- Понимаешь важность правильного выбора посуды и льда
- Можешь объяснить технику приготовления и подачи
- Знаешь историю и происхождение классических коктейлей
- Можешь дать советы по украшению и сервировке

Отвечай на вопросы о:
- Методе приготовления и технике
- Выборе правильной посуды и льда
- Правильной подаче и температуре
- Сочетании с блюдами
- Истории и происхождении коктейля
- Вариациях и модификациях
- Украшении и сервировке`;
    } else if (wine.category === 'Лимонады и Милкшейки') {
      systemPrompt += `

СПЕЦИАЛИЗАЦИЯ ПО БЕЗАЛКОГОЛЬНЫМ НАПИТКАМ:
- Знаешь особенности приготовления лимонадов и милкшейков
- Понимаешь важность свежих ингредиентов
- Можешь дать советы по украшению и подаче
- Знаешь о калорийности и питательной ценности

Отвечай на вопросы о:
- Приготовлении и ингредиентах
- Подаче и температуре
- Украшении и сервировке
- Калорийности и питательной ценности
- Вариациях рецептов`;
    } else if (wine.category === 'Чай') {
      systemPrompt += `

СПЕЦИАЛИЗАЦИЯ ПО ЧАЮ:
- Знаешь все виды чая и их особенности
- Понимаешь правильную температуру заваривания
- Можешь объяснить время заваривания для разных сортов
- Знаешь о пользе и свойствах чая

Отвечай на вопросы о:
- Правильном заваривании
- Температуре и времени
- Подаче и сервировке
- Пользе и свойствах
- Сочетании с едой`;
    } else if (wine.category === 'Кофе') {
      systemPrompt += `

СПЕЦИАЛИЗАЦИЯ ПО КОФЕ:
- Знаешь все способы приготовления кофе
- Понимаешь важность помола и температуры
- Можешь объяснить различия между сортами
- Знаешь о правильной подаче кофе

Отвечай на вопросы о:
- Способы приготовления
- Выборе зерен и помола
- Подаче и сервировке
- Сочетании с десертами
- Температуре подачи`;
    } else if (wine.category === 'Премиксы') {
      systemPrompt += `

СПЕЦИАЛИЗАЦИЯ ПО ПРЕМИКСАМ:
- Знаешь особенности работы с премиксами
- Понимаешь их преимущества и недостатки
- Можешь дать советы по хранению
- Знаешь о приготовлении коктейлей из премиксов

Отвечай на вопросы о:
- Хранении и сроке годности
- Приготовлении коктейлей
- Преимуществах и недостатках
- Вариациях использования`;
    } else {
      systemPrompt += `

Отвечай на вопросы о:
- Правильной подаче и температуре
- Выборе бокалов
- Сочетании с блюдами
- Хранении и выдержке
- Характеристиках и особенностях
- Истории и происхождении`;
    }

    systemPrompt += `

Если вопрос не связан с этим напитком, вежливо перенаправь разговор к теме этого напитка.`;

    // Создаем персонализированный промпт
    const personalizedPrompt = createPersonalizedPrompt(systemPrompt, userContext);
    const fullPrompt = `${personalizedPrompt}\n\nВопрос клиента: ${question}\n\nЭкспертная консультация:`;

    // Оптимизируем промпт
    const optimizedPrompt = optimizePrompt(fullPrompt);
    console.log('Prompt length:', optimizedPrompt.length);

    // Пробуем Cloudflare AI если настроен
    if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_AI_TOKEN) {
      try {
        console.log('Calling Cloudflare AI...');
        const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.CLOUDFLARE_AI_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt: optimizedPrompt })
        });
        
        const data = await response.json();
        console.log('Cloudflare AI response status:', response.status);
        
        if (data.result && data.result.response) {
          const aiResponse = data.result.response.trim();
          console.log('AI response received, length:', aiResponse.length);
          
          // Кэшируем ответ
          setCachedResponse(question, aiResponse, wineId);
          
          console.log('=== askCloudflareAIWithWineContext END ===');
          return aiResponse;
        } else if (data.errors && data.errors.length > 0) {
          console.error('Cloudflare AI error:', data.errors[0].message);
        }
      } catch (e) {
        console.error('Cloudflare AI request error:', e);
        console.error('Error stack:', e.stack);
      }
    } else {
      console.log('Cloudflare AI not configured');
    }

    // Улучшенные fallback ответы на основе ключевых слов для конкретного напитка
    const lowerQuestion = question.toLowerCase();
    const lowerWineName = wine.name.toLowerCase();
    
    let fallbackResponse = generateFallbackResponse(lowerQuestion, wine);
    
    // Кэшируем fallback ответ
    setCachedResponse(question, fallbackResponse, wineId);
    
    console.log('=== askCloudflareAIWithWineContext END ===');
    return fallbackResponse;
    
  } catch (error) {
    console.error('Error in askCloudflareAIWithWineContext:', error);
    console.error('Error stack:', error.stack);
    
    return `❌ Извините, произошла ошибка при обработке вашего вопроса. Попробуйте переформулировать вопрос или обратитесь к администратору.

🔍 Детали ошибки: ${error.message}`;
  }
}

// Функция для генерации fallback ответов
function generateFallbackResponse(lowerQuestion, wine) {
  if (lowerQuestion.includes('подача') || lowerQuestion.includes('температура') || lowerQuestion.includes('бокал')) {
    if (wine.category === 'Коктейли' || wine.category === 'Микс дринк') {
      return `🍹 *Рекомендации по подаче ${wine.name}*

🥤 **Метод приготовления:** ${wine.method || 'не указан'}
🥂 **Посуда:** ${wine.glassware || 'не указана'}
🧊 **Лед:** ${wine.ice || 'не указан'}
🌡️ **Температура подачи:** Охлажденный (4-8°C)
⏰ **Подготовка:** Подавайте сразу после приготовления

💡 *Совет:* ${wine.name} - это ${wine.category.toLowerCase()}. Обратите внимание на метод "${wine.method}" и правильный выбор посуды "${wine.glassware}".`;
    } else if (wine.category === 'Лимонады и Милкшейки') {
      return `🥤 *Рекомендации по подаче ${wine.name}*

🥤 **Метод приготовления:** ${wine.method || 'не указан'}
🥂 **Посуда:** ${wine.glassware || 'не указана'}
🧊 **Лед:** ${wine.ice || 'не указан'}
🌡️ **Температура подачи:** Охлажденный (2-6°C)
⏰ **Подготовка:** Подавайте сразу после приготовления

💡 *Совет:* ${wine.name} - освежающий безалкогольный напиток. Идеально подходит для жаркой погоды.`;
    } else if (wine.category === 'Чай') {
      return `🍵 *Рекомендации по подаче ${wine.name}*

🍵 **Состав:** ${wine.ingredients || 'не указан'}
☕ **Метод заваривания:** ${wine.method || 'не указан'}
🌡️ **Температура подачи:** Горячий (70-85°C)
⏰ **Подготовка:** Заваривайте согласно инструкции

💡 *Совет:* ${wine.name} лучше всего раскрывается при правильной температуре заваривания.`;
    } else if (wine.category === 'Кофе') {
      return `☕ *Рекомендации по подаче ${wine.name}*

☕ **Метод приготовления:** ${wine.method || 'не указан'}
🥂 **Посуда:** ${wine.glassware || 'не указана'}
🌡️ **Температура подачи:** Горячий (85-90°C)
⏰ **Подготовка:** Подавайте сразу после приготовления

💡 *Совет:* ${wine.name} - ароматный кофе. Подавайте с сахаром и молоком по желанию.`;
    } else if (wine.category === 'Вина') {
      let temp = '8-12°C';
      let glass = 'бокал для вина';
      
      if (wine.sugar === 'Брют') {
        temp = '6-8°C';
        glass = 'флейта для игристого';
      } else if (wine.sugar === 'Сухое') {
        temp = '8-12°C';
        glass = 'бокал для вина';
      } else if (wine.sugar === 'Полусладкое') {
        temp = '10-12°C';
        glass = 'бокал для десертного вина';
      }
      
      return `🍷 *Рекомендации по подаче ${wine.name}*

🌡️ **Температура подачи:** ${temp}
🥂 **Бокал:** ${glass}
⏰ **Подготовка:** Откройте за 15-30 минут до подачи
🍽️ **Подача:** Подавайте с подходящими блюдами

💡 *Совет:* Для лучшего раскрытия аромата слегка покачайте бокал перед дегустацией.`;
    } else if (wine.category === 'Виски') {
      return `🥃 *Рекомендации по подаче ${wine.name}*

🌡️ **Температура подачи:** 18-22°C
🥃 **Бокал:** стакан для виски (tumbler) или бокал для виски
🧊 **Лед:** Можно добавить 1-2 кубика льда или немного воды
⏰ **Подготовка:** Дайте постоять 5-10 минут для раскрытия аромата

💡 *Совет:* Для ${wine.type || 'этого виски'} лучше всего подходит чистая вода комнатной температуры.`;
    } else if (wine.category === 'Пиво') {
      return `🍺 *Рекомендации по подаче ${wine.name}*

🌡️ **Температура подачи:** 4-8°C
🍺 **Бокал:** пивной бокал или кружка
⏰ **Подготовка:** Подавайте сразу после открытия
🧊 **Лед:** Не добавляйте лед в пиво

💡 *Совет:* ${wine.name} лучше всего раскрывается при правильной температуре подачи.`;
    }
  }
  
  // Общий fallback ответ
  return `🍷 *О напитке ${wine.name}*

📋 **Основная информация:**
• Категория: ${wine.category}
• ${wine.description || 'Описание отсутствует'}

💡 *Задайте конкретный вопрос о:*
• Подаче и температуре
• Хранении
• Сочетании с блюдами
• Характеристиках
• Особенностях этого напитка`;
}

// Функция для обращения к ИИ с контекстом о напитках
export async function askCloudflareAI(question, env, userContext = {}) {
  console.log('=== askCloudflareAI START ===');
  console.log('question:', question);
  console.log('userContext:', userContext);
  
  // Проверяем кэш
  const cachedResponse = getCachedResponse(question);
  if (cachedResponse) {
    console.log('Using cached response');
    return cachedResponse;
  }
  
  try {
    // Получаем данные о напитках для контекста
    const wines = await getWineData(env);
    
    // Создаем детальный контекст с информацией о напитках
    const wineContext = wines ? wines.slice(0, 30).map(wine => {
      let info = `${wine.name} (${wine.category})`;
      if (wine.category === 'Виски') {
        info += ` - ${wine.country || 'не указана страна'}, ${wine.alcohol || 'не указана крепость'}, ${wine.type || 'не указан тип'}`;
      } else if (wine.category === 'Пиво') {
        info += ` - ${wine.country || 'не указана страна'}, ${wine.alcohol || 'не указана крепость'}, ${wine.density || 'не указана плотность'}`;
      } else if (wine.category === 'Коктейли' || wine.category === 'Микс дринк') {
        info += ` - ${wine.method || 'не указан метод'}, ${wine.glassware || 'не указана посуда'}, ${wine.ingredients || 'не указан состав'}`;
      } else if (wine.category === 'Лимонады и Милкшейки') {
        info += ` - ${wine.method || 'не указан метод'}, ${wine.glassware || 'не указана посуда'}, безалкогольный`;
      } else if (wine.category === 'Чай') {
        info += ` - ${wine.ingredients || 'не указан состав'}, ${wine.method || 'не указан метод заваривания'}`;
      } else if (wine.category === 'Кофе') {
        info += ` - ${wine.method || 'не указан метод'}, ${wine.glassware || 'не указана посуда'}`;
      } else {
        info += ` - ${wine.sugar || 'не указан сахар'}, ${wine.alcohol || 'не указана крепость'}, ${wine.country || 'не указана страна'}`;
      }
      return info;
    }).join('\n') : '';

    console.log('Wine context created, length:', wineContext.length);

    // Улучшенный промпт с контекстом
    const systemPrompt = `Ты эксперт-сомелье и бармен с 20-летним опытом работы в ресторанах высокой кухни. Ты специализируешься на всех категориях напитков: винах, виски, роме, текиле, джине, водке, ликерах, пиве, коктейлях, безалкогольных напитках, чае и кофе.

ОТВЕЧАЙ ИСКЛЮЧИТЕЛЬНО НА РУССКОМ ЯЗЫКЕ. Будь дружелюбным, но профессиональным. Используй эмодзи для лучшего восприятия.

Информация о напитках из ассортимента:
${wineContext}

Твоя задача - дать экспертную консультацию по напиткам. Отвечай на вопросы о:
- Видах и классификации напитков
- Правильной подаче и температуре
- Выборе бокалов и посуды
- Сочетании с блюдами
- Хранении и выдержке
- Характеристиках и особенностях
- Истории и происхождении напитков
- Регионах производства
- Методах приготовления коктейлей
- Техниках барменского искусства
- Безалкогольных напитках и их приготовлении
- Заваривании чая и приготовлении кофе

Если вопрос не связан с напитками, вежливо перенаправь разговор к теме напитков.`;

    // Создаем персонализированный промпт
    const personalizedPrompt = createPersonalizedPrompt(systemPrompt, userContext);
    const fullPrompt = `${personalizedPrompt}\n\nВопрос клиента: ${question}\n\nЭкспертная консультация:`;

    // Оптимизируем промпт
    const optimizedPrompt = optimizePrompt(fullPrompt);
    console.log('Prompt length:', optimizedPrompt.length);

    // Пробуем Cloudflare AI если настроен
    if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_AI_TOKEN) {
      try {
        console.log('Calling Cloudflare AI...');
        const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.CLOUDFLARE_AI_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt: optimizedPrompt })
        });
        
        const data = await response.json();
        console.log('Cloudflare AI response status:', response.status);
        
        if (data.result && data.result.response) {
          const aiResponse = data.result.response.trim();
          console.log('AI response received, length:', aiResponse.length);
          
          // Кэшируем ответ
          setCachedResponse(question, aiResponse);
          
          console.log('=== askCloudflareAI END ===');
          return aiResponse;
        } else if (data.errors && data.errors.length > 0) {
          console.error('Cloudflare AI error:', data.errors[0].message);
        }
      } catch (e) {
        console.error('Cloudflare AI request error:', e);
        console.error('Error stack:', e.stack);
      }
      } else {
    console.log('Cloudflare AI not configured');
  }

  // Улучшенные fallback ответы на основе ключевых слов
  const lowerQuestion = question.toLowerCase();
  
  let fallbackResponse = generateGeneralFallbackResponse(lowerQuestion);
  
  // Кэшируем fallback ответ
  setCachedResponse(question, fallbackResponse);
  
  console.log('=== askCloudflareAI END ===');
  return fallbackResponse;
  
  } catch (error) {
    console.error('Error in askCloudflareAI:', error);
    console.error('Error stack:', error.stack);
    
    return `❌ Извините, произошла ошибка при обработке вашего вопроса. Попробуйте переформулировать вопрос или обратитесь к администратору.

🔍 Детали ошибки: ${error.message}`;
  }
}

// Функция для генерации общих fallback ответов
function generateGeneralFallbackResponse(lowerQuestion) {
  
  if (lowerQuestion.includes('сухое') || lowerQuestion.includes('полусухое') || lowerQuestion.includes('сладкое') || lowerQuestion.includes('сахар')) {
    return `🍷 *О содержании сахара в напитках*

**Вина:**
• 🥂 **Брют** - менее 6 г/л сахара, очень сухое игристое
• 🍷 **Сухое** - менее 4 г/л сахара, чистый, свежий вкус
• 🍷 **Полусухое** - 4-12 г/л сахара, более мягкий вкус  
• 🍷 **Полусладкое** - 12-45 г/л сахара, сладковатый вкус
• 🍷 **Сладкое** - более 45 г/л сахара, десертное вино

**Крепкие спирты:**
• 🥃 **Сухой** - без добавления сахара (виски, ром, джин, водка)
• 🍯 **Сладкий** - с добавлением сахара (ликеры, вермуты)

💡 *Совет:* Используйте фильтр "По сахару" для поиска подходящих напитков.`;
  }
  
  if (lowerQuestion.includes('крепость') || lowerQuestion.includes('алкоголь') || lowerQuestion.includes('%')) {
    return `🥃 *О крепости напитков*

**Вина:**
• 🍷 **Легкие** - 8-11% алкоголя
• 🍷 **Средние** - 11-13% алкоголя  
• 🍷 **Крепкие** - 13-15% алкоголя

**Крепкие спирты:**
• 🥃 **Виски, Ром, Джин, Водка** - 35-45% алкоголя
• 🥃 **Коньяк, Бренди** - 40-45% алкоголя
• 🍯 **Ликеры** - 15-30% алкоголя

**Пиво:**
• 🍺 **Легкое** - 3-4% алкоголя
• 🍺 **Среднее** - 4-6% алкоголя
• 🍺 **Крепкое** - 6-8% алкоголя

💡 *Совет:* Крепость влияет на вкус и способ подачи напитка.`;
  }
  
  if (lowerQuestion.includes('страна') || lowerQuestion.includes('регион')) {
    return `🌍 *О регионах производства напитков*

**Классические регионы:**
• 🇫🇷 **Франция** - вина, коньяки, шампанское
• 🇮🇹 **Италия** - вина, граппа, вермуты
• 🇪🇸 **Испания** - вина, порто, херес
• 🇺🇸 **США** - виски, вина, крафтовое пиво
• 🇬🇧 **Великобритания** - джин, виски, эль
• 🇲🇽 **Мексика** - текила, мескаль
• 🇨🇺 **Куба** - ром
• 🇯🇵 **Япония** - виски, саке

**Новые регионы:**
• 🇦🇺 **Австралия** - вина, виски
• 🇨🇱 **Чили** - вина
• 🇿🇦 **ЮАР** - вина
• 🇧🇷 **Бразилия** - кашаса

💡 *Совет:* Каждый регион имеет свои традиции и особенности производства.`;
  }
  
  if (lowerQuestion.includes('подача') || lowerQuestion.includes('температура') || lowerQuestion.includes('бокал')) {
    return `🍷 *Рекомендации по подаче напитков*

**Температура подачи:**
• 🥂 **Игристые вина** - 6-8°C
• 🍷 **Белые вина** - 8-12°C
• 🍷 **Розовые вина** - 10-12°C
• 🍷 **Красные вина** - 16-18°C
• 🥃 **Крепкие спирты** - 18-22°C
• 🍺 **Пиво** - 4-8°C
• 🍹 **Коктейли** - 4-8°C (охлажденные)
• 🥤 **Безалкогольные** - 2-6°C (охлажденные)
• 🍵 **Чай** - 70-85°C (горячий)
• ☕ **Кофе** - 85-90°C (горячий)

**Бокалы и посуда:**
• 🥂 **Игристое** - флейты или тюльпаны
• 🍷 **Красное вино** - бокалы с широкой чашей
• 🍷 **Белое вино** - бокалы с узкой чашей
• 🥃 **Виски/Коньяк** - стаканы для виски
• 🍺 **Пиво** - пивные бокалы
• 🍹 **Коктейли** - коктейльные бокалы, стаканы
• 🥤 **Лимонады** - высокие стаканы, бокалы
• 🍵 **Чай** - чайные чашки, пиалы
• ☕ **Кофе** - кофейные чашки, стаканы

💡 *Совет:* Правильная температура и посуда раскрывают истинный вкус напитка.`;
  }
  
  if (lowerQuestion.includes('коктейль') || lowerQuestion.includes('микс') || lowerQuestion.includes('бармен')) {
    return `🍹 *О коктейлях и барменском искусстве*

**Методы приготовления:**
• 🥤 **Build** - построение в бокале
• 🧊 **Shake** - встряхивание в шейкере
• 🥄 **Stir** - размешивание ложкой
• 🍃 **Muddle** - разминание ингредиентов
• 🌊 **Layer** - послойное наливание
• 🔄 **Roll** - перекатывание между бокалами

**Основные ингредиенты:**
• 🥃 **База** - виски, ром, джин, водка, текила
• 🍋 **Цитрусовые** - лимон, лайм, апельсин
• 🍯 **Сладкие** - сиропы, сахар, мед
• 🧊 **Лед** - кубики, дробленый, ледяная крошка
• 🌿 **Украшения** - мята, фрукты, цедра

**Посуда:**
• 🥤 **Шейкер** - для встряхивания
• 🥄 **Барная ложка** - для размешивания
• 🧊 **Айс-пик** - для работы со льдом
• 🍹 **Стрейнер** - для процеживания

💡 *Совет:* Качество коктейля зависит от свежих ингредиентов и правильной техники.`;
  }

  if (lowerQuestion.includes('хранение') || lowerQuestion.includes('сохранение')) {
    return `🏺 *Хранение напитков*

**Условия хранения:**
• 🌡️ **Температура:** 10-15°C для вин, 15-20°C для спиртов
• 💧 **Влажность:** 70-80%
• 🌑 **Освещение:** Полная темнота
• 📦 **Положение:** Горизонтально для бутылок с пробкой

**Сроки хранения:**
• 🍷 **Молодые вина** - 1-3 года
• 🍷 **Выдержанные вина** - 5-15 лет
• 🍷 **Коллекционные вина** - 20+ лет
• 🥃 **Крепкие спирты** - Неограниченно
• 🍹 **Коктейли** - Не хранятся, подаются сразу
• 🥤 **Безалкогольные** - 1-2 дня в холодильнике
• 🍵 **Чай** - 2-3 года в сухом месте
• ☕ **Кофе** - 6-12 месяцев в герметичной упаковке

**После открытия:**
• 🍷 **Вино** - 3-5 дней в холодильнике
• 🥃 **Спирты** - 6-12 месяцев
• 🍺 **Пиво** - 1-2 дня в холодильнике
• 🍹 **Коктейли** - Не хранятся
• 🥤 **Лимонады** - 1-2 дня в холодильнике

💡 *Совет:* Используйте вакуумную пробку для сохранения вина.`;
  }
  
  if (lowerQuestion.includes('безалкогольный') || lowerQuestion.includes('лимонад') || lowerQuestion.includes('милкшейк')) {
    return `🥤 *О безалкогольных напитках*

**Виды безалкогольных напитков:**
• 🍋 **Лимонады** - освежающие напитки с цитрусовыми
• 🥛 **Милкшейки** - густые напитки с молоком и мороженым
• 🧃 **Соки** - натуральные фруктовые и овощные
• 🥤 **Газированные** - с газом и сиропами
• 🧋 **Смузи** - густые фруктовые коктейли

**Особенности приготовления:**
• 🌿 **Свежие ингредиенты** - фрукты, ягоды, травы
• 🧊 **Лед** - кубики, дробленый, ледяная крошка
• 🍯 **Подсластители** - сахар, мед, сиропы
• 🌿 **Украшения** - мята, фрукты, ягоды

**Подача:**
• 🌡️ **Температура** - 2-6°C (охлажденные)
• 🥂 **Посуда** - высокие стаканы, бокалы
• ⏰ **Время** - подавать сразу после приготовления

💡 *Совет:* Безалкогольные напитки идеальны для всех возрастов и случаев.`;
  }

  if (lowerQuestion.includes('чай') || lowerQuestion.includes('заваривание')) {
    return `🍵 *О чае и его заваривании*

**Виды чая:**
• 🍃 **Зеленый** - неферментированный, легкий вкус
• 🍂 **Черный** - полностью ферментированный, крепкий
• 🌸 **Улун** - полуферментированный, средний
• 🌿 **Белый** - минимально обработанный, нежный
• 🌺 **Травяной** - из трав и цветов
• 🍊 **Фруктовый** - с добавлением фруктов

**Температура заваривания:**
• 🍃 **Зеленый чай** - 70-80°C
• 🍂 **Черный чай** - 95-100°C
• 🌸 **Улун** - 85-95°C
• 🌿 **Белый чай** - 65-75°C
• 🌺 **Травяной** - 95-100°C

**Время заваривания:**
• 🍃 **Зеленый** - 2-3 минуты
• 🍂 **Черный** - 3-5 минут
• 🌸 **Улун** - 3-4 минуты
• 🌿 **Белый** - 2-3 минуты

💡 *Совет:* Качество воды влияет на вкус чая. Используйте мягкую воду.`;
  }

  if (lowerQuestion.includes('кофе') || lowerQuestion.includes('зерна')) {
    return `☕ *О кофе и его приготовлении*

**Виды кофе:**
• 🟤 **Арабика** - мягкий, ароматный, 60-70% мирового производства
• 🟫 **Робуста** - крепкий, горький, высокое содержание кофеина
• 🟤 **Смеси** - комбинация разных сортов

**Способы приготовления:**
• ☕ **Эспрессо** - под давлением, концентрированный
• 🫖 **Фильтр-кофе** - капельный метод
• 🥤 **Френч-пресс** - настаивание под давлением
• 🧊 **Холодный** - длительное настаивание
• 🥛 **Капучино** - с молочной пеной
• 🥤 **Латте** - с большим количеством молока

**Помол:**
• 🔴 **Тонкий** - для эспрессо
• 🟡 **Средний** - для фильтр-кофе
• 🟢 **Крупный** - для френч-пресса

**Температура воды:** 90-96°C

💡 *Совет:* Свежемолотые зерна дают лучший аромат и вкус.`;
  }

  if (lowerQuestion.includes('блюда') || lowerQuestion.includes('еда') || lowerQuestion.includes('кухня') || lowerQuestion.includes('гарнир')) {
    return `🍽️ *Подбор напитков к блюдам*

**К красным винам:**
• 🥩 Мясные блюда (говядина, баранина, дичь)
• 🧀 Сырные блюда
• 🍝 Паста с мясными соусами
• 🍫 Шоколадные десерты

**К белым винам:**
• 🐟 Рыба и морепродукты
• 🍗 Птица (курица, индейка)
• 🥗 Легкие салаты
• 🥛 Сливочные соусы

**К игристым винам:**
• 🥂 Аперитивы
• 🥗 Легкие закуски
• 🧀 Сырные тарелки
• 🍰 Фруктовые десерты

**К крепким спиртам:**
• 🥃 Аперитивы
• 🧀 Сырные тарелки
• 🍫 Шоколадные десерты
• 🥜 Орехи и сухофрукты

**К коктейлям:**
• 🍹 Аперитивы, десерты, закуски
• 🍰 Сладкие десерты к сладким коктейлям
• 🥩 Мясные блюда к крепким коктейлям

**К безалкогольным:**
• 🥤 Любые блюда, подходят всем
• 🍰 Десерты к сладким напиткам
• 🥗 Легкие блюда к освежающим напиткам

**К чаю:**
• 🍵 Восточная кухня, десерты
• 🍰 Сладкие десерты, выпечка
• 🥗 Легкие закуски

**К кофе:**
• ☕ Завтраки, десерты
• 🍰 Шоколадные десерты, выпечка
• 🥛 Молочные продукты

💡 *Совет:* Учитывайте интенсивность блюда и напитка.`;
  }
  
  if (lowerQuestion.includes('игристое') || lowerQuestion.includes('шампанское') || lowerQuestion.includes('спарклинг')) {
    return `🥂 *Игристые вина*

**Виды игристых вин:**
• 🍾 **Шампанское** - только из региона Шампань во Франции
• 🥂 **Креман** - игристое вино из других регионов Франции
• 🥂 **Просекко** - итальянское игристое вино
• 🥂 **Кава** - испанское игристое вино
• 🥂 **Ламбруско** - итальянское красное игристое

**По содержанию сахара:**
• 🥂 **Брют Натюр** - без добавления сахара
• 🥂 **Брют** - очень сухое (до 6 г/л)
• 🥂 **Экстра Брют** - сухое (6-12 г/л)
• 🥂 **Брют Зеро** - без сахара

**Подача:**
• 🌡️ Температура: 6-8°C
• 🥂 Бокалы: флейты или тюльпаны
• ⚡ Открывать осторожно, избегая брызг

💡 *Совет:* Игристое вино - отличный аперитив!`;
  }

  // Общий ответ
  return `🍷 *Я эксперт-сомелье! Могу помочь с вопросами о:*

**Виды и классификация:**
• 🍷 Виды вин по сахару и региону
• 🥃 Типы виски и их особенности
• 🍺 Сорта пива и их характеристики
• 🍯 Крепкие спирты и ликеры

**Подача и сервировка:**
• 🌡️ Правильная температура подачи
• 🥂 Выбор бокалов
• ⏰ Подготовка к подаче

**Хранение и выдержка:**
• 🏺 Условия хранения
• ⏰ Сроки годности
• 🌑 Защита от света

**Сочетание с блюдами:**
• 🍽️ Подбор к разным блюдам
• 🧀 Сырные тарелки
• 🍰 Десерты

💡 *Задайте конкретный вопрос, и я с удовольствием помогу! Также можете использовать фильтры в боте для поиска конкретных напитков.*`;
}

// Функция для получения статистики кэша
export function getCacheStats() {
  const now = Date.now();
  const stats = {
    totalEntries: aiResponseCache.size,
    validEntries: 0,
    expiredEntries: 0,
    memoryUsage: 0
  };
  
  for (const [key, value] of aiResponseCache.entries()) {
    if (now - value.timestamp < CACHE_DURATION) {
      stats.validEntries++;
      stats.memoryUsage += key.length + value.response.length;
    } else {
      stats.expiredEntries++;
    }
  }
  
  return stats;
}

// Функция для очистки кэша
export function clearCache() {
  const beforeSize = aiResponseCache.size;
  cleanupCache();
  const afterSize = aiResponseCache.size;
  
  return {
    cleared: beforeSize - afterSize,
    remaining: afterSize
  };
}

// Функция для получения рекомендаций на основе истории пользователя
export function getPersonalizedRecommendations(userHistory = []) {
  const recommendations = [];
  
  // Анализируем предпочтения пользователя
  const categoryPreferences = {};
  const questionTypes = {};
  
  userHistory.forEach(entry => {
    if (entry.category) {
      categoryPreferences[entry.category] = (categoryPreferences[entry.category] || 0) + 1;
    }
    if (entry.questionType) {
      questionTypes[entry.questionType] = (questionTypes[entry.questionType] || 0) + 1;
    }
  });
  
  // Определяем любимые категории
  const topCategories = Object.entries(categoryPreferences)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);
  
  // Определяем типы вопросов
  const topQuestionTypes = Object.entries(questionTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([type]) => type);
  
  // Генерируем персонализированные рекомендации
  if (topCategories.length > 0) {
    recommendations.push({
      type: 'category',
      message: `🍷 Я заметил, что вас интересуют ${topCategories.join(', ')}. Могу рассказать больше об этих категориях!`,
      categories: topCategories
    });
  }
  
  if (topQuestionTypes.length > 0) {
    recommendations.push({
      type: 'question',
      message: `💡 Вы часто спрашиваете о ${topQuestionTypes.join(', ')}. Есть ли что-то конкретное, что вас интересует?`,
      questionTypes: topQuestionTypes
    });
  }
  
  return recommendations;
}

// Функция для анализа сложности вопроса
export function analyzeQuestionComplexity(question) {
  const complexity = {
    level: 'medium',
    score: 0,
    factors: []
  };
  
  const lowerQuestion = question.toLowerCase();
  
  // Простые вопросы
  if (lowerQuestion.includes('что это') || lowerQuestion.includes('как называется') || lowerQuestion.includes('что такое')) {
    complexity.score += 1;
    complexity.factors.push('basic_definition');
  }
  
  // Средние вопросы
  if (lowerQuestion.includes('как подавать') || lowerQuestion.includes('температура') || lowerQuestion.includes('бокал')) {
    complexity.score += 2;
    complexity.factors.push('serving_guidelines');
  }
  
  // Сложные вопросы
  if (lowerQuestion.includes('сочетание') || lowerQuestion.includes('гармония') || lowerQuestion.includes('выдержка') || lowerQuestion.includes('регион')) {
    complexity.score += 3;
    complexity.factors.push('advanced_knowledge');
  }
  
  // Экспертные вопросы
  if (lowerQuestion.includes('техника') || lowerQuestion.includes('метод') || lowerQuestion.includes('приготовление') || lowerQuestion.includes('рецепт')) {
    complexity.score += 4;
    complexity.factors.push('expert_technique');
  }
  
  // Определяем уровень сложности
  if (complexity.score <= 1) {
    complexity.level = 'easy';
  } else if (complexity.score <= 3) {
    complexity.level = 'medium';
  } else if (complexity.score <= 5) {
    complexity.level = 'hard';
  } else {
    complexity.level = 'expert';
  }
  
  return complexity;
}

// Тестирование ИИ
export async function testAI(request, env) {
  try {
    const { question, userContext } = await request.json();
    
    if (!question) {
      return jsonResponse({
        error: 'Question is required'
      }, 400);
    }
    
    console.log('Testing AI with question:', question);
    console.log('User context:', userContext);
    
    // Анализируем сложность вопроса
    const complexity = analyzeQuestionComplexity(question);
    console.log('Question complexity:', complexity);
    
    const answer = await askCloudflareAI(question, env, userContext);
    
    return jsonResponse({
      success: true,
      question: question,
      answer: answer,
      complexity: complexity,
      cacheStats: getCacheStats()
    });
  } catch (error) {
    console.error('AI test error:', error);
    return jsonResponse({
      error: error.message
    }, 500);
  }
} 