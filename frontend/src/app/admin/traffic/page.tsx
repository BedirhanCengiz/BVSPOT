'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import PageHeader from '@/components/admin/PageHeader';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { adminAPI } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { format } from 'date-fns';
import { Globe, Download, Filter } from 'lucide-react';

export default function AdminTraffic() {
  const router = useRouter();
  const { language } = useLanguage();
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
      <div className="px-6 pt-4 pb-6">
        <PageHeader
          titleKey="trafficTitle"
          descriptionKey="trafficDescription"
          icon={Globe}
        />

        {/* İstatistikler */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {[
              { labelKey: 'totalRequests', value: stats.totalRequests?.toLocaleString() || 0, color: 'from-blue-500 to-blue-600' },
              { labelKey: 'totalTraffic', value: formatBytes(stats.totalDataBytes || 0), color: 'from-purple-500 to-purple-600' },
              { labelKey: 'totalDomains', value: stats.topDomains?.length || 0, color: 'from-green-500 to-green-600' },
              { labelKey: 'avgResponse', value: stats.avgResponseTime ? `${stats.avgResponseTime}ms` : '-', color: 'from-orange-500 to-orange-600' },
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all duration-200" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-xs font-semibold text-gray-600 mb-2">{t(stat.labelKey, language)}</div>
                <div className={`text-2xl font-extrabold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* En Çok Ziyaret Edilen Domainler */}
        {stats?.topDomains && stats.topDomains.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-3">{t('topDomains', language)}</h2>
            <div className="space-y-2">
              {stats.topDomains.slice(0, 10).map((domain: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-900 text-sm">{domain.domain || '-'}</span>
                    <div className="flex gap-4 text-xs text-gray-600">
                      <span>{domain.count} {t('requests', language)}</span>
                      <span>{formatBytes(domain.total_bytes || 0)}</span>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtreler */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gradient-to-br from-primary-500 to-purple-600 p-1.5 rounded-lg">
              <Filter className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-extrabold text-gray-900 text-sm">{t('filters', language)}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <input
              type="text"
              placeholder={t('userId', language)}
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
            <input
              type="text"
              placeholder={t('ipAddress', language)}
              value={filters.ipAddress}
              onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
            <input
              type="text"
              placeholder={t('domain', language)}
              value={filters.domain}
              onChange={(e) => setFilters({ ...filters, domain: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
            <select
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            >
              <option value="">{t('allMethods', language)}</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('date', language)}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('user', language)}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('ipAddress', language)}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('domain', language)}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('url', language)}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('method', language)}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('status', language)}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('traffic', language)}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        {t('noTrafficLogs', language)}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {log.full_name || '-'}
                          {log.phone && <div className="text-xs text-gray-500">{log.phone}</div>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {log.ip_address || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={log.domain || ''}>
                            {log.domain || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="max-w-md truncate" title={log.url || ''}>
                            {log.url || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                            {log.method || 'GET'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {log.status_code ? (
                            <span className={`font-medium ${getStatusColor(log.status_code)}`}>
                              {log.status_code}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
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

