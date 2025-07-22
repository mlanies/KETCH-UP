import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Learning from './pages/Learning';
import Drinks from './pages/Drinks';
import Achievements from './pages/Achievements';
import Profile from './pages/Profile';
import Motivation from './pages/Motivation';
import QuickTest from './components/QuickTest';
import PersonalizedTest from './components/PersonalizedTest';
import CategoryTest from './components/CategoryTest';
import DailyChallenges from './components/DailyChallenges';
import Logo from './assets/logo.svg';

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Навигация */}
      <nav className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                <img src={Logo} alt="KB Logo" className="w-7 h-7" />
              </div>
              <span className="font-semibold text-sm">Wine Learning</span>
            </div>
            <div className="flex gap-1">
              <Link 
                to="/" 
                className={`nav-link px-3 py-2 rounded-lg text-sm ${location.pathname === '/' ? 'active bg-slate-700/50' : ''}`}
              >
                Главная
              </Link>
              {/*
              <Link 
                to="/learning" 
                className={`nav-link px-3 py-2 rounded-lg text-sm ${location.pathname === '/learning' ? 'active bg-slate-700/50' : ''}`}
              >
                Обучение
              </Link>
              */}
              <Link 
                to="/drinks" 
                className={`nav-link px-3 py-2 rounded-lg text-sm ${location.pathname === '/drinks' ? 'active bg-slate-700/50' : ''}`}
              >
                Напитки
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Основной контент */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/drinks" element={<Drinks />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/profile" element={<Profile />} />
        
        {/* Новые маршруты для тестирования */}
        <Route path="/quick-test" element={<QuickTest />} />
        <Route path="/personalized-test" element={<PersonalizedTest />} />
        <Route path="/category-test" element={<CategoryTest />} />
        <Route path="/daily-challenges" element={<DailyChallenges />} />
        <Route path="/motivation" element={<Motivation />} />
      </Routes>
    </div>
  );
} 