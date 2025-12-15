import express from 'express';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import { requireAdmin } from '../middleware/auth.js';
import {
  getAllSSIDs,
  getActiveSSIDs,
  getSSIDById,
  getSSIDBySSID,
  createSSID,
  updateSSID,
  deleteSSID,
  saveBackgroundImage,
  deleteBackgroundImage
} from '../services/ssidService.js';
import { createLog } from '../services/logService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer yapılandırması
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Tek dosya
    fields: 10, // Form alanları
    fieldNameSize: 100, // Field name uzunluğu
    fieldSize: 10 * 1024 * 1024 // Field size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/x-png'];
    
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype?.toLowerCase()) || allowedTypes.test(file.mimetype);
    
    // Ya uzantı ya da MIME type yeterli (daha esnek kontrol)
    if (extname || mimetype) {
      return cb(null, true);
    } else {
      cb(new Error(`Sadece resim dosyaları (JPEG, PNG, GIF, WEBP) yüklenebilir. Dosya: ${file.originalname}, MIME: ${file.mimetype}`));
    }
  }
});

/**
 * GET /api/ssids/public
 * Aktif SSID'leri getir (public - SSID seçimi için)
 */
router.get('/public', async (req, res, next) => {
  try {
    const ssids = await getActiveSSIDs();
    res.json({ ssids });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ssids/:ssid
 * SSID'ye göre arkaplan bilgisini getir (public)
 */
router.get('/:ssid', async (req, res, next) => {
  try {
    const { ssid } = req.params;
    const ssidData = await getSSIDBySSID(ssid);
    
    if (!ssidData || !ssidData.is_active) {
      return res.status(404).json({ error: 'SSID bulunamadı' });
    }
    
    res.json({
      ssid: ssidData.ssid,
      name: ssidData.name,
      backgroundImageUrl: ssidData.background_image_url
    });
  } catch (error) {
    next(error);
  }
});

// Tüm admin route'ları admin yetkisi gerektirir
router.use(requireAdmin);

/**
 * GET /api/ssids
 * Tüm SSID'leri getir (admin)
 */
router.get('/', async (req, res, next) => {
  try {
    const ssids = await getAllSSIDs();
    res.json({ ssids });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ssids
 * Yeni SSID oluştur (admin)
 */
router.post('/',
  [
    body('name').notEmpty().withMessage('SSID adı gereklidir'),
    body('ssid').notEmpty().withMessage('SSID gereklidir')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, ssid, description, isActive } = req.body;
      
      // SSID zaten var mı kontrol et
      const existing = await getSSIDBySSID(ssid);
      if (existing) {
        return res.status(400).json({ error: 'Bu SSID zaten mevcut' });
      }

      const newSSID = await createSSID({
        name,
        ssid,
        description,
        isActive: isActive !== undefined ? isActive : true, // Varsayılan olarak aktif
        createdBy: req.admin.id
      });

      await createLog(null, 'ssid_created', req, {
        adminId: req.admin.id,
        ssidId: newSSID.id,
        ssid: newSSID.ssid
      });

      res.status(201).json({ ssid: newSSID });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/ssids/:id
 * SSID güncelle (admin)
 */
router.put('/:id',
  [
    body('name').optional().notEmpty().withMessage('SSID adı boş olamaz'),
    body('ssid').optional().notEmpty().withMessage('SSID boş olamaz')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { name, ssid, description, isActive } = req.body;

      const existing = await getSSIDById(id);
      if (!existing) {
        return res.status(404).json({ error: 'SSID bulunamadı' });
      }

      // SSID değiştiriliyorsa, yeni SSID'nin benzersiz olduğunu kontrol et
      if (ssid && ssid !== existing.ssid) {
        const ssidExists = await getSSIDBySSID(ssid);
        if (ssidExists) {
          return res.status(400).json({ error: 'Bu SSID zaten kullanılıyor' });
        }
      }

      const updated = await updateSSID(id, {
        name,
        ssid,
        description,
        isActive
      });

      await createLog(null, 'ssid_updated', req, {
        adminId: req.admin.id,
        ssidId: id,
        changes: req.body
      });

      res.json({ ssid: updated });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ssids/:id/background
 * SSID arkaplan resmini yükle (admin)
 */
router.post('/:id/background',
  (req, res, next) => {
    upload.single('backgroundImage')(req, res, (err) => {
      if (err) {
        // Multer hatalarını yakala
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Dosya boyutu çok büyük. Maksimum 10MB yükleyebilirsiniz.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Beklenmeyen dosya alanı. Lütfen "backgroundImage" alanını kullanın.' });
        }
        // FileFilter hatası veya diğer hatalar
        return res.status(400).json({ error: err.message || 'Dosya yükleme hatası' });
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Resim dosyası gereklidir. Lütfen geçerli bir resim dosyası seçin (JPEG, PNG, GIF, WEBP)' });
      }

      // Dosya tipini tekrar kontrol et (daha esnek)
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/x-png'];
      const fileMimeType = req.file.mimetype?.toLowerCase();
      const ext = path.extname(req.file.originalname).toLowerCase();
      const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      
      const isValidMimeType = allowedMimeTypes.includes(fileMimeType) || fileMimeType?.startsWith('image/');
      const isValidExt = allowedExts.includes(ext);
      
      // Ya MIME type ya da uzantı geçerli olmalı
      if (!isValidMimeType && !isValidExt) {
        console.warn(`Şüpheli dosya: MIME=${req.file.mimetype}, EXT=${ext}, dosya=${req.file.originalname}`);
        return res.status(400).json({ 
          error: `Desteklenmeyen dosya tipi. Sadece JPEG, PNG, GIF, WEBP formatları desteklenir. (MIME: ${req.file.mimetype}, Uzantı: ${ext})` 
        });
      }

      const { id } = req.params;
      const ssid = await getSSIDById(id);
      
      if (!ssid) {
        return res.status(404).json({ error: 'SSID bulunamadı' });
      }

      // Eski resmi sil
      if (ssid.background_image_url) {
        await deleteBackgroundImage(ssid.background_image_url);
      }

      // Yeni resmi kaydet
      const imageUrl = await saveBackgroundImage(req.file);

      // SSID'yi güncelle
      const updated = await updateSSID(id, { backgroundImageUrl: imageUrl });

      await createLog(null, 'ssid_background_updated', req, {
        adminId: req.admin.id,
        ssidId: id,
        imageUrl
      });

      res.json({ ssid: updated });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/ssids/:id
 * SSID sil (admin)
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const ssid = await getSSIDById(id);
    
    if (!ssid) {
      return res.status(404).json({ error: 'SSID bulunamadı' });
    }

    await deleteSSID(id);

    await createLog(null, 'ssid_deleted', req, {
      adminId: req.admin.id,
      ssidId: id,
      ssid: ssid.ssid
    });

    res.json({ success: true, message: 'SSID silindi' });
  } catch (error) {
    next(error);
  }
});

export default router;

