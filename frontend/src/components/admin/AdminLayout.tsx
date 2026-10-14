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
  Wifi,
  Shield
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

  // Mobilde body scroll'unu engelle
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

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
    { href: '/admin/immutable-logs', labelKey: '5651Logs', icon: Shield },
    { href: '/admin/settings', labelKey: 'settings', icon: Settings },
  ];

  return (
    <div className="admin-panel min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex" style={{ caretColor: '#111827' }}>
      {/* Mobile Header - Hamburger Menu - Sadece sidebar kapalıyken görünür */}
      {!sidebarOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm p-3 sm:p-4 flex items-center justify-between sticky top-0 z-[60]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
            aria-label={t('openMenu', language) || 'Open menu'}
            aria-expanded={false}
          >
            <Menu className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          </button>
        </div>
      )}

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 dark:bg-black/70 z-[45] transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Mobilde hamburger menü, desktop'ta her zaman görünür */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-[50] lg:z-20 w-64 sm:w-72 lg:w-56 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-2xl lg:shadow-xl transition-transform duration-300 ease-in-out flex-shrink-0`}
        aria-label="Navigation menu"
      >
        <div className="h-full flex flex-col">
          {/* Logo Section */}
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 relative">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <img 
                  src="/assets/bvspot_logo_metalic.png" 
                  alt="BVSPOT Logo" 
                  className="h-12 sm:h-14 w-auto flex-shrink-0"
                />
                <div className="hidden sm:block min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{t('adminPanel', language)}</p>
                </div>
              </div>
              {/* Mobile close button - sadece mobilde görünür */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:scale-95 flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label={t('closeMenu', language) || 'Close menu'}
              >
                <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 sm:p-3 space-y-1 overflow-y-auto">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-2.5 sm:gap-2 px-3 py-2.5 sm:py-2 rounded-lg transition-all duration-200 active:scale-95 min-h-[44px] sm:min-h-[40px] ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  <Icon className={`w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0 transition-transform ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`} />
                  <span className={`font-medium text-sm sm:text-xs flex-1 min-w-0 truncate ${isActive ? 'text-white' : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                    {t(item.labelKey, language)}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-2 sm:p-3 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                handleLogout();
                setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-2.5 sm:gap-2 px-3 py-2.5 sm:py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 font-medium text-sm sm:text-xs group active:scale-95 min-h-[44px] sm:min-h-[40px]"
            >
              <LogOut className="w-5 h-5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-0.5 flex-shrink-0" />
              <span className="truncate">{t('logout', language)}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <section className="lg:ml-13 flex-1 min-w-0 overflow-x-hidden pt-0 lg:pt-0">
        <main className="min-h-screen bg-transparent max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6">{children}</main>
      </section>
    </div>
  );
}
