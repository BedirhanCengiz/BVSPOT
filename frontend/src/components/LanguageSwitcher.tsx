'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 glass-strong rounded-xl shadow-lg p-2 backdrop-blur-md border border-white/30">
      <Languages className="w-5 h-5 text-gray-700" />
      <button
        onClick={() => setLanguage('tr')}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
          language === 'tr'
            ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg scale-105'
            : 'text-gray-700 hover:bg-white/50 hover:scale-105'
        }`}
      >
        🇹🇷 TR
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
          language === 'en'
            ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg scale-105'
            : 'text-gray-700 hover:bg-white/50 hover:scale-105'
        }`}
      >
        🇬🇧 EN
      </button>
    </div>
  );
}

