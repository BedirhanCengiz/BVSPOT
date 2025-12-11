'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminAPI } from '@/lib/api';
import { format } from 'date-fns';
import { Globe, Download, Filter } from 'lucide-react';

export default function AdminTraffic() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState({
    userId: '',
    ipAddress: '',
    domain: '',
    method: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 100,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }
    }
    loadData();
  }, [filters, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Web trafiği yükleniyor...', filters);
      
      const [logsResponse, statsResponse] = await Promise.all([
        adminAPI.getWebTrafficLogs(filters),
        adminAPI.getWebTrafficStats({
          userId: filters.userId || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        }),
      ]);
      
      console.log('Logs response:', logsResponse);
      console.log('Stats response:', statsResponse);
      
      // Response yapısını kontrol et
      const logs = logsResponse.data?.logs || logsResponse.data || [];
      const stats = statsResponse.data || statsResponse;
      
      console.log('Parsed logs:', logs);
      console.log('Parsed stats:', stats);
      
      setLogs(Array.isArray(logs) ? logs : []);
      setStats(stats);
    } catch (err: any) {
      console.error('Web trafiği yükleme hatası:', err);
      console.error('Hata detayları:', {
        code: err.code,
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      if (err.response?.status === 401) {
        router.push('/admin/login');
      } else {
        // Hata durumunda boş array set et
        setLogs([]);
        setStats(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return 'text-green-600';
    if (statusCode >= 300 && statusCode < 400) return 'text-blue-600';
    if (statusCode >= 400 && statusCode < 500) return 'text-yellow-600';
    if (statusCode >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="w-8 h-8" />
              Web Trafiği Logları
            </h1>
            <p className="text-gray-600 mt-1">Kullanıcıların ziyaret ettiği web siteleri ve trafik bilgileri</p>
          </div>
        </div>

        {/* İstatistikler */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Toplam İstek</div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalRequests?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Toplam Trafik</div>
              <div className="text-3xl font-bold text-gray-900">{formatBytes(stats.totalDataBytes || 0)}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Toplam Domain</div>
              <div className="text-3xl font-bold text-gray-900">{stats.topDomains?.length || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-1">Ortalama Response</div>
              <div className="text-3xl font-bold text-gray-900">
                {stats.avgResponseTime ? `${stats.avgResponseTime}ms` : '-'}
              </div>
            </div>
          </div>
        )}

        {/* En Çok Ziyaret Edilen Domainler */}
        {stats?.topDomains && stats.topDomains.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">En Çok Ziyaret Edilen Domainler</h2>
            <div className="space-y-2">
              {stats.topDomains.slice(0, 10).map((domain: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-900">{domain.domain || '-'}</span>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>{domain.count} istek</span>
                    <span>{formatBytes(domain.total_bytes || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtreler */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filtreler</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <input
              type="text"
              placeholder="User ID"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
            />
            <input
              type="text"
              placeholder="IP Adresi"
              value={filters.ipAddress}
              onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
            />
            <input
              type="text"
              placeholder="Domain"
              value={filters.domain}
              onChange={(e) => setFilters({ ...filters, domain: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
            />
            <select
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
            >
              <option value="">Tüm Methodlar</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Adresi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trafik</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        Henüz web trafiği logu bulunmuyor
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.full_name || '-'}
                          {log.phone && <div className="text-xs text-gray-500">{log.phone}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.ip_address || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={log.domain || ''}>
                            {log.domain || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-md truncate" title={log.url || ''}>
                            {log.url || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                            {log.method || 'GET'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {log.status_code ? (
                            <span className={`font-medium ${getStatusColor(log.status_code)}`}>
                              {log.status_code}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatBytes(log.data_transferred_bytes || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

