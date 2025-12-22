'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 glass-strong rounded-lg sm:rounded-xl shadow-lg p-1.5 sm:p-2 md:p-2.5 backdrop-blur-md border border-white/30">
      <Languages className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-700 flex-shrink-0" />
      <button
        onClick={() => setLanguage('tr')}
        className={`px-2 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold transition-all duration-300 active:scale-95 ${
          language === 'tr'
            ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg scale-105'
            : 'text-gray-700 hover:bg-white/50 hover:scale-105'
        }`}
      >
        🇹🇷 <span className="hidden sm:inline">TR</span>
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 sm:px-3 md:px-4 lg:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold transition-all duration-300 active:scale-95 ${
          language === 'en'
            ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg scale-105'
            : 'text-gray-700 hover:bg-white/50 hover:scale-105'
        }`}
      >
        🇬🇧 <span className="hidden sm:inline">EN</span>
      </button>
    </div>
  );
}

