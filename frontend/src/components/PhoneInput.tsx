'use client';

import { useState, useRef, useEffect } from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n';

interface Country {
  code: string;
  dialCode: string;
  nameKey: string; // Çeviri anahtarı
  flag: string;
}

const countries: Country[] = [
  { code: 'TR', dialCode: '+90', nameKey: 'country.turkey', flag: '🇹🇷' },
  { code: 'US', dialCode: '+1', nameKey: 'country.usa', flag: '🇺🇸' },
  { code: 'GB', dialCode: '+44', nameKey: 'country.uk', flag: '🇬🇧' },
  { code: 'DE', dialCode: '+49', nameKey: 'country.germany', flag: '🇩🇪' },
  { code: 'FR', dialCode: '+33', nameKey: 'country.france', flag: '🇫🇷' },
  { code: 'IT', dialCode: '+39', nameKey: 'country.italy', flag: '🇮🇹' },
  { code: 'ES', dialCode: '+34', nameKey: 'country.spain', flag: '🇪🇸' },
  { code: 'NL', dialCode: '+31', nameKey: 'country.netherlands', flag: '🇳🇱' },
  { code: 'BE', dialCode: '+32', nameKey: 'country.belgium', flag: '🇧🇪' },
  { code: 'CH', dialCode: '+41', nameKey: 'country.switzerland', flag: '🇨🇭' },
  { code: 'AT', dialCode: '+43', nameKey: 'country.austria', flag: '🇦🇹' },
  { code: 'GR', dialCode: '+30', nameKey: 'country.greece', flag: '🇬🇷' },
  { code: 'BG', dialCode: '+359', nameKey: 'country.bulgaria', flag: '🇧🇬' },
  { code: 'RO', dialCode: '+40', nameKey: 'country.romania', flag: '🇷🇴' },
  { code: 'RU', dialCode: '+7', nameKey: 'country.russia', flag: '🇷🇺' },
  { code: 'UA', dialCode: '+380', nameKey: 'country.ukraine', flag: '🇺🇦' },
  { code: 'SA', dialCode: '+966', nameKey: 'country.saudiArabia', flag: '🇸🇦' },
  { code: 'AE', dialCode: '+971', nameKey: 'country.uae', flag: '🇦🇪' },
  { code: 'IQ', dialCode: '+964', nameKey: 'country.iraq', flag: '🇮🇶' },
  { code: 'IR', dialCode: '+98', nameKey: 'country.iran', flag: '🇮🇷' },
  { code: 'SY', dialCode: '+963', nameKey: 'country.syria', flag: '🇸🇾' },
  { code: 'JO', dialCode: '+962', nameKey: 'country.jordan', flag: '🇯🇴' },
  { code: 'LB', dialCode: '+961', nameKey: 'country.lebanon', flag: '🇱🇧' },
  { code: 'EG', dialCode: '+20', nameKey: 'country.egypt', flag: '🇪🇬' },
  { code: 'DZ', dialCode: '+213', nameKey: 'country.algeria', flag: '🇩🇿' },
  { code: 'MA', dialCode: '+212', nameKey: 'country.morocco', flag: '🇲🇦' },
  { code: 'TN', dialCode: '+216', nameKey: 'country.tunisia', flag: '🇹🇳' },
  { code: 'LY', dialCode: '+218', nameKey: 'country.libya', flag: '🇱🇾' },
  { code: 'CN', dialCode: '+86', nameKey: 'country.china', flag: '🇨🇳' },
  { code: 'JP', dialCode: '+81', nameKey: 'country.japan', flag: '🇯🇵' },
  { code: 'KR', dialCode: '+82', nameKey: 'country.southKorea', flag: '🇰🇷' },
  { code: 'IN', dialCode: '+91', nameKey: 'country.india', flag: '🇮🇳' },
  { code: 'PK', dialCode: '+92', nameKey: 'country.pakistan', flag: '🇵🇰' },
  { code: 'BD', dialCode: '+880', nameKey: 'country.bangladesh', flag: '🇧🇩' },
  { code: 'ID', dialCode: '+62', nameKey: 'country.indonesia', flag: '🇮🇩' },
  { code: 'MY', dialCode: '+60', nameKey: 'country.malaysia', flag: '🇲🇾' },
  { code: 'TH', dialCode: '+66', nameKey: 'country.thailand', flag: '🇹🇭' },
  { code: 'VN', dialCode: '+84', nameKey: 'country.vietnam', flag: '🇻🇳' },
  { code: 'PH', dialCode: '+63', nameKey: 'country.philippines', flag: '🇵🇭' },
  { code: 'AU', dialCode: '+61', nameKey: 'country.australia', flag: '🇦🇺' },
  { code: 'NZ', dialCode: '+64', nameKey: 'country.newZealand', flag: '🇳🇿' },
  { code: 'CA', dialCode: '+1', nameKey: 'country.canada', flag: '🇨🇦' },
  { code: 'MX', dialCode: '+52', nameKey: 'country.mexico', flag: '🇲🇽' },
  { code: 'BR', dialCode: '+55', nameKey: 'country.brazil', flag: '🇧🇷' },
  { code: 'AR', dialCode: '+54', nameKey: 'country.argentina', flag: '🇦🇷' },
  { code: 'ZA', dialCode: '+27', nameKey: 'country.southAfrica', flag: '🇿🇦' },
];

interface PhoneInputProps {
  register: UseFormRegisterReturn;
  error?: string;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
}

export default function PhoneInput({
  register,
  error,
  placeholder = '5XX XXX XX XX',
  className = '',
  defaultValue,
}: PhoneInputProps) {
  const { language } = useLanguage();
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]); // Türkiye varsayılan
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sadece rakamları al ve max 11 karakter
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    e.target.value = value;
    register.onChange(e);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        {/* Ülke Kodu Seçici */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-2 border-2 border-gray-200 ${className?.includes('rounded-lg') ? 'rounded-lg' : 'rounded-xl'} focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white hover:border-primary-300 transition-all duration-300 text-xs min-w-[75px]`}
          >
            <span className="text-xl leading-none inline-block" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Segoe UI Symbol, sans-serif', fontSize: '1.25rem', lineHeight: '1' }}>{selectedCountry.flag}</span>
            <span className="text-gray-700 font-medium text-xs">{selectedCountry.dialCode}</span>
            <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto w-56">
              <div className="p-1.5">
                {countries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors text-left ${
                      selectedCountry.code === country.code ? 'bg-primary-50' : ''
                    }`}
                  >
                    <span className="text-xl leading-none flex-shrink-0 inline-block" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Segoe UI Symbol, sans-serif', fontSize: '1.25rem', lineHeight: '1' }}>{country.flag}</span>
                    <span className="flex-1 text-xs text-gray-700 truncate">{t(country.nameKey, language)}</span>
                    <span className="text-xs text-gray-500 font-medium flex-shrink-0">{country.dialCode}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Telefon Numarası Input */}
        <div className="flex-1">
          <input
            type="tel"
            {...register}
            onChange={handlePhoneChange}
            defaultValue={defaultValue}
            className={`w-full border-2 border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white transition-all duration-300 input-focus-glow hover:border-primary-300 text-sm ${error ? 'border-red-300' : ''} ${
              className?.includes('px-3') 
                ? 'px-3 py-2 rounded-lg' 
                : className?.includes('rounded-lg')
                ? 'px-4 py-2.5 rounded-lg'
                : 'px-4 py-2.5 rounded-xl'
            }`}
            placeholder={placeholder}
            maxLength={11}
          />
          {error && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-slide-down">
              <span>⚠️</span> {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

