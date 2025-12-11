export type Language = 'tr' | 'en';

export const translations = {
  tr: {
    // Common
    welcome: 'Hoş Geldiniz',
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı',
    submit: 'Gönder',
    cancel: 'İptal',
    back: 'Geri',
    next: 'İleri',
    save: 'Kaydet',
    delete: 'Sil',
    edit: 'Düzenle',
    search: 'Ara',
    
    // Auth
    register: 'Kayıt Ol',
    login: 'Giriş Yap',
    logout: 'Çıkış Yap',
    fullName: 'Ad Soyad',
    phone: 'Telefon Numarası',
    password: 'Şifre',
    confirmPassword: 'Şifre Tekrar',
    birthDate: 'Doğum Tarihi',
    idType: 'Kimlik Tipi',
    tckn: 'T.C. Kimlik Numarası',
    passportNo: 'Pasaport Numarası',
    foreignIdNo: 'Yabancı Kimlik Numarası',
    selectIdType: 'Kimlik tipi seçiniz',
    language: 'Dil',
    selectLanguage: 'Dil seçiniz',
    selectLoginMethod: 'Giriş yöntemi seçiniz',
    loginWithTCKN: 'TCKN ile Giriş',
    registerWithTCKN: 'TCKN ile Kayıt',
    loginWithPassport: 'Pasaport ile Giriş',
    registerWithPassport: 'Pasaport ile Kayıt',
    loginWithForeignId: 'Yabancı Kimlik ile Giriş',
    registerWithForeignId: 'Yabancı Kimlik ile Kayıt',
    passportNote: 'Pasaport ile kayıt yaparsanız Yönetici Onayı gerekecektir',
    pendingApproval: 'Admin Onayı Bekleniyor',
    pendingApprovalMessage: 'Pasaport kaydınız admin onayına gönderildi. Onaylandıktan sonra size bilgi verilecektir.',
    approvalNote: 'Lütfen bekleyin, admin onayından sonra otomatik olarak internete erişim sağlanacaktır.',
    
    // Register
    guestWifiRegistration: 'Misafir Wi-Fi Kayıt',
    internetAccessRegistration: 'İnternete erişim için lütfen bilgilerinizi giriniz',
    required: 'zorunlu',
    kvkkAccept: 'KVKK Aydınlatma Metni\'ni okudum ve kabul ediyorum',
    termsAccept: 'Kullanım koşullarını okudum ve kabul ediyorum',
    registerAndContinue: 'Kayıt Ol ve Devam Et',
    registering: 'Kaydediliyor...',
    
    // OTP
    verificationCode: 'Doğrulama Kodu',
    otpSentTo: 'numaralı telefona gönderilen 6 haneli kodu giriniz',
    enterCode: 'Kodu giriniz',
    verify: 'Doğrula',
    verifying: 'Doğrulanıyor...',
    resendCode: 'Kodu Tekrar Gönder',
    sending: 'Gönderiliyor...',
    resendAfter: 'saniye sonra tekrar gönder',
    
    // Login
    loginToInternet: 'İnternete Erişim',
    loginDescription: 'Kayıtlı hesabınızla giriş yapın',
    forgotPassword: 'Şifremi Unuttum',
    loginButton: 'Giriş Yap',
    loggingIn: 'Giriş yapılıyor...',
    noAccount: 'Hesabınız yok mu?',
    registerHere: 'Kayıt olun',
    
    // Success
    verificationSuccess: 'Doğrulama Başarılı!',
    internetAccessActivated: 'İnternet erişiminiz aktif edildi. Yönlendiriliyorsunuz...',
    clickHere: 'buraya tıklayın',
    redirecting: 'Otomatik yönlendirme çalışmazsa',
    
    // Errors
    requiredField: 'Bu alan zorunludur',
    invalidPhone: 'Geçerli bir telefon numarası giriniz',
    invalidTCKN: 'TCKN 11 haneli olmalıdır',
    invalidPassword: 'Şifre en az 6 karakter olmalıdır',
    passwordsNotMatch: 'Şifreler eşleşmiyor',
    invalidDate: 'Geçerli bir doğum tarihi giriniz',
    invalidOTP: 'OTP kodu 6 haneli olmalıdır',
    loginFailed: 'Telefon numarası veya şifre hatalı',
    registrationFailed: 'Kayıt sırasında bir hata oluştu',
  },
  en: {
    // Common
    welcome: 'Welcome',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    submit: 'Submit',
    cancel: 'Cancel',
    back: 'Back',
    next: 'Next',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    
    // Auth
    register: 'Register',
    login: 'Login',
    logout: 'Logout',
    fullName: 'Full Name',
    phone: 'Phone Number',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    birthDate: 'Date of Birth',
    idType: 'ID Type',
    tckn: 'Turkish ID Number',
    passportNo: 'Passport Number',
    foreignIdNo: 'Foreign ID Number',
    selectIdType: 'Select ID type',
    language: 'Language',
    selectLanguage: 'Select language',
    selectLoginMethod: 'Select login method',
    loginWithTCKN: 'Login with TCKN',
    registerWithTCKN: 'Register with TCKN',
    loginWithPassport: 'Login with Passport',
    registerWithPassport: 'Register with Passport',
    loginWithForeignId: 'Login with Foreign ID',
    registerWithForeignId: 'Register with Foreign ID',
    passportNote: 'Passport registrations require Administrator Approval',
    pendingApproval: 'Pending Approval',
    pendingApprovalMessage: 'Your passport registration has been sent for admin approval. You will be notified once approved.',
    approvalNote: 'Please wait, internet access will be automatically granted after admin approval.',
    
    // Register
    guestWifiRegistration: 'Guest Wi-Fi Registration',
    internetAccessRegistration: 'Please enter your information to access the internet',
    required: 'required',
    optional: 'optional',
    passwordOptional: 'If you set a password, you can login with password next time',
    alreadyHaveAccount: 'Already have an account?',
    kvkkAccept: 'I have read and accept the KVKK Disclosure Text',
    termsAccept: 'I have read and accept the terms of use',
    registerAndContinue: 'Register and Continue',
    registering: 'Registering...',
    
    // OTP
    verificationCode: 'Verification Code',
    otpSentTo: 'Enter the 6-digit code sent to',
    enterCode: 'Enter code',
    verify: 'Verify',
    verifying: 'Verifying...',
    resendCode: 'Resend Code',
    sending: 'Sending...',
    resendAfter: 'seconds to resend',
    
    // Login
    loginToInternet: 'Internet Access',
    loginDescription: 'Login with your registered account',
    forgotPassword: 'Forgot Password',
    loginButton: 'Login',
    loggingIn: 'Logging in...',
    noAccount: 'Don\'t have an account?',
    registerHere: 'Register here',
    
    // Success
    verificationSuccess: 'Verification Successful!',
    internetAccessActivated: 'Your internet access has been activated. Redirecting...',
    clickHere: 'click here',
    redirecting: 'If automatic redirect doesn\'t work,',
    
    // Errors
    requiredField: 'This field is required',
    invalidPhone: 'Please enter a valid phone number',
    invalidTCKN: 'TCKN must be 11 digits',
    invalidPassword: 'Password must be at least 6 characters',
    passwordsNotMatch: 'Passwords do not match',
    invalidDate: 'Please enter a valid date of birth',
    invalidOTP: 'OTP code must be 6 digits',
    loginFailed: 'Phone number or password is incorrect',
    registrationFailed: 'An error occurred during registration',
  },
};

export function getTranslation(key: string, lang: Language = 'tr'): string {
  const keys = key.split('.');
  let value: any = translations[lang];
  
  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      return translations.tr[key as keyof typeof translations.tr] || key;
    }
  }
  
  return value || key;
}

export function t(key: string, lang: Language = 'tr'): string {
  return getTranslation(key, lang);
}

