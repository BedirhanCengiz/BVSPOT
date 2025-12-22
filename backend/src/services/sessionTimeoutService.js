import { pool } from '../database/db.js';
import { disconnectUser } from './hotspotService.js';
import { logSessionEnd } from './immutableLogService.js';
import { createLog } from './logService.js';

/**
 * Session Timeout Servisi
 * Oturum ayarlarına göre kullanıcıları otomatik olarak ağdan atar
 */

/**
 * Settings'ten timeout ayarlarını alır
 */
async function getTimeoutSettings() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT value FROM settings WHERE key = $1`,
      ['inactive_timeout_hours']
    );
    const inactiveTimeoutHours = result.rows[0]?.value 
      ? parseInt(result.rows[0].value) 
      : 24; // Varsayılan 24 saat

    const maxSessionResult = await client.query(
      `SELECT value FROM settings WHERE key = $1`,
      ['max_session_hours']
    );
    const maxSessionHours = maxSessionResult.rows[0]?.value 
      ? parseInt(maxSessionResult.rows[0].value) 
      : 24; // Varsayılan 24 saat

    return { inactiveTimeoutHours, maxSessionHours };
  } finally {
    client.release();
  }
}

/**
 * Pasif kullanıcıları kontrol eder ve ağdan atar
 * (inactive_timeout_hours süre trafik yapmayan kullanıcılar)
 */
export async function checkInactiveSessions() {
  const client = await pool.connect();
  
  try {
    const { inactiveTimeoutHours } = await getTimeoutSettings();
    
    // Son trafik zamanını kontrol etmek için immutable_access_logs tablosunu kullan
    // Eğer log yoksa, session start_time'ı kullan
    const inactiveThreshold = new Date();
    inactiveThreshold.setHours(inactiveThreshold.getHours() - inactiveTimeoutHours);

    // Pasif kullanıcıları bul
    // Son trafik zamanına göre kontrol et (immutable_access_logs'tan son aktivite zamanı)
    const inactiveSessions = await client.query(
      `SELECT DISTINCT ON (s.user_id) 
        s.id as session_id,
        s.user_id,
        s.mac_address,
        s.internal_ip,
        s.start_time,
        u.full_name,
        u.phone,
        COALESCE(MAX(ial.connection_start_time), s.start_time) as last_activity
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN immutable_access_logs ial ON s.user_id = ial.user_id 
        AND ial.connection_start_time >= s.start_time
      WHERE s.status = 'active'
        AND u.status = 'active'
      GROUP BY s.id, s.user_id, s.mac_address, s.internal_ip, s.start_time, u.full_name, u.phone
      HAVING COALESCE(MAX(ial.connection_start_time), s.start_time) < $1
      ORDER BY s.user_id, s.start_time DESC`,
      [inactiveThreshold]
    );

    console.log(`[Session Timeout] ${inactiveSessions.rows.length} pasif kullanıcı bulundu`);

    for (const session of inactiveSessions.rows) {
      try {
        // Hotspot'tan disconnect et
        if (session.mac_address) {
          await disconnectUser(session.mac_address);
        }

        // Session'ı sonlandır
        await client.query(
          `UPDATE sessions 
           SET status = 'expired', 
               end_time = NOW() 
           WHERE id = $1`,
          [session.session_id]
        );

        // Immutable log oluştur
        await logSessionEnd(session.session_id, new Date());

        // Log kaydı oluştur
        await createLog(session.user_id, 'session_timeout_inactive', null, {
          sessionId: session.session_id,
          inactiveTimeoutHours,
          lastActivity: session.last_activity
        });

        console.log(`[Session Timeout] Kullanıcı ${session.user_id} (${session.full_name}) pasif timeout nedeniyle atıldı`);
      } catch (error) {
        console.error(`[Session Timeout] Kullanıcı ${session.user_id} atılırken hata:`, error);
      }
    }

    return { disconnected: inactiveSessions.rows.length };
  } catch (error) {
    console.error('[Session Timeout] Pasif session kontrolü hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Maksimum oturum süresini aşan kullanıcıları kontrol eder ve ağdan atar
 * (max_session_hours süre geçen kullanıcılar, trafiğe bakılmaksızın)
 */
export async function checkMaxSessionDuration() {
  const client = await pool.connect();
  
  try {
    const { maxSessionHours } = await getTimeoutSettings();
    
    const maxDurationThreshold = new Date();
    maxDurationThreshold.setHours(maxDurationThreshold.getHours() - maxSessionHours);

    // Maksimum süreyi aşan aktif session'ları bul
    const expiredSessions = await client.query(
      `SELECT s.id as session_id,
              s.user_id,
              s.mac_address,
              s.internal_ip,
              s.start_time,
              u.full_name,
              u.phone
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.status = 'active'
         AND u.status = 'active'
         AND s.start_time < $1`,
      [maxDurationThreshold]
    );

    console.log(`[Session Timeout] ${expiredSessions.rows.length} maksimum süre aşan kullanıcı bulundu`);

    for (const session of expiredSessions.rows) {
      try {
        // Hotspot'tan disconnect et
        if (session.mac_address) {
          await disconnectUser(session.mac_address);
        }

        // Session'ı sonlandır
        await client.query(
          `UPDATE sessions 
           SET status = 'expired', 
               end_time = NOW() 
           WHERE id = $1`,
          [session.session_id]
        );

        // Kullanıcı durumunu güncelle
        await client.query(
          `UPDATE users 
           SET status = 'expired',
               connection_end_time = NOW()
           WHERE id = $1`,
          [session.user_id]
        );

        // Immutable log oluştur
        await logSessionEnd(session.session_id, new Date());

        // Log kaydı oluştur
        await createLog(session.user_id, 'session_timeout_max_duration', null, {
          sessionId: session.session_id,
          maxSessionHours,
          sessionDuration: Math.floor((new Date() - new Date(session.start_time)) / (1000 * 60 * 60))
        });

        console.log(`[Session Timeout] Kullanıcı ${session.user_id} (${session.full_name}) maksimum süre nedeniyle atıldı`);
      } catch (error) {
        console.error(`[Session Timeout] Kullanıcı ${session.user_id} atılırken hata:`, error);
      }
    }

    return { disconnected: expiredSessions.rows.length };
  } catch (error) {
    console.error('[Session Timeout] Maksimum süre kontrolü hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Tüm timeout kontrollerini çalıştırır
 */
export async function checkAllTimeouts() {
  try {
    const inactiveResult = await checkInactiveSessions();
    const maxDurationResult = await checkMaxSessionDuration();
    
    return {
      inactiveDisconnected: inactiveResult.disconnected,
      maxDurationDisconnected: maxDurationResult.disconnected,
      total: inactiveResult.disconnected + maxDurationResult.disconnected
    };
  } catch (error) {
    console.error('[Session Timeout] Genel kontrol hatası:', error);
    throw error;
  }
}

