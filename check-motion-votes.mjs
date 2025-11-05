#!/usr/bin/env node

import { ApiPromise, WsProvider } from '@polkadot/api';

const motionHash = '0x3f47ccd988314258f990c833aaa907e33a1a9352fea9d80029b191ae1258ca92';

async function main() {
  // Connect to remote node
  const wsProvider = new WsProvider('wss://bazari.libervia.xyz');
  const api = await ApiPromise.create({ provider: wsProvider });

  console.log('Connected to chain:', (await api.rpc.system.chain()).toString());
  console.log('Motion hash:', motionHash);
  console.log('\n--- Checking votes on-chain ---\n');

  // Get voting info
  const voting = await api.query.council.voting(motionHash);
  const votingData = voting.toJSON();

  console.log('Voting data:', JSON.stringify(votingData, null, 2));

  if (votingData) {
    console.log('\n--- Vote Summary ---');
    console.log('Threshold:', votingData.threshold);
    console.log('Ayes:', votingData.ayes?.length || 0, votingData.ayes);
    console.log('Nays:', votingData.nays?.length || 0, votingData.nays);
    console.log('End block:', votingData.end);
  } else {
    console.log('❌ No voting data found for this motion hash');
  }

  // Also check if motion exists in proposals
  const proposals = await api.query.council.proposals();
  const proposalHashes = proposals.toJSON();

  console.log('\n--- Active Proposals ---');
  console.log('Total proposals:', proposalHashes?.length || 0);
  console.log('Proposal hashes:', proposalHashes);

  if (proposalHashes && proposalHashes.includes(motionHash)) {
    console.log('✅ Motion is in active proposals');
  } else {
    console.log('❌ Motion NOT found in active proposals');
  }

  await api.disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
