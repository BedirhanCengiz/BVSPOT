import { redisClient } from '../server.js';

/**
 * Redis cache middleware
 * Response'ları cache'ler ve performansı artırır
 */

/**
 * Cache key oluşturur
 */
function getCacheKey(req) {
  const key = `${req.method}:${req.originalUrl}`;
  const params = JSON.stringify(req.query || {});
  return `cache:${key}:${Buffer.from(params).toString('base64')}`;
}

/**
 * Cache middleware
 * @param {number} ttlSeconds - Cache TTL (seconds)
 */
export function cacheMiddleware(ttlSeconds = 300) {
  return async (req, res, next) => {
    // Sadece GET istekleri için cache
    if (req.method !== 'GET') {
      return next();
    }

    // Admin endpoint'leri için cache kullanma (güvenlik)
    if (req.path.includes('/admin') && !req.path.includes('/admin/dashboard')) {
      return next();
    }

    try {
      const cacheKey = getCacheKey(req);
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        const data = JSON.parse(cached);
        res.setHeader('X-Cache', 'HIT');
        return res.json(data);
      }

      // Original send'i override et
      const originalJson = res.json.bind(res);
      res.json = function (data) {
        // Cache'e kaydet
        redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(data))
          .catch(err => {
            console.error('Cache kaydetme hatası:', err);
          });
        
        res.setHeader('X-Cache', 'MISS');
        return originalJson(data);
      };

      next();
    } catch (error) {
      // Cache hatası durumunda normal akışa devam et
      console.error('Cache middleware hatası:', error);
      next();
    }
  };
}

/**
 * Cache'i temizle
 */
export async function clearCache(pattern = '*') {
  try {
    const keys = await redisClient.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return keys.length;
  } catch (error) {
    console.error('Cache temizleme hatası:', error);
    return 0;
  }
}

