import axios from 'axios';

const HOTSPOT_API_URL = process.env.HOTSPOT_API_URL;
const HOTSPOT_API_KEY = process.env.HOTSPOT_API_KEY;

/**
 * Hotspot entegrasyon servisi
 * Mikrotik, UniFi, OpenWRT gibi cihazlarla entegrasyon için
 */

/**
 * MAC adresini whitelist'e ekle (Mikrotik örneği)
 */
export async function allowMacAddress(macAddress, ipAddress) {
  if (!HOTSPOT_API_URL) {
    console.log('[Hotspot] API URL not configured, skipping');
    return { success: true, provider: 'none' };
  }

  try {
    // Mikrotik API örneği
    // Gerçek implementasyon router'ınıza göre değişecektir
    const response = await axios.post(
      `${HOTSPOT_API_URL}/hotspot/user/add`,
      {
        name: macAddress,
        macAddress: macAddress,
        ipAddress: ipAddress,
        profile: 'guest',
      },
      {
        headers: {
          Authorization: `Bearer ${HOTSPOT_API_KEY}`,
        },
      }
    );

    return { success: true, provider: 'mikrotik', data: response.data };
  } catch (error) {
    console.error('Hotspot MAC ekleme hatası:', error);
    return { success: false, error: error.message };
  }
}

/**
 * MAC adresini blacklist'e ekle
 */
export async function blockMacAddress(macAddress) {
  if (!HOTSPOT_API_URL) {
    console.log('[Hotspot] API URL not configured, skipping');
    return { success: true, provider: 'none' };
  }

  try {
    const response = await axios.post(
      `${HOTSPOT_API_URL}/hotspot/user/block`,
      {
        macAddress: macAddress,
      },
      {
        headers: {
          Authorization: `Bearer ${HOTSPOT_API_KEY}`,
        },
      }
    );

    return { success: true, provider: 'mikrotik', data: response.data };
  } catch (error) {
    console.error('Hotspot MAC engelleme hatası:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Kullanıcıya kota ve hız limiti uygula
 */
export async function setUserQuota(macAddress, quotaMb, speedLimitMbps) {
  if (!HOTSPOT_API_URL) {
    console.log('[Hotspot] API URL not configured, skipping');
    return { success: true, provider: 'none' };
  }

  try {
    const response = await axios.post(
      `${HOTSPOT_API_URL}/hotspot/user/quota`,
      {
        macAddress: macAddress,
        quotaMb: quotaMb,
        speedLimitMbps: speedLimitMbps,
      },
      {
        headers: {
          Authorization: `Bearer ${HOTSPOT_API_KEY}`,
        },
      }
    );

    return { success: true, provider: 'mikrotik', data: response.data };
  } catch (error) {
    console.error('Hotspot kota ayarlama hatası:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Kullanıcıyı disconnect et
 */
export async function disconnectUser(macAddress) {
  if (!HOTSPOT_API_URL) {
    console.log('[Hotspot] API URL not configured, skipping');
    return { success: true, provider: 'none' };
  }

  try {
    const response = await axios.post(
      `${HOTSPOT_API_URL}/hotspot/user/disconnect`,
      {
        macAddress: macAddress,
      },
      {
        headers: {
          Authorization: `Bearer ${HOTSPOT_API_KEY}`,
        },
      }
    );

    return { success: true, provider: 'mikrotik', data: response.data };
  } catch (error) {
    console.error('Hotspot disconnect hatası:', error);
    return { success: false, error: error.message };
  }
}

