#!/usr/bin/env node
/**
 * Treasury Auto-Payout Service
 *
 * Monitors Treasury spends and automatically executes payout() for approved spends.
 * This ensures immediate payment to beneficiaries after Council approval.
 *
 * How it works:
 * 1. Listens for treasury.SpendApproved events
 * 2. Immediately calls treasury.payout(spendIndex)
 * 3. Beneficiary receives funds without waiting for SpendPeriod
 */

const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { cryptoWaitReady } = require('@polkadot/util-crypto');

// Configuration
const WS_URL = process.env.WS_URL || 'wss://bazari.libervia.xyz/rpc';
const PAYOUT_ACCOUNT_SEED = process.env.PAYOUT_ACCOUNT_SEED; // Optional: use specific account for payouts
const CHECK_INTERVAL_MS = 12000; // Check every 12 seconds (2 blocks)

let api;
let payoutAccount;
let processedSpends = new Set();

async function main() {
  console.log('🚀 Treasury Auto-Payout Service starting...');
  console.log('   WebSocket:', WS_URL);
  console.log('   Check interval:', CHECK_INTERVAL_MS / 1000, 'seconds');
  console.log('');

  // Initialize crypto
  await cryptoWaitReady();

  // Connect to chain
  const provider = new WsProvider(WS_URL);
  api = await ApiPromise.create({ provider });

  console.log('✅ Connected to chain');
  console.log('   Chain:', (await api.rpc.system.chain()).toString());
  console.log('   Runtime version:', api.runtimeVersion.specVersion.toNumber());
  console.log('');

  // Setup payout account
  const keyring = new Keyring({ type: 'sr25519' });

  if (PAYOUT_ACCOUNT_SEED) {
    payoutAccount = keyring.addFromUri(PAYOUT_ACCOUNT_SEED);
    console.log('✅ Payout account configured:', payoutAccount.address);
  } else {
    // Use Alice for testing (dev chain)
    payoutAccount = keyring.addFromUri('//Alice');
    console.log('⚠️  Using default account (Alice):', payoutAccount.address);
    console.log('   Set PAYOUT_ACCOUNT_SEED env var for production!');
  }
  console.log('');

  // Load processed spends from storage (in production, use a database)
  console.log('🔍 Loading existing approved spends...');
  await loadExistingSpends();

  // Start monitoring
  console.log('👀 Starting monitoring loop...');
  console.log('');
  await monitoringLoop();
}

async function loadExistingSpends() {
  try {
    // Get list of approved spends
    const approvals = await api.query.treasury.approvals();
    const approvedList = approvals.toJSON();

    console.log('   Found', approvedList.length, 'approved spends:', approvedList);

    // Add to processed set so we don't re-process them
    // (assuming they were already processed or are old)
    approvedList.forEach(spendId => {
      processedSpends.add(spendId);
    });

    console.log('   Marked existing spends as processed');
    console.log('');
  } catch (error) {
    console.error('❌ Error loading existing spends:', error.message);
  }
}

async function monitoringLoop() {
  while (true) {
    try {
      await checkForNewSpends();
    } catch (error) {
      console.error('❌ Error in monitoring loop:', error.message);
    }

    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
  }
}

async function checkForNewSpends() {
  // Get current approved spends
  const approvals = await api.query.treasury.approvals();
  const currentSpends = approvals.toJSON();

  // Find new spends (not yet processed)
  const newSpends = currentSpends.filter(spendId => !processedSpends.has(spendId));

  if (newSpends.length > 0) {
    console.log('🆕 Found', newSpends.length, 'new spend(s):', newSpends);

    for (const spendId of newSpends) {
      await executePayoutForSpend(spendId);
    }
  }
}

async function executePayoutForSpend(spendId) {
  try {
    console.log('');
    console.log('💰 Processing spend #' + spendId);

    // Get spend details
    const spendInfo = await api.query.treasury.spends(spendId);

    if (spendInfo.isNone) {
      console.log('   ⚠️  Spend #' + spendId + ' not found in storage');
      processedSpends.add(spendId);
      return;
    }

    const spend = spendInfo.unwrap().toHuman();
    console.log('   Beneficiary:', spend.beneficiary);
    console.log('   Amount:', spend.amount);

    // Execute payout
    console.log('   📤 Executing treasury.payout(' + spendId + ')...');

    const payoutTx = api.tx.treasury.payout(spendId);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Payout transaction timeout'));
      }, 60000);

      payoutTx.signAndSend(payoutAccount, ({ status, events, dispatchError }) => {
        console.log('   Transaction status:', status.type);

        if (status.isInBlock) {
          console.log('   ✅ Payout in block:', status.asInBlock.toHex());
        }

        if (status.isFinalized) {
          clearTimeout(timeout);

          if (dispatchError) {
            let errorMsg = 'Transaction failed';
            if (dispatchError.isModule) {
              try {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
              } catch (e) {
                errorMsg = dispatchError.toString();
              }
            } else {
              errorMsg = dispatchError.toString();
            }
            console.error('   ❌ Payout failed:', errorMsg);
            reject(new Error(errorMsg));
          } else {
            // Check for Paid event
            const paidEvent = events.find(({ event }) =>
              event.section === 'treasury' && event.method === 'Paid'
            );

            if (paidEvent) {
              const [paidSpendId, beneficiary, amount] = paidEvent.event.data;
              console.log('   ✅ PAYMENT SUCCESSFUL!');
              console.log('      Spend ID:', paidSpendId.toString());
              console.log('      Beneficiary:', beneficiary.toString());
              console.log('      Amount:', (amount.toBigInt() / 1000000000000n).toString(), 'BZR');
            } else {
              console.log('   ✅ Payout transaction finalized');
            }

            processedSpends.add(spendId);
            resolve(true);
          }
        }
      }).catch(err => {
        clearTimeout(timeout);
        reject(err);
      });
    });

  } catch (error) {
    console.error('   ❌ Error processing spend #' + spendId + ':', error.message);

    // Don't mark as processed if there was an error
    // Will retry on next loop
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('');
  console.log('👋 Shutting down gracefully...');
  if (api) {
    await api.disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('');
  console.log('👋 Shutting down gracefully...');
  if (api) {
    await api.disconnect();
  }
  process.exit(0);
});

// Start the service
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
