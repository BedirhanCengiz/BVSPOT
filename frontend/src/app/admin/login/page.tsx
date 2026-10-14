'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authAPI } from '@/lib/api';

interface LoginFormData {
  email: string;
  password: string;
}

export default function AdminLogin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Admin login attempt:', data.email);
      const response = await authAPI.adminLogin(data.email, data.password);
      console.log('Admin login response:', response.data);
      if (response.data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('adminToken', response.data.token);
        }
        router.push('/admin/dashboard');
      } else {
        setError('Giriş başarısız');
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 relative overflow-hidden">
      {/* Logo - Sol Üst */}
      <div className="absolute top-2 sm:top-4 md:top-6 left-2 sm:left-4 md:left-6 z-20">
        <img 
          src="/assets/bvspot_logo_metalic.png" 
          alt="BVSPOT Logo" 
          className="h-12 sm:h-14 md:h-16 w-auto"
        />
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 sm:top-20 left-4 sm:left-10 md:left-20 w-48 sm:w-64 md:w-72 h-48 sm:h-64 md:h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float"></div>
        <div className="absolute top-20 sm:top-40 right-4 sm:right-10 md:right-20 w-48 sm:w-64 md:w-72 h-48 sm:h-64 md:h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-10 sm:bottom-20 left-1/2 transform -translate-x-1/2 w-48 sm:w-64 md:w-72 h-48 sm:h-64 md:h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="w-full max-w-md glass-strong rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 animate-fade-in hover-lift relative z-50" style={{ pointerEvents: 'auto' }}>
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="bg-gradient-to-br from-primary-500 to-purple-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-glow animate-float">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold gradient-text mb-1 sm:mb-2 animate-slide-down px-2">
            Admin Girişi
          </h1>
          <p className="text-gray-600 text-sm sm:text-base md:text-lg animate-slide-up px-2">Yönetim paneline giriş yapın</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5 md:space-y-6 animate-fade-in relative z-50" style={{ pointerEvents: 'auto' }}>
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1">
              E-posta <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              {...register('email', {
                required: 'E-posta zorunludur',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Geçerli bir e-posta adresi giriniz',
                },
              })}
              className="w-full px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px]"
              placeholder="admin@bvspot.com"
            />
            {errors.email && (
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-red-600 flex items-center gap-1 animate-slide-down">
                <span>⚠</span> {errors.email.message}
              </p>
            )}
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1">
              Şifre <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              {...register('password', {
                required: 'Şifre zorunludur',
              })}
              className="w-full px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm sm:text-base min-h-[44px] sm:min-h-[48px]"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-red-600 flex items-center gap-1 animate-slide-down">
                <span>⚠</span> {errors.password.message}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 text-red-700 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl shadow-lg animate-slide-down flex items-center gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-xs sm:text-sm break-words">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-600 to-purple-600 text-white py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 relative overflow-hidden btn-glow group animate-slide-up cursor-pointer z-50 min-h-[44px] sm:min-h-[48px] md:min-h-[56px]"
            style={{ animationDelay: '0.3s', pointerEvents: loading ? 'none' : 'auto' }}
          >
            <span className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-xs sm:text-sm md:text-base">Giriş yapılıyor...</span>
                </>
              ) : (
                <>
                  <span className="text-xs sm:text-sm md:text-base">Giriş Yap</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

