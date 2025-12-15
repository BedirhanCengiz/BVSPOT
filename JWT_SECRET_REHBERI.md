# 🔐 JWT Secret Key Rehberi

Bu doküman, BVSPOT sisteminde kullanılan JWT secret key'lerin nasıl oluşturulması ve yapılandırılması gerektiğini açıklar.

## 🔑 JWT Secret Key Nedir?

JWT (JSON Web Token) secret key, token'ların imzalanması ve doğrulanması için kullanılan gizli anahtardır. Bu anahtar, token'ların güvenliğini sağlar ve yetkisiz erişimleri önler.

## ⚠️ Güvenlik Önemi

JWT secret key'iniz:
- **Asla** kod deposuna (Git) commit edilmemelidir
- **Asla** açık kaynak olarak paylaşılmamalıdır
- **Her ortam için farklı** olmalıdır (development, staging, production)
- **Yeterince uzun ve karmaşık** olmalıdır (en az 32 karakter)
- **Düzenli olarak değiştirilmeli**dir (production'da)

## 🎯 JWT Secret Key Gereksinimleri

### Minimum Gereksinimler

- **Uzunluk**: En az 32 karakter (önerilen: 64+ karakter)
- **Karmaşıklık**: Büyük/küçük harf, rakam ve özel karakterler içermeli
- **Rastgelelik**: Tahmin edilemez olmalı

### Önerilen Format

```
[Uzunluk]: 64+ karakter
[Format]: Base64 veya hex string
[İçerik]: Büyük/küçük harf, rakam, özel karakterler
```

## 🛠️ JWT Secret Key Oluşturma Yöntemleri

### Yöntem 1: OpenSSL ile (Önerilen)

**Linux/Mac:**
```bash
# 64 karakterlik rastgele hex string
openssl rand -hex 32

# 64 karakterlik base64 string
openssl rand -base64 48

# 128 karakterlik (daha güvenli)
openssl rand -hex 64
```

**Windows (PowerShell):**
```powershell
# 64 karakterlik hex string
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})

# OpenSSL yüklüyse
openssl rand -hex 32
```

### Yöntem 2: Node.js ile

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### Yöntem 3: Online Generator (Dikkatli Kullanın!)

**Sadece development için:**
- [randomkeygen.com](https://randomkeygen.com/)
- [1password.com/password-generator](https://1password.com/password-generator/)

**⚠️ Uyarı:** Production için online generator kullanmayın! Yerel araçları tercih edin.

### Yöntem 4: Manuel Oluşturma

Güçlü bir secret key örneği:
```
BvSp0t-JWT-S3cr3t-K3y-2024!@#$%^&*()_+-=[]{}|;:,.<>?
```

## 📝 BVSPOT JWT Secret Key Yapılandırması

### Backend Environment Variables

`backend/.env` dosyasında:

```env
# Kullanıcı JWT Secret (Normal kullanıcılar için)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Admin JWT Secret (Admin kullanıcılar için - opsiyonel, aynı da olabilir)
ADMIN_JWT_SECRET=your-super-secret-admin-jwt-key-minimum-32-characters-long

# JWT Token Süresi (Opsiyonel)
JWT_EXPIRES_IN=1h  # 1 saat, 24h, 7d, vb.
```

### Örnek Yapılandırma

**Development Ortamı:**
```env
JWT_SECRET=dev-secret-key-12345678901234567890123456789012
ADMIN_JWT_SECRET=dev-admin-secret-key-12345678901234567890123456789012
JWT_EXPIRES_IN=24h
```

**Production Ortamı:**
```env
JWT_SECRET=a8f5f167f44f4964e6c998dee827110c8f5f167f44f4964e6c998dee827110c
ADMIN_JWT_SECRET=b9e6g278g55g5075g7d9eeff938221d9e6g278g55g5075g7d9eeff938221d
JWT_EXPIRES_IN=1h
```

## 🔄 Kodda Kullanım

### Mevcut Durum

BVSPOT kodunda şu anda:
- `JWT_SECRET`: Normal kullanıcılar ve admin kullanıcılar için kullanılıyor
- `ADMIN_JWT_SECRET`: Dokümantasyonda var ama kodda henüz kullanılmıyor

### Önerilen İyileştirme

Admin ve kullanıcı token'ları için ayrı secret key kullanmak daha güvenlidir:

```javascript
// backend/src/middleware/auth.js

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || JWT_SECRET;

// Normal kullanıcı token'ı için
export function generateToken(userId, role = 'user') {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

// Admin token'ı için
export function generateAdminToken(adminId, role = 'admin') {
  return jwt.sign(
    { adminId, role },
    ADMIN_JWT_SECRET,  // Ayrı secret key
    { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '24h' }
  );
}
```

## ✅ Güvenlik Kontrol Listesi

- [ ] Secret key en az 32 karakter uzunluğunda
- [ ] Secret key rastgele ve tahmin edilemez
- [ ] `.env` dosyası `.gitignore`'da
- [ ] Production ve development için farklı secret key'ler
- [ ] Secret key'ler güvenli bir şekilde saklanıyor (environment variables, secrets manager)
- [ ] Secret key'ler düzenli olarak değiştiriliyor (production'da)
- [ ] Eski secret key'ler güvenli bir şekilde imha ediliyor

## 🚨 Yaygın Hatalar

### ❌ Yapılmaması Gerekenler

1. **Zayıf Secret Key:**
   ```env
   JWT_SECRET=secret
   JWT_SECRET=123456
   JWT_SECRET=my-secret-key
   ```

2. **Kod İçinde Hardcode:**
   ```javascript
   const JWT_SECRET = 'my-secret-key';  // ❌ YANLIŞ!
   ```

3. **Git'e Commit Etmek:**
   ```bash
   git add .env  # ❌ YANLIŞ!
   git commit -m "Add config"
   ```

4. **Tüm Ortamlar İçin Aynı Key:**
   ```env
   # Development ve Production için aynı key ❌
   JWT_SECRET=shared-secret-key
   ```

### ✅ Doğru Yaklaşım

1. **Güçlü Secret Key:**
   ```env
   JWT_SECRET=a8f5f167f44f4964e6c998dee827110c8f5f167f44f4964e6c998dee827110c
   ```

2. **Environment Variable:**
   ```javascript
   const JWT_SECRET = process.env.JWT_SECRET;  // ✅ DOĞRU!
   ```

3. **.gitignore'da:**
   ```gitignore
   .env
   .env.local
   .env.production
   ```

4. **Ortam Bazlı Key'ler:**
   ```env
   # Development
   JWT_SECRET=dev-secret-key-...
   
   # Production
   JWT_SECRET=prod-secret-key-...
   ```

## 🔐 Production Ortamı İçin Öneriler

### 1. Secrets Manager Kullanın

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name bvspot/jwt-secret \
  --secret-string "your-secret-key-here"
```

**Azure Key Vault:**
```bash
az keyvault secret set \
  --vault-name bvspot-vault \
  --name jwt-secret \
  --value "your-secret-key-here"
```

**HashiCorp Vault:**
```bash
vault kv put secret/bvspot jwt_secret="your-secret-key-here"
```

### 2. Environment Variables

**Docker:**
```yaml
# docker-compose.yml
services:
  backend:
    environment:
      - JWT_SECRET=${JWT_SECRET}
    secrets:
      - jwt_secret
```

**Kubernetes:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: jwt-secret
type: Opaque
stringData:
  JWT_SECRET: "your-secret-key-here"
```

### 3. Key Rotation (Düzenli Değiştirme)

Production'da secret key'leri düzenli olarak değiştirin:
- **Önerilen sıklık**: 3-6 ayda bir
- **Acil durumlar**: Güvenlik ihlali şüphesi varsa hemen değiştirin

## 🧪 Test ve Doğrulama

### Secret Key'in Çalıştığını Kontrol Etme

```bash
# Backend'i başlatın
cd backend
npm start

# Token oluşturma testi
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"5551234567","password":"test123"}'

# Eğer token alırsanız, secret key çalışıyor demektir
```

### Secret Key Değişikliği Sonrası

Secret key değiştirdiğinizde:
1. Tüm kullanıcıların yeniden giriş yapması gerekir
2. Eski token'lar geçersiz olur
3. Backend'i yeniden başlatın

## 📚 Ek Kaynaklar

- [JWT.io](https://jwt.io/) - JWT token'ları test etme
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [RFC 7519 - JSON Web Token](https://tools.ietf.org/html/rfc7519)

---

**Önemli Hatırlatma:** JWT secret key'iniz sisteminizin güvenliğinin temelidir. Asla paylaşmayın, güvenli tutun ve düzenli olarak değiştirin!

**Son Güncelleme**: 2024

