/**
 * 5651 Loglama Sistemi Test Scripti
 * Tüm servisleri ve fonksiyonları test eder
 */

import { pool } from './src/database/db.js';
import { calculateHash, calculateLogHash, getPreviousLogHash, addToHashChain, verifyHashChain } from './src/services/hashChainService.js';
import { getTurkeyTime, formatTurkeyTime, checkNTPSync } from './src/utils/timeUtils.js';
import { createImmutableAccessLog, getImmutableAccessLogs, findUserByIpAndTime } from './src/services/immutableLogService.js';
import { createKVKKConsent, getUserConsents } from './src/services/kvkkConsentService.js';
import { getOrCreateDailyLogFile, sealDailyLogFile, getDailyLogFiles } from './src/services/dailyLogFileService.js';
import { createAdminAccessLog } from './src/services/adminAccessLogService.js';

// Test sonuçları
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

async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logTest('Database Connection', true);
    return true;
  } catch (error) {
    logTest('Database Connection', false, error.message);
    return false;
  }
}

async function testTablesExist() {
  try {
    const client = await pool.connect();
    const tables = [
      'immutable_access_logs',
      'log_hash_chain',
      'daily_log_files',
      'kvkk_consents',
      'admin_access_logs'
    ];
    
    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [table]
      );
      
      if (!result.rows[0].exists) {
        logTest(`Table ${table} exists`, false, 'Table not found');
        client.release();
        return false;
      }
    }
    
    client.release();
    logTest('All Required Tables Exist', true);
    return true;
  } catch (error) {
    logTest('Table Check', false, error.message);
    return false;
  }
}

async function testHashFunctions() {
  try {
    // Test calculateHash
    const testData = 'test data';
    const hash1 = calculateHash(testData);
    const hash2 = calculateHash(testData);
    
    if (hash1 !== hash2 || hash1.length !== 64) {
      logTest('Hash Calculation', false, 'Hash inconsistency or wrong length');
      return false;
    }
    
    // Test calculateLogHash
    const logData = {
      user_id: 1,
      internal_ip: '192.168.1.100',
      mac_address: 'AA:BB:CC:DD:EE:FF',
      connection_start_time: new Date(),
      log_date: '2024-01-15'
    };
    
    const logHash = calculateLogHash(logData);
    if (logHash.length !== 64) {
      logTest('Log Hash Calculation', false, 'Invalid hash length');
      return false;
    }
    
    logTest('Hash Functions', true);
    return true;
  } catch (error) {
    logTest('Hash Functions', false, error.message);
    return false;
  }
}

async function testTimeUtils() {
  try {
    const turkeyTime = getTurkeyTime();
    if (!(turkeyTime instanceof Date)) {
      logTest('Get Turkey Time', false, 'Not a Date object');
      return false;
    }
    
    const formatted = formatTurkeyTime(turkeyTime);
    if (!formatted.includes('+03:00')) {
      logWarning('Time Format', 'UTC+3 timezone not properly formatted');
    }
    
    const ntpSync = await checkNTPSync();
    if (!ntpSync) {
      logWarning('NTP Sync', 'NTP synchronization check failed - ensure NTP is configured');
    }
    
    logTest('Time Utils', true);
    return true;
  } catch (error) {
    logTest('Time Utils', false, error.message);
    return false;
  }
}

async function testImmutableLogCreation() {
  try {
    const testLogData = {
      user_id: null, // Test için user_id null olabilir
      session_id: null,
      internal_ip: '192.168.1.100',
      external_ip: '85.123.45.67',
      mac_address: 'AA:BB:CC:DD:EE:FF',
      gateway_id: 'GW-TEST-001',
      firewall_id: 'FW-TEST-001',
      connection_start_time: getTurkeyTime(),
      source_port: 54321,
      destination_port: 443,
      protocol: 'HTTPS',
      data_transferred_bytes: 1048576
    };
    
    const logId = await createImmutableAccessLog(testLogData);
    
    if (!logId || logId <= 0) {
      logTest('Immutable Log Creation', false, 'Invalid log ID returned');
      return false;
    }
    
    // Log'u oku ve kontrol et
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM immutable_access_logs WHERE id = $1',
        [logId]
      );
      
      if (result.rows.length === 0) {
        logTest('Immutable Log Retrieval', false, 'Log not found after creation');
        return false;
      }
      
      const log = result.rows[0];
      if (log.log_hash.length !== 64) {
        logTest('Immutable Log Hash', false, 'Invalid hash length');
        return false;
      }
      
      logTest('Immutable Log Creation', true, `Log ID: ${logId}`);
      
      // Hash chain kontrolü
      const chainResult = await client.query(
        'SELECT * FROM log_hash_chain WHERE log_id = $1',
        [logId]
      );
      
      if (chainResult.rows.length === 0) {
        logTest('Hash Chain Entry', false, 'Hash chain entry not created');
        return false;
      }
      
      logTest('Hash Chain Entry', true);
      
      return logId;
    } finally {
      client.release();
    }
  } catch (error) {
    logTest('Immutable Log Creation', false, error.message);
    return null;
  }
}

