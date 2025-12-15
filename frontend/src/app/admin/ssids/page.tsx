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
      if (editingSSID) {
        await adminAPI.updateSSID(editingSSID.id, formData);
      } else {
        await adminAPI.createSSID(formData);
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
      <div className="px-6 pt-4 pb-6">
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
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              {t('newSSID', language)}
            </button>
          }
        />

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingSSID ? t('editSSID', language) : t('newSSID', language)}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingSSID(null);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="animate-slide-up">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    {t('ssidName', language)} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white transition-all duration-200 text-sm"
                    placeholder={t('ssidNamePlaceholder', language)}
                  />
                </div>

                <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    {t('ssidNetworkName', language)} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ssid}
                    onChange={(e) => setFormData({ ...formData, ssid: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white transition-all duration-200 text-sm"
                    placeholder={t('ssidPlaceholder', language)}
                  />
                </div>

                <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('description', language)}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white transition-all duration-200 text-sm"
                    rows={3}
                    placeholder={t('descriptionPlaceholder', language)}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    {t('active', language)}
                  </label>
                </div>

                <div className="flex gap-4 pt-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 text-sm"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {editingSSID ? t('update', language) : t('create', language)}
                      <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-all duration-200 text-sm"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            {ssids.map((ssid, index) => {
              const imageUrl = getImageUrl(ssid.background_image_url);
              return (
                <div
                  key={ssid.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-indigo-300 transition-all duration-200"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Arkaplan Önizleme */}
                  <div
                    className="h-48 bg-gradient-to-br from-purple-400 to-blue-500 relative"
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
                      <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                        Arkaplan Yok
                      </div>
                    )}
                  </div>

                  {/* SSID Bilgileri */}
                  <div className="p-5 bg-white/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-extrabold text-gray-900 text-lg mb-1">{ssid.name}</h3>
                        <p className="text-sm text-gray-600 font-medium">{ssid.ssid}</p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full shadow-md ${
                          ssid.is_active
                            ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                            : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800'
                        }`}
                      >
                        {ssid.is_active ? t('active', language) : t('inactive', language)}
                      </span>
                    </div>

                    {ssid.description && (
                      <p className="text-sm text-gray-500 mb-4">{ssid.description}</p>
                    )}

                    {/* Arkaplan Yükleme */}
                    <div className="mb-3">
                      <label className="block text-xs text-gray-600 mb-1">
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
                        className="w-full text-xs"
                      />
                      {uploadingImage === ssid.id && (
                        <div className="text-xs text-blue-600 mt-1">{t('uploading', language)}</div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Desteklenen formatlar: JPEG, PNG, GIF, WEBP
                      </p>
                    </div>

                    {/* İşlem Butonları */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(ssid)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 text-sm font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
                      >
                        <Edit className="w-4 h-4" />
                        {t('edit', language)}
                      </button>
                      <button
                        onClick={() => handleDelete(ssid.id)}
                        className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && ssids.length === 0 && (
          <div className="text-center py-12 glass-strong rounded-2xl shadow-xl animate-slide-up mt-2">
            <div className="bg-gradient-to-br from-gray-200 to-gray-300 p-6 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <Wifi className="w-12 h-12 text-gray-500" />
            </div>
            <p className="text-gray-600 text-lg font-semibold mb-2">Henüz SSID eklenmemiş</p>
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

