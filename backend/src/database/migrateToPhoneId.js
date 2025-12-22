import { pool } from './db.js';

/**
 * Users tablosunda ID'yi telefon numarasına çevirme migration scripti
 * DİKKAT: Bu migration mevcut verileri etkiler!
 */
export async function migrateToPhoneId() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 User ID -> Phone migration başlatılıyor...');
    
    await client.query('BEGIN');
    
    // 1. Önce tüm foreign key constraint'lerini kaldır
    console.log('📝 Foreign key constraint\'leri kaldırılıyor...');
    
    // sessions tablosu
    await client.query(`
      ALTER TABLE sessions 
      DROP CONSTRAINT IF EXISTS sessions_user_id_fkey
    `);
    
    // logs tablosu
    await client.query(`
      ALTER TABLE logs 
      DROP CONSTRAINT IF EXISTS logs_user_id_fkey
    `);
    
    // web_traffic_logs tablosu
    await client.query(`
      ALTER TABLE web_traffic_logs 
      DROP CONSTRAINT IF EXISTS web_traffic_logs_user_id_fkey
    `);
    
    // kvkk_consents tablosu
    await client.query(`
      ALTER TABLE kvkk_consents 
      DROP CONSTRAINT IF EXISTS kvkk_consents_user_id_fkey
    `);
    
    // immutable_access_logs tablosu
    await client.query(`
      ALTER TABLE immutable_access_logs 
      DROP CONSTRAINT IF EXISTS immutable_access_logs_user_id_fkey
    `);
    
    // 2. user_id kolonlarını VARCHAR(20) olarak değiştir
    console.log('📝 user_id kolonları VARCHAR(20) olarak değiştiriliyor...');
    
    // Önce mevcut user_id değerlerini phone'a çevir
    await client.query(`
      UPDATE sessions s
      SET user_id = (SELECT phone FROM users WHERE id = s.user_id::integer)
      WHERE user_id IS NOT NULL
    `);
    
    await client.query(`
      UPDATE logs l
      SET user_id = (SELECT phone FROM users WHERE id = l.user_id::integer)
      WHERE user_id IS NOT NULL
    `);
    
    await client.query(`
      UPDATE web_traffic_logs wtl
      SET user_id = (SELECT phone FROM users WHERE id = wtl.user_id::integer)
      WHERE user_id IS NOT NULL
    `);
    
    await client.query(`
      UPDATE kvkk_consents kc
      SET user_id = (SELECT phone FROM users WHERE id = kc.user_id::integer)
      WHERE user_id IS NOT NULL
    `);
    
    await client.query(`
      UPDATE immutable_access_logs ial
      SET user_id = (SELECT phone FROM users WHERE id = ial.user_id::integer)
      WHERE user_id IS NOT NULL
    `);
    
    // 3. Kolon tiplerini değiştir
    await client.query(`
      ALTER TABLE sessions 
      ALTER COLUMN user_id TYPE VARCHAR(20) USING user_id::VARCHAR(20)
    `);
    
    await client.query(`
      ALTER TABLE logs 
      ALTER COLUMN user_id TYPE VARCHAR(20) USING user_id::VARCHAR(20)
    `);
    
    await client.query(`
      ALTER TABLE web_traffic_logs 
      ALTER COLUMN user_id TYPE VARCHAR(20) USING user_id::VARCHAR(20)
    `);
    
    await client.query(`
      ALTER TABLE kvkk_consents 
      ALTER COLUMN user_id TYPE VARCHAR(20) USING user_id::VARCHAR(20)
    `);
    
    await client.query(`
      ALTER TABLE immutable_access_logs 
      ALTER COLUMN user_id TYPE VARCHAR(20) USING user_id::VARCHAR(20)
    `);
    
    // 4. users tablosunda id'yi phone'a çevir
    console.log('📝 users tablosunda id primary key\'i kaldırılıyor...');
    
    // Önce id kolonunu kaldır (ama önce phone'u primary key yap)
    await client.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_pkey
    `);
    
    // phone'u primary key yap
    await client.query(`
      ALTER TABLE users 
      ADD PRIMARY KEY (phone)
    `);
    
    // id kolonunu kaldır
    await client.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS id
    `);
    
    // 5. Foreign key constraint'lerini yeniden ekle
    console.log('📝 Foreign key constraint\'leri yeniden ekleniyor...');
    
    await client.query(`
      ALTER TABLE sessions 
      ADD CONSTRAINT sessions_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(phone) ON DELETE CASCADE
    `);
    
    await client.query(`
      ALTER TABLE logs 
      ADD CONSTRAINT logs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(phone) ON DELETE SET NULL
    `);
    
    await client.query(`
      ALTER TABLE web_traffic_logs 
      ADD CONSTRAINT web_traffic_logs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(phone) ON DELETE SET NULL
    `);
    
    await client.query(`
      ALTER TABLE kvkk_consents 
      ADD CONSTRAINT kvkk_consents_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(phone) ON DELETE SET NULL
    `);
    
    await client.query(`
      ALTER TABLE immutable_access_logs 
      ADD CONSTRAINT immutable_access_logs_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(phone) ON DELETE SET NULL
    `);
    
    await client.query('COMMIT');
    console.log('✅ Migration başarıyla tamamlandı!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Script olarak çalıştırılırsa
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToPhoneId()
    .then(() => {
      console.log('Migration tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration başarısız:', error);
      process.exit(1);
    });
}

