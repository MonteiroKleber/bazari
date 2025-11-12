import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';

async function testCouncilTreasuryFlow() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });

  console.log('=== TESTE END-TO-END: TREASURY + COUNCIL ===\n');

  // Setup accounts
  const keyring = new Keyring({ type: 'sr25519' });
  const bob = keyring.addFromUri('//Bob'); // Council member
  const charlie = keyring.addFromUri('//Charlie'); // Council member
  const dave = keyring.addFromUri('//Dave'); // Beneficiary

  console.log('Bob (Council):', bob.address);
  console.log('Charlie (Council):', charlie.address);
  console.log('Dave (Beneficiary):', dave.address);

  // Check balances before
  console.log('\n=== BALANCES BEFORE ===');
  const treasuryAddress = '5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z';
  const { data: treasuryBefore } = await api.query.system.account(treasuryAddress);
  const { data: daveBefore } = await api.query.system.account(dave.address);
  console.log('Treasury:', (treasuryBefore.free.toBigInt() / 10n ** 18n).toString(), 'BZR');
  console.log('Dave:', (daveBefore.free.toBigInt() / 10n ** 18n).toString(), 'BZR');

  // Step 1: Create a Council motion to spend from treasury
  console.log('\n=== STEP 1: Bob creates Council motion ===');
  const spendAmount = 5n * 10n ** 18n; // 5 BZR
  console.log('Amount to spend:', (spendAmount / 10n ** 18n).toString(), 'BZR');
  console.log('Beneficiary:', dave.address);

  // Create treasury.spendLocal proposal
  const proposal = api.tx.treasury.spendLocal(spendAmount, dave.address);
  const lengthBound = proposal.encodedLength + 4;

  console.log('Proposal hash:', proposal.method.hash.toHex());
  console.log('Length bound:', lengthBound);

  // Create motion (threshold = 2, need both Bob and Charlie to vote)
  const threshold = 2;
  const motionTx = api.tx.council.propose(threshold, proposal, lengthBound);

  let motionHash = null;
  let motionIndex = null;

  await new Promise((resolve, reject) => {
    motionTx.signAndSend(bob, ({ status, events, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          let errorMsg = 'Motion creation failed';
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
          }
          reject(new Error(errorMsg));
        } else {
          // Extract motion hash and index from events
          events.forEach(({ event }) => {
            if (event.section === 'council' && event.method === 'Proposed') {
              motionHash = event.data[2].toHex();
              motionIndex = event.data[1].toNumber();
              console.log('✅ Motion created!');
              console.log('   Hash:', motionHash);
              console.log('   Index:', motionIndex);
            }
          });
          resolve(true);
        }
      }
    }).catch(reject);
  });

  if (!motionHash || motionIndex === null) {
    throw new Error('Failed to get motion hash/index');
  }

  // Step 2: Bob votes AYE (he already voted when creating the motion)
  console.log('\n=== STEP 2: Bob auto-voted AYE (as proposer) ===');

  // Step 3: Charlie votes AYE
  console.log('\n=== STEP 3: Charlie votes AYE ===');
  const voteTx = api.tx.council.vote(motionHash, motionIndex, true);

  await new Promise((resolve, reject) => {
    voteTx.signAndSend(charlie, ({ status, dispatchError }) => {
      if (status.isFinalized) {
        if (dispatchError) {
          let errorMsg = 'Vote failed';
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
          }
          reject(new Error(errorMsg));
        } else {
          console.log('✅ Charlie voted AYE');
          resolve(true);
        }
      }
    }).catch(reject);
  });

  // Check votes
  console.log('\n=== CHECKING VOTES ===');
  const votes = await api.query.council.voting(motionHash);
  if (votes.isSome) {
    const v = votes.unwrap();
    console.log('Threshold:', v.threshold.toNumber());
    console.log('Ayes:', v.ayes.length, '-', v.ayes.map(a => a.toString()));
    console.log('Nays:', v.nays.length);
    console.log('Votes met threshold:', v.ayes.length >= v.threshold.toNumber());
  }

  // Step 4: Close the motion (this will execute the proposal)
  console.log('\n=== STEP 4: Bob closes the motion ===');

  // Get proposal to calculate weight
  const proposalOption = await api.query.council.proposalOf(motionHash);
  if (proposalOption.isNone) {
    throw new Error('Proposal not found');
  }

  const proposalData = proposalOption.unwrap();
  const proposalLength = proposalData.encodedLength;

  // Use reasonable weight for treasury.spendLocal
  const proposalWeight = api.createType('Weight', {
    refTime: api.consts.system.blockWeights.maxBlock.refTime.toBigInt() / 10n,
    proofSize: api.consts.system.blockWeights.maxBlock.proofSize.toBigInt() / 4n,
  });

  console.log('Proposal weight:', proposalWeight.toHuman());
  console.log('Proposal length:', proposalLength);

  const closeTx = api.tx.council.close(motionHash, motionIndex, proposalWeight, proposalLength);

  await new Promise((resolve, reject) => {
    closeTx.signAndSend(bob, ({ status, events, dispatchError }) => {
      console.log('Close status:', status.type);

      if (status.isFinalized) {
        if (dispatchError) {
          let errorMsg = 'Close failed';
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
          }
          console.error('ERROR:', errorMsg);
          reject(new Error(errorMsg));
        } else {
          console.log('✅ Motion closed!');
          console.log('\nEvents:');
          events.forEach(({ event }) => {
            console.log(`  - ${event.section}.${event.method}`);
            if (event.section === 'treasury') {
              console.log('    Treasury event data:', event.data.toString());
            }
          });
          resolve(true);
        }
      }
    }).catch(reject);
  });

  // Check balances after
  console.log('\n=== BALANCES AFTER ===');
  const { data: treasuryAfter } = await api.query.system.account(treasuryAddress);
  const { data: daveAfter } = await api.query.system.account(dave.address);
  console.log('Treasury:', (treasuryAfter.free.toBigInt() / 10n ** 18n).toString(), 'BZR');
  console.log('Dave:', (daveAfter.free.toBigInt() / 10n ** 18n).toString(), 'BZR');

  const treasuryChange = treasuryBefore.free.toBigInt() - treasuryAfter.free.toBigInt();
  const daveChange = daveAfter.free.toBigInt() - daveBefore.free.toBigInt();

  console.log('\n=== CHANGES ===');
  console.log('Treasury decreased by:', (treasuryChange / 10n ** 18n).toString(), 'BZR');
  console.log('Dave increased by:', (daveChange / 10n ** 18n).toString(), 'BZR');

  if (daveChange >= spendAmount) {
    console.log('\n✅✅✅ TESTE PASSOU! Treasury spend via Council foi executado com sucesso!');
  } else {
    console.log('\n❌ TESTE FALHOU - Dave não recebeu os fundos');
  }

  await api.disconnect();
}

testCouncilTreasuryFlow().catch(console.error);
