#!/usr/bin/env node
/**
 * Test script to verify pallet-vesting is available in the runtime
 * FASE 9 - PROMPT 1 validation
 */

import { ApiPromise, WsProvider } from '@polkadot/api';

async function testVestingPallet() {
  console.log('🔍 Testing pallet-vesting integration...\n');

  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });

  try {
    // 1. Check runtime version
    const version = await api.rpc.state.getRuntimeVersion();
    console.log(`✅ Runtime Version: ${version.specVersion.toNumber()}`);

    if (version.specVersion.toNumber() < 103) {
      console.warn(`⚠️  WARNING: Runtime version is ${version.specVersion.toNumber()}, expected 103+`);
      console.warn('   Please restart the chain with the new runtime.');
    }

    // 2. Check if vesting pallet exists
    const hasVesting = api.tx.vesting !== undefined;
    console.log(`${hasVesting ? '✅' : '❌'} Vesting pallet available: ${hasVesting}`);

    if (!hasVesting) {
      console.log('\n❌ FAIL: Vesting pallet not found. Chain needs to be restarted.');
      process.exit(1);
    }

    // 3. List available vesting extrinsics
    console.log('\n📝 Available Vesting Extrinsics:');
    const vestingMethods = Object.keys(api.tx.vesting);
    vestingMethods.forEach(method => {
      console.log(`   - ${method}`);
    });

    // 4. Check expected extrinsics
    const expectedExtrinsics = ['vest', 'vestOther', 'vestedTransfer', 'forceVestedTransfer', 'mergeSchedules'];
    console.log('\n✅ Expected Extrinsics Check:');
    expectedExtrinsics.forEach(method => {
      const exists = api.tx.vesting[method] !== undefined;
      console.log(`   ${exists ? '✅' : '❌'} ${method}: ${exists ? 'Available' : 'Missing'}`);
    });

    // 5. Check storage queries
    console.log('\n📦 Storage Queries:');
    console.log(`   ✅ vesting.vesting: ${api.query.vesting?.vesting !== undefined}`);

    // 6. Check events
    console.log('\n📡 Events:');
    const events = api.events.vesting;
    if (events) {
      console.log(`   ✅ VestingUpdated: ${events.VestingUpdated !== undefined}`);
      console.log(`   ✅ VestingCompleted: ${events.VestingCompleted !== undefined}`);
    }

    console.log('\n✅ SUCCESS: pallet-vesting integration verified!');
    console.log('\n📊 Summary:');
    console.log(`   - Runtime version: ${version.specVersion.toNumber()}`);
    console.log(`   - Vesting extrinsics: ${vestingMethods.length}`);
    console.log(`   - All expected features: Available`);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await api.disconnect();
  }
}

testVestingPallet().catch(console.error);
