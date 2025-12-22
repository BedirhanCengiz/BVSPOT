'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import UsersTable from '@/components/admin/UsersTable';
import PageHeader from '@/components/admin/PageHeader';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { adminAPI } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { Users } from 'lucide-react';

export default function AdminUsers() {
  const { language } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [filters, setFilters] = useState<{
    status: string;
    search: string;
    page: number;
    pendingPassport?: string;
  }>({
    status: '',
    search: '',
    page: 1,
    pendingPassport: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }
    }
    loadUsers();
  }, [filters, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers({ ...filters, limit: 10 });
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (id: number) => {
    if (confirm(t('confirmBlockUser', language))) {
      try {
        await adminAPI.blockUser(id);
        loadUsers();
      } catch (err) {
        alert(t('error', language));
      }
    }
  };

  const handleUnblock = async (id: number) => {
    try {
      await adminAPI.unblockUser(id);
      loadUsers();
    } catch (err) {
      alert('İşlem başarısız');
    }
  };

  const handleEdit = () => {
    loadUsers();
  };

  const handleApprove = async (id: number) => {
    if (confirm(t('confirmApprovePassport', language))) {
      try {
        await adminAPI.approveUser(id);
        loadUsers();
      } catch (err) {
        alert(t('approvalFailed', language));
      }
    }
  };

  const handleReject = async (id: number) => {
    if (confirm(t('confirmRejectPassport', language))) {
      try {
        await adminAPI.rejectUser(id);
        loadUsers();
      } catch (err) {
        alert(t('rejectionFailed', language));
      }
    }
  };

  return (
    <AdminLayout>
      <div className="px-2 sm:px-4 lg:px-6 pt-2 sm:pt-4 pb-4 sm:pb-6">
        <PageHeader
          titleKey="usersTitle"
          descriptionKey="usersDescription"
          icon={Users}
        />

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-4 md:p-5 mb-3 sm:mb-4 md:mb-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
            <input
              type="text"
              placeholder={t('searchPlaceholder', language)}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 transition-all duration-200 text-sm sm:text-base"
            >
              <option value="">{t('allStatuses', language)}</option>
              <option value="pending">{t('statusPending', language)}</option>
              <option value="verified">{t('statusVerified', language)}</option>
              <option value="active">{t('statusActive', language)}</option>
              <option value="blocked">{t('statusBlocked', language)}</option>
            </select>
            <button
              onClick={() => setFilters({ ...filters, pendingPassport: filters.pendingPassport ? '' : 'true', page: 1 })}
              className={`w-full sm:w-auto px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm md:text-base active:scale-95 ${
                filters.pendingPassport
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {t('pendingPassports', language)}
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <UsersTable
            users={users}
            pagination={pagination}
            onBlock={handleBlock}
            onUnblock={handleUnblock}
            onEdit={handleEdit}
            onApprove={handleApprove}
            onReject={handleReject}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        )}
      </div>
    </AdminLayout>
  );
}

