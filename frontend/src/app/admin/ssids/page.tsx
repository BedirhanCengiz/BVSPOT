'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import PageHeader from '@/components/admin/PageHeader';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { adminAPI } from '@/lib/api';
import { Wifi, Plus, Edit, Trash2, Upload, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

interface SSID {
  id: number;
  name: string;
  ssid: string;
  background_image_url: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

export default function AdminSSIDs() {
  const { language } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ssids, setSSIDs] = useState<SSID[]>([]);
  const [editingSSID, setEditingSSID] = useState<SSID | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ssid: '',
    description: '',
    is_active: true,
  });
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);

  // Modal açıldığında body scroll'unu engelle
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showForm]);

  useEffect(() => {
    const init = async () => {
      // Token kontrolü
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          router.push('/admin/login');
          return;
        }
        
        // Token varsa SSID'leri yükle
        await loadSSIDs();
      }
    };
    
    init();
  }, [router]);

  const loadSSIDs = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSSIDs();
      setSSIDs(response.data.ssids || []);
    } catch (err: any) {
      console.error('SSID yükleme hatası:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        // Token geçersiz veya yetki yok
        if (typeof window !== 'undefined') {
          localStorage.removeItem('adminToken');
        }
        router.push('/admin/login');
      } else {
        // Diğer hatalar için kullanıcıya bilgi ver
        console.error('SSID yüklenirken hata:', err.response?.data || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Backend camelCase bekliyor, frontend snake_case kullanıyor
      const apiData = {
        name: formData.name,
        ssid: formData.ssid,
        description: formData.description,
        isActive: formData.is_active, // is_active -> isActive dönüşümü
      };
      
      if (editingSSID) {
        await adminAPI.updateSSID(editingSSID.id, apiData);
      } else {
        await adminAPI.createSSID(apiData);
      }
      setShowForm(false);
      setEditingSSID(null);
      setFormData({ name: '', ssid: '', description: '', is_active: true });
      loadSSIDs();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Bir hata oluştu');
    }
  };

  const handleEdit = (ssid: SSID) => {
    setEditingSSID(ssid);
    setFormData({
      name: ssid.name,
      ssid: ssid.ssid,
      description: ssid.description || '',
      is_active: ssid.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteSSID', language))) return;
    
    try {
      await adminAPI.deleteSSID(id);
      loadSSIDs();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Bir hata oluştu');
    }
  };

  const handleImageUpload = async (id: number, file: File) => {
    try {
      // Dosya boyutu kontrolü (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`Dosya boyutu çok büyük. Maksimum boyut: 10MB. Seçilen dosya: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
      }

      // Dosya tipi kontrolü
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert(t('imageOnly', language));
        return;
      }

      setUploadingImage(id);
      await adminAPI.uploadSSIDBackground(id, file);
      loadSSIDs();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || t('imageUploadError', language);
      if (err.response?.status === 413) {
        alert(t('fileTooLargeSimple', language));
      } else {
        alert(errorMessage);
      }
    } finally {
      setUploadingImage(null);
    }
  };

  const getImageUrl = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${imageUrl}`;
  };

  return (
    <AdminLayout>
      <div className="px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 pb-4 sm:pb-6">
        <PageHeader
          titleKey="ssidManagement"
          descriptionKey="ssidManagementDescription"
          icon={Wifi}
          action={
            <button
              onClick={() => {
                setEditingSSID(null);
                setFormData({ name: '', ssid: '', description: '', is_active: true });
                setShowForm(true);
              }}
              className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              {t('newSSID', language)}
            </button>
          }
        />

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-3 md:p-4 overflow-hidden">
            <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto m-2 sm:m-4">
              <div className="flex justify-between items-center p-3 sm:p-4 md:p-5 lg:p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 sticky top-0 bg-white dark:bg-slate-800 z-10">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 break-words pr-2">
                  {editingSSID ? t('editSSID', language) : t('newSSID', language)}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingSSID(null);
                  }}
                  className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors active:scale-95 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-3 sm:p-4 md:p-5 lg:p-6 space-y-3 sm:space-y-4">
                <div className="animate-slide-up">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2 flex items-center gap-1">
                    {t('ssidName', language)} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base min-h-[44px]"
                    placeholder={t('ssidNamePlaceholder', language)}
                  />
                </div>

                <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <label className="block text-xs sm:text-sm md:text-base font-semibold text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2 flex items-center gap-1">
                    {t('ssidNetworkName', language)} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ssid}
                    onChange={(e) => setFormData({ ...formData, ssid: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base min-h-[44px]"
                    placeholder={t('ssidPlaceholder', language)}
                  />
                </div>

                <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                    {t('description', language)}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base resize-y min-h-[80px]"
                    rows={3}
                    placeholder={t('descriptionPlaceholder', language)}
                  />
                </div>

                <div className="flex items-center p-2 sm:p-2.5">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 rounded cursor-pointer flex-shrink-0"
                  />
                  <label htmlFor="is_active" className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                    {t('active', language)}
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 animate-slide-up sticky bottom-0 bg-white dark:bg-slate-800 pb-2 sm:pb-0" style={{ animationDelay: '0.3s' }}>
                  <button
                    type="submit"
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 text-xs sm:text-sm active:scale-95 min-h-[44px] sm:min-h-[48px]"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2">
                      {editingSSID ? t('update', language) : t('create', language)}
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingSSID(null);
                    }}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 text-xs sm:text-sm active:scale-95 min-h-[44px] sm:min-h-[48px]"
                  >
                    {t('cancel', language)}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mt-2 sm:mt-3">
            {ssids.map((ssid, index) => {
              const imageUrl = getImageUrl(ssid.background_image_url);
              return (
                <div
                  key={ssid.id}
                  className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 active:scale-95"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Arkaplan Önizleme */}
                  <div
                    className="h-32 sm:h-40 md:h-48 bg-gradient-to-br from-purple-400 to-blue-500 relative"
                    style={
                      imageUrl
                        ? {
                            backgroundImage: `url(${imageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : {}
                    }
                  >
                    {!imageUrl && (
                      <div className="absolute inset-0 flex items-center justify-center text-white text-xs sm:text-sm md:text-base px-2">
                        Arkaplan Yok
                      </div>
                    )}
                  </div>

                  {/* SSID Bilgileri */}
                  <div className="p-3 sm:p-4 md:p-5 bg-white/50 dark:bg-slate-800/50">
                    <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-sm sm:text-base md:text-lg mb-1 break-words">{ssid.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 font-medium break-all">{ssid.ssid}</p>
                      </div>
                      <span
                        className={`px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 md:py-1.5 text-[9px] sm:text-[10px] md:text-xs font-bold rounded-full shadow-md whitespace-nowrap flex-shrink-0 ${
                          ssid.is_active
                            ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                            : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-slate-600 dark:to-slate-700 text-gray-800 dark:text-slate-300'
                        }`}
                      >
                        {ssid.is_active ? t('active', language) : t('inactive', language)}
                      </span>
                    </div>

                    {ssid.description && (
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mb-3 sm:mb-4 break-words line-clamp-2">{ssid.description}</p>
                    )}

                    {/* Arkaplan Yükleme */}
                    <div className="mb-2 sm:mb-3">
                      <label className="block text-[10px] sm:text-xs text-gray-600 mb-1">
                        Arkaplan Resmi (Max: 10MB)
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(ssid.id, file);
                          }
                          // Input'u temizle (aynı dosyayı tekrar seçebilmek için)
                          e.target.value = '';
                        }}
                        disabled={uploadingImage === ssid.id}
                        className="w-full text-[10px] sm:text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {uploadingImage === ssid.id && (
                        <div className="text-[10px] sm:text-xs text-blue-600 mt-1">{t('uploading', language)}</div>
                      )}
                      <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 mt-1">
                        Desteklenen formatlar: JPEG, PNG, GIF, WEBP
                      </p>
                    </div>

                    {/* İşlem Butonları */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleEdit(ssid)}
                        className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 md:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-blue-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
                      >
                        <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        {t('edit', language)}
                      </button>
                      <button
                        onClick={() => handleDelete(ssid.id)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 md:py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg sm:rounded-xl hover:from-red-600 hover:to-red-700 text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && ssids.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl animate-slide-up mt-2">
            <div className="bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-600 p-6 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <Wifi className="w-12 h-12 text-gray-500 dark:text-slate-400" />
            </div>
            <p className="text-gray-600 dark:text-slate-400 text-lg font-semibold mb-2">Henüz SSID eklenmemiş</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 btn-glow group"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                İlk SSID'yi Ekle
              </span>
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

