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
      <div className="glass-strong rounded-3xl shadow-2xl p-5 text-center animate-fade-in hover-lift">
        <div className="flex justify-center mb-3 animate-scale-in">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-3 rounded-full shadow-glow animate-pulse-glow">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold gradient-text mb-2 animate-slide-down">
          {t('pendingApproval', language)}
        </h1>
        <p className="text-gray-600 mb-3 text-sm animate-slide-up">
          {t('pendingApprovalMessage', language)}
        </p>
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-3 shadow-inner animate-slide-up">
          <div className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-semibold text-blue-800">
              {t('approvalNote', language)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-3xl shadow-2xl p-5 text-center animate-fade-in hover-lift">
      <div className="flex justify-center mb-3 animate-scale-in">
        <div className="relative">
          <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-3 rounded-full shadow-glow animate-pulse-glow">
            <CheckCircle2 className="w-12 h-12 text-white relative z-10" />
          </div>
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
        </div>
      </div>
      <h1 className="text-2xl font-extrabold gradient-text mb-2 animate-slide-down">
        {t('verificationSuccess', language)}
      </h1>
      <p className="text-gray-600 mb-3 text-sm animate-slide-up">
        {t('internetAccessActivated', language)}
      </p>
      <div className="flex flex-col items-center gap-2 animate-slide-up">
        <div className="relative">
          <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary-200 border-t-primary-600"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-8 w-8 border-3 border-primary-400 opacity-20"></div>
        </div>
        <p className="text-xs text-gray-600 font-medium">
          {t('redirecting', language)}{' '}
          <a href={redirectUrl} className="text-primary-600 hover:text-primary-700 font-bold underline decoration-2 underline-offset-2 transition-colors">
            {t('clickHere', language)}
          </a>
        </p>
      </div>
    </div>
  );
}

