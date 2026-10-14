/**
 * FortiGate harici captive portal dönüşü.
 * Kayıt/giriş Vintra'da bittikten sonra tarayıcı, FortiGate'in
 * gönderdiği post adresine (fgtauth) magic + yerel kullanıcı ile POST eder.
 * https://community.fortinet.com — captive portal workflow
 */

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function allowedHosts() {
  return (process.env.FORTI_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Doğrulanmış kullanıcı için FortiGate fgtauth form alanlarını üretir.
 * postUrl ve magic, FortiGate'in portal yönlendirmesinden gelir.
 */
export function buildFortiRelease({ postUrl, magic }) {
  if (process.env.FORTI_ENABLED !== 'true') {
    return { enabled: false };
  }

  const username = process.env.FORTI_LOCAL_USER;
  const password = process.env.FORTI_LOCAL_PASSWORD;
  if (!username || !password) {
    throw fail(503, 'FortiGate yerel kullanıcı bilgisi tanımlı değil');
  }

  if (!magic || !/^[A-Za-z0-9]+$/.test(magic) || magic.length > 128) {
    throw fail(400, 'Geçersiz FortiGate oturum anahtarı (magic)');
  }

  if (!postUrl || typeof postUrl !== 'string') {
    throw fail(400, 'FortiGate dönüş adresi eksik');
  }

  let url;
  try {
    url = new URL(postUrl);
  } catch {
    throw fail(400, 'FortiGate dönüş adresi geçersiz');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw fail(400, 'FortiGate dönüş adresi yalnızca http veya https olabilir');
  }

  if (url.username || url.password) {
    throw fail(400, 'FortiGate dönüş adresinde kullanıcı bilgisi olamaz');
  }

  if (!url.pathname.toLowerCase().includes('fgtauth')) {
    throw fail(400, 'FortiGate dönüş adresi fgtauth içermelidir');
  }

  const hosts = allowedHosts();
  if (hosts.length === 0 || !hosts.includes(url.hostname.toLowerCase())) {
    throw fail(403, 'FortiGate adresi izin listesinde değil');
  }

  return {
    enabled: true,
    action: `${url.origin}${url.pathname}`,
    fields: {
      username,
      password,
      magic,
    },
  };
}