async function testHashChainVerification() {
  try {
    const result = await verifyHashChain();
    
    if (result.valid === undefined || result.total_logs === undefined) {
      logTest('Hash Chain Verification', false, 'Invalid result structure');
      return false;
    }
    
    if (!result.valid && result.issues.length > 0) {
      logWarning('Hash Chain Integrity', `Found ${result.issues.length} issues in hash chain`);
      console.log('Issues:', result.issues);
    }
    
    logTest('Hash Chain Verification', true, `Total logs: ${result.total_logs}, Valid: ${result.valid}`);
    return true;
  } catch (error) {
    logTest('Hash Chain Verification', false, error.message);
    return false;
  }
}

async function testKVKKConsent() {
  try {
    const consentId = await createKVKKConsent({
      user_id: null,
      consent_type: 'kvkk',
      consent_version: '1.0',
      consent_text: 'Test KVKK metni',
      ip_address: '192.168.1.100',
      user_agent: 'Test Agent'
    });
    
    if (!consentId || consentId <= 0) {
      logTest('KVKK Consent Creation', false, 'Invalid consent ID');
      return false;
    }
    
    logTest('KVKK Consent Creation', true, `Consent ID: ${consentId}`);
    return true;
  } catch (error) {
    logTest('KVKK Consent Creation', false, error.message);
    return false;
  }
}

async function testDailyLogFile() {
  try {
    const dailyFile = await getOrCreateDailyLogFile();
    
    if (!dailyFile || !dailyFile.log_date) {
      logTest('Daily Log File Creation', false, 'Invalid daily file structure');
      return false;
    }
    
    logTest('Daily Log File Creation', true, `Date: ${dailyFile.log_date}`);
    return true;
  } catch (error) {
    logTest('Daily Log File Creation', false, error.message);
    return false;
  }
}

async function testAdminAccessLog() {
  try {
    await createAdminAccessLog({
      admin_id: null,
      action: 'test_action',
      search_criteria: { test: true },
      ip_address: '192.168.1.100',
      user_agent: 'Test Agent'
    });
    
    logTest('Admin Access Log Creation', true);
    return true;
  } catch (error) {
    logTest('Admin Access Log Creation', false, error.message);
    return false;
  }
}

async function testImmutableLogQuery() {
  try {
    const logs = await getImmutableAccessLogs({
      limit: 10
    });
    
    if (!Array.isArray(logs)) {
      logTest('Immutable Log Query', false, 'Result is not an array');
      return false;
    }
    
    logTest('Immutable Log Query', true, `Found ${logs.length} logs`);
    return true;
  } catch (error) {
    logTest('Immutable Log Query', false, error.message);
    return false;
  }
}

async function testImmutableLogUpdatePrevention() {
  try {
    const client = await pool.connect();
    try {
      // Bir log bul
      const result = await client.query(
        'SELECT id FROM immutable_access_logs LIMIT 1'
      );
      
      if (result.rows.length === 0) {
        logWarning('Immutable Log Update Prevention', 'No logs found to test');
        return true;
      }
      
      const logId = result.rows[0].id;
      
      // UPDATE denemesi yap (başarısız olmalı)
      try {
        await client.query(
          'UPDATE immutable_access_logs SET internal_ip = $1 WHERE id = $2',
          ['999.999.999.999', logId]
        );
        logTest('Immutable Log Update Prevention', false, 'UPDATE was allowed');
        return false;
      } catch (updateError) {
        if (updateError.message.includes('Immutable logs cannot be modified')) {
          logTest('Immutable Log Update Prevention', true);
          return true;
        } else {
          throw updateError;
        }
      }
    } finally {
      client.release();
    }
  } catch (error) {
    logTest('Immutable Log Update Prevention', false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🧪 5651 Loglama Sistemi Testleri Başlatılıyor...\n');
  
  // Temel testler
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.error('\n❌ Veritabanı bağlantısı başarısız! Testler durduruluyor.');
    return;
  }
  
  await testTablesExist();
  await testHashFunctions();
  await testTimeUtils();
  
  // Servis testleri
  await testImmutableLogCreation();
  await testHashChainVerification();
  await testKVKKConsent();
  await testDailyLogFile();
  await testAdminAccessLog();
  await testImmutableLogQuery();
  await testImmutableLogUpdatePrevention();
  
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
    console.log('✅ Tüm testler başarılı!');
    process.exit(0);
  } else {
    console.log('❌ Bazı testler başarısız oldu.');
    process.exit(1);
  }
}

// Testleri çalıştır
runAllTests().catch(error => {
  console.error('Test hatası:', error);
  process.exit(1);
});


