/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Doğrulama hatası',
      details: err.message
    });
  }

  // Database errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      error: 'Bu kayıt zaten mevcut',
      details: err.detail
    });
  }

  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      error: 'İlişkili kayıt bulunamadı',
      details: err.detail
    });
  }

  // Default error - Production'da detaylı hata bilgisi gösterme
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Sensitive bilgileri gizle
  let errorMessage = 'Sunucu hatası';
  if (isDevelopment) {
    errorMessage = err.message || 'Sunucu hatası';
  } else if (err.status && err.status < 500) {
    // 4xx hataları kullanıcıya gösterilebilir
    errorMessage = err.message || 'İstek hatası';
  }

  res.status(err.status || 500).json({
    error: errorMessage,
    ...(isDevelopment && { 
      stack: err.stack,
      details: err.details 
    })
  });
}

