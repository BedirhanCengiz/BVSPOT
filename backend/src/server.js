import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { createClient } from 'redis';
import { pool } from './database/db.js';
import { initializeDatabase } from './database/init.js';
import { checkAllTimeouts } from './services/sessionTimeoutService.js';
import { validateEnvVars, securityHeaders, xssProtection } from './middleware/security.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import trafficRoutes from './routes/traffic.routes.js';
import ssidRoutes from './routes/ssid.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter, adminRateLimiter } from './middleware/rateLimiter.js';
import { macAddressMiddleware } from './middleware/macAddress.js';
import { syncNTP, checkNTPSync } from './utils/timeUtils.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Environment variable validation
try {
  validateEnvVars();
} catch (error) {
  console.error('❌ Environment variable validation failed:', error.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Redis client
export const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis connected'));

// Security Headers
app.use(securityHeaders);

// Helmet - Güvenlik başlıkları
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
}));

// Response compression (gzip)
app.use(compression({
  level: 6, // Compression level (1-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Logging (production'da daha az verbose)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  skip: (req, res) => {
    // Health check endpoint'lerini loglama
    return req.url === '/health' && res.statusCode < 400;
  }
}));

// Body parser
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Prevent JSON parsing errors from crashing the server
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// XSS Protection
app.use(xssProtection);

// MAC adresi middleware (captive portal için)
app.use(macAddressMiddleware);

// Static files - SSID arkaplan resimleri için (CORS header'ları ile)
app.use('/api/uploads/ssids', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(path.join(__dirname, '../uploads/ssids')));

// Rate limiting - Admin route'ları için özel rate limiter
app.use('/api/admin', adminRateLimiter);
// Diğer route'lar için normal rate limiter
app.use('/api/', rateLimiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    await redisClient.ping();
    res.json({ status: 'ok', database: 'connected', redis: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/ssids', ssidRoutes);

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await redisClient.connect();
    await initializeDatabase();
    console.log('Database initialized');
    
    // NTP senkronizasyonu - Başlangıçta ve her saatte bir
    console.log('🕐 NTP senkronizasyonu başlatılıyor...');
    try {
      await syncNTP();
      const syncStatus = await checkNTPSync();
      console.log(`✅ NTP senkronizasyonu: ${syncStatus.message}`);
    } catch (error) {
      console.warn('⚠️  NTP senkronizasyonu başarısız, sistem zamanı kullanılıyor:', error.message);
    }
    
    // NTP senkronizasyonu - Her saatte bir
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('[Cron] NTP senkronizasyonu güncelleniyor...');
        await syncNTP();
        const syncStatus = await checkNTPSync();
        console.log(`[Cron] NTP senkronizasyonu: ${syncStatus.message}`);
      } catch (error) {
        console.error('[Cron] NTP senkronizasyonu hatası:', error);
      }
    });
    console.log('✅ NTP senkronizasyon cron job başlatıldı (her saatte bir)');
    
    // Session timeout kontrolü - Her 5 dakikada bir çalışır
    cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('[Cron] Session timeout kontrolü başlatılıyor...');
        const result = await checkAllTimeouts();
        if (result.total > 0) {
          console.log(`[Cron] ${result.total} kullanıcı ağdan atıldı (Pasif: ${result.inactiveDisconnected}, Maksimum Süre: ${result.maxDurationDisconnected})`);
        }
      } catch (error) {
        console.error('[Cron] Session timeout kontrolü hatası:', error);
      }
    });
    console.log('✅ Session timeout cron job başlatıldı (her 5 dakikada bir)');
    
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on ${HOST}:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await redisClient.quit();
  await pool.end();
  process.exit(0);
});

