'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // LocalStorage'dan tema tercihini yükle
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Backend'den tema ayarını yükle
      loadThemeFromBackend();
    }
  }, []);

  // Tema değiştiğinde HTML'e uygula
  useEffect(() => {
    if (mounted) {
      applyTheme(theme);
    }
  }, [theme, mounted]);

  const loadThemeFromBackend = async () => {
    try {
      const { adminAPI } = await import('@/lib/api');
      const response = await adminAPI.getSettings();
      const settings = response.data.settings || {};
      if (settings.theme?.value) {
        const backendTheme = settings.theme.value as Theme;
        setThemeState(backendTheme);
        applyTheme(backendTheme);
        localStorage.setItem('theme', backendTheme);
      }
    } catch (error) {
      console.error('Failed to load theme from backend:', error);
    }
  };

  const applyTheme = (newTheme: Theme) => {
    if (typeof window === 'undefined') return;
    
    const root = window.document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    
    // Backend'e kaydet
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('adminToken');
      if (token) {
        saveThemeToBackend(newTheme);
      }
    }
  };

  const saveThemeToBackend = async (newTheme: Theme) => {
    try {
      const { adminAPI } = await import('@/lib/api');
      await adminAPI.updateSettings({ theme: newTheme });
    } catch (error) {
      console.error('Failed to save theme to backend:', error);
    }
  };

  // Hydration hatası önlemek için - mounted olmasa bile context provider'ı render et
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

