'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import PageHeader from '@/components/admin/PageHeader';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { adminAPI } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { Settings, Users, Key, Clock, Palette, Plus, Trash2, Edit, X } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminSettings() {
  const router = useRouter();
  const { language } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'admins' | 'session' | 'theme' | 'password'>('admins');
  
  // Admin users
  const [admins, setAdmins] = useState<any[]>([]);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [createAdminData, setCreateAdminData] = useState({ email: '', password: '', confirmPassword: '', role: 'admin' });
  
  // Settings
  const [settings, setSettings] = useState<any>({});
  const [sessionSettings, setSessionSettings] = useState({ inactiveTimeoutHours: 24, maxSessionHours: 72 });
  
  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPasswordFor, setChangingPasswordFor] = useState<number | null>(null);

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
    if (showCreateAdmin || showPasswordChange) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCreateAdmin, showPasswordChange]);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      alert(t('passwordsNotMatchError', language));
      return;
    }
    if (passwordChangeData.newPassword.length < 6) {
      alert(t('passwordMinLength', language));
      return;
    }
    
    try {
      let adminId = changingPasswordFor;
      if (!adminId && typeof window !== 'undefined') {
        const token = localStorage.getItem('adminToken');
        if (token) {
          try {
            const decoded = JSON.parse(atob(token.split('.')[1]));
            adminId = decoded.adminId || decoded.id;
          } catch (e) {
            console.error('Token decode error:', e);
          }
        }
      }
      
      if (!adminId) {
        alert(t('error', language));
        return;
      }
      
      await adminAPI.changeAdminPassword(adminId, passwordChangeData.newPassword);
      alert(t('passwordChanged', language));
      setShowPasswordChange(false);
      setPasswordChangeData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setChangingPasswordFor(null);
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
    { id: 'password' as const, label: t('changePassword', language), icon: Key },
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
            <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
              <div className="flex gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Admin Users Tab */}
            {activeTab === 'admins' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('adminUsers', language)}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('adminUsersDescription', language)}</p>
                  </div>
                  <button
                    onClick={() => setShowCreateAdmin(true)}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {t('createAdmin', language)}
                  </button>
                </div>

                <div className="p-6">
                  {admins.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      {t('noAdminsFound', language)}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('adminEmail', language)}</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('adminRole', language)}</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('lastLogin', language)}</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('createdAt', language)}</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{t('action', language)}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                          {admins.map((admin) => (
                            <tr key={admin.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">{admin.email}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                  admin.role === 'super_admin' 
                                    ? 'bg-purple-100 text-purple-700' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {admin.role === 'super_admin' ? t('adminRoleSuperAdmin', language) : t('adminRoleAdmin', language)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                {admin.last_login ? format(new Date(admin.last_login), 'dd MMM yyyy HH:mm') : '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                {format(new Date(admin.created_at), 'dd MMM yyyy HH:mm')}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setChangingPasswordFor(admin.id);
                                      setShowPasswordChange(true);
                                    }}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title={t('changePassword', language)}
                                  >
                                    <Key className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAdmin(admin.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">{t('sessionSettings', language)}</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('inactiveTimeoutHours', language)}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={sessionSettings.inactiveTimeoutHours}
                      onChange={(e) => setSessionSettings({ ...sessionSettings, inactiveTimeoutHours: parseInt(e.target.value) || 24 })}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('inactiveTimeoutDescription', language)}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('maxSessionHours', language)}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={sessionSettings.maxSessionHours}
                      onChange={(e) => setSessionSettings({ ...sessionSettings, maxSessionHours: parseInt(e.target.value) || 72 })}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('maxSessionDescription', language)}</p>
                  </div>

                  <button
                    onClick={handleSaveSettings}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    {t('saveSettings', language)}
                  </button>
                </div>
              </div>
            )}

            {/* Theme Settings Tab */}
            {activeTab === 'theme' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">{t('themeSettings', language)}</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('theme', language)}</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleThemeChange('light')}
                        className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                          theme === 'light'
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="text-center">
                          <div className="w-full h-16 bg-white border-2 border-slate-300 dark:border-slate-500 rounded mb-2"></div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('themeLight', language)}</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleThemeChange('dark')}
                        className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                          theme === 'dark'
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="text-center">
                          <div className="w-full h-16 bg-slate-800 border-2 border-slate-600 rounded mb-2"></div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('themeDark', language)}</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveSettings}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    {t('saveSettings', language)}
                  </button>
                </div>
              </div>
            )}

            {/* Password Change Tab */}
            {activeTab === 'password' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">{t('changePassword', language)}</h3>
                
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('newPassword', language)}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordChangeData.newPassword}
                      onChange={(e) => setPasswordChangeData({ ...passwordChangeData, newPassword: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('confirmNewPassword', language)}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordChangeData.confirmPassword}
                      onChange={(e) => setPasswordChangeData({ ...passwordChangeData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    {t('changePassword', language)}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Create Admin Modal */}
        {showCreateAdmin && (
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-hidden">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('createAdmin', language)}</h2>
                <button
                  onClick={() => {
                    setShowCreateAdmin(false);
                    setCreateAdminData({ email: '', password: '', confirmPassword: '', role: 'admin' });
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t('adminEmail', language)} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={createAdminData.email}
                    onChange={(e) => setCreateAdminData({ ...createAdminData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white dark:bg-slate-700 transition-all duration-200"
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
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white dark:bg-slate-700 transition-all duration-200"
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
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white dark:bg-slate-700 transition-all duration-200"
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
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white dark:bg-slate-700 transition-all duration-200"
                    style={{ color: '#111827' }}
                  >
                    <option value="admin">{t('adminRoleAdmin', language)}</option>
                    <option value="super_admin">{t('adminRoleSuperAdmin', language)}</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    {t('create', language)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateAdmin(false);
                      setCreateAdminData({ email: '', password: '', confirmPassword: '', role: 'admin' });
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
                  >
                    {t('cancel', language)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Change Modal */}
        {showPasswordChange && (
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-hidden">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('changePassword', language)}</h2>
                <button
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordChangeData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setChangingPasswordFor(null);
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t('newPassword', language)} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordChangeData.newPassword}
                    onChange={(e) => setPasswordChangeData({ ...passwordChangeData, newPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t('confirmNewPassword', language)} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordChangeData.confirmPassword}
                    onChange={(e) => setPasswordChangeData({ ...passwordChangeData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    {t('changePassword', language)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordChangeData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setChangingPasswordFor(null);
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
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
