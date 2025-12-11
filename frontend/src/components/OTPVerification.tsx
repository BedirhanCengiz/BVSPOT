'use client';

import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

interface OTPVerificationProps {
  phone: string;
  userId: number;
  onSuccess: (data: any) => void;
  onBack: () => void;
}

export default function OTPVerification({
  phone,
  userId,
  onSuccess,
  onBack,
}: OTPVerificationProps) {
  const { language } = useLanguage();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  useEffect(() => {
    // İlk OTP'yi otomatik gönder
    sendOTP();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendOTP = async () => {
    setSendingOTP(true);
    setError(null);
    try {
      const response = await authAPI.sendOTP(phone, userId);
      if (response.data.success) {
        setCountdown(60); // 1 dakika geri sayım
        if (process.env.NODE_ENV === 'development' && response.data.code) {
          console.log('OTP Code:', response.data.code);
          alert(`[TEST MODE] OTP Code: ${response.data.code}`);
        }
      } else {
        setError(response.data.error || 'OTP gönderilemedi');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'OTP gönderilirken bir hata oluştu');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Sadece rakam

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Son karakteri al

    // Otomatik sonraki input'a geç
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    setCode(newCode);

    // 6 haneli kod tamamlandıysa otomatik doğrula
    if (newCode.every((c) => c !== '') && newCode.join('').length === 6) {
      verifyOTP(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const verifyOTP = async (otpCode?: string) => {
    const otp = otpCode || code.join('');
    if (otp.length !== 6) {
      setError('Lütfen 6 haneli kodu giriniz');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.verifyOTP(phone, otp, userId);
      if (response.data.success) {
        onSuccess(response.data);
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(errorData?.error || 'OTP doğrulama hatası');
      
      if (errorData?.attemptsLeft !== undefined) {
        setAttemptsLeft(errorData.attemptsLeft);
      }

      // Hata durumunda kodu temizle
      setCode(['', '', '', '', '', '']);
      const firstInput = document.getElementById('otp-0');
      firstInput?.focus();
    } finally {
      setLoading(false);
    }
  };

  const maskedPhone = phone.substring(0, 4) + '***' + phone.substring(7);

  return (
    <div className="glass-strong rounded-3xl shadow-2xl p-8 animate-fade-in hover-lift">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-br from-primary-500 to-purple-600 p-4 rounded-2xl shadow-glow animate-float">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl font-extrabold gradient-text mb-2 animate-slide-down">
          {t('verificationCode', language)}
        </h1>
        <p className="text-gray-600 text-lg animate-slide-up">
          {t('otpSentTo', language)} <span className="font-semibold text-gray-800">{maskedPhone}</span>
        </p>
      </div>

      <div className="space-y-6 animate-fade-in">
        {/* OTP Input */}
        <div className="flex justify-center gap-3 animate-slide-up">
          {code.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-14 h-16 text-center text-3xl font-bold border-2 rounded-xl focus:ring-4 focus:ring-primary-300 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-400 hover:scale-105 ${
                digit ? 'border-primary-500 bg-primary-50 shadow-lg' : 'border-gray-300'
              }`}
              disabled={loading}
              style={{ animationDelay: `${index * 0.1}s` }}
            />
          ))}
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 text-red-700 px-5 py-4 rounded-xl shadow-lg text-center animate-slide-down flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
            {attemptsLeft !== null && (
              <p className="text-sm font-semibold bg-red-200 px-3 py-1 rounded-full">
                Kalan deneme hakkı: {attemptsLeft}
              </p>
            )}
          </div>
        )}

        {/* Tekrar Gönder */}
        <div className="text-center animate-slide-up">
          <button
            onClick={sendOTP}
            disabled={sendingOTP || countdown > 0}
            className="text-primary-600 hover:text-primary-700 font-semibold disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 flex items-center gap-2 mx-auto"
          >
            {sendingOTP ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('sending', language)}
              </>
            ) : countdown > 0 ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {countdown} {t('resendAfter', language)}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('resendCode', language)}
              </>
            )}
          </button>
        </div>

        {/* Butonlar */}
        <div className="flex gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={onBack}
            className="flex-1 border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-white/80 hover:border-primary-300 hover:scale-[1.02] transition-all duration-300 shadow-md hover:shadow-lg"
          >
            ← {t('back', language)}
          </button>
          <button
            onClick={() => verifyOTP()}
            disabled={loading || code.some((c) => !c)}
            className="flex-1 bg-gradient-to-r from-primary-600 to-purple-600 text-white py-4 rounded-xl font-bold hover:shadow-xl hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 relative overflow-hidden btn-glow group"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('verifying', language)}
                </>
              ) : (
                <>
                  {t('verify', language)}
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

