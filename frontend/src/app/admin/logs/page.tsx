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
      // Remove pagination and other non-export parameters
      const exportParams = {
        format,
        ...(filters.action && filters.action.trim() ? { action: filters.action.trim() } : {}),
        ...(filters.startDate ? { startDate: filters.startDate } : {}),
        ...(filters.endDate ? { endDate: filters.endDate } : {}),
      };
      
      console.log('Exporting logs with format:', format, 'params:', exportParams);
      const response = await adminAPI.exportLogs(exportParams);
      console.log('Export response:', response);
      
      // Check if response is an error blob (when responseType is 'blob', errors come as blobs)
      if (response.data instanceof Blob && response.data.type === 'application/json') {
        // Error response was sent as JSON blob
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || errorData.message || 'Export başarısız');
      }
      
      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error('Export error:', err);
      console.error('Export error details:', {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data
      });
      
      // Handle blob error responses
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          console.log('Blob error text:', text);
          const errorData = JSON.parse(text);
          const errorMessage = errorData.error || errorData.message || 'Export başarısız';
          alert(`Export başarısız: ${errorMessage}`);
          return;
        } catch (parseError) {
          console.error('Error parsing blob error response:', parseError);
          // If parsing fails, use default error message
        }
      }
      
      const errorMessage = err.response?.data?.error || err.message || 'Export başarısız';
      alert(`Export başarısız: ${errorMessage}`);
    }
  };

  return (
    <AdminLayout>
      <div className="px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 pb-4 sm:pb-6">
        <PageHeader
          titleKey="logsTitle"
          descriptionKey="logsDescription"
          icon={FileText}
          action={
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleExport('csv')}
                className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                {t('exportCSV', language)}
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                {t('exportJSON', language)}
              </button>
            </div>
          }
        />

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <input
              type="text"
              placeholder={t('action', language)}
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm sm:text-base min-h-[44px]"
            />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm sm:text-base min-h-[44px]"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm sm:text-base min-h-[44px]"
            />
            <button
              onClick={loadLogs}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 btn-glow text-xs sm:text-sm min-h-[44px] sm:min-h-[48px]"
            >
              {t('filter', language)}
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto -mx-2 sm:-mx-0">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-700">
                  <tr>
                    <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      {t('date', language)}
                    </th>
                    <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                      {t('action', language)}
                    </th>
                    <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-slate-300 uppercase hidden md:table-cell">
                      {t('user', language)}
                    </th>
                    <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-slate-300 uppercase hidden lg:table-cell">
                      {t('ipAddress', language)}
                    </th>
                    <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-left text-[10px] sm:text-xs font-medium text-gray-500 dark:text-slate-300 uppercase hidden sm:table-cell">
                      {t('details', language)}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 sm:px-4 py-6 sm:py-8 text-center text-gray-500 dark:text-slate-400 text-xs sm:text-sm">
                        {t('noLogsFound', language)}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-slate-100">
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-slate-100 break-words">
                        {log.action}
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-slate-100 hidden md:table-cell break-words">
                        {log.full_name || '-'}
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-slate-100 hidden lg:table-cell break-all">
                        {log.ip_address || '-'}
                      </td>
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-900 dark:text-slate-100 hidden sm:table-cell break-words">
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
              <div className="bg-slate-50 dark:bg-slate-700/50 px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 md:gap-0 border-t border-slate-200 dark:border-slate-700">
                <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 text-center sm:text-left break-words">
                  {t('totalRecords', language)
                    .replace('{total}', pagination.total?.toString() || '0')
                    .replace('{page}', pagination.page?.toString() || '1')
                    .replace('{totalPages}', pagination.totalPages?.toString() || '1')}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: (pagination.page || 1) - 1 })}
                    disabled={pagination.page === 1}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-600 text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 transition-all active:scale-95 min-h-[40px] sm:min-h-[44px]"
                  >
                    {t('previous', language)}
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, page: (pagination.page || 1) + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-600 text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 transition-all active:scale-95 min-h-[40px] sm:min-h-[44px]"
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

