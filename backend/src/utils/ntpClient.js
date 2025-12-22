import dgram from 'dgram';

/**
 * Basit NTP Client
 * Türkiye NTP sunucularından zaman alır
 */

const NTP_SERVERS = [
  '0.tr.pool.ntp.org',
  '1.tr.pool.ntp.org',
  '2.tr.pool.ntp.org',
  '3.tr.pool.ntp.org'
];

const NTP_PORT = 123;
const NTP_TIMEOUT = 5000; // 5 saniye

/**
 * NTP paketini oluşturur
 * @returns {Buffer} NTP paketi
 */
function createNTPPacket() {
  const packet = Buffer.alloc(48);
  // NTP v3, client mode
  packet[0] = 0x1b; // 00 011 011 (leap=0, version=3, mode=3)
  return packet;
}

/**
 * NTP paketinden zamanı çıkarır
 * @param {Buffer} packet - NTP paketi
 * @returns {Date} NTP zamanı
 */
function parseNTPPacket(packet) {
  // Seconds since 1900-01-01 00:00:00 UTC
  const secondsSince1900 = packet.readUInt32BE(40);
  const fraction = packet.readUInt32BE(44);
  
  // NTP epoch: 1900-01-01 00:00:00 UTC
  // Unix epoch: 1970-01-01 00:00:00 UTC
  // Fark: 2208988800 saniye
  const NTP_EPOCH_OFFSET = 2208988800;
  const milliseconds = (secondsSince1900 - NTP_EPOCH_OFFSET) * 1000 + Math.floor(fraction * 1000 / 0x100000000);
  
  return new Date(milliseconds);
}

/**
 * NTP sunucusundan zaman alır
 * @param {string} server - NTP sunucu adresi
 * @returns {Promise<Date>} NTP zamanı
 */
function getTimeFromServer(server) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const packet = createNTPPacket();
    let timeout;
    
    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      socket.close();
    };
    
    timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`NTP timeout: ${server}`));
    }, NTP_TIMEOUT);
    
    socket.on('message', (msg) => {
      cleanup();
      try {
        const ntpTime = parseNTPPacket(msg);
        resolve(ntpTime);
      } catch (error) {
        reject(new Error(`NTP parse error: ${error.message}`));
      }
    });
    
    socket.on('error', (error) => {
      cleanup();
      reject(error);
    });
    
    socket.send(packet, 0, packet.length, NTP_PORT, server, (err) => {
      if (err) {
        cleanup();
        reject(err);
      }
    });
  });
}

/**
 * NTP sunucularından zaman alır (ilk başarılı olanı döner)
 * @returns {Promise<Date>} NTP zamanı
 */
export async function getNTPTime() {
  const errors = [];
  
  for (const server of NTP_SERVERS) {
    try {
      const time = await getTimeFromServer(server);
      console.log(`[NTP] Zaman alındı: ${server} -> ${time.toISOString()}`);
      return time;
    } catch (error) {
      errors.push(`${server}: ${error.message}`);
      console.warn(`[NTP] ${server} başarısız:`, error.message);
      continue;
    }
  }
  
  throw new Error(`Tüm NTP sunucuları başarısız: ${errors.join(', ')}`);
}

