'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Ban, CheckCircle, Eye, Edit, X } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { adminAPI } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

interface UsersTableProps {
  users: any[];
  pagination: any;
  onBlock: (id: number) => void;
  onUnblock: (id: number) => void;
  onEdit?: () => void;
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onPageChange: (page: number) => void;
}

interface EditFormData {
  fullName: string;
  phone: string;
  password?: string;
  confirmPassword?: string;
  passportNo?: string;
  foreignIdNo?: string;
  status: string;
  quotaMb: number | null;
  unlimitedQuota: boolean;
  speedLimitMbps: number;
}

export default function UsersTable({
  users,
  pagination,
  onBlock,
  onUnblock,
  onEdit,
  onApprove,
  onReject,
  onPageChange,
}: UsersTableProps) {
  const { language } = useLanguage();
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<EditFormData>();
  const password = watch('password');
  const unlimitedQuota = watch('unlimitedQuota');

  // Modal açıldığında body scroll'unu engelle
  useEffect(() => {
    if (editingUser) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingUser]);
  const handleEditClick = (user: any) => {
    setEditingUser(user);
    const isUnlimited = user.quota_mb === null || user.quota_mb === -1;
    reset({
      fullName: user.full_name,
      phone: user.phone,
      password: '',
      confirmPassword: '',
      passportNo: user.passport_no || '',
      foreignIdNo: user.foreign_id_no || '',
      status: user.status,
      quotaMb: isUnlimited ? 1000 : (user.quota_mb || 1000),
      unlimitedQuota: isUnlimited,
      speedLimitMbps: user.speed_limit_mbps || 10,
    });
  };

  const handleEditSubmit = async (data: EditFormData) => {
    if (!editingUser) return;
    
    // Şifre kontrolü
    if (data.password && data.password !== data.confirmPassword) {
      alert(t('passwordsNotMatchError', language));
      return;
    }
    
    if (data.password && data.password.length < 6) {
      alert(t('passwordMinLength', language));
      return;
    }
    
    setLoading(true);
    try {
      // Backend'e gönderilecek veriyi hazırla
      const quotaValue = data.unlimitedQuota ? -1 : data.quotaMb;
      console.log('[Frontend] Sending quotaMb:', quotaValue, 'unlimitedQuota:', data.unlimitedQuota, 'quotaMb:', data.quotaMb);
      
      const updateData: any = {
        fullName: data.fullName,
        phone: data.phone,
        status: data.status,
        quotaMb: quotaValue, // -1 = sınırsız
        speedLimitMbps: data.speedLimitMbps,
      };
      
      console.log('[Frontend] Full updateData:', JSON.stringify(updateData));

      // Şifre varsa ekle
      if (data.password) {
        updateData.password = data.password;
      }

      // Kimlik tipine göre ilgili alanı ekle (TCKN hariç)
      if (editingUser.id_type === 'passport' && data.passportNo) {
        updateData.passportNo = data.passportNo;
      } else if (editingUser.id_type === 'foreign_id' && data.foreignIdNo) {
        updateData.foreignIdNo = data.foreignIdNo;
      }

      // User ID artık phone numarası
      const userId = editingUser.phone || editingUser.id;
      console.log('[Frontend] Updating user with ID (phone):', userId);
      await adminAPI.updateUser(userId, updateData);
      setEditingUser(null);
      if (onEdit) onEdit();
      alert(t('success', language));
    } catch (error: any) {
      console.error('Update user error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error response errors:', error.response?.data?.errors);
      
      let errorMessage = 'Güncelleme başarısız';
      if (error.response?.data) {
        // Express-validator format: { errors: [{ msg: '...', param: '...' }] }
        if (error.response.data.errors && Array.isArray(error.response.data.errors) && error.response.data.errors.length > 0) {
          const firstError = error.response.data.errors[0];
          errorMessage = firstError.msg || firstError.message || firstError || errorMessage;
          console.log('Extracted error message:', errorMessage, 'from error:', firstError);
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      console.log('Final error message to show:', errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
      blocked: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
      awaiting_admin_approval: 'bg-orange-100 text-orange-800',
    };

    const labels = {
      pending: t('statusPending', language),
      verified: t('statusVerified', language),
      active: t('statusActive', language),
      blocked: t('statusBlocked', language),
      expired: t('statusExpired', language),
      awaiting_admin_approval: t('statusAwaitingApproval', language),
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="overflow-x-auto -mx-2 sm:-mx-0">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                {t('fullName', language)}
              </th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden md:table-cell">
                {t('phone', language)}
              </th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden lg:table-cell">
                {t('idType', language)}
              </th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden lg:table-cell">
                {t('idNumber', language)}
              </th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                {t('statusLabel', language)}
              </th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden sm:table-cell">
                {t('quotaLabel', language)}
              </th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider hidden md:table-cell">
                {t('registrationDate', language)}
              </th>
              <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-right text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                {t('edit', language)}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5">
                  <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-slate-100 break-words">{user.full_name}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 md:hidden mt-0.5 break-all">{user.phone}</div>
                </td>
                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap hidden md:table-cell">
                  <div className="text-xs sm:text-sm text-gray-900 dark:text-slate-100 break-all">{user.phone}</div>
                </td>
                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap hidden lg:table-cell">
                  <div className="text-xs sm:text-sm text-gray-900 dark:text-slate-100">
                    {user.id_type === 'tckn' && t('tckn', language)}
                    {user.id_type === 'passport' && t('passport', language)}
                    {user.id_type === 'foreign_id' && t('foreignId', language)}
                  </div>
                </td>
                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap hidden lg:table-cell">
                  <div className="text-xs sm:text-sm text-gray-900 dark:text-slate-100 break-all">
                    {user.tckn || user.passport_no || user.foreign_id_no || '-'}
                  </div>
                </td>
                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap hidden sm:table-cell">
                  <div className="text-xs sm:text-sm text-gray-900 dark:text-slate-100">
                    {user.quota_used_mb || 0} / {user.quota_mb === null || user.quota_mb === -1 ? t('unlimited', language) : `${user.quota_mb || 0} MB`}
                  </div>
                </td>
                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap hidden md:table-cell">
                  <div className="text-xs sm:text-sm text-gray-900 dark:text-slate-100">
                    {format(new Date(user.created_at), 'dd MMM yyyy')}
                  </div>
                </td>
                <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                  <div className="flex justify-end gap-1 sm:gap-1.5 md:gap-2">
                    {user.status === 'awaiting_admin_approval' && user.id_type === 'passport' ? (
                      <>
                        {onApprove && (
                          <button
                            onClick={() => onApprove(user.id)}
                            className="text-green-600 hover:text-green-900"
                            title={t('approve', language)}
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        {onReject && (
                          <button
                            onClick={() => onReject(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title={t('reject', language)}
                          >
                            <Ban className="w-5 h-5" />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditClick(user)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 active:scale-95 transition-transform p-1"
                          title={t('edit', language)}
                        >
                          <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        {user.status === 'blocked' ? (
                          <button
                            onClick={() => onUnblock(user.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 active:scale-95 transition-transform p-1"
                            title={t('unblock', language)}
                          >
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onBlock(user.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 active:scale-95 transition-transform p-1"
                            title={t('block', language)}
                          >
                            <Ban className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-slate-50 dark:bg-slate-700/50 px-3 sm:px-4 md:px-6 py-3 sm:py-3.5 md:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 md:gap-0 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs sm:text-sm md:text-base text-slate-700 dark:text-slate-300 text-center sm:text-left break-words">
            {t('totalRecords', language).replace('{total}', pagination.total.toString()).replace('{page}', pagination.page.toString()).replace('{totalPages}', pagination.totalPages.toString())}
          </div>
          <div className="flex gap-2 sm:gap-2.5 md:gap-3">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-600 active:scale-95 text-xs sm:text-sm md:text-base text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 transition-all"
            >
              {t('previous', language)}
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-600 active:scale-95 text-xs sm:text-sm md:text-base text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 transition-all"
            >
              {t('next', language)}
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-3 md:p-4 overflow-hidden">
            <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col m-2 sm:m-4">
              <div className="flex justify-between items-center p-3 sm:p-4 md:p-5 lg:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100 break-words pr-2">{t('editUser', language)}</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors active:scale-95 flex-shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(handleEditSubmit)} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 lg:p-6 space-y-3 sm:space-y-4 md:space-y-5">
              <div>
                <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  {t('fullName', language)}
                </label>
                <input
                  type="text"
                  {...register('fullName', { required: t('fullNameRequired', language) })}
                  className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base"
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  {t('phone', language)}
                </label>
                <input
                  type="tel"
                  {...register('phone', { 
                    required: t('phoneRequired', language),
                    pattern: {
                      value: /^[0-9]{10,11}$/,
                      message: t('phoneInvalid', language)
                    }
                  })}
                  className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.phone.message}</p>
                )}
              </div>

              {/* Şifre Değiştirme */}
              <div>
                <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  {t('changePassword', language)}
                </label>
                <input
                  type="password"
                  {...register('password', {
                    minLength: {
                      value: 6,
                      message: t('passwordMinLength', language)
                    }
                  })}
                  className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base"
                  placeholder={t('changePasswordOptional', language)}
                />
                {errors.password && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Şifre Tekrar */}
              {password && (
                <div>
                  <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                    {t('confirmPasswordLabel', language)} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    {...register('confirmPassword', {
                      required: password ? t('confirmPasswordRequired', language) : false,
                      validate: (value) => {
                        if (password && value !== password) {
                          return t('passwordsNotMatchError', language);
                        }
                        return true;
                      }
                    })}
                    className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base"
                    placeholder={t('confirmPasswordLabel', language)}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
                  )}
                </div>
              )}

              {/* Pasaport No */}
              {editingUser?.id_type === 'passport' && (
                <div>
                  <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                    {t('passportNoLabel', language)}
                  </label>
                  <input
                    type="text"
                    {...register('passportNo', {
                      minLength: {
                        value: 5,
                        message: t('passportMinLength', language)
                      }
                    })}
                    className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base"
                    placeholder={t('passportPlaceholder', language)}
                  />
                  {errors.passportNo && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.passportNo.message}</p>
                  )}
                </div>
              )}

              {/* Yabancı Kimlik No */}
              {editingUser?.id_type === 'foreign_id' && (
                <div>
                  <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                    {t('foreignIdNoLabel', language)}
                  </label>
                  <input
                    type="text"
                    {...register('foreignIdNo', {
                      minLength: {
                        value: 5,
                        message: t('foreignIdMinLength', language)
                      }
                    })}
                    className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base"
                    placeholder={t('foreignIdPlaceholder', language)}
                  />
                  {errors.foreignIdNo && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.foreignIdNo.message}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  {t('statusLabel', language)}
                </label>
                <select
                  {...register('status', { required: t('statusRequired', language) })}
                  className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base"
                >
                  <option value="pending">{t('statusPending', language)}</option>
                  <option value="verified">{t('statusVerified', language)}</option>
                  <option value="active">{t('statusActive', language)}</option>
                  <option value="blocked">{t('statusBlocked', language)}</option>
                  <option value="awaiting_admin_approval">{t('statusAwaitingApproval', language)}</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.status.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
                <div>
                  <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                    {t('quotaLabel', language)}
                  </label>
                  <div className="space-y-2 sm:space-y-2.5">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        {...register('unlimitedQuota')}
                        onChange={(e) => {
                          setValue('unlimitedQuota', e.target.checked);
                          if (e.target.checked) {
                            setValue('quotaMb', 1000); // Placeholder value
                          }
                        }}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                      />
                      <label className="ml-2 sm:ml-3 text-xs sm:text-sm md:text-base font-medium text-gray-700 dark:text-slate-300 cursor-pointer">
                        {t('unlimitedQuota', language)}
                      </label>
                    </div>
                    <input
                      type="number"
                      {...register('quotaMb', { 
                        required: !unlimitedQuota ? t('quotaRequired', language) : false,
                        min: { value: 0, message: t('quotaMin', language) },
                        validate: (value) => {
                          if (unlimitedQuota) return true;
                          return (value ?? 0) > 0 || t('quotaMin', language);
                        }
                      })}
                      disabled={unlimitedQuota}
                      className={`w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base ${
                        unlimitedQuota ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''
                      }`}
                      placeholder={unlimitedQuota ? t('unlimited', language) : ''}
                    />
                    {errors.quotaMb && (
                      <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.quotaMb.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                    {t('speedLimitLabel', language)}
                  </label>
                  <input
                    type="number"
                    {...register('speedLimitMbps', { 
                      required: t('speedLimitRequired', language),
                      min: { value: 1, message: t('speedLimitMin', language) }
                    })}
                    className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base"
                  />
                  {errors.speedLimitMbps && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.speedLimitMbps.message}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 pt-3 sm:pt-4 md:pt-5">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 sm:py-3 md:py-3.5 rounded-lg font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-xs sm:text-sm md:text-base active:scale-95"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-2.5">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('saving', language)}
                      </>
                    ) : (
                      <>
                        {t('save', language)}
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 py-2.5 sm:py-3 md:py-3.5 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 text-xs sm:text-sm md:text-base active:scale-95"
                >
                  {t('cancel', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

