'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminAPI } from '@/lib/api';
import AdminLayout from '@/components/admin/AdminLayout';
import DashboardStats from '@/components/admin/DashboardStats';
import PageHeader from '@/components/admin/PageHeader';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import ErrorDisplay from '@/components/admin/ErrorDisplay';
import { LayoutDashboard } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Token kontrolü
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }
    }

    loadDashboard();
  }, [router]);

  const loadDashboard = async () => {
    try {
      console.log('Dashboard yükleniyor...');
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      console.log('Admin token:', token ? 'Mevcut' : 'Yok');
      
      const response = await adminAPI.getDashboard();
      console.log('Dashboard yüklendi:', response.data);
      setStats(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Dashboard yükleme hatası:', err);
      console.error('Hata detayları:', {
        code: err.code,
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        networkError: err.networkError
      });
      
      // Network error kontrolü
      if (err.code === 'ECONNREFUSED' || err.message === 'Network Error' || err.code === 'ERR_NETWORK' || !err.response || err.networkError) {
        setError('Backend sunucusuna bağlanılamıyor. Lütfen backend\'in çalıştığından emin olun. (http://localhost:3001)');
        return;
      }
      
      if (err.response?.status === 401) {
        console.log('401 hatası - login sayfasına yönlendiriliyor');
        router.push('/admin/login');
        return;
      }
      
      if (err.response?.status === 403) {
        setError('Admin yetkisi gerekli. Lütfen tekrar giriş yapın.');
        router.push('/admin/login');
        return;
      }
      
      const errorMessage = err.response?.data?.error || err.message || 'Dashboard yüklenirken bir hata oluştu';
      setError(`${errorMessage} (Status: ${err.response?.status || 'N/A'})`);
      console.error('Detaylı hata:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="px-6 pt-4 pb-6">
        <PageHeader
          titleKey="dashboardTitle"
          descriptionKey="dashboardDescription"
          icon={LayoutDashboard}
        />
        
        {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorDisplay
              message={error}
              onRetry={() => {
                setError(null);
                setLoading(true);
                loadDashboard();
              }}
            />
          ) : (
            <DashboardStats stats={stats} />
          )}
      </div>
    </AdminLayout>
  );
}

