'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import UsersTable from '@/components/admin/UsersTable';
import { adminAPI } from '@/lib/api';

export default function AdminUsers() {
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
      const response = await adminAPI.getUsers(filters);
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
    if (confirm('Bu kullanıcıyı engellemek istediğinize emin misiniz?')) {
      try {
        await adminAPI.blockUser(id);
        loadUsers();
      } catch (err) {
        alert('İşlem başarısız');
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
    if (confirm('Bu pasaport kaydını onaylamak istediğinize emin misiniz?')) {
      try {
        await adminAPI.approveUser(id);
        loadUsers();
      } catch (err) {
        alert('Onaylama başarısız');
      }
    }
  };

  const handleReject = async (id: number) => {
    if (confirm('Bu pasaport kaydını reddetmek istediğinize emin misiniz?')) {
      try {
        await adminAPI.rejectUser(id);
        loadUsers();
      } catch (err) {
        alert('Reddetme başarısız');
      }
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Kullanıcılar</h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Ara (isim, telefon, TCKN)..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tüm Durumlar</option>
              <option value="pending">Beklemede</option>
              <option value="verified">Doğrulanmış</option>
              <option value="active">Aktif</option>
              <option value="blocked">Engellenmiş</option>
            </select>
            <button
              onClick={() => setFilters({ ...filters, pendingPassport: filters.pendingPassport ? '' : 'true', page: 1 })}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filters.pendingPassport
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Pasaport Bekleyenler
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
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

