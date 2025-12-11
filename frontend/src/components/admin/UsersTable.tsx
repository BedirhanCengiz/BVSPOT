'use client';

import { useState } from 'react';
import { Ban, CheckCircle, Eye, Edit, X } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { adminAPI } from '@/lib/api';

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
  tckn?: string;
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
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<EditFormData>();
  const handleEditClick = (user: any) => {
    setEditingUser(user);
    reset({
      fullName: user.full_name,
      phone: user.phone,
      tckn: user.tckn || '',
      passportNo: user.passport_no || '',
      foreignIdNo: user.foreign_id_no || '',
      status: user.status,
      quotaMb: user.quota_mb || 1000,
      speedLimitMbps: user.speed_limit_mbps || 10,
    });
  };

  const handleEditSubmit = async (data: EditFormData) => {
    if (!editingUser) return;
    
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

      // Kimlik tipine göre ilgili alanı ekle
      if (editingUser.id_type === 'tckn' && data.tckn) {
        updateData.tckn = data.tckn;
      } else if (editingUser.id_type === 'passport' && data.passportNo) {
        updateData.passportNo = data.passportNo;
      } else if (editingUser.id_type === 'foreign_id' && data.foreignIdNo) {
        updateData.foreignIdNo = data.foreignIdNo;
      }

      await adminAPI.updateUser(editingUser.id, updateData);
      setEditingUser(null);
      if (onEdit) onEdit();
      alert('Kullanıcı bilgileri başarıyla güncellendi');
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
      pending: 'Beklemede',
      verified: 'Doğrulanmış',
      active: 'Aktif',
      blocked: 'Engellenmiş',
      expired: 'Süresi Dolmuş',
      awaiting_admin_approval: 'Onay Bekliyor',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ad Soyad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telefon
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kimlik Tipi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kimlik No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Durum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kota
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kayıt Tarihi
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.id_type === 'tckn' && 'TCKN'}
                    {user.id_type === 'passport' && 'Pasaport'}
                    {user.id_type === 'foreign_id' && 'Yabancı Kimlik'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.tckn || user.passport_no || user.foreign_id_no || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {user.quota_used_mb || 0} / {user.quota_mb || 0} MB
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {format(new Date(user.created_at), 'dd MMM yyyy')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    {user.status === 'awaiting_admin_approval' && user.id_type === 'passport' ? (
                      <>
                        {onApprove && (
                          <button
                            onClick={() => onApprove(user.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Onayla"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        {onReject && (
                          <button
                            onClick={() => onReject(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Reddet"
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
                          title="Düzenle"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        {user.status === 'blocked' ? (
                          <button
                            onClick={() => onUnblock(user.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Engeli Kaldır"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onBlock(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Engelle"
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
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Toplam {pagination.total} kayıt, Sayfa {pagination.page} / {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Önceki
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Kullanıcı Düzenle</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(handleEditSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  {...register('fullName', { required: 'Ad Soyad gereklidir' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  {...register('phone', { 
                    required: 'Telefon gereklidir',
                    pattern: {
                      value: /^[0-9]{10,11}$/,
                      message: 'Geçerli bir telefon numarası giriniz'
                    }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              {/* TCKN */}
              {editingUser?.id_type === 'tckn' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TCKN
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    {...register('tckn', {
                      pattern: {
                        value: /^[0-9]{11}$/,
                        message: 'TCKN 11 haneli olmalıdır'
                      }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    placeholder="11 haneli TCKN"
                  />
                  {errors.tckn && (
                    <p className="mt-1 text-sm text-red-600">{errors.tckn.message}</p>
                  )}
                </div>
              )}

              {/* Pasaport No */}
              {editingUser?.id_type === 'passport' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pasaport No
                  </label>
                  <input
                    type="text"
                    {...register('passportNo', {
                      minLength: {
                        value: 5,
                        message: 'Pasaport numarası en az 5 karakter olmalıdır'
                      }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    placeholder="Pasaport numarası"
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
                    Yabancı Kimlik No
                  </label>
                  <input
                    type="text"
                    {...register('foreignIdNo', {
                      minLength: {
                        value: 5,
                        message: 'Yabancı kimlik numarası en az 5 karakter olmalıdır'
                      }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                    placeholder="Yabancı kimlik numarası"
                  />
                  {errors.foreignIdNo && (
                    <p className="mt-1 text-sm text-red-600">{errors.foreignIdNo.message}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durum
                </label>
                <select
                  {...register('status', { required: 'Durum gereklidir' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                >
                  <option value="pending">Beklemede</option>
                  <option value="verified">Doğrulanmış</option>
                  <option value="active">Aktif</option>
                  <option value="blocked">Engellenmiş</option>
                  <option value="awaiting_admin_approval">Onay Bekliyor</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kota (MB)
                  </label>
                  <input
                    type="number"
                    {...register('quotaMb', { 
                      required: 'Kota gereklidir',
                      min: { value: 0, message: 'Kota 0 veya daha büyük olmalıdır' }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                  />
                  {errors.quotaMb && (
                    <p className="mt-1 text-sm text-red-600">{errors.quotaMb.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hız Limiti (Mbps)
                  </label>
                  <input
                    type="number"
                    {...register('speedLimitMbps', { 
                      required: 'Hız limiti gereklidir',
                      min: { value: 1, message: 'Hız limiti en az 1 Mbps olmalıdır' }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
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
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

