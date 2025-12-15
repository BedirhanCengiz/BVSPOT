'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Activity, CheckCircle, XCircle, TrendingUp, X } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { adminAPI } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface DashboardStatsProps {
  stats: any;
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal açıldığında body scroll'unu engelle
  useEffect(() => {
    if (selectedCard) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedCard]);

  if (!stats) return null;

  const statCards = [
    {
      id: 'today_registrations',
      title: 'Bugünkü Kayıtlar',
      value: stats.daily?.today_registrations || 0,
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      iconColor: '#3b82f6',
      filter: { 
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      },
    },
    {
      id: 'active',
      title: 'Aktif Kullanıcılar',
      value: stats.daily?.total_active || 0,
      icon: Activity,
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-50 to-teal-50',
      iconColor: '#10b981',
      filter: { status: 'active' },
    },
    {
      id: 'verified',
      title: 'Doğrulanmış Toplam',
      value: stats.daily?.total_verified || 0,
      icon: CheckCircle,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50',
      iconColor: '#a855f7',
      filter: { status: 'verified' },
    },
    {
      id: 'blocked',
      title: 'Engellenmiş',
      value: stats.daily?.total_blocked || 0,
      icon: XCircle,
      gradient: 'from-red-500 to-rose-500',
      bgGradient: 'from-red-50 to-rose-50',
      iconColor: '#ef4444',
      filter: { status: 'blocked' },
    },
    {
      id: 'online',
      title: 'Online Kullanıcılar',
      value: stats.onlineUsers || 0,
      icon: TrendingUp,
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-indigo-50 to-purple-50',
      iconColor: '#6366f1',
      filter: { status: 'active' },
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

  // Haftalık kayıtlar için grafik verisi hazırla
  const weeklyChartData = useMemo(() => {
    if (!stats.weekly || !Array.isArray(stats.weekly)) return [];
    
    // Son 7 günün tarihlerini oluştur
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return format(date, 'yyyy-MM-dd');
    });

    // Her gün için kayıt sayısını bul
    return last7Days.map(date => {
      const dayData = stats.weekly.find((w: any) => {
        const dayDate = typeof w.date === 'string' ? w.date.split('T')[0] : format(new Date(w.date), 'yyyy-MM-dd');
        return dayDate === date;
      });
      return {
        date: format(parseISO(date), 'dd MMM'),
        fullDate: date,
        registrations: dayData ? parseInt(dayData.registrations) : 0
      };
    });
  }, [stats.weekly]);

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              onClick={() => handleCardClick(stat)}
              className={`bg-white rounded-xl border border-slate-200 p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-indigo-300 hover:-translate-y-0.5 ${
                stat.value === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.bgGradient} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" style={{ color: stat.iconColor }} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1.5">{stat.title}</p>
                <p className={`text-2xl font-bold bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedCard && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {statCards.find(c => c.id === selectedCard)?.title}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-indigo-200 rounded-full border-t-indigo-600 animate-spin"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  Kullanıcı bulunamadı
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Ad Soyad
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Telefon
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          Kayıt Tarihi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {users.map((user: any) => (
                        <tr key={user.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                            {user.id}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                            {user.full_name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                            {user.phone}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                              user.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              user.status === 'blocked' ? 'bg-red-100 text-red-700' :
                              user.status === 'verified' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {user.status === 'active' ? 'Aktif' :
                               user.status === 'blocked' ? 'Engellenmiş' :
                               user.status === 'verified' ? 'Doğrulanmış' :
                               user.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
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
        </div>,
        document.body
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Haftalık Kayıtlar
          </h3>
          {weeklyChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ color: '#64748b', fontSize: '12px', fontWeight: '600' }}
                    formatter={(value: number) => [value, 'Kayıt']}
                  />
                  <Bar 
                    dataKey="registrations" 
                    fill="url(#colorGradient)"
                    radius={[8, 8, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
              <div className="text-center">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">Veri bulunamadı</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-indigo-600" />
            Doğrulama İstatistikleri
          </h3>
          <div className="space-y-2">
            {stats.verificationStats?.map((stat: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <span className="text-slate-700 font-medium text-sm">{stat.action}</span>
                <span className="font-bold text-indigo-600 text-lg">{stat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
