import { pool } from './db.js';

/**
 * Telefon numarasını INTEGER'a çevirme migration'ı
 * DİKKAT: Bu migration baştaki 0'ları kaldırır (0532 -> 532)
 */
export async function migrateToIntegerPhone() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Telefon numarasını INTEGER\'a çevirme migration\'ı başlatılıyor...');
    
    // 1. Önce tüm foreign key constraint'lerini kaldır
    console.log('📝 Foreign key constraint\'leri kaldırılıyor...');
    
    await client.query(`
      ALTER TABLE sessions 
      DROP CONSTRAINT IF EXISTS sessions_user_id_fkey
    `);
    
    await client.query(`
      ALTER TABLE logs 
      DROP CONSTRAINT IF EXISTS logs_user_id_fkey
    `);
    
    await client.query(`
      ALTER TABLE web_traffic_logs 
      DROP CONSTRAINT IF EXISTS web_traffic_logs_user_id_fkey
    `);
    
    await client.query(`
      ALTER TABLE kvkk_consents 
      DROP CONSTRAINT IF EXISTS kvkk_consents_user_id_fkey
    `);
    
    await client.query(`
      ALTER TABLE immutable_access_logs 
      DROP CONSTRAINT IF EXISTS immutable_access_logs_user_id_fkey
    `);
    
    await client.query(`
      ALTER TABLE otp_codes 
      DROP CONSTRAINT IF EXISTS otp_codes_phone_fkey
    `);
    
    // 2. users tablosuna id kolonu ekle (SERIAL)
    console.log('📝 users tablosuna id kolonu ekleniyor...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS id SERIAL
    `);
    
    // 3. Mevcut telefon numaralarını integer'a çevir (baştaki 0'ları kaldır)
    console.log('📝 Telefon numaraları integer\'a çevriliyor...');
    await client.query(`
      UPDATE users 
      SET id = CAST(REGEXP_REPLACE(phone, '^0+', '') AS BIGINT)
      WHERE phone IS NOT NULL AND phone != ''
    `);
    
    // 4. id'yi primary key yap
    console.log('📝 id primary key yapılıyor...');
    await client.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_pkey,
      ADD PRIMARY KEY (id)
    `);
    
    // 5. phone kolonunu integer'a çevir
    console.log('📝 phone kolonu integer\'a çevriliyor...');
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN phone TYPE BIGINT USING CAST(REGEXP_REPLACE(phone, '^0+', '') AS BIGINT)
    `);
    
    // 6. Tüm user_id kolonlarını integer'a çevir
    console.log('📝 user_id kolonları integer\'a çevriliyor...');
    
    // sessions
    await client.query(`
      UPDATE sessions s
      SET user_id = CAST(REGEXP_REPLACE(s.user_id, '^0+', '') AS BIGINT)
      WHERE s.user_id IS NOT NULL AND s.user_id != ''
    `);
    await client.query(`
      ALTER TABLE sessions 
      ALTER COLUMN user_id TYPE BIGINT USING CAST(REGEXP_REPLACE(user_id, '^0+', '') AS BIGINT)
    `);
    
    // logs
    await client.query(`
      UPDATE logs l
      SET user_id = CAST(REGEXP_REPLACE(l.user_id, '^0+', '') AS BIGINT)
      WHERE l.user_id IS NOT NULL AND l.user_id != ''
    `);
    await client.query(`
      ALTER TABLE logs 
      ALTER COLUMN user_id TYPE BIGINT USING CAST(REGEXP_REPLACE(user_id, '^0+', '') AS BIGINT)
    `);
    
    // web_traffic_logs
    await client.query(`
      UPDATE web_traffic_logs wtl
      SET user_id = CAST(REGEXP_REPLACE(wtl.user_id, '^0+', '') AS BIGINT)
      WHERE wtl.user_id IS NOT NULL AND wtl.user_id != ''
    `);
    await client.query(`
      ALTER TABLE web_traffic_logs 
      ALTER COLUMN user_id TYPE BIGINT USING CAST(REGEXP_REPLACE(user_id, '^0+', '') AS BIGINT)
    `);
    
    // kvkk_consents
    await client.query(`
      UPDATE kvkk_consents kc
      SET user_id = CAST(REGEXP_REPLACE(kc.user_id, '^0+', '') AS BIGINT)
      WHERE kc.user_id IS NOT NULL AND kc.user_id != ''
    `);
    await client.query(`
      ALTER TABLE kvkk_consents 
      ALTER COLUMN user_id TYPE BIGINT USING CAST(REGEXP_REPLACE(user_id, '^0+', '') AS BIGINT)
    `);
    
    // immutable_access_logs
    await client.query(`
      UPDATE immutable_access_logs ial
      SET user_id = CAST(REGEXP_REPLACE(ial.user_id, '^0+', '') AS BIGINT)
      WHERE ial.user_id IS NOT NULL AND ial.user_id != ''
    `);
    await client.query(`
      ALTER TABLE immutable_access_logs 
      ALTER COLUMN user_id TYPE BIGINT USING CAST(REGEXP_REPLACE(user_id, '^0+', '') AS BIGINT)
    `);
    
    // otp_codes
    await client.query(`
      UPDATE otp_codes oc
      SET phone = CAST(REGEXP_REPLACE(oc.phone, '^0+', '') AS BIGINT)
      WHERE oc.phone IS NOT NULL AND oc.phone != ''
    `);
    await client.query(`
      ALTER TABLE otp_codes 
      ALTER COLUMN phone TYPE BIGINT USING CAST(REGEXP_REPLACE(phone, '^0+', '') AS BIGINT)
    `);
    
    // 7. Foreign key constraint'lerini yeniden ekle (id'ye referans vererek)
    console.log('📝 Foreign key constraint\'leri yeniden ekleniyor...');
    
    await client.query(`
      ALTER TABLE sessions 
      ADD CONSTRAINT sessions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    `);
    
    await client.query(`
      ALTER TABLE logs 
      ADD CONSTRAINT logs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    `);
    
    await client.query(`
      ALTER TABLE web_traffic_logs 
      ADD CONSTRAINT web_traffic_logs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    `);
    
    await client.query(`
      ALTER TABLE kvkk_consents 
      ADD CONSTRAINT kvkk_consents_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    `);
    
    await client.query(`
      ALTER TABLE immutable_access_logs 
      ADD CONSTRAINT immutable_access_logs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration tamamlandı! Telefon numaraları artık INTEGER olarak saklanıyor.');
    console.log('⚠️  DİKKAT: Baştaki 0\'lar kaldırıldı (0532 -> 532)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Eğer doğrudan çalıştırılırsa
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToIntegerPhone()
    .then(() => {
      console.log('Migration başarıyla tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration başarısız:', error);
      process.exit(1);
    });
}

