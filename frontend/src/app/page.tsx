'use client';

import { useState } from 'react';
import RegisterForm from '@/components/RegisterForm';
import LoginForm from '@/components/LoginForm';
import OTPVerification from '@/components/OTPVerification';
import SuccessScreen from '@/components/SuccessScreen';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import MainMenu from '@/components/MainMenu';
import { useLanguage } from '@/contexts/LanguageContext';

export type AuthStep = 'menu' | 'login' | 'register' | 'otp' | 'success';
export type IdType = 'tckn' | 'passport' | 'foreign_id';

export default function Home() {
  const { language } = useLanguage();
  const [step, setStep] = useState<AuthStep>('menu');
  const [idType, setIdType] = useState<IdType | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

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
    // Eğer şifre varsa direkt login, yoksa OTP
    if (data.hasPassword) {
      setStep('login');
    } else {
      setStep('otp');
    }
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
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      
      <div className="w-full max-w-md relative z-10">
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
