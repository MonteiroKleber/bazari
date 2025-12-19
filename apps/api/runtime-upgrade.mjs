// Runtime Upgrade Script - Submits new WASM runtime via sudo
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { readFileSync } from 'fs';

const WS_URL = 'ws://127.0.0.1:9944';
const WASM_PATH = '/root/bazari-chain/target/release/wbuild/solochain-template-runtime/solochain_template_runtime.compact.compressed.wasm';

async function main() {
  console.log('🔄 Connecting to chain...');
  const provider = new WsProvider(WS_URL);
  const api = await ApiPromise.create({ provider });

  // Get current runtime version
  const currentVersion = api.runtimeVersion;
  console.log(`📦 Current runtime: ${currentVersion.specName} v${currentVersion.specVersion}`);

  // Read new WASM
  console.log('📂 Reading new WASM runtime...');
  const wasm = readFileSync(WASM_PATH);
  console.log(`   WASM size: ${(wasm.length / 1024).toFixed(2)} KB`);

  // Setup sudo account (Alice for dev chain)
  const keyring = new Keyring({ type: 'sr25519' });
  const sudo = keyring.addFromUri('//Alice');
  console.log(`🔑 Sudo account: ${sudo.address}`);

  // Verify sudo key matches
  const sudoKey = await api.query.sudo.key();
  if (sudoKey.toString() !== sudo.address) {
    console.error(`❌ Sudo key mismatch! Expected: ${sudoKey.toString()}`);
    process.exit(1);
  }
  console.log('✅ Sudo key verified');

  // Create the setCode call
  const setCodeCall = api.tx.system.setCode(`0x${wasm.toString('hex')}`);

  // Wrap in sudo.sudoUncheckedWeight (bypasses weight check for runtime upgrade)
  const sudoCall = api.tx.sudo.sudoUncheckedWeight(
    setCodeCall,
    { refTime: 0, proofSize: 0 }
  );

  console.log('🚀 Submitting runtime upgrade...');

  return new Promise((resolve, reject) => {
    sudoCall.signAndSend(sudo, { nonce: -1 }, ({ status, events, dispatchError }) => {
      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          console.error(`❌ Error: ${decoded.section}.${decoded.name}`);
          reject(new Error(`${decoded.section}.${decoded.name}`));
        } else {
          console.error(`❌ Error: ${dispatchError.toString()}`);
          reject(new Error(dispatchError.toString()));
        }
        return;
      }

      console.log(`   Status: ${status.type}`);

      if (status.isInBlock) {
        console.log(`📦 Included in block: ${status.asInBlock.toHex()}`);

        // Check for success
        const success = events.some(({ event }) =>
          api.events.system.ExtrinsicSuccess.is(event)
        );

        if (success) {
          console.log('✅ Runtime upgrade submitted successfully!');
        }
      }

      if (status.isFinalized) {
        console.log(`🎉 Finalized in block: ${status.asFinalized.toHex()}`);

        // Wait a bit for runtime to apply
        setTimeout(async () => {
          // Reconnect to get new runtime
          await api.disconnect();
          const newApi = await ApiPromise.create({ provider: new WsProvider(WS_URL) });
          const newVersion = newApi.runtimeVersion;
          console.log(`\n📦 New runtime: ${newVersion.specName} v${newVersion.specVersion}`);

          // Check if bazariRecurringPayments pallet exists
          const hasPallet = !!newApi.tx.bazariRecurringPayments;
          console.log(`\n🔍 bazariRecurringPayments pallet available: ${hasPallet ? '✅ YES' : '❌ NO'}`);

          await newApi.disconnect();
          resolve();
        }, 2000);
      }
    }).catch(reject);
  });
}

main()
  .then(() => {
    console.log('\n✅ Runtime upgrade complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Runtime upgrade failed:', err.message);
    process.exit(1);
  });
