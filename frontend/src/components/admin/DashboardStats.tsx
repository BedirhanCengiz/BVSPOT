'use client';

import { useState } from 'react';
import { Users, Activity, CheckCircle, XCircle, TrendingUp, X } from 'lucide-react';
import { format } from 'date-fns';
import { adminAPI } from '@/lib/api';

interface DashboardStatsProps {
  stats: any;
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  if (!stats) return null;

  const statCards = [
    {
      id: 'today_registrations',
      title: 'Bugünkü Kayıtlar',
      value: stats.daily?.today_registrations || 0,
      icon: Users,
      color: 'bg-blue-500',
      filter: { 
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      },
    },
    {
      id: 'active',
      title: 'Aktif Kullanıcılar',
      value: stats.daily?.today_active || 0,
      icon: Activity,
      color: 'bg-green-500',
      filter: { status: 'active' },
    },
    {
      id: 'verified',
      title: 'Doğrulanmış Toplam',
      value: stats.daily?.total_verified || 0,
      icon: CheckCircle,
      color: 'bg-purple-500',
      filter: { status: 'verified' },
    },
    {
      id: 'blocked',
      title: 'Engellenmiş',
      value: stats.daily?.total_blocked || 0,
      icon: XCircle,
      color: 'bg-red-500',
      filter: { status: 'blocked' },
    },
    {
      id: 'online',
      title: 'Online Kullanıcılar',
      value: stats.onlineUsers || 0,
      icon: TrendingUp,
      color: 'bg-indigo-500',
      filter: { status: 'active' }, // Online için de active status kullanıyoruz
    },
  ];

  const handleCardClick = async (card: any) => {
    if (card.value === 0) return;
    
    setSelectedCard(card.id);
    setLoading(true);
    try {
      const response = await adminAPI.getUsers(card.filter);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedCard(null);
    setUsers([]);
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              onClick={() => handleCardClick(stat)}
              className={`bg-white rounded-lg shadow p-6 flex items-center justify-between cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                stat.value === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {statCards.find(c => c.id === selectedCard)?.title}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Kullanıcı bulunamadı
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ad Soyad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Telefon
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kayıt Tarihi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user: any) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.full_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              user.status === 'active' ? 'bg-green-100 text-green-800' :
                              user.status === 'blocked' ? 'bg-red-100 text-red-800' :
                              user.status === 'verified' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.status === 'active' ? 'Aktif' :
                               user.status === 'blocked' ? 'Engellenmiş' :
                               user.status === 'verified' ? 'Doğrulanmış' :
                               user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(user.created_at), 'dd.MM.yyyy HH:mm')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Haftalık Kayıtlar
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            Grafik buraya eklenecek
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Doğrulama İstatistikleri
          </h3>
          <div className="space-y-2">
            {stats.verificationStats?.map((stat: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-gray-700">{stat.action}</span>
                <span className="font-semibold text-gray-900">{stat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

