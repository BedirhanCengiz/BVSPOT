'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { Wifi } from 'lucide-react';

interface SSID {
  id: number;
  name: string;
  ssid: string;
  background_image_url: string | null;
  is_active: boolean;
}

interface SSIDSelectorProps {
  onSSIDChange: (ssid: SSID | null) => void;
}

export default function SSIDSelector({ onSSIDChange }: SSIDSelectorProps) {
  const [ssids, setSSIDs] = useState<SSID[]>([]);
  const [selectedSSID, setSelectedSSID] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSSIDs();
    
    // URL'den SSID parametresini kontrol et
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ssidParam = urlParams.get('ssid');
      if (ssidParam) {
        setSelectedSSID(ssidParam);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedSSID) {
      const ssid = ssids.find(s => s.ssid === selectedSSID);
      onSSIDChange(ssid || null);
    } else {
      onSSIDChange(null);
    }
  }, [selectedSSID, ssids, onSSIDChange]);

  const loadSSIDs = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPublicSSIDs();
      setSSIDs(response.data.ssids || []);
      
      // Eğer URL'de SSID varsa ve listede varsa seç
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const ssidParam = urlParams.get('ssid');
        if (ssidParam && response.data.ssids?.some((s: SSID) => s.ssid === ssidParam)) {
          setSelectedSSID(ssidParam);
        }
      }
    } catch (error) {
      console.error('SSID yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (ssids.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 z-20">
      <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-3 border border-white/30">
        <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
          <Wifi className="w-4 h-4" />
          SSID Seçiniz
        </label>
        <select
          value={selectedSSID}
          onChange={(e) => setSelectedSSID(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900"
        >
          <option value="">Varsayılan</option>
          {ssids.map((ssid) => (
            <option key={ssid.id} value={ssid.ssid}>
              {ssid.name} ({ssid.ssid})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

