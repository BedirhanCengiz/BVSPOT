import { pool } from './db.js';
import bcrypt from 'bcryptjs';

export async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL UNIQUE,
        tckn VARCHAR(11),
        passport_no VARCHAR(50),
        foreign_id_no VARCHAR(50),
        id_type VARCHAR(20) DEFAULT 'tckn' CHECK (id_type IN ('tckn', 'passport', 'foreign_id')),
        birth_date DATE NOT NULL,
        password_hash VARCHAR(255),
        mac_address VARCHAR(17),
        ip_address VARCHAR(45),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'active', 'blocked', 'expired', 'awaiting_admin_approval')),
        quota_mb INTEGER DEFAULT 1000,
        quota_used_mb INTEGER DEFAULT 0,
        speed_limit_mbps INTEGER DEFAULT 10,
        connection_start_time TIMESTAMP,
        connection_end_time TIMESTAMP,
        kvkk_accepted BOOLEAN DEFAULT false,
        terms_accepted BOOLEAN DEFAULT false,
        language VARCHAR(10) DEFAULT 'tr' CHECK (language IN ('tr', 'en')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_phone UNIQUE (phone),
        CONSTRAINT unique_tckn UNIQUE (tckn),
        CONSTRAINT unique_passport UNIQUE (passport_no),
        CONSTRAINT unique_foreign_id UNIQUE (foreign_id_no)
      )
    `);

    // OTP table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        code VARCHAR(6) NOT NULL,
        attempts INTEGER DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sessions table - 5651 Kanunu uyumlu
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        mac_address VARCHAR(17),
        internal_ip VARCHAR(45), -- İç IP (DHCP)
        external_ip VARCHAR(45), -- Dış IP (NAT sonrası)
        ip_address VARCHAR(45), -- Geriye uyumluluk için (deprecated)
        gateway_id VARCHAR(100), -- Gateway/Firewall ID
        firewall_id VARCHAR(100), -- Firewall ID
        start_time TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Europe/Istanbul'), -- UTC+3
        end_time TIMESTAMP,
        data_transferred_mb INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired'))
      )
    `);

    // Logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45),
        mac_address VARCHAR(17),
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Admin users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Whitelist/Blacklist table
    await client.query(`
      CREATE TABLE IF NOT EXISTS mac_list (
        id SERIAL PRIMARY KEY,
        mac_address VARCHAR(17) NOT NULL UNIQUE,
        list_type VARCHAR(10) NOT NULL CHECK (list_type IN ('whitelist', 'blacklist')),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES admin_users(id)
      )
    `);

    // Web Traffic Logs table - Kullanıcı web trafiği logları (5651 Kanunu uyumlu)
    await client.query(`
      CREATE TABLE IF NOT EXISTS web_traffic_logs (
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
        -- 5651 Kanunu için ek alanlar
        source_port INTEGER,
        destination_port INTEGER,
        protocol VARCHAR(20) DEFAULT 'HTTP', -- HTTP, HTTPS, FTP, SSH, DNS, TCP, UDP vb.
        connection_start_time TIMESTAMP,
        connection_end_time TIMESTAMP,
        dns_query VARCHAR(255), -- DNS sorguları için
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 5651 Kanunu için eksik kolonları ekle (migration için)
    try {
      await client.query(`
        ALTER TABLE web_traffic_logs 
        ADD COLUMN IF NOT EXISTS source_port INTEGER,
        ADD COLUMN IF NOT EXISTS destination_port INTEGER,
        ADD COLUMN IF NOT EXISTS protocol VARCHAR(20) DEFAULT 'HTTP',
        ADD COLUMN IF NOT EXISTS connection_start_time TIMESTAMP,
        ADD COLUMN IF NOT EXISTS connection_end_time TIMESTAMP,
        ADD COLUMN IF NOT EXISTS dns_query VARCHAR(255)
      `);
    } catch (error) {
      // Kolonlar zaten varsa hata vermez, devam et
      console.log('Migration: Kolonlar zaten mevcut veya eklenemedi:', error.message);
    }

    // SSID Management table - SSID bazlı arkaplan yönetimi
    await client.query(`
      CREATE TABLE IF NOT EXISTS ssids (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        ssid VARCHAR(100) NOT NULL UNIQUE,
        background_image_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        description TEXT,
        created_by INTEGER REFERENCES admin_users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        value TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES admin_users(id)
      )
    `);
    
    // Sessions tablosuna yeni kolonları ekle (migration - önce kolonları ekle)
    try {
      await client.query(`
        ALTER TABLE sessions 
        ADD COLUMN IF NOT EXISTS internal_ip VARCHAR(45),
        ADD COLUMN IF NOT EXISTS external_ip VARCHAR(45),
        ADD COLUMN IF NOT EXISTS gateway_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS firewall_id VARCHAR(100)
      `);
    } catch (error) {
      console.log('Sessions migration: Kolonlar zaten mevcut veya eklenemedi:', error.message);
    }

    // KVKK Consent Logs - Detaylı onay kayıtları
    await client.query(`
      CREATE TABLE IF NOT EXISTS kvkk_consents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('kvkk', 'terms', 'law5651')),
        consent_version VARCHAR(20) NOT NULL, -- Metin versiyonu (örn: '1.0', '2.1')
        consent_text_hash VARCHAR(64), -- Onaylanan metnin SHA-256 hash'i
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        accepted_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Europe/Istanbul') NOT NULL, -- UTC+3
        created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Europe/Istanbul')
      )
    `);

    // Immutable Access Logs - 5651 Kanunu uyumlu, değiştirilemez loglar
    await client.query(`
      CREATE TABLE IF NOT EXISTS immutable_access_logs (
        id BIGSERIAL PRIMARY KEY,
        log_hash VARCHAR(64) NOT NULL UNIQUE, -- Bu log satırının SHA-256 hash'i
        previous_log_hash VARCHAR(64), -- Önceki logun hash'i (hash chain)
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
        internal_ip VARCHAR(45) NOT NULL, -- İç IP (DHCP)
        external_ip VARCHAR(45), -- Dış IP (NAT sonrası)
        mac_address VARCHAR(17) NOT NULL,
        gateway_id VARCHAR(100),
        firewall_id VARCHAR(100),
        connection_start_time TIMESTAMP NOT NULL, -- UTC+3, saniye hassasiyetinde
        connection_end_time TIMESTAMP,
        source_port INTEGER, -- CGNAT varsa zorunlu
        destination_port INTEGER,
        protocol VARCHAR(20), -- HTTP, HTTPS, FTP, SSH, DNS, TCP, UDP
        data_transferred_bytes BIGINT DEFAULT 0,
        log_date DATE NOT NULL, -- Günlük dosya için
        created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Europe/Istanbul') NOT NULL,
        -- Log değiştirilemez olmalı - UPDATE/DELETE yasak
        CONSTRAINT chk_immutable CHECK (true) -- PostgreSQL'de trigger ile korunacak
      )
    `);

    // Log Hash Chain - Hash zinciri yönetimi
    await client.query(`
      CREATE TABLE IF NOT EXISTS log_hash_chain (
        id SERIAL PRIMARY KEY,
        log_id BIGINT REFERENCES immutable_access_logs(id) ON DELETE RESTRICT,
        log_hash VARCHAR(64) NOT NULL UNIQUE,
        previous_hash VARCHAR(64), -- Önceki logun hash'i
        chain_position BIGINT NOT NULL, -- Zincirdeki pozisyon
        created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Europe/Istanbul') NOT NULL
      )
    `);

    // Daily Log Files - Günlük log dosyaları ve hash mühürleri
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_log_files (
        id SERIAL PRIMARY KEY,
        log_date DATE NOT NULL UNIQUE,
        file_path VARCHAR(500), -- Dosya yolu (opsiyonel)
        file_hash VARCHAR(64) NOT NULL, -- Günlük dosyanın SHA-256 hash'i
        previous_day_hash VARCHAR(64), -- Önceki günün hash'i (zincirleme)
        seal_type VARCHAR(20) CHECK (seal_type IN ('electronic_signature', 'timestamp_authority', 'manual')),
        seal_hash VARCHAR(64), -- Elektronik imza veya zaman damgası hash'i
        seal_timestamp TIMESTAMP, -- Mühürlenme zamanı
        seal_authority VARCHAR(255), -- Mühürleyen otorite (TÜBİTAK vb.)
        total_logs INTEGER DEFAULT 0, -- O günkü toplam log sayısı
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'sealed', 'archived')),
        created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Europe/Istanbul'),
        sealed_at TIMESTAMP
      )
    `);

    // Admin Access Logs - Admin erişim logları (log erişimlerini loglamak için)
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_access_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL, -- 'view_logs', 'export_logs', 'search_logs' vb.
        search_criteria JSONB, -- Arama kriterleri
        accessed_log_ids BIGINT[], -- Erişilen log ID'leri
        ip_address VARCHAR(45),
        user_agent TEXT,
        accessed_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Europe/Istanbul') NOT NULL
      )
    `);

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_users_tckn ON users(tckn);
      CREATE INDEX IF NOT EXISTS idx_users_mac ON users(mac_address);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_mac ON sessions(mac_address);
      CREATE INDEX IF NOT EXISTS idx_sessions_internal_ip ON sessions(internal_ip);
      CREATE INDEX IF NOT EXISTS idx_sessions_external_ip ON sessions(external_ip);
      CREATE INDEX IF NOT EXISTS idx_sessions_internal_ip ON sessions(internal_ip);
      CREATE INDEX IF NOT EXISTS idx_sessions_external_ip ON sessions(external_ip);
      CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_mac_list_address ON mac_list(mac_address);
      CREATE INDEX IF NOT EXISTS idx_web_traffic_user ON web_traffic_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_web_traffic_ip ON web_traffic_logs(ip_address);
      CREATE INDEX IF NOT EXISTS idx_web_traffic_domain ON web_traffic_logs(domain);
      CREATE INDEX IF NOT EXISTS idx_web_traffic_created ON web_traffic_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_ssids_ssid ON ssids(ssid);
      CREATE INDEX IF NOT EXISTS idx_ssids_active ON ssids(is_active);
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
      -- 5651 Kanunu için yeni indexler
      CREATE INDEX IF NOT EXISTS idx_kvkk_consents_user ON kvkk_consents(user_id);
      CREATE INDEX IF NOT EXISTS idx_kvkk_consents_date ON kvkk_consents(accepted_at);
      CREATE INDEX IF NOT EXISTS idx_immutable_logs_user ON immutable_access_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_immutable_logs_session ON immutable_access_logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_immutable_logs_internal_ip ON immutable_access_logs(internal_ip);
      CREATE INDEX IF NOT EXISTS idx_immutable_logs_external_ip ON immutable_access_logs(external_ip);
      CREATE INDEX IF NOT EXISTS idx_immutable_logs_mac ON immutable_access_logs(mac_address);
      CREATE INDEX IF NOT EXISTS idx_immutable_logs_date ON immutable_access_logs(log_date);
      CREATE INDEX IF NOT EXISTS idx_immutable_logs_start_time ON immutable_access_logs(connection_start_time);
      CREATE INDEX IF NOT EXISTS idx_immutable_logs_hash ON immutable_access_logs(log_hash);
      CREATE INDEX IF NOT EXISTS idx_hash_chain_log ON log_hash_chain(log_id);
      CREATE INDEX IF NOT EXISTS idx_hash_chain_hash ON log_hash_chain(log_hash);
      CREATE INDEX IF NOT EXISTS idx_hash_chain_position ON log_hash_chain(chain_position);
      CREATE INDEX IF NOT EXISTS idx_daily_log_files_date ON daily_log_files(log_date);
      CREATE INDEX IF NOT EXISTS idx_admin_access_logs_admin ON admin_access_logs(admin_id);
      CREATE INDEX IF NOT EXISTS idx_admin_access_logs_date ON admin_access_logs(accessed_at);
    `);

    // Immutable Logs için Trigger - UPDATE ve DELETE'i engelle
    await client.query(`
      CREATE OR REPLACE FUNCTION prevent_immutable_log_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Immutable logs cannot be modified or deleted. Log ID: %', OLD.id;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS immutable_logs_update_trigger ON immutable_access_logs;
      CREATE TRIGGER immutable_logs_update_trigger
        BEFORE UPDATE ON immutable_access_logs
        FOR EACH ROW
        EXECUTE FUNCTION prevent_immutable_log_modification();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS immutable_logs_delete_trigger ON immutable_access_logs;
      CREATE TRIGGER immutable_logs_delete_trigger
        BEFORE DELETE ON immutable_access_logs
        FOR EACH ROW
        EXECUTE FUNCTION prevent_immutable_log_modification();
    `);

    // Default settings
    const defaultSettings = [
      { key: 'inactive_timeout_hours', value: '24', description: 'Kullanıcı kaç saat trafik yapmazsa ağdan atılsın (saat)' },
      { key: 'max_session_hours', value: '72', description: 'Maksimum oturum süresi - trafiğe bakılmaksızın kaç saat sonra ağdan atılsın (saat)' },
      { key: 'theme', value: 'light', description: 'Tema (light/dark)' }
    ];

    for (const setting of defaultSettings) {
      await client.query(
        `INSERT INTO settings (key, value, description) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (key) DO NOTHING`,
        [setting.key, setting.value, setting.description]
      );
    }

    // Create default admin user if not exists
    const adminCheck = await client.query('SELECT id FROM admin_users WHERE email = $1', [
      process.env.ADMIN_EMAIL || 'admin@bvspot.com'
    ]);

    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || 'admin123',
        10
      );
      
      await client.query(
        'INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, $3)',
        [process.env.ADMIN_EMAIL || 'admin@bvspot.com', hashedPassword, 'super_admin']
      );
      console.log('Default admin user created');
    }

    console.log('Database tables initialized successfully');
    
    // Migration çalıştır (eksik sütunları ekle)
    try {
      const { migrateDatabase } = await import('./migrate.js');
      await migrateDatabase();
    } catch (migrationError) {
      console.warn('Migration hatası (normal olabilir):', migrationError.message);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

