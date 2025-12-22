'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  Globe,
  Wifi
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('token');
    }
    router.push('/admin/login');
  };

  const menuItems = [
    { href: '/admin/dashboard', labelKey: 'dashboard', icon: LayoutDashboard },
    { href: '/admin/users', labelKey: 'users', icon: Users },
    { href: '/admin/ssids', labelKey: 'ssidManagement', icon: Wifi },
    { href: '/admin/logs', labelKey: 'logs', icon: FileText },
    { href: '/admin/traffic', labelKey: 'webTraffic', icon: Globe },
    { href: '/admin/settings', labelKey: 'settings', icon: Settings },
  ];

  return (
    <div className="admin-panel min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex" style={{ caretColor: '#111827' }}>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img 
            src="/assets/bvspot_logo_metalic.png" 
            alt="BVSPOT Logo" 
            className="h-8 w-auto"
          />
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            BVSPOT
          </h1>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-20 w-56 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 shadow-xl transition-transform duration-300 ease-in-out flex-shrink-0`}
      >
        <div className="h-full flex flex-col">
          {/* Logo Section */}
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 mb-1">
              <img 
                src="/assets/bvspot_logo_metalic.png" 
                alt="BVSPOT Logo" 
                className="h-10 w-auto"
              />
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  BVSPOT
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('adminPanel', language)}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`} />
                  <span className={`font-medium text-xs ${isActive ? 'text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                    {t(item.labelKey, language)}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-3 border-t border-slate-200/50 dark:border-slate-700/50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 font-medium text-xs group"
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              {t('logout', language)}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <section className="lg:ml-13 flex-1 min-w-0 overflow-x-hidden">
        <main className="min-h-screen bg-transparent max-w-[1600px] mx-auto">{children}</main>
      </section>
    </div>
  );
}
