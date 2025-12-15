'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import PageHeader from '@/components/admin/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { Settings } from 'lucide-react';

export default function AdminSettings() {
  const { language } = useLanguage();
  
  return (
    <AdminLayout>
      <div className="px-6 pt-4 pb-6">
        <PageHeader
          titleKey="settingsTitle"
          descriptionKey="settingsDescription"
          icon={Settings}
        />
        
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <p className="text-slate-600 text-center">{t('settingsComingSoon', language)}</p>
        </div>
      </div>
    </AdminLayout>
  );
}

