'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import PageHeader from '@/components/admin/PageHeader';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { adminAPI } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { Settings, Users, Clock, Palette, Plus, Trash2, Edit, X } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminSettings() {
  const router = useRouter();
  const { language } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'admins' | 'session' | 'theme'>('admins');
  
  // Admin users
  const [admins, setAdmins] = useState<any[]>([]);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [createAdminData, setCreateAdminData] = useState({ email: '', password: '', confirmPassword: '', role: 'admin' });
  
  // Settings
  const [settings, setSettings] = useState<any>({});
  const [sessionSettings, setSessionSettings] = useState({ inactiveTimeoutHours: 24, maxSessionHours: 72 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }
    }
    loadData();
  }, [router]);

  // Modal açıldığında body scroll'unu engelle
  useEffect(() => {
    if (showCreateAdmin) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCreateAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsResponse, adminsResponse] = await Promise.all([
        adminAPI.getSettings(),
        adminAPI.getAdmins()
      ]);
      
      const settingsData = settingsResponse.data.settings || {};
      setSettings(settingsData);
      
      if (settingsData.inactive_timeout_hours) {
        setSessionSettings(prev => ({
          ...prev,
          inactiveTimeoutHours: parseInt(settingsData.inactive_timeout_hours.value) || 24
        }));
      }
      if (settingsData.max_session_hours) {
        setSessionSettings(prev => ({
          ...prev,
          maxSessionHours: parseInt(settingsData.max_session_hours.value) || 72
        }));
      }
      // Theme is managed by ThemeContext, no need to set it here
      
      setAdmins(adminsResponse.data.admins || []);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createAdminData.password !== createAdminData.confirmPassword) {
      alert(t('passwordsNotMatchError', language));
      return;
    }
    if (createAdminData.password.length < 6) {
      alert(t('passwordMinLength', language));
      return;
    }
    
    try {
      await adminAPI.createAdmin({
        email: createAdminData.email,
        password: createAdminData.password,
        role: createAdminData.role
      });
      alert(t('adminCreated', language));
      setShowCreateAdmin(false);
      setCreateAdminData({ email: '', password: '', confirmPassword: '', role: 'admin' });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || t('error', language));
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!confirm(t('confirmDeleteAdmin', language))) return;
    
    try {
      await adminAPI.deleteAdmin(id);
      alert(t('adminDeleted', language));
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || t('error', language));
    }
  };

  const handleSaveSettings = async () => {
    try {
      await adminAPI.updateSettings({
        inactive_timeout_hours: sessionSettings.inactiveTimeoutHours,
        max_session_hours: sessionSettings.maxSessionHours,
        theme: theme
      });
      alert(t('settingsSaved', language));
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || t('error', language));
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    // ThemeContext otomatik olarak backend'e kaydedecek
    try {
      await adminAPI.updateSettings({ theme: newTheme });
      alert(t('settingsSaved', language));
    } catch (err: any) {
      alert(err.response?.data?.error || t('error', language));
    }
  };

  const tabs = [
    { id: 'admins' as const, label: t('adminUsers', language), icon: Users },
    { id: 'session' as const, label: t('sessionSettings', language), icon: Clock },
    { id: 'theme' as const, label: t('themeSettings', language), icon: Palette },
  ];

  return (
    <AdminLayout>
      <div className="px-6 pt-4 pb-6">
        <PageHeader
          titleKey="settingsTitle"
          descriptionKey="settingsDescription"
          icon={Settings}
        />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
              <div className="flex flex-wrap gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 min-w-[120px] sm:min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Admin Users Tab */}
            {activeTab === 'admins' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-3 sm:p-4 md:p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">{t('adminUsers', language)}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 break-words">{t('adminUsersDescription', language)}</p>
                  </div>
                  <button
                    onClick={() => setShowCreateAdmin(true)}
                    className="px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-h-[44px] sm:min-h-[48px] active:scale-95 flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{t('createAdmin', language)}</span>
                  </button>
                </div>

                <div className="p-3 sm:p-4 md:p-6">
                  {admins.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-slate-500 dark:text-slate-400 text-sm sm:text-base">
                      {t('noAdminsFound', language)}
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-3 sm:-mx-0">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                          <tr>
                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('adminEmail', language)}</th>
                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('adminRole', language)}</th>
                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase hidden md:table-cell">{t('lastLogin', language)}</th>
                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase hidden lg:table-cell">{t('createdAt', language)}</th>
                            <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-right text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('action', language)}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                          {admins.map((admin) => (
                            <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 break-all">{admin.email}</td>
                              <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap">
                                <span className={`px-2 sm:px-2.5 py-1 text-[9px] sm:text-[10px] md:text-xs font-semibold rounded-full ${
                                  admin.role === 'super_admin' 
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                }`}>
                                  {admin.role === 'super_admin' ? t('adminRoleSuperAdmin', language) : t('adminRoleAdmin', language)}
                                </span>
                              </td>
                              <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap text-xs sm:text-sm text-slate-600 dark:text-slate-400 hidden md:table-cell">
                                {admin.last_login ? format(new Date(admin.last_login), 'dd MMM yyyy HH:mm') : '-'}
                              </td>
                              <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap text-xs sm:text-sm text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                                {format(new Date(admin.created_at), 'dd MMM yyyy HH:mm')}
                              </td>
                              <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap text-right text-xs sm:text-sm">
                                <div className="flex justify-end gap-1 sm:gap-1.5 md:gap-2">
                                  <button
                                    onClick={() => handleDeleteAdmin(admin.id)}
                                    className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
                                    title={t('delete', language)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Session Settings Tab */}
            {activeTab === 'session' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4 shadow-sm max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">{t('sessionSettings', language)}</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('inactiveTimeoutHours', language)}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={sessionSettings.inactiveTimeoutHours}
                      onChange={(e) => setSessionSettings({ ...sessionSettings, inactiveTimeoutHours: parseInt(e.target.value) || 24 })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('inactiveTimeoutDescription', language)}</p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t('maxSessionHours', language)}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={sessionSettings.maxSessionHours}
                      onChange={(e) => setSessionSettings({ ...sessionSettings, maxSessionHours: parseInt(e.target.value) || 72 })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('maxSessionDescription', language)}</p>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 mt-4 text-sm"
                >
                  {t('saveSettings', language)}
                </button>
              </div>
            )}

            {/* Theme Settings Tab */}
            {activeTab === 'theme' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4 shadow-sm max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">{t('themeSettings', language)}</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('theme', language)}</label>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <button
                        onClick={() => handleThemeChange('light')}
                        className={`p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 ${
                          theme === 'light'
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="text-center">
                          <div className="w-full h-12 sm:h-16 bg-white border-2 border-slate-300 dark:border-slate-500 rounded mb-2"></div>
                          <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">{t('themeLight', language)}</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleThemeChange('dark')}
                        className={`p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 ${
                          theme === 'dark'
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="text-center">
                          <div className="w-full h-12 sm:h-16 bg-slate-800 border-2 border-slate-600 rounded mb-2"></div>
                          <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">{t('themeDark', language)}</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveSettings}
                    className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 text-sm"
                  >
                    {t('saveSettings', language)}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Create Admin Modal */}
        {showCreateAdmin && (
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-3 md:p-4 overflow-hidden">
            <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[95vh] overflow-hidden flex flex-col m-2 sm:m-4">
              <div className="flex justify-between items-center p-3 sm:p-4 md:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 sticky top-0 bg-white dark:bg-slate-800 z-10">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 break-words pr-2">{t('createAdmin', language)}</h2>
                <button
                  onClick={() => {
                    setShowCreateAdmin(false);
                    setCreateAdminData({ email: '', password: '', confirmPassword: '', role: 'admin' });
                  }}
                  className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors active:scale-95 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleCreateAdmin} className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t('adminEmail', language)} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={createAdminData.email}
                    onChange={(e) => setCreateAdminData({ ...createAdminData, email: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base min-h-[44px]"
                    style={{ color: '#111827' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t('password', language)} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createAdminData.password}
                    onChange={(e) => setCreateAdminData({ ...createAdminData, password: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base min-h-[44px]"
                    style={{ color: '#111827' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t('confirmPassword', language)} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createAdminData.confirmPassword}
                    onChange={(e) => setCreateAdminData({ ...createAdminData, confirmPassword: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base min-h-[44px]"
                    style={{ color: '#111827' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t('adminRole', language)}
                  </label>
                  <select
                    value={createAdminData.role}
                    onChange={(e) => setCreateAdminData({ ...createAdminData, role: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base min-h-[44px]"
                    style={{ color: '#111827' }}
                  >
                    <option value="admin">{t('adminRoleAdmin', language)}</option>
                    <option value="super_admin">{t('adminRoleSuperAdmin', language)}</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 pt-3 sm:pt-4 sticky bottom-0 bg-white dark:bg-slate-800 pb-2 sm:pb-0">
                  <button
                    type="submit"
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 text-xs sm:text-sm min-h-[44px] sm:min-h-[48px] active:scale-95"
                  >
                    {t('create', language)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateAdmin(false);
                      setCreateAdminData({ email: '', password: '', confirmPassword: '', role: 'admin' });
                    }}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 text-xs sm:text-sm min-h-[44px] sm:min-h-[48px] active:scale-95"
                  >
                    {t('cancel', language)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
