// Вспомогательные функции для работы с категориями

// Вспомогательная функция для получения типа категории
export function getCategoryType(categoryName) {
  switch (categoryName) {
    case 'Вина':
      return 'wines';
    case 'Граппа, Порто, Коньяк, Вермут':
      return 'spirits';
    case 'Виски':
      return 'whisky';
    case 'Ром, Текила':
      return 'rum_tequila';
    case 'Джин, Водка, Ликеры':
      return 'gin_vodka';
    case 'Пиво':
      return 'beer';
    case 'Коктейли':
      return 'cocktails';
    case 'Микс дринк':
      return 'mix_drinks';
    case 'Лимонады и Милкшейки':
      return 'lemonades_milkshakes';
    case 'Чай':
      return 'tea';
    case 'Кофе':
      return 'coffee';
    case 'Премиксы':
      return 'premixes';
    case 'ПФ':
      return 'pf';
    case 'нет в меню':
      return 'not_in_menu';
    default:
      return 'wines'; // fallback
  }
}

// Функция для получения названия категории по типу
export function getCategoryName(categoryType) {
  switch (categoryType) {
    case 'wines':
      return 'Вина';
    case 'spirits':
      return 'Граппа, Порто, Коньяк, Вермут';
    case 'whisky':
      return 'Виски';
    case 'rum_tequila':
      return 'Ром, Текила';
    case 'gin_vodka':
      return 'Джин, Водка, Ликеры';
    case 'beer':
      return 'Пиво';
    case 'cocktails':
      return 'Коктейли';
    case 'mix_drinks':
      return 'Микс дринк';
    case 'lemonades_milkshakes':
      return 'Лимонады и Милкшейки';
    case 'tea':
      return 'Чай';
    case 'coffee':
      return 'Кофе';
    case 'premixes':
      return 'Премиксы';
    case 'pf':
      return 'ПФ';
    case 'not_in_menu':
      return 'нет в меню';
    default:
      return 'Вина'; // fallback
  }
} 