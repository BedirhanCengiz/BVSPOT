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
import { FileText, Download } from 'lucide-react';

export default function AdminLogs() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [filters, setFilters] = useState({
    action: '',
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
      const response = await adminAPI.getLogs({ ...filters, limit: 10, page: filters.page });
      setLogs(response.data.logs);
      setPagination(response.data.pagination || {});
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const response = await adminAPI.exportLogs({ ...filters, format });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs.${format}`;
      a.click();
    } catch (err) {
      alert('Export başarısız');
    }
  };

  return (
    <AdminLayout>
      <div className="px-6 pt-4 pb-6">
        <PageHeader
          titleKey="logsTitle"
          descriptionKey="logsDescription"
          icon={FileText}
          action={
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                {t('exportCSV', language)}
              </button>
              <button
                onClick={() => handleExport('json')}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                {t('exportJSON', language)}
              </button>
            </div>
          }
        />

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder={t('action', language)}
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm"
            />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
              className="px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
              className="px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300"
            />
            <button
              onClick={loadLogs}
              className="px-4 py-2 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 btn-glow text-sm"
            >
              {t('filter', language)}
            </button>
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
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('date', language)}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('action', language)}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('user', language)}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('ipAddress', language)}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('details', language)}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        {t('noLogsFound', language)}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {log.full_name || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {log.ip_address || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {log.details ? JSON.stringify(log.details).substring(0, 50) + '...' : '-'}
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-200">
                <div className="text-sm text-slate-700">
                  {t('totalRecords', language)
                    .replace('{total}', pagination.total?.toString() || '0')
                    .replace('{page}', pagination.page?.toString() || '1')
                    .replace('{totalPages}', pagination.totalPages?.toString() || '1')}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: (pagination.page || 1) - 1 })}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 text-sm text-slate-700 bg-white"
                  >
                    {t('previous', language)}
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, page: (pagination.page || 1) + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-4 py-2 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 text-sm text-slate-700 bg-white"
                  >
                    {t('next', language)}
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

