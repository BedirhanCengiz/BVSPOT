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

    // Sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        mac_address VARCHAR(17),
        ip_address VARCHAR(45),
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

    // Web Traffic Logs table - Kullanıcı web trafiği logları
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_users_tckn ON users(tckn);
      CREATE INDEX IF NOT EXISTS idx_users_mac ON users(mac_address);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_mac ON sessions(mac_address);
      CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_mac_list_address ON mac_list(mac_address);
      CREATE INDEX IF NOT EXISTS idx_web_traffic_user ON web_traffic_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_web_traffic_ip ON web_traffic_logs(ip_address);
      CREATE INDEX IF NOT EXISTS idx_web_traffic_domain ON web_traffic_logs(domain);
      CREATE INDEX IF NOT EXISTS idx_web_traffic_created ON web_traffic_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_ssids_ssid ON ssids(ssid);
      CREATE INDEX IF NOT EXISTS idx_ssids_active ON ssids(is_active);
    `);

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

