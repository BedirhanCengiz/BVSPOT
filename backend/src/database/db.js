import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bvspot_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_POOL_MAX) || 20, // Maximum pool size
  min: parseInt(process.env.DB_POOL_MIN) || 5, // Minimum pool size
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000, // 5 seconds
  allowExitOnIdle: false, // Keep pool alive
  // Statement timeout (prevent long-running queries)
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000, // 30 seconds
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

