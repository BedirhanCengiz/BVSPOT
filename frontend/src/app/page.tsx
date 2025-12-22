'use client';

import { useState, useEffect } from 'react';
import RegisterForm from '@/components/RegisterForm';
import LoginForm from '@/components/LoginForm';
import OTPVerification from '@/components/OTPVerification';
import SuccessScreen from '@/components/SuccessScreen';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import MainMenu from '@/components/MainMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import { adminAPI } from '@/lib/api';

export type AuthStep = 'menu' | 'login' | 'register' | 'otp' | 'success';
export type IdType = 'tckn' | 'passport' | 'foreign_id';

interface SSID {
  id: number;
  name: string;
  ssid: string;
  background_image_url: string | null;
  is_active: boolean;
}

export default function Home() {
  const { language } = useLanguage();
  const [step, setStep] = useState<AuthStep>('menu');
  const [idType, setIdType] = useState<IdType | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);

  // URL'den SSID parametresini al ve arkaplan resmini yükle
  useEffect(() => {
    const loadSSIDBackground = async () => {
      if (typeof window === 'undefined') return;

      // URL'den SSID parametresini al (?ssid=SSID_ADI)
      const urlParams = new URLSearchParams(window.location.search);
      const ssidParam = urlParams.get('ssid');

      if (ssidParam) {
        try {
          // SSID bilgisini API'den al
          const response = await adminAPI.getSSID(ssidParam);
          const ssidData = response.data;

          if (ssidData?.backgroundImageUrl) {
            const imageUrl = ssidData.backgroundImageUrl;
            if (imageUrl.startsWith('http')) {
              setBackgroundImageUrl(imageUrl);
            } else {
              setBackgroundImageUrl(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${imageUrl}`);
            }
          } else {
            setBackgroundImageUrl(null);
          }
        } catch (error) {
          console.error('SSID arkaplan yükleme hatası:', error);
          setBackgroundImageUrl(null);
        }
      } else {
        setBackgroundImageUrl(null);
      }
    };

    loadSSIDBackground();
  }, []);

  const handleMenuSelection = (selectedIdType: IdType, action: 'login' | 'register') => {
    setIdType(selectedIdType);
    setStep(action);
  };

  const handleRegisterSuccess = (data: any) => {
    setUserData(data);
    // Pasaport kayıtları admin onayına düşer
    if (data.requiresApproval || idType === 'passport') {
      // Admin onayı bekleme ekranı göster
      setStep('success');
      return;
    }
    // Şifre her zaman var olduğu için direkt login'e yönlendir
    setStep('login');
  };

  const handleLoginSuccess = (data: any) => {
    setToken(data.token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.token);
    }
    setStep('success');
  };

  const handleOTPSuccess = (data: any) => {
    setToken(data.token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', data.token);
    }
    setStep('success');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 relative overflow-hidden">
      {/* SSID bazlı arkaplan veya varsayılan animasyonlu arkaplan */}
      {backgroundImageUrl ? (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
          }}
        >
          <div className="absolute inset-0 bg-black/30"></div>
        </div>
      ) : (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 sm:top-20 left-2 sm:left-4 md:left-20 w-24 h-24 sm:w-48 sm:h-48 md:w-72 md:h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float"></div>
          <div className="absolute top-20 sm:top-40 right-2 sm:right-4 md:right-20 w-24 h-24 sm:w-48 sm:h-48 md:w-72 md:h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-10 sm:bottom-20 left-1/2 transform -translate-x-1/2 w-24 h-24 sm:w-48 sm:h-48 md:w-72 md:h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '4s' }}></div>
        </div>
      )}

      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-6 md:right-6 z-20">
        <LanguageSwitcher />
      </div>
      
      <div className="w-full max-w-md px-2 sm:px-4 md:px-6 relative z-10 flex items-center justify-center min-h-[calc(100vh-1rem)] sm:min-h-[calc(100vh-2rem)] py-2 sm:py-4 md:py-6">
        {step === 'menu' && (
          <MainMenu onSelect={handleMenuSelection} />
        )}
        {step === 'login' && idType && (
          <LoginForm 
            idType={idType}
            onSuccess={handleLoginSuccess}
            onBack={() => setStep('menu')}
          />
        )}
        {step === 'register' && idType && (
          <RegisterForm 
            idType={idType}
            onSuccess={handleRegisterSuccess}
            onBack={() => setStep('menu')}
          />
        )}
        {step === 'otp' && userData && (
          <OTPVerification
            phone={userData.phone}
            userId={userData.userId}
            onSuccess={handleOTPSuccess}
            onBack={() => setStep('register')}
          />
        )}
        {step === 'success' && (
          <SuccessScreen 
            redirectUrl="https://google.com"
            isPendingApproval={idType === 'passport' && !token}
          />
        )}
      </div>
    </main>
  );
}
