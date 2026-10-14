'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { authAPI } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';
import { UserPlus } from 'lucide-react';
import { getMacAddressAuto } from '@/utils/macAddress';
import PhoneInput from '@/components/PhoneInput';

interface RegisterFormData {
  fullName: string;
  phone: string;
  idType: 'tckn' | 'passport' | 'foreign_id';
  tckn?: string;
  passportNo?: string;
  foreignIdNo?: string;
  password?: string;
  confirmPassword?: string;
  birthDate: string;
  language: 'tr' | 'en';
  kvkkAccepted: boolean;
  termsAccepted: boolean;
}

interface RegisterFormProps {
  idType: 'tckn' | 'passport' | 'foreign_id';
  onSuccess: (data: { phone: string; userId: number; hasPassword: boolean }) => void;
  onBack: () => void;
}

export default function RegisterForm({ idType: propIdType, onSuccess, onBack }: RegisterFormProps) {
  const { language, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    defaultValues: {
      idType: propIdType,
      language: language,
    },
  });

  const idType = propIdType; // Prop'tan gelen idType'ı kullan
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');
  const kvkkAccepted = watch('kvkkAccepted');
  const termsAccepted = watch('termsAccepted');

  // Language field'ını mevcut dil ile güncelle
  useEffect(() => {
    setValue('language', language);
  }, [language, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setError(null);
    setIdError(null);

    try {
      // TCKN doğrulama (sadece TCKN için)
      if (data.idType === 'tckn' && data.tckn) {
        const tcknValidation = await authAPI.validateTCKN(data.tckn, data.birthDate);
        
        if (!tcknValidation.data.valid) {
          setIdError(t('invalidTCKNMessage', language));
          setLoading(false);
          return;
        }
      }

      // Şifre kontrolü
      if (data.password !== data.confirmPassword) {
        setError(t('passwordsNotMatch', language));
        setLoading(false);
        return;
      }

      // Kayıt işlemi - MAC adresi otomatik çekiliyor
      const macAddress = getMacAddressAuto(); // Otomatik MAC adresi çekme
      const registerData: any = {
        ...data,
        kvkkAccepted: data.kvkkAccepted ? 'true' : 'false',
        termsAccepted: data.termsAccepted ? 'true' : 'false',
      };
      
      // MAC adresi varsa otomatik ekle (kullanıcıya sormadan)
      if (macAddress) {
        registerData.macAddress = macAddress;
      }
      
      const response = await authAPI.register(registerData);

      if (response.data.success) {
        // Eğer otomatik giriş yapıldıysa
        if (response.data.token) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', response.data.token);
          }
          window.location.href = response.data.redirectUrl || 'https://google.com';
          return;
        }

        // Şifre her zaman var olduğu için direkt login'e yönlendir
        onSuccess({
          phone: data.phone,
          userId: response.data.userId,
          hasPassword: true,
        });
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.details ||
        err.response?.data?.errors?.[0]?.msg ||
        t('registrationFailed', language);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-strong rounded-2xl sm:rounded-3xl shadow-2xl p-3 sm:p-4 md:p-6 lg:p-8 animate-fade-in hover-lift w-full max-h-[90vh] sm:max-h-[95vh] overflow-y-auto">
      <div className="text-center mb-2 sm:mb-3 md:mb-4">
        <div className="flex justify-center mb-2 sm:mb-3">
          <div className="bg-gradient-to-br from-primary-500 to-purple-600 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl md:rounded-2xl shadow-glow animate-float">
            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
          </div>
        </div>
        <h1 className="text-base sm:text-lg md:text-xl font-extrabold gradient-text mb-1 sm:mb-2 animate-slide-down px-2">
          {t('guestWifiRegistration', language)}
        </h1>
        <p className="text-gray-600 text-[10px] sm:text-xs md:text-sm animate-slide-up px-2 sm:px-4">
          {t('internetAccessRegistration', language)}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5 sm:space-y-3 md:space-y-3.5 animate-fade-in">
        {/* Language hidden field - mevcut dil kullanılacak */}
        <input type="hidden" {...register('language')} value={language} />

        {/* Ad Soyad */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1">
            {t('fullName', language)} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('fullName', {
              required: t('requiredField', language),
              minLength: {
                value: 3,
                message: t('requiredField', language),
              },
            })}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm sm:text-base min-h-[44px]"
            placeholder={t('fullName', language)}
          />
          {errors.fullName && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-slide-down">
              <span>⚠️</span> {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Telefon */}
        <div className="animate-slide-up relative z-[70]" style={{ animationDelay: '0.2s' }}>
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
            className="rounded-lg px-3 py-2"
          />
        </div>

        {/* Kimlik Tipi (Hidden - prop'tan geliyor) */}
        <input type="hidden" {...register('idType')} value={propIdType} />
        
        {/* Kimlik Tipi Bilgi Kutusu */}
        <div className="bg-gradient-to-r from-primary-50 to-purple-50 border-2 border-primary-200 rounded-lg p-2 sm:p-2.5 md:p-3 mb-2 sm:mb-3 shadow-inner animate-slide-up">
          <p className="text-xs sm:text-sm md:text-base font-bold text-primary-800 text-center flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
            {propIdType === 'tckn' && <span className="text-base sm:text-lg md:text-xl">📋</span>}
            {propIdType === 'passport' && <span className="text-base sm:text-lg md:text-xl">📘</span>}
            {propIdType === 'foreign_id' && <span className="text-base sm:text-lg md:text-xl">🌍</span>}
            <span className="break-words">
              {propIdType === 'tckn' && t('registerWithTCKN', language)}
              {propIdType === 'passport' && t('registerWithPassport', language)}
              {propIdType === 'foreign_id' && t('registerWithForeignId', language)}
            </span>
          </p>
        </div>

        {/* TCKN */}
        {idType === 'tckn' && (
          <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1">
              {t('tckn', language)} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={11}
              {...register('tckn', {
                required: idType === 'tckn' ? t('requiredField', language) : false,
                pattern: {
                  value: /^[0-9]{11}$/,
                  message: t('invalidTCKN', language),
                },
              })}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm sm:text-base min-h-[44px]"
              placeholder={t('tcknPlaceholder', language)}
            />
            {errors.tckn && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-slide-down">
                <span>⚠️</span> {errors.tckn.message}
              </p>
            )}
            {idError && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-slide-down">
                <span>⚠️</span> {idError}
              </p>
            )}
          </div>
        )}

        {/* Pasaport No */}
        {idType === 'passport' && (
          <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1">
              {t('passportNo', language)} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('passportNo', {
                required: idType === 'passport' ? t('requiredField', language) : false,
                minLength: {
                  value: 5,
                  message: t('requiredField', language),
                },
              })}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm sm:text-base min-h-[44px]"
              placeholder={t('passportNo', language)}
            />
            {errors.passportNo && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-slide-down">
                <span>⚠️</span> {errors.passportNo.message}
              </p>
            )}
          </div>
        )}

        {/* Yabancı Kimlik No */}
        {idType === 'foreign_id' && (
          <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1">
              {t('foreignIdNo', language)} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('foreignIdNo', {
                required: idType === 'foreign_id' ? t('requiredField', language) : false,
                minLength: {
                  value: 5,
                  message: t('requiredField', language),
                },
              })}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm sm:text-base min-h-[44px]"
              placeholder={t('foreignIdNo', language)}
            />
            {errors.foreignIdNo && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-slide-down">
                <span>⚠️</span> {errors.foreignIdNo.message}
              </p>
            )}
          </div>
        )}

        {/* Doğum Tarihi */}
        <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1">
            {t('birthDate', language)} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register('birthDate', {
              required: t('requiredField', language),
            })}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm sm:text-base min-h-[44px]"
          />
          {errors.birthDate && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-slide-down">
              <span>⚠️</span> {errors.birthDate.message}
            </p>
          )}
        </div>

        {/* Şifre */}
        <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
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
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm sm:text-base min-h-[44px]"
            placeholder={t('password', language)}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-slide-down">
              <span>⚠️</span> {errors.password.message}
            </p>
          )}
        </div>

        {/* Şifre Tekrar */}
        <div className="animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1">
            {t('confirmPassword', language)} <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            {...register('confirmPassword', {
              required: t('requiredField', language),
              validate: (value) =>
                value === password || t('passwordsNotMatch', language),
            })}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm sm:text-base min-h-[44px]"
            placeholder={t('confirmPassword', language)}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-slide-down">
              <span>⚠️</span> {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* KVKK Onayı */}
        <div className="flex items-start p-2 sm:p-2.5 md:p-3 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-primary-300 transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.7s' }}>
          <input
            type="checkbox"
            id="kvkk"
            {...register('kvkkAccepted', {
              required: t('requiredField', language),
            })}
            className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer transition-all flex-shrink-0"
          />
          <label htmlFor="kvkk" className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700 cursor-pointer flex items-start gap-1 leading-relaxed">
            <span className="text-red-500 font-bold">*</span> <span className="break-words">{t('kvkkAccept', language)}</span>
          </label>
        </div>
        {errors.kvkkAccepted && (
          <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1 animate-slide-down">
            <span>⚠️</span> {errors.kvkkAccepted.message}
          </p>
        )}

        {/* Kullanım Koşulları */}
        <div className="flex items-start p-2 sm:p-2.5 md:p-3 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-primary-300 transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.8s' }}>
          <input
            type="checkbox"
            id="terms"
            {...register('termsAccepted', {
              required: t('requiredField', language),
            })}
            className="mt-0.5 sm:mt-1 h-4 w-4 sm:h-5 sm:w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer transition-all flex-shrink-0"
          />
          <label htmlFor="terms" className="ml-2 sm:ml-3 text-xs sm:text-sm text-gray-700 cursor-pointer flex items-start gap-1 leading-relaxed">
            <span className="text-red-500 font-bold">*</span> <span className="break-words">{t('termsAccept', language)}</span>
          </label>
        </div>
        {errors.termsAccepted && (
          <p className="text-xs text-red-600 flex items-center gap-1 animate-slide-down">
            <span>⚠️</span> {errors.termsAccepted.message}
          </p>
        )}

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
          disabled={loading || !kvkkAccepted || !termsAccepted}
          className="w-full bg-gradient-to-r from-primary-600 to-purple-600 text-white py-2.5 sm:py-3 rounded-lg font-bold text-xs sm:text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 relative overflow-hidden btn-glow group animate-slide-up min-h-[44px] sm:min-h-[48px]"
          style={{ animationDelay: '0.9s' }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-2.5">
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{t('registering', language)}</span>
              </>
            ) : (
              <>
                <span>{t('registerAndContinue', language)}</span>
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
          className="w-full border-2 border-gray-300 text-gray-700 py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm hover:bg-white/80 hover:border-primary-300 hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-md hover:shadow-lg animate-slide-up min-h-[44px] sm:min-h-[48px]"
          style={{ animationDelay: '1s' }}
        >
          ← {t('back', language)}
        </button>
      </form>
    </div>
  );
}
