'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authAPI } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { getMacAddressAuto } from '@/utils/macAddress';
import PhoneInput from '@/components/PhoneInput';

interface LoginFormData {
  phone: string;
  password: string;
}

interface LoginFormProps {
  idType: 'tckn' | 'passport' | 'foreign_id';
  onSuccess: (data: any) => void;
  onBack: () => void;
}

export default function LoginForm({ idType, onSuccess, onBack }: LoginFormProps) {
  const { language } = useLanguage();
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
      // MAC adresi otomatik çekiliyor
      const macAddress = getMacAddressAuto(); // Otomatik MAC adresi çekme
      const loginData: any = {
        phone: data.phone,
        password: data.password,
      };
      
      // MAC adresi varsa otomatik ekle (kullanıcıya sormadan)
      if (macAddress) {
        loginData.macAddress = macAddress;
      }
      
      const response = await authAPI.login(loginData);

      if (response.data.success) {
        onSuccess(response.data);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        t('loginFailed', language);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-strong rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-5 md:p-6 lg:p-8 animate-fade-in hover-lift relative z-50 w-full max-w-full" style={{ pointerEvents: 'auto' }}>
      <div className="text-center mb-3 sm:mb-4 md:mb-5">
        <div className="flex justify-center mb-2 sm:mb-3">
          <img 
            src="/assets/bvspot_logo_metalic.png" 
            alt="BVSPOT Logo" 
            className="h-10 sm:h-12 md:h-14 w-auto"
          />
        </div>
        <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-extrabold gradient-text mb-1 sm:mb-2 animate-slide-down px-2">
          {t('loginToInternet', language)}
        </h1>
        <p className="text-gray-600 text-[10px] sm:text-xs md:text-sm animate-slide-up px-2 sm:px-4">
          {t('loginDescription', language)}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5 sm:space-y-3 md:space-y-4 animate-fade-in relative z-50" style={{ pointerEvents: 'auto' }}>
        {/* Telefon */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1">
            {t('phone', language)} <span className="text-red-500">*</span>
          </label>
          <PhoneInput
            register={register('phone', {
              required: t('requiredField', language),
              pattern: {
                value: /^[0-9]{10,11}$/,
                message: t('invalidPhone', language),
              },
            })}
            error={errors.phone?.message}
            placeholder="5XX XXX XX XX"
          />
        </div>

        {/* Şifre */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1">
            {t('password', language)} <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            {...register('password', {
              required: t('requiredField', language),
              minLength: {
                value: 6,
                message: t('invalidPassword', language),
              },
            })}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm sm:text-base min-h-[44px]"
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-slide-down">
              <span>⚠</span> {errors.password.message}
            </p>
          )}
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 text-red-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg shadow-lg animate-slide-down flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-xs sm:text-sm break-words">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary-600 to-purple-600 text-white py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden btn-glow group cursor-pointer z-50 min-h-[44px] sm:min-h-[48px]"
          style={{ pointerEvents: loading ? 'none' : 'auto' }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-2.5">
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{t('loggingIn', language)}</span>
              </>
            ) : (
              <>
                {t('loginButton', language)}
                <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </span>
        </button>

        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="w-full border-2 border-gray-300 text-gray-700 py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm hover:bg-white/80 hover:border-primary-300 hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer z-50 min-h-[44px] sm:min-h-[48px]"
          style={{ pointerEvents: 'auto' }}
        >
          &larr; {t('back', language)}
        </button>
      </form>
    </div>
  );
}

