import { ApiPromise, WsProvider } from '@polkadot/api';

console.log('[Test] Starting WebSocket connection test...');
console.log('[Test] Endpoint: ws://127.0.0.1:9944');

const provider = new WsProvider('ws://127.0.0.1:9944', false, undefined, 10000);

provider.on('connected', () => {
  console.log('[Test] ✅ WebSocket provider CONNECTED');
});

provider.on('disconnected', () => {
  console.log('[Test] ⚠️ WebSocket provider DISCONNECTED');
});

provider.on('error', (err) => {
  console.error('[Test] ❌ WebSocket provider ERROR:', err);
});

console.log('[Test] Creating ApiPromise...');

const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Connection timeout after 15s')), 15000);
});

Promise.race([
  ApiPromise.create({ provider }),
  timeoutPromise
]).then((api) => {
  console.log('[Test] ✅ API connected successfully!');
  console.log('[Test] Genesis hash:', api.genesisHash.toHex());
  console.log('[Test] Runtime version:', api.runtimeVersion.specVersion.toString());
  process.exit(0);
}).catch((err) => {
  console.error('[Test] ❌ Connection failed:', err.message);
  console.error('[Test] Error stack:', err.stack);
  process.exit(1);
});
