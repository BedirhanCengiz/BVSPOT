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
import { Shield, Download, Search, FileText } from 'lucide-react';

export default function ImmutableLogs() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [filters, setFilters] = useState({
    userId: '',
    internalIp: '',
    externalIp: '',
    sourceIp: '',
    destinationIp: '',
    sourcePort: '',
    destinationPort: '',
    macAddress: '',
    protocol: '',
    startDate: '',
    endDate: '',
    page: 1,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }
    }
    loadLogs();
  }, [filters, router]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params: any = {
        limit: 20,
        page: filters.page,
      };
      
      if (filters.userId) params.userId = filters.userId;
      if (filters.internalIp) params.internalIp = filters.internalIp;
      if (filters.externalIp) params.externalIp = filters.externalIp;
      if (filters.sourceIp) params.sourceIp = filters.sourceIp;
      if (filters.destinationIp) params.destinationIp = filters.destinationIp;
      if (filters.sourcePort) params.sourcePort = parseInt(filters.sourcePort);
      if (filters.destinationPort) params.destinationPort = parseInt(filters.destinationPort);
      if (filters.macAddress) params.macAddress = filters.macAddress;
      if (filters.protocol) params.protocol = filters.protocol;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await adminAPI.getImmutableLogs(params);
      setLogs(response.data.logs || []);
      setPagination(response.data.pagination || {});
    } catch (err: any) {
      console.error('Immutable logs load error:', err);
      if (err.response?.status === 401) {
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params: any = {};
      if (filters.userId) params.userId = filters.userId;
      if (filters.internalIp) params.internalIp = filters.internalIp;
      if (filters.externalIp) params.externalIp = filters.externalIp;
      if (filters.sourceIp) params.sourceIp = filters.sourceIp;
      if (filters.destinationIp) params.destinationIp = filters.destinationIp;
      if (filters.sourcePort) params.sourcePort = filters.sourcePort;
      if (filters.destinationPort) params.destinationPort = filters.destinationPort;
      if (filters.macAddress) params.macAddress = filters.macAddress;
      if (filters.protocol) params.protocol = filters.protocol;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await adminAPI.exportImmutableLogs(params);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `5651_logs_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      console.error('Export error:', err);
      alert('Export başarısız');
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <AdminLayout>
      <div className="px-6 pt-4 pb-6">
        <PageHeader
          titleKey="5651 Kanunu Logları"
          descriptionKey="5651 sayılı kanun uyumlu değiştirilemez erişim logları"
          icon={Shield}
          action={
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              CSV İndir
            </button>
          }
        />

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                5651 Kanunu Uyumlu Loglar
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Bu loglar değiştirilemez (immutable) ve hash chain ile korunmaktadır. Her log kaydı önceki logun hash'ini içerir ve zincir bütünlüğü kontrol edilebilir.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Kullanıcı ID"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
            <input
              type="text"
              placeholder="Kaynak IP Adresi"
              value={filters.sourceIp}
              onChange={(e) => setFilters({ ...filters, sourceIp: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
            <input
              type="text"
              placeholder="Hedef IP Adresi"
              value={filters.destinationIp}
              onChange={(e) => setFilters({ ...filters, destinationIp: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
            <input
              type="text"
              placeholder="İç IP Adresi (NAT)"
              value={filters.internalIp}
              onChange={(e) => setFilters({ ...filters, internalIp: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
            <input
              type="text"
              placeholder="Dış IP Adresi"
              value={filters.externalIp}
              onChange={(e) => setFilters({ ...filters, externalIp: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
            <input
              type="text"
              placeholder="MAC Adresi"
              value={filters.macAddress}
              onChange={(e) => setFilters({ ...filters, macAddress: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
            <select
              value={filters.protocol}
              onChange={(e) => setFilters({ ...filters, protocol: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            >
              <option value="">Tüm Protokoller</option>
              <option value="TCP">TCP</option>
              <option value="UDP">UDP</option>
              <option value="HTTP">HTTP</option>
              <option value="HTTPS">HTTPS</option>
              <option value="FTP">FTP</option>
              <option value="SSH">SSH</option>
              <option value="DNS">DNS</option>
            </select>
            <input
              type="number"
              placeholder="Kaynak Port"
              value={filters.sourcePort}
              onChange={(e) => setFilters({ ...filters, sourcePort: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
              min="1"
              max="65535"
            />
            <input
              type="number"
              placeholder="Hedef Port"
              value={filters.destinationPort}
              onChange={(e) => setFilters({ ...filters, destinationPort: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
              min="1"
              max="65535"
            />
            <input
              type="date"
              placeholder="Başlangıç Tarihi"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
            <input
              type="date"
              placeholder="Bitiş Tarihi"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
            <button
              onClick={loadLogs}
              className="px-4 py-2 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 btn-glow text-sm flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Filtrele
            </button>
            <button
              onClick={() => {
                setFilters({
                  userId: '',
                  internalIp: '',
                  externalIp: '',
                  sourceIp: '',
                  destinationIp: '',
                  sourcePort: '',
                  destinationPort: '',
                  macAddress: '',
                  protocol: '',
                  startDate: '',
                  endDate: '',
                  page: 1,
                });
              }}
              className="px-4 py-2 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-300 text-sm"
            >
              Temizle
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      Tarih/Saat
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      Kullanıcı
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      Kaynak IP
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      Hedef IP
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      İç IP (NAT)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      Dış IP
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      Kaynak Port
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      Hedef Port
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      Protokol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      Oturum Süresi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      Veri Transferi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      MAC Adresi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                        Log bulunamadı
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      // Oturum süresini formatla
                      const formatDuration = (seconds: number | null) => {
                        if (!seconds) return '-';
                        if (seconds < 60) return `${seconds}s`;
                        if (seconds < 3600) return `${Math.floor(seconds / 60)}d ${seconds % 60}s`;
                        const hours = Math.floor(seconds / 3600);
                        const minutes = Math.floor((seconds % 3600) / 60);
                        const secs = seconds % 60;
                        return `${hours}s ${minutes}d ${secs}s`;
                      };

                      return (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                            <div>
                              <div className="font-medium">
                                {log.connection_start_time
                                  ? format(new Date(log.connection_start_time), 'dd MMM yyyy HH:mm:ss')
                                  : '-'}
                              </div>
                              {log.connection_end_time && (
                                <div className="text-xs text-gray-500">
                                  Bitiş: {format(new Date(log.connection_end_time), 'HH:mm:ss')}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                            {log.full_name || `ID: ${log.user_id || '-'}`}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 font-mono">
                            {log.source_ip || log.internal_ip || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 font-mono">
                            {log.destination_ip || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 font-mono">
                            {log.internal_ip || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 font-mono">
                            {log.external_ip || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 font-mono">
                            {log.source_port || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 font-mono">
                            {log.destination_port || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                              {log.protocol || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                            {formatDuration(log.session_duration_seconds)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                            {formatBytes(log.data_transferred_bytes || 0)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100 font-mono">
                            {log.mac_address || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-700 dark:text-slate-300">
                  Toplam {pagination.total || 0} kayıt - Sayfa {pagination.page || 1} / {pagination.totalPages || 1}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: (pagination.page || 1) - 1 })}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-600 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, page: (pagination.page || 1) + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-600 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

