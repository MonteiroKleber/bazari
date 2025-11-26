// Script de diagnóstico para verificar IndexedDB
// Cole este código no Console do navegador (F12 → Console)

(async function debugIndexedDB() {
  console.log('🔍 Iniciando diagnóstico do IndexedDB...\n');

  // Abrir IndexedDB
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('bazari-auth', 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  console.log('✅ IndexedDB aberto:', db.name, 'versão', db.version);
  console.log('📦 Object stores:', Array.from(db.objectStoreNames).join(', '));

  // Ler todas as contas
  const tx = db.transaction(['vault_accounts'], 'readonly');
  const store = tx.objectStore('vault_accounts');
  const accounts = await new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
  });

  console.log('\n📊 Total de contas:', accounts.length);

  accounts.forEach((account, index) => {
    console.log(`\n--- Conta ${index + 1} ---`);
    console.log('Address:', account.address);
    console.log('Name:', account.name || '(sem nome)');
    console.log('Created:', account.createdAt);
    console.log('Iterations:', account.iterations);
    console.log('Version:', account.version);
    console.log('⚠️ usesHashedPin:', account.usesHashedPin);
    console.log('Cipher length:', account.cipher?.length || 0);
    console.log('IV length:', account.iv?.length || 0);
    console.log('Salt length:', account.salt?.length || 0);
  });

  db.close();

  console.log('\n✅ Diagnóstico completo!');
  console.log('\n🎯 O que procurar:');
  console.log('- usesHashedPin deve ser TRUE para contas OAuth');
  console.log('- usesHashedPin deve ser FALSE ou undefined para contas tradicionais');
})();
