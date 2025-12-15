'use client';

import { useState, useEffect } from 'react';
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
  quotaMb: number;
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
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<EditFormData>();
  const password = watch('password');

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
    reset({
      fullName: user.full_name,
      phone: user.phone,
      password: '',
      confirmPassword: '',
      passportNo: user.passport_no || '',
      foreignIdNo: user.foreign_id_no || '',
      status: user.status,
      quotaMb: user.quota_mb || 1000,
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
      const updateData: any = {
        fullName: data.fullName,
        phone: data.phone,
        status: data.status,
        quotaMb: data.quotaMb,
        speedLimitMbps: data.speedLimitMbps,
      };

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

      await adminAPI.updateUser(editingUser.id, updateData);
      setEditingUser(null);
      if (onEdit) onEdit();
      alert(t('success', language));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Güncelleme başarısız';
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t('fullName', language)}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t('phone', language)}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t('idType', language)}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t('idNumber', language)}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t('statusLabel', language)}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t('quotaLabel', language)}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t('registrationDate', language)}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t('edit', language)}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.phone}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.id_type === 'tckn' && t('tckn', language)}
                    {user.id_type === 'passport' && t('passport', language)}
                    {user.id_type === 'foreign_id' && t('foreignId', language)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.tckn || user.passport_no || user.foreign_id_no || '-'}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.quota_used_mb || 0} / {user.quota_mb || 0} MB
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {format(new Date(user.created_at), 'dd MMM yyyy')}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
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
                          className="text-blue-600 hover:text-blue-900"
                          title={t('edit', language)}
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        {user.status === 'blocked' ? (
                          <button
                            onClick={() => onUnblock(user.id)}
                            className="text-green-600 hover:text-green-900"
                            title={t('unblock', language)}
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onBlock(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title={t('block', language)}
                          >
                            <Ban className="w-5 h-5" />
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
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <div className="text-sm text-slate-700">
            {t('totalRecords', language).replace('{total}', pagination.total.toString()).replace('{page}', pagination.page.toString()).replace('{totalPages}', pagination.totalPages.toString())}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 text-sm text-slate-700 bg-white"
            >
              {t('previous', language)}
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 text-sm text-slate-700 bg-white"
            >
              {t('next', language)}
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">{t('editUser', language)}</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(handleEditSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fullName', language)}
                </label>
                <input
                  type="text"
                  {...register('fullName', { required: t('fullNameRequired', language) })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white transition-all duration-200 text-sm"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white transition-all duration-200 text-sm"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              {/* Şifre Değiştirme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white transition-all duration-200 text-sm"
                  placeholder={t('changePasswordOptional', language)}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Şifre Tekrar */}
              {password && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white transition-all duration-200 text-sm"
                    placeholder={t('confirmPasswordLabel', language)}
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              )}

              {/* Pasaport No */}
              {editingUser?.id_type === 'passport' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white transition-all duration-200 text-sm"
                    placeholder={t('passportPlaceholder', language)}
                  />
                  {errors.passportNo && (
                    <p className="mt-1 text-sm text-red-600">{errors.passportNo.message}</p>
                  )}
                </div>
              )}

              {/* Yabancı Kimlik No */}
              {editingUser?.id_type === 'foreign_id' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white transition-all duration-200 text-sm"
                    placeholder={t('foreignIdPlaceholder', language)}
                  />
                  {errors.foreignIdNo && (
                    <p className="mt-1 text-sm text-red-600">{errors.foreignIdNo.message}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('statusLabel', language)}
                </label>
                <select
                  {...register('status', { required: t('statusRequired', language) })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white transition-all duration-200 text-sm"
                >
                  <option value="pending">{t('statusPending', language)}</option>
                  <option value="verified">{t('statusVerified', language)}</option>
                  <option value="active">{t('statusActive', language)}</option>
                  <option value="blocked">{t('statusBlocked', language)}</option>
                  <option value="awaiting_admin_approval">{t('statusAwaitingApproval', language)}</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('quotaLabel', language)}
                  </label>
                  <input
                    type="number"
                    {...register('quotaMb', { 
                      required: t('quotaRequired', language),
                      min: { value: 0, message: t('quotaMin', language) }
                    })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white transition-all duration-200 text-sm"
                  />
                  {errors.quotaMb && (
                    <p className="mt-1 text-sm text-red-600">{errors.quotaMb.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('speedLimitLabel', language)}
                  </label>
                  <input
                    type="number"
                    {...register('speedLimitMbps', { 
                      required: t('speedLimitRequired', language),
                      min: { value: 1, message: t('speedLimitMin', language) }
                    })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white transition-all duration-200 text-sm"
                  />
                  {errors.speedLimitMbps && (
                    <p className="mt-1 text-sm text-red-600">{errors.speedLimitMbps.message}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-lg font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('saving', language)}
                      </>
                    ) : (
                      <>
                        {t('save', language)}
                        <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-all duration-200 text-sm"
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

