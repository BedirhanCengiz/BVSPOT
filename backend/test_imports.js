// Basit import testi
console.log('Import testleri başlatılıyor...');

try {
  const hashChain = await import('./src/services/hashChainService.js');
  console.log('✅ hashChainService import başarılı');
  console.log('Exports:', Object.keys(hashChain));
} catch (error) {
  console.error('❌ hashChainService import hatası:', error.message);
}

try {
  const timeUtils = await import('./src/utils/timeUtils.js');
  console.log('✅ timeUtils import başarılı');
  console.log('Exports:', Object.keys(timeUtils));
} catch (error) {
  console.error('❌ timeUtils import hatası:', error.message);
}

try {
  const immutableLog = await import('./src/services/immutableLogService.js');
  console.log('✅ immutableLogService import başarılı');
  console.log('Exports:', Object.keys(immutableLog));
} catch (error) {
  console.error('❌ immutableLogService import hatası:', error.message);
}


