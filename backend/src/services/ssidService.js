import { pool } from '../database/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads klasörü yolu
const uploadsDir = path.join(__dirname, '../../uploads/ssids');

// Uploads klasörünü oluştur (yoksa)
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Tüm SSID'leri getirir
 */
export async function getAllSSIDs() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM ssids ORDER BY created_at DESC'
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Aktif SSID'leri getirir
 */
export async function getActiveSSIDs() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM ssids WHERE is_active = true ORDER BY name ASC'
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * SSID'yi SSID adına göre getirir
 */
export async function getSSIDBySSID(ssid) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM ssids WHERE ssid = $1',
      [ssid]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * SSID'yi ID'ye göre getirir
 */
export async function getSSIDById(id) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM ssids WHERE id = $1', [id]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * Yeni SSID oluşturur
 */
export async function createSSID(data) {
  const client = await pool.connect();
  try {
    const { name, ssid, backgroundImageUrl, description, isActive, createdBy } = data;
    
    const result = await client.query(
      `INSERT INTO ssids (name, ssid, background_image_url, description, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, ssid, backgroundImageUrl || null, description || null, isActive !== undefined ? isActive : true, createdBy]
    );
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * SSID günceller
 */
export async function updateSSID(id, data) {
  const client = await pool.connect();
  try {
    const { name, ssid, backgroundImageUrl, description, isActive } = data;
    
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (ssid !== undefined) {
      updates.push(`ssid = $${paramIndex++}`);
      params.push(ssid);
    }
    if (backgroundImageUrl !== undefined) {
      updates.push(`background_image_url = $${paramIndex++}`);
      params.push(backgroundImageUrl);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(isActive);
    }
    
    updates.push(`updated_at = NOW()`);
    params.push(id);
    
    const result = await client.query(
      `UPDATE ssids SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * SSID siler
 */
export async function deleteSSID(id) {
  const client = await pool.connect();
  try {
    // Önce arkaplan resmini sil
    const ssid = await getSSIDById(id);
    if (ssid && ssid.background_image_url) {
      const imagePath = path.join(uploadsDir, path.basename(ssid.background_image_url));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    const result = await client.query('DELETE FROM ssids WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Resim dosyasını kaydeder ve URL döner
 */
export async function saveBackgroundImage(file) {
  const timestamp = Date.now();
  
  // Dosya adındaki özel karakterleri temizle ve güvenli hale getir
  let safeFilename = file.originalname
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Özel karakterleri alt çizgi ile değiştir
    .replace(/_{2,}/g, '_') // Birden fazla alt çizgiyi tek alt çizgiye çevir
    .toLowerCase();
  
  // Uzantıyı koru
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  if (!safeFilename.endsWith(ext)) {
    safeFilename = safeFilename.replace(/\.[^.]+$/, '') + ext;
  }
  
  const filename = `${timestamp}-${safeFilename}`;
  const filepath = path.join(uploadsDir, filename);
  
  // Dosyayı kaydet
  fs.writeFileSync(filepath, file.buffer);
  
  // URL döndür (API endpoint'e göre)
  return `/api/uploads/ssids/${filename}`;
}

/**
 * Eski resmi siler
 */
export async function deleteBackgroundImage(imageUrl) {
  if (!imageUrl) return;
  
  const filename = path.basename(imageUrl);
  const filepath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}

