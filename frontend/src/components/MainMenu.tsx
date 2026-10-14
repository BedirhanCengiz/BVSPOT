'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { CreditCard, FileText, Globe, LogIn, UserPlus } from 'lucide-react';
import { IdType } from '@/app/page';

interface MainMenuProps {
  onSelect: (idType: IdType, action: 'login' | 'register') => void;
}

export default function MainMenu({ onSelect }: MainMenuProps) {
  const { language } = useLanguage();

  const menuItems = [
    {
      id: 'tckn' as IdType,
      title: t('tckn', language),
      icon: CreditCard,
      loginLabel: t('loginWithTCKN', language),
      registerLabel: t('registerWithTCKN', language),
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-900',
      borderColor: 'border-blue-300',
      hoverBg: 'hover:bg-blue-200',
    },
    {
      id: 'passport' as IdType,
      title: t('passportNo', language),
      icon: FileText,
      loginLabel: t('loginWithPassport', language),
      registerLabel: t('registerWithPassport', language),
      bgColor: 'bg-green-100',
      textColor: 'text-green-900',
      borderColor: 'border-green-300',
      hoverBg: 'hover:bg-green-200',
    },
    {
      id: 'foreign_id' as IdType,
      title: t('foreignIdNo', language),
      icon: Globe,
      loginLabel: t('loginWithForeignId', language),
      registerLabel: t('registerWithForeignId', language),
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-900',
      borderColor: 'border-purple-300',
      hoverBg: 'hover:bg-purple-200',
    },
  ];

  return (
    <div className="glass-strong rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-5 md:p-6 lg:p-8 animate-fade-in hover-lift w-full max-w-full">
      <div className="text-center mb-3 sm:mb-4 md:mb-5">
        <div className="inline-flex items-center justify-center mb-2 sm:mb-3">
          <img 
            src="/assets/bvspot_logo_metalic.png" 
            alt="Vintra Logo" 
            className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto"
          />
        </div>
        <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold gradient-text mb-1 sm:mb-2 animate-slide-down px-2">
          {t('guestWifiRegistration', language)}
        </h1>
        <p className="text-gray-600 text-[10px] sm:text-xs md:text-sm animate-slide-up px-2 sm:px-4">
          {t('selectLoginMethod', language)}
        </p>
      </div>

      <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.id} 
              className="glass rounded-2xl overflow-hidden border border-white/20 hover-lift transition-smooth animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`${item.bgColor} p-2 sm:p-2.5 md:p-3 flex items-center gap-1.5 sm:gap-2 relative overflow-hidden`}>
                <div className="absolute inset-0 shimmer opacity-30"></div>
                <div className="relative z-10 flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                  <div className={`p-1.5 sm:p-2 rounded-lg ${item.bgColor} shadow-lg transform transition-transform hover:scale-110 flex-shrink-0`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.textColor}`} />
                  </div>
                  <h3 className={`font-bold text-xs sm:text-sm ${item.textColor} truncate flex-1`}>{item.title}</h3>
                </div>
              </div>
              <div className="p-2 sm:p-2.5 md:p-3 grid grid-cols-2 gap-1.5 sm:gap-2 bg-white/50">
                <button
                  onClick={() => onSelect(item.id, 'login')}
                  className={`group flex items-center justify-center gap-1 px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2.5 ${item.bgColor} ${item.hoverBg} ${item.textColor} rounded-lg font-semibold text-[10px] sm:text-xs transition-all duration-300 border-2 ${item.borderColor} hover:scale-105 hover:shadow-lg active:scale-95 relative overflow-hidden btn-glow min-h-[36px] sm:min-h-[40px]`}
                >
                  <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1 flex-shrink-0" />
                  <span className="relative z-10 truncate text-center">{item.loginLabel}</span>
                </button>
                <button
                  onClick={() => onSelect(item.id, 'register')}
                  className="group flex items-center justify-center gap-1 px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 md:py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold text-[10px] sm:text-xs hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary-300 active:scale-95 relative overflow-hidden min-h-[36px] sm:min-h-[40px]"
                >
                  <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:scale-110 flex-shrink-0" />
                  <span className="relative z-10 truncate text-center">{item.registerLabel}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 sm:mt-3 md:mt-4 p-1.5 sm:p-2 md:p-2.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200/50 shadow-inner animate-slide-up">
        <div className="flex items-center justify-center gap-1 sm:gap-1.5">
          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 animate-pulse flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[9px] sm:text-[10px] md:text-xs font-medium text-blue-800 text-center leading-tight px-1 break-words">
            {t('passportNote', language)}
          </p>
        </div>
      </div>
    </div>
  );
}

