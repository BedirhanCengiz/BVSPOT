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
    <div className="glass-strong rounded-3xl shadow-2xl p-8 animate-fade-in hover-lift">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 mb-4 shadow-glow animate-float">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold gradient-text mb-3 animate-slide-down">
          {t('guestWifiRegistration', language)}
        </h1>
        <p className="text-gray-600 text-lg animate-slide-up">
          {t('selectLoginMethod', language)}
        </p>
      </div>

      <div className="space-y-5">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.id} 
              className="glass rounded-2xl overflow-hidden border border-white/20 hover-lift transition-smooth animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`${item.bgColor} p-5 flex items-center gap-4 relative overflow-hidden`}>
                <div className="absolute inset-0 shimmer opacity-30"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${item.bgColor} shadow-lg transform transition-transform hover:scale-110`}>
                    <Icon className={`w-7 h-7 ${item.textColor}`} />
                  </div>
                  <h3 className={`font-bold text-xl ${item.textColor}`}>{item.title}</h3>
                </div>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4 bg-white/50">
                <button
                  onClick={() => onSelect(item.id, 'login')}
                  className={`group flex items-center justify-center gap-2 px-5 py-4 ${item.bgColor} ${item.hoverBg} ${item.textColor} rounded-xl font-semibold transition-all duration-300 border-2 ${item.borderColor} hover:scale-105 hover:shadow-lg relative overflow-hidden btn-glow`}
                >
                  <LogIn className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  <span className="relative z-10">{item.loginLabel}</span>
                </button>
                <button
                  onClick={() => onSelect(item.id, 'register')}
                  className="group flex items-center justify-center gap-2 px-5 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary-300 relative overflow-hidden"
                >
                  <UserPlus className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span className="relative z-10">{item.registerLabel}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200/50 shadow-inner animate-slide-up">
        <div className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-blue-800 text-center">
            {t('passportNote', language)}
          </p>
        </div>
      </div>
    </div>
  );
}

