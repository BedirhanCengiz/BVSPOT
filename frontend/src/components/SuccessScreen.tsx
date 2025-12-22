'use client';

import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

interface SuccessScreenProps {
  redirectUrl?: string;
  isPendingApproval?: boolean;
}

export default function SuccessScreen({ redirectUrl = 'https://google.com', isPendingApproval = false }: SuccessScreenProps) {
  const { language } = useLanguage();

  useEffect(() => {
    if (!isPendingApproval) {
      // 3 saniye sonra yönlendir (sadece onaylanmış kullanıcılar için)
      const timer = setTimeout(() => {
        window.location.href = redirectUrl;
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [redirectUrl, isPendingApproval]);

  if (isPendingApproval) {
    return (
      <div className="glass-strong rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-4 md:p-6 lg:p-8 text-center animate-fade-in hover-lift w-full max-w-full">
        <div className="flex justify-center mb-2 sm:mb-3 md:mb-4 animate-scale-in">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-2.5 sm:p-3 md:p-4 rounded-full shadow-glow animate-pulse-glow">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-white" />
          </div>
        </div>
        <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold gradient-text mb-2 sm:mb-3 animate-slide-down px-2">
          {t('pendingApproval', language)}
        </h1>
        <p className="text-gray-600 mb-2 sm:mb-3 md:mb-4 text-[10px] sm:text-xs md:text-sm animate-slide-up px-2 sm:px-4">
          {t('pendingApprovalMessage', language)}
        </p>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-2 sm:p-2.5 md:p-3 shadow-inner animate-slide-up">
          <div className="flex items-center justify-center gap-1 sm:gap-1.5">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 animate-pulse flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-blue-800 leading-relaxed px-1 break-words">
              {t('approvalNote', language)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-4 md:p-6 lg:p-8 text-center animate-fade-in hover-lift w-full max-w-full">
      <div className="flex justify-center mb-2 sm:mb-3 md:mb-4 animate-scale-in">
        <div className="relative">
          <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-2.5 sm:p-3 md:p-4 rounded-full shadow-glow animate-pulse-glow">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-white relative z-10" />
          </div>
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
        </div>
      </div>
      <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold gradient-text mb-2 sm:mb-3 animate-slide-down px-2">
        {t('verificationSuccess', language)}
      </h1>
      <p className="text-gray-600 mb-2 sm:mb-3 md:mb-4 text-[10px] sm:text-xs md:text-sm animate-slide-up px-2 sm:px-4">
        {t('internetAccessActivated', language)}
      </p>
      <div className="flex flex-col items-center gap-2 sm:gap-2.5 md:gap-3 animate-slide-up">
        <div className="relative">
          <div className="animate-spin rounded-full h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 border-2 sm:border-3 md:border-4 border-primary-200 border-t-primary-600"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 border-2 sm:border-3 md:border-4 border-primary-400 opacity-20"></div>
        </div>
        <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 font-medium px-2 sm:px-4 text-center break-words">
          {t('redirecting', language)}{' '}
          <a href={redirectUrl} className="text-primary-600 hover:text-primary-700 font-bold underline decoration-2 underline-offset-2 transition-colors break-all">
            {t('clickHere', language)}
          </a>
        </p>
      </div>
    </div>
  );
}

