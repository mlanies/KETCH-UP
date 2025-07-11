// Тестовые данные для случаев, когда Google Sheets недоступен

export function getFallbackWineData() {
  return [
    // Вина
    {
      id: 'wine_1',
      name: 'Chateau Tamagne Brut Blanc',
      category: 'Вина',
      sugar: 'Брют',
      alcohol: '10.5-12.5%',
      country: 'Россия',
      description: 'Создано вино из нескольких сортов винограда – Шардоне, Алиготе, Рислинг Рейнский, Пино Белый, Бианка. Аромат игристое вино обладает развитым, тонким ароматом с хорошо выраженными цветочными тонами.',
      image: 'https://via.placeholder.com/400x600/FFD700/000000?text=Chateau+Tamagne+Brut+Blanc'
    },
    {
      id: 'wine_2',
      name: 'Tierra Natal Blanco',
      category: 'Вина',
      sugar: 'Сухое',
      alcohol: '11%',
      country: 'Испания',
      description: 'Сухое столовое вино из бленда винограда белых разновидностей. Оно обладает деликатным вкусом и букетом с нюансами цветов и фруктов.',
      image: 'https://via.placeholder.com/400x600/F5F5DC/000000?text=Tierra+Natal+Blanco'
    },
    {
      id: 'wine_3',
      name: 'Deep Creek Pinotage',
      category: 'Вина',
      sugar: 'Сухое',
      alcohol: '13.5%',
      country: 'ЮАР',
      description: 'Вино блестящего рубинового цвета, с ярким и спелым ароматом с оттенками темных фруктов и специй. Вкус сочный с хорошим балансом и мягкими танинами в послевкусии.',
      image: 'https://via.placeholder.com/400x600/8B0000/FFFFFF?text=Deep+Creek+Pinotage'
    },
    {
      id: 'wine_4',
      name: 'Bigi Vipra Rosa',
      category: 'Вина',
      sugar: 'Сухое',
      alcohol: '12%',
      country: 'Италия',
      description: 'Вино красивого кораллового цвета с вишнёвым блеском. В ярком аромате доминируют оттенки лепестка розы, фиалки, вишни и красных ягод.',
      image: 'https://via.placeholder.com/400x600/FFB6C1/000000?text=Bigi+Vipra+Rosa'
    },
    // Граппа, Порто, Коньяк, Вермут
    {
      id: 'wine_5',
      name: 'Martini Bianco',
      category: 'Граппа, Порто, Коньяк, Вермут',
      sugar: 'Сладкий',
      alcohol: '15%',
      country: 'Италия',
      description: 'Классический итальянский вермут с мягким вкусом и ароматом трав.',
      image: 'https://via.placeholder.com/400x600/F5F5DC/000000?text=Martini+Bianco'
    },
    {
      id: 'wine_6',
      name: 'Hennessy VS',
      category: 'Граппа, Порто, Коньяк, Вермут',
      sugar: 'Сухой',
      alcohol: '40%',
      country: 'Франция',
      description: 'Классический французский коньяк с богатым вкусом и ароматом.',
      image: 'https://via.placeholder.com/400x600/8B4513/FFFFFF?text=Hennessy+VS'
    },
    // Виски
    {
      id: 'wine_7',
      name: 'Jack Daniel\'s',
      category: 'Виски',
      country: 'США',
      alcohol: '40%',
      type: 'Бурбон',
      aging: '4 года',
      description: 'Классический американский виски с характерным вкусом.',
      sugar: 'Сухой',
      image: 'https://via.placeholder.com/400x600/8B4513/FFFFFF?text=Jack+Daniels'
    },
    {
      id: 'wine_8',
      name: 'Glenfiddich 12',
      category: 'Виски',
      country: 'Шотландия',
      alcohol: '40%',
      type: 'Сингл Молт',
      aging: '12 лет',
      description: 'Шотландский виски с фруктовыми нотками и медовым вкусом.',
      sugar: 'Сухой',
      image: 'https://via.placeholder.com/400x600/DAA520/000000?text=Glenfiddich+12'
    },
    // Ром, Текила
    {
      id: 'wine_9',
      name: 'Bacardi Superior',
      category: 'Ром, Текила',
      sugar: 'Сухой',
      alcohol: '37.5%',
      country: 'Куба',
      description: 'Легкий белый ром с чистым вкусом.',
      image: 'https://via.placeholder.com/400x600/F5F5DC/000000?text=Bacardi+Superior'
    },
    {
      id: 'wine_10',
      name: 'Patron Silver',
      category: 'Ром, Текила',
      sugar: 'Сухой',
      alcohol: '40%',
      country: 'Мексика',
      description: 'Премиальная текила с мягким вкусом и ароматом агавы.',
      image: 'https://via.placeholder.com/400x600/90EE90/000000?text=Patron+Silver'
    },
    // Джин, Водка, Ликеры
    {
      id: 'wine_11',
      name: 'Gordon\'s London Dry Gin',
      category: 'Джин, Водка, Ликеры',
      sugar: 'Сухой',
      alcohol: '37.5%',
      country: 'Великобритания',
      description: 'Классический лондонский джин с ароматом можжевельника.',
      image: 'https://via.placeholder.com/400x600/90EE90/000000?text=Gordons+Gin'
    },
    {
      id: 'wine_12',
      name: 'Absolut Vodka',
      category: 'Джин, Водка, Ликеры',
      sugar: 'Сухой',
      alcohol: '40%',
      country: 'Швеция',
      description: 'Чистая шведская водка с нейтральным вкусом.',
      image: 'https://via.placeholder.com/400x600/F5F5DC/000000?text=Absolut+Vodka'
    },
    // Пиво
    {
      id: 'wine_13',
      name: 'Heineken',
      category: 'Пиво',
      country: 'Нидерланды',
      density: '11.5°P',
      alcohol: '5%',
      description: 'Светлое лагерное пиво с характерным вкусом.',
      sugar: 'Сухое',
      image: 'https://via.placeholder.com/400x600/FFD700/000000?text=Heineken'
    },
    {
      id: 'wine_14',
      name: 'Guinness Draught',
      category: 'Пиво',
      country: 'Ирландия',
      density: '10.5°P',
      alcohol: '4.2%',
      description: 'Темное стаут пиво с кремовой пеной и кофейными нотками.',
      sugar: 'Сухое',
      image: 'https://via.placeholder.com/400x600/2F1B14/FFFFFF?text=Guinness+Draught'
    },
    // Коктейли
    {
      id: 'wine_15',
      name: 'Мохито',
      category: 'Коктейли',
      method: 'Build',
      glassware: 'Хайбол',
      ice: 'Кубики',
      ingredients: 'Белый ром, сахарный сироп, лайм, мята, содовая',
      description: 'Классический коктейль с освежающим вкусом мяты и лайма.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Mojito_001.jpg'
    },
    {
      id: 'wine_16',
      name: 'Маргарита',
      category: 'Коктейли',
      method: 'Shake',
      glassware: 'Коктейльный бокал',
      ice: 'Кубики',
      ingredients: 'Текила, трипл сек, лаймовый сок',
      description: 'Мексиканский коктейль с кисло-сладким вкусом.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/MargaritaReal.jpg'
    },
    {
      id: 'wine_17',
      name: 'Негрони',
      category: 'Коктейли',
      method: 'Stir',
      glassware: 'Старомодный бокал',
      ice: 'Один большой кубик',
      ingredients: 'Джин, красный вермут, кампари',
      description: 'Итальянский коктейль с горьковатым вкусом.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Negroni_001.jpg'
    },
    // Микс дринк
    {
      id: 'wine_18',
      name: 'Длинный Айленд',
      category: 'Микс дринк',
      method: 'Shake',
      glassware: 'Хайбол',
      ice: 'Кубики',
      ingredients: 'Водка, джин, ром, текила, трипл сек, лимонный сок, кола',
      description: 'Крепкий коктейль с множеством спиртов.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Long_Island_Iced_Tea.jpg'
    },
    // Лимонады и Милкшейки
    {
      id: 'wine_19',
      name: 'Лимонный лимонад',
      category: 'Лимонады и Милкшейки',
      method: 'Shake',
      glassware: 'Хайбол',
      ice: 'Кубики',
      ingredients: 'Лимонный сок, сахарный сироп, содовая',
      description: 'Освежающий безалкогольный напиток.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Lemonade.jpg'
    },
    {
      id: 'wine_20',
      name: 'Клубничный милкшейк',
      category: 'Лимонады и Милкшейки',
      method: 'Blend',
      glassware: 'Бокал для милкшейка',
      ice: 'Дробленый лед',
      ingredients: 'Молоко, клубничное мороженое, клубника',
      description: 'Сладкий и густой молочный коктейль.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Strawberry_milkshake.jpg'
    },
    // Чай
    {
      id: 'wine_21',
      name: 'Зеленый чай',
      category: 'Чай',
      ingredients: 'Зеленый чай, горячая вода',
      method: 'Заваривание 3-5 минут при 80°C',
      description: 'Традиционный зеленый чай с нежным вкусом.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Green_tea_2.jpg'
    },
    // Кофе
    {
      id: 'wine_22',
      name: 'Эспрессо',
      category: 'Кофе',
      method: 'Эспрессо машина',
      glassware: 'Чашка для эспрессо',
      ice: 'Без льда',
      ingredients: 'Кофейные зерна, горячая вода',
      description: 'Крепкий итальянский кофе.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/4/45/A_small_cup_of_coffee.JPG'
    },
    // Премиксы
    {
      id: 'wine_23',
      name: 'Премикс Мохито',
      category: 'Премиксы',
      ingredients: 'Сахарный сироп, лаймовый сок, мятный сироп, ароматизаторы',
      description: 'Готовый премикс для коктейля Мохито.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Mojito_001.jpg'
    },
    // ПФ
    {
      id: 'wine_24',
      name: 'Специальный коктейль',
      category: 'ПФ',
      subcategory: 'Авторский',
      ingredients: 'Водка, ликер, фруктовый сок, сироп',
      description: 'Уникальный авторский коктейль от шеф-бармена.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Cocktail_in_a_coupe_glass.jpg'
    }
  ];
} 