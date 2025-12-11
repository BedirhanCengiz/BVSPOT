import { pool } from './db.js';

/**
 * Veritabanı migration scripti
 * Eksik sütunları ekler
 */
export async function migrateDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Veritabanı migration başlatılıyor...');

    // id_type sütunu kontrolü ve ekleme
    const idTypeCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id_type'
    `);

    if (idTypeCheck.rows.length === 0) {
      console.log('📝 id_type sütunu ekleniyor...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN id_type VARCHAR(20) DEFAULT 'tckn' 
        CHECK (id_type IN ('tckn', 'passport', 'foreign_id'))
      `);
      console.log('✅ id_type sütunu eklendi');
    } else {
      console.log('✅ id_type sütunu zaten mevcut');
    }

    // passport_no sütunu kontrolü ve ekleme
    const passportCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'passport_no'
    `);

    if (passportCheck.rows.length === 0) {
      console.log('📝 passport_no sütunu ekleniyor...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN passport_no VARCHAR(50) UNIQUE
      `);
      console.log('✅ passport_no sütunu eklendi');
    } else {
      console.log('✅ passport_no sütunu zaten mevcut');
    }

    // foreign_id_no sütunu kontrolü ve ekleme
    const foreignIdCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'foreign_id_no'
    `);

    if (foreignIdCheck.rows.length === 0) {
      console.log('📝 foreign_id_no sütunu ekleniyor...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN foreign_id_no VARCHAR(50) UNIQUE
      `);
      console.log('✅ foreign_id_no sütunu eklendi');
    } else {
      console.log('✅ foreign_id_no sütunu zaten mevcut');
    }

    // password_hash sütunu kontrolü ve ekleme
    const passwordHashCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash'
    `);

    if (passwordHashCheck.rows.length === 0) {
      console.log('📝 password_hash sütunu ekleniyor...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN password_hash VARCHAR(255)
      `);
      console.log('✅ password_hash sütunu eklendi');
    } else {
      console.log('✅ password_hash sütunu zaten mevcut');
    }

    // language sütunu kontrolü ve ekleme
    const languageCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'language'
    `);

    if (languageCheck.rows.length === 0) {
      console.log('📝 language sütunu ekleniyor...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN language VARCHAR(10) DEFAULT 'tr' 
        CHECK (language IN ('tr', 'en'))
      `);
      console.log('✅ language sütunu eklendi');
    } else {
      console.log('✅ language sütunu zaten mevcut');
    }

    // status enum değerlerini güncelle (awaiting_admin_approval ekle)
    try {
      await client.query(`
        ALTER TABLE users 
        DROP CONSTRAINT IF EXISTS users_status_check
      `);
      
      await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_status_check 
        CHECK (status IN ('pending', 'verified', 'active', 'blocked', 'expired', 'awaiting_admin_approval'))
      `);
      console.log('✅ status constraint güncellendi');
    } catch (error) {
      // Constraint zaten güncellenmiş olabilir
      console.log('ℹ️  status constraint kontrol edildi');
    }

    // Unique constraint'leri ekle (eğer yoksa)
    try {
      await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT unique_passport 
        UNIQUE (passport_no)
      `);
      console.log('✅ unique_passport constraint eklendi');
    } catch (error) {
      // Constraint zaten var
      console.log('ℹ️  unique_passport constraint zaten mevcut');
    }

    try {
      await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT unique_foreign_id 
        UNIQUE (foreign_id_no)
      `);
      console.log('✅ unique_foreign_id constraint eklendi');
    } catch (error) {
      // Constraint zaten var
      console.log('ℹ️  unique_foreign_id constraint zaten mevcut');
    }

    // sessions tablosundaki mac_address NOT NULL constraint'ini kaldır
    try {
      const macAddressCheck = await client.query(`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'mac_address'
      `);

      if (macAddressCheck.rows.length > 0 && macAddressCheck.rows[0].is_nullable === 'NO') {
        console.log('📝 sessions.mac_address NOT NULL constraint kaldırılıyor...');
        await client.query(`
          ALTER TABLE sessions 
          ALTER COLUMN mac_address DROP NOT NULL
        `);
        console.log('✅ sessions.mac_address artık NULL kabul ediyor');
      } else {
        console.log('✅ sessions.mac_address zaten NULL kabul ediyor');
      }
    } catch (error) {
      console.log('ℹ️  sessions.mac_address constraint kontrol edildi:', error.message);
    }

    // web_traffic_logs tablosunu kontrol et ve oluştur
    const webTrafficCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'web_traffic_logs'
    `);

    if (webTrafficCheck.rows.length === 0) {
      console.log('📝 web_traffic_logs tablosu oluşturuluyor...');
      await client.query(`
        CREATE TABLE web_traffic_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
          ip_address VARCHAR(45) NOT NULL,
          mac_address VARCHAR(17),
          url TEXT NOT NULL,
          domain VARCHAR(255),
          method VARCHAR(10) DEFAULT 'GET',
          status_code INTEGER,
          user_agent TEXT,
          referer TEXT,
          data_transferred_bytes BIGINT DEFAULT 0,
          response_time_ms INTEGER,
          country_code VARCHAR(2),
          device_type VARCHAR(50),
          browser VARCHAR(100),
          os VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Indexes oluştur
      await client.query(`CREATE INDEX IF NOT EXISTS idx_web_traffic_user ON web_traffic_logs(user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_web_traffic_ip ON web_traffic_logs(ip_address)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_web_traffic_domain ON web_traffic_logs(domain)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_web_traffic_created ON web_traffic_logs(created_at)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_web_traffic_session ON web_traffic_logs(session_id)`);
      
      console.log('✅ web_traffic_logs tablosu oluşturuldu');
    } else {
      console.log('✅ web_traffic_logs tablosu zaten mevcut');
    }

    console.log('✅ Veritabanı migration tamamlandı!');
  } catch (error) {
    console.error('❌ Migration hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Eğer doğrudan çalıştırılıyorsa
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  migrateDatabase()
    .then(() => {
      console.log('✅ Migration başarıyla tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration başarısız:', error);
      process.exit(1);
    });
}

