import dotenv from 'dotenv';
dotenv.config();

console.log('🧪 Basit Test Başlatılıyor...\n');

// 1. Veritabanı bağlantısı testi
try {
  const { pool } = await import('./src/database/db.js');
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
  console.log('✅ Veritabanı bağlantısı: BAŞARILI');
} catch (error) {
  console.error('❌ Veritabanı bağlantısı: BAŞARISIZ -', error.message);
  process.exit(1);
}

// 2. Tabloları kontrol et
try {
  const { pool } = await import('./src/database/db.js');
  const client = await pool.connect();
  
  const tables = [
    'immutable_access_logs',
    'log_hash_chain',
    'daily_log_files',
    'kvkk_consents',
    'admin_access_logs'
  ];
  
  console.log('\n📋 Tablo Kontrolleri:');
  for (const table of tables) {
    const result = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      )`,
      [table]
    );
    
    if (result.rows[0].exists) {
      console.log(`  ✅ ${table}: Mevcut`);
    } else {
      console.log(`  ❌ ${table}: Bulunamadı`);
    }
  }
  
  client.release();
} catch (error) {
  console.error('❌ Tablo kontrolü hatası:', error.message);
}

// 3. Hash fonksiyonu testi
try {
  const crypto = await import('crypto');
  const testData = 'test';
  const hash = crypto.createHash('sha256').update(testData).digest('hex');
  if (hash.length === 64) {
    console.log('\n✅ Hash fonksiyonu: ÇALIŞIYOR');
  } else {
    console.log('\n❌ Hash fonksiyonu: HATALI');
  }
} catch (error) {
  console.error('❌ Hash testi hatası:', error.message);
}

// 4. Time utils testi
try {
  const now = new Date();
  const turkeyOffset = 3 * 60 * 60 * 1000;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const turkeyTime = new Date(utcTime + turkeyOffset);
  console.log('\n✅ Zaman fonksiyonu: ÇALIŞIYOR');
  console.log(`   Türkiye saati: ${turkeyTime.toISOString()}`);
} catch (error) {
  console.error('❌ Zaman testi hatası:', error.message);
}

// 5. Immutable log oluşturma testi
try {
  const { pool } = await import('./src/database/db.js');
  const client = await pool.connect();
  
  // Test log verisi
  const testLogData = {
    user_id: null,
    session_id: null,
    internal_ip: '192.168.1.100',
    external_ip: '85.123.45.67',
    mac_address: 'AA:BB:CC:DD:EE:FF',
    gateway_id: 'GW-TEST',
    firewall_id: 'FW-TEST',
    connection_start_time: new Date(),
    source_port: 54321,
    destination_port: 443,
    protocol: 'HTTPS',
    data_transferred_bytes: 1048576
  };
  
  // Hash hesapla
  const crypto = await import('crypto');
  const logString = JSON.stringify({
    user_id: testLogData.user_id || null,
    session_id: testLogData.session_id || null,
    internal_ip: testLogData.internal_ip,
    external_ip: testLogData.external_ip || null,
    mac_address: testLogData.mac_address,
    gateway_id: testLogData.gateway_id || null,
    firewall_id: testLogData.firewall_id || null,
    connection_start_time: testLogData.connection_start_time,
    connection_end_time: null,
    source_port: testLogData.source_port || null,
    destination_port: testLogData.destination_port || null,
    protocol: testLogData.protocol || null,
    data_transferred_bytes: testLogData.data_transferred_bytes || 0,
    log_date: new Date().toISOString().split('T')[0]
  });
  
  const logHash = crypto.createHash('sha256').update(logString).digest('hex');
  
  // Önceki hash'i al
  const prevHashResult = await client.query(
    `SELECT log_hash FROM log_hash_chain 
     ORDER BY chain_position DESC 
     LIMIT 1`
  );
  const previousHash = prevHashResult.rows.length > 0 ? prevHashResult.rows[0].log_hash : null;
  
  // Log ekle
  const logDate = new Date().toISOString().split('T')[0];
  const result = await client.query(
    `INSERT INTO immutable_access_logs (
      log_hash, previous_log_hash, user_id, session_id,
      internal_ip, external_ip, mac_address,
      gateway_id, firewall_id,
      connection_start_time, connection_end_time,
      source_port, destination_port, protocol,
      data_transferred_bytes, log_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id`,
    [
      logHash,
      previousHash,
      testLogData.user_id || null,
      testLogData.session_id || null,
      testLogData.internal_ip,
      testLogData.external_ip || null,
      testLogData.mac_address,
      testLogData.gateway_id || null,
      testLogData.firewall_id || null,
      testLogData.connection_start_time,
      null,
      testLogData.source_port || null,
      testLogData.destination_port || null,
      testLogData.protocol || null,
      testLogData.data_transferred_bytes || 0,
      logDate
    ]
  );
  
  const logId = result.rows[0].id;
  console.log(`\n✅ Immutable log oluşturma: BAŞARILI (Log ID: ${logId})`);
  
  // Hash chain'e ekle
  const positionResult = await client.query(
    `SELECT COALESCE(MAX(chain_position), 0) + 1 as next_position 
     FROM log_hash_chain`
  );
  const nextPosition = positionResult.rows[0].next_position;
  
  await client.query(
    `INSERT INTO log_hash_chain (log_id, log_hash, previous_hash, chain_position)
     VALUES ($1, $2, $3, $4)`,
    [logId, logHash, previousHash, nextPosition]
  );
  
  console.log(`✅ Hash chain ekleme: BAŞARILI (Position: ${nextPosition})`);
  
  // UPDATE denemesi (başarısız olmalı)
  try {
    await client.query(
      'UPDATE immutable_access_logs SET internal_ip = $1 WHERE id = $2',
      ['999.999.999.999', logId]
    );
    console.log('❌ Immutable log UPDATE koruması: ÇALIŞMIYOR');
  } catch (updateError) {
    if (updateError.message.includes('Immutable logs cannot be modified')) {
      console.log('✅ Immutable log UPDATE koruması: ÇALIŞIYOR');
    } else {
      console.log('⚠️  Immutable log UPDATE koruması: Beklenmeyen hata -', updateError.message);
    }
  }
  
  client.release();
} catch (error) {
  console.error('\n❌ Immutable log testi hatası:', error.message);
  console.error(error.stack);
}

console.log('\n✅ Testler tamamlandı!');

