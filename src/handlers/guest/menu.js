// src/handlers/guest/menu.js
// Модуль меню для гостевого бота

import { sendMessageWithKeyboard } from '../../handlers/telegramApi.js';
import { askCloudflareAI } from '../../handlers/ai.js';
import {
  showMenuCategories,
  showCategoryDrinks,
  showDrinkDetails,
  showAlcoholCategories
} from './menu-common.js';

export {
  guestMenuCategoryList,
  guestMenuCategoryDrinks,
  guestShowDrinkDetails,
  guestAlcoholCategoryList,
  guestAlcoholCategoryDrinks,
  startGuestAIFoodChat,
  handleGuestAIPrefsMessage
} from './menu-common.js'; 