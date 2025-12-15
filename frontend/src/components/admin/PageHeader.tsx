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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-slate-200 shadow-sm -mx-6 px-6 py-4 mb-6 lg:z-30">
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-2 rounded-lg shadow-md shadow-indigo-500/20">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-0.5">
              {t(titleKey, language)}
            </h1>
            <p className="text-sm text-slate-600">{t(descriptionKey, language)}</p>
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  );
}
