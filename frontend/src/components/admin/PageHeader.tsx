'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

interface PageHeaderProps {
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  action?: ReactNode;
}

export default function PageHeader({ titleKey, descriptionKey, icon: Icon, action }: PageHeaderProps) {
  const { language } = useLanguage();
  
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 shadow-sm -mx-2 sm:-mx-4 lg:-mx-6 px-2 sm:px-4 lg:px-6 py-3 sm:py-4 md:py-5 mb-3 sm:mb-4 md:mb-6 lg:z-30">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 md:gap-0">
        <div className="flex items-start gap-2 sm:gap-2.5 md:gap-3 min-w-0 flex-1">
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-1.5 sm:p-2 md:p-2.5 rounded-lg shadow-md shadow-indigo-500/20 flex-shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-0.5 sm:mb-1 break-words">
              {t(titleKey, language)}
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 dark:text-slate-400 break-words">{t(descriptionKey, language)}</p>
          </div>
        </div>
        {action && <div className="w-full sm:w-auto flex-shrink-0">{action}</div>}
      </div>
    </header>
  );
}
