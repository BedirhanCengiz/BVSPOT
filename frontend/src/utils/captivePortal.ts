/**
 * FortiGate harici captive portal yönlendirmesinden gelen oturum bilgisi.
 * Örnek:
 * /?post=http://10.0.0.1:1000/fgtauth&magic=...&usermac=aa:bb:cc:dd:ee:ff&userip=10.0.0.50&ssid=Misafir
 */

const STORAGE_KEY = 'bvspotForti';

export interface FortiPortalParams {
  post: string | null;
  magic: string | null;
  usermac: string | null;
  userip: string | null;
  ssid: string | null;
  apmac: string | null;
  apname: string | null;
}

export function captureFortiParams(): FortiPortalParams | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const post = params.get('post') || params.get('login');
  const magic = params.get('magic');
  const usermac = params.get('usermac');
  const userip = params.get('userip');

  if (!post && !magic && !usermac && !userip) {
    return getFortiParams();
  }

  const data: FortiPortalParams = {
    post,
    magic,
    usermac,
    userip,
    ssid: params.get('ssid'),
    apmac: params.get('apmac'),
    apname: params.get('apname'),
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage kapalıysa URL parametreleri yeter
  }

  return data;
}

export function getFortiParams(): FortiPortalParams | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw) as FortiPortalParams;
    if (!data || typeof data !== 'object') {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
