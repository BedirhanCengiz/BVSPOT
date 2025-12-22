/**
 * Kod Seviyesi Testler (Veritabanı bağlantısı olmadan)
 * Syntax, import/export, fonksiyon yapıları kontrol edilir
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

function logTest(name, passed, message = '') {
  if (passed) {
    testResults.passed.push(name);
    console.log(`✅ ${name}: PASSED ${message ? '- ' + message : ''}`);
  } else {
    testResults.failed.push({ name, message });
    console.error(`❌ ${name}: FAILED - ${message}`);
  }
}

function logWarning(name, message) {
  testResults.warnings.push({ name, message });
  console.warn(`⚠️  ${name}: WARNING - ${message}`);
}

// 1. Dosya varlık kontrolü
console.log('📁 Dosya Kontrolleri:\n');

const requiredFiles = [
  'src/services/hashChainService.js',
  'src/services/immutableLogService.js',
  'src/services/dailyLogFileService.js',
  'src/services/kvkkConsentService.js',
  'src/services/adminAccessLogService.js',
  'src/utils/timeUtils.js',
  'src/database/init.js'
];

for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    logTest(`File exists: ${file}`, true);
  } else {
    logTest(`File exists: ${file}`, false, 'File not found');
  }
}

// 2. Syntax kontrolü
console.log('\n📝 Syntax Kontrolleri:\n');

for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // Basit syntax kontrolü - export kelimesi var mı?
      if (content.includes('export')) {
        logTest(`Syntax check: ${file}`, true, 'Contains exports');
      } else {
        logWarning(`Syntax check: ${file}`, 'No exports found');
      }
    } catch (error) {
      logTest(`Syntax check: ${file}`, false, error.message);
    }
  }
}

// 3. Export kontrolü
console.log('\n📤 Export Kontrolleri:\n');

const exportChecks = {
  'src/services/hashChainService.js': [
    'calculateHash',
    'calculateLogHash',
    'getPreviousLogHash',
    'addToHashChain',
    'verifyHashChain'
  ],
  'src/utils/timeUtils.js': [
    'getTurkeyTime',
    'formatTurkeyTime',
    'checkNTPSync'
  ],
  'src/services/immutableLogService.js': [
    'createImmutableAccessLog',
    'logSessionStart',
    'logSessionEnd',
    'getImmutableAccessLogs',
    'findUserByIpAndTime'
  ],
  'src/services/kvkkConsentService.js': [
    'createKVKKConsent',
    'getUserConsents'
  ],
  'src/services/dailyLogFileService.js': [
    'getOrCreateDailyLogFile',
    'appendToDailyLogFile',
    'sealDailyLogFile',
    'getDailyLogFiles'
  ],
  'src/services/adminAccessLogService.js': [
    'createAdminAccessLog',
    'getAdminAccessLogs'
  ]
};

for (const [file, exports] of Object.entries(exportChecks)) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const exp of exports) {
      const hasExport = content.includes(`export function ${exp}`) || 
                       content.includes(`export async function ${exp}`);
      if (hasExport) {
        logTest(`Export: ${file} -> ${exp}`, true);
      } else {
        logTest(`Export: ${file} -> ${exp}`, false, 'Export not found');
      }
    }
  }
}

// 4. Import kontrolü
console.log('\n📥 Import Kontrolleri:\n');

const importChecks = {
  'src/services/hashChainService.js': ['crypto', 'pool'],
  'src/services/immutableLogService.js': ['pool', 'hashChainService', 'timeUtils'],
  'src/services/dailyLogFileService.js': ['pool', 'hashChainService', 'timeUtils', 'fs', 'path'],
  'src/services/kvkkConsentService.js': ['pool', 'hashChainService', 'timeUtils'],
  'src/services/adminAccessLogService.js': ['pool', 'timeUtils'],
  'src/utils/timeUtils.js': []
};

for (const [file, imports] of Object.entries(importChecks)) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const imp of imports) {
      const hasImport = content.includes(`import`) && content.includes(imp);
      if (hasImport || imports.length === 0) {
        logTest(`Import: ${file} -> ${imp || 'N/A'}`, true);
      } else {
        logTest(`Import: ${file} -> ${imp}`, false, 'Import not found');
      }
    }
  }
}

// 5. Veritabanı şema kontrolü
console.log('\n🗄️  Veritabanı Şema Kontrolleri:\n');

const initFilePath = path.join(__dirname, 'src/database/init.js');
if (fs.existsSync(initFilePath)) {
  const content = fs.readFileSync(initFilePath, 'utf8');
  
  const requiredTables = [
    'immutable_access_logs',
    'log_hash_chain',
    'daily_log_files',
    'kvkk_consents',
    'admin_access_logs'
  ];
  
  for (const table of requiredTables) {
    if (content.includes(`CREATE TABLE IF NOT EXISTS ${table}`) || 
        content.includes(`CREATE TABLE ${table}`)) {
      logTest(`Table schema: ${table}`, true);
    } else {
      logTest(`Table schema: ${table}`, false, 'Table creation not found');
    }
  }
  
  // Trigger kontrolü
  if (content.includes('prevent_immutable_log_modification')) {
    logTest('Immutable log trigger', true);
  } else {
    logTest('Immutable log trigger', false, 'Trigger not found');
  }
}

// 6. API Route kontrolü
console.log('\n🛣️  API Route Kontrolleri:\n');

const adminRoutesPath = path.join(__dirname, 'src/routes/admin.routes.js');
if (fs.existsSync(adminRoutesPath)) {
  const content = fs.readFileSync(adminRoutesPath, 'utf8');
  
  const requiredRoutes = [
    '/immutable-logs',
    '/immutable-logs/ip-lookup',
    '/immutable-logs/export',
    '/hash-chain/verify',
    '/daily-log-files',
    '/daily-log-files/seal'
  ];
  
  for (const route of requiredRoutes) {
    if (content.includes(route)) {
      logTest(`API Route: ${route}`, true);
    } else {
      logTest(`API Route: ${route}`, false, 'Route not found');
    }
  }
}

// Özet
console.log('\n' + '='.repeat(60));
console.log('📊 TEST ÖZETİ');
console.log('='.repeat(60));
console.log(`✅ Başarılı: ${testResults.passed.length}`);
console.log(`❌ Başarısız: ${testResults.failed.length}`);
console.log(`⚠️  Uyarılar: ${testResults.warnings.length}`);

if (testResults.failed.length > 0) {
  console.log('\n❌ Başarısız Testler:');
  testResults.failed.forEach(f => {
    console.log(`   - ${f.name}: ${f.message}`);
  });
}

if (testResults.warnings.length > 0) {
  console.log('\n⚠️  Uyarılar:');
  testResults.warnings.forEach(w => {
    console.log(`   - ${w.name}: ${w.message}`);
  });
}

console.log('\n' + '='.repeat(60));

if (testResults.failed.length === 0) {
  console.log('✅ Tüm kod seviyesi testler başarılı!');
  console.log('\n⚠️  NOT: Veritabanı bağlantısı olmadan tam fonksiyonel test yapılamaz.');
  console.log('   Docker/PostgreSQL çalıştırıldıktan sonra test_simple.js çalıştırılabilir.');
  process.exit(0);
} else {
  console.log('❌ Bazı testler başarısız oldu.');
  process.exit(1);
}


