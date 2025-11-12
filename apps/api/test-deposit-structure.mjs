import { ApiPromise, WsProvider } from '@polkadot/api';

const WS_URL = 'ws://127.0.0.1:9944';

async function testDepositStructure() {
  console.log('🔗 Connecting to blockchain...');
  const provider = new WsProvider(WS_URL);
  const api = await ApiPromise.create({ provider });

  console.log('✅ Connected!\n');

  try {
    // Buscar proposta #4 que sabemos que tem endossos
    const proposalId = 4;
    console.log(`📋 Testing depositOf structure for proposal #${proposalId}...\n`);

    const depositOf = await api.query.democracy.depositOf(proposalId);

    console.log('depositOf.isSome:', depositOf.isSome);
    console.log('depositOf.isNone:', depositOf.isNone);

    if (depositOf.isSome) {
      const unwrapped = depositOf.unwrap();
      console.log('\n🔍 Unwrapped structure:');
      console.log('Type:', unwrapped.constructor.name);
      console.log('Is Array:', Array.isArray(unwrapped));
      console.log('Length:', unwrapped.length);

      console.log('\n📊 Full structure:');
      console.log(JSON.stringify(unwrapped, null, 2));

      console.log('\n🔬 Accessing elements:');
      console.log('unwrapped[0] (depositors):', unwrapped[0]?.toString());
      console.log('unwrapped[1] (balance):', unwrapped[1]?.toString());

      // Try to access as tuple
      const [depositors, balance] = unwrapped;
      console.log('\n✨ Deconstructed:');
      console.log('depositors type:', depositors?.constructor.name);
      console.log('depositors length:', depositors?.length);
      console.log('balance:', balance?.toString());

      if (depositors && depositors.length > 0) {
        console.log('\n👥 Depositors list:');
        depositors.forEach((addr, idx) => {
          console.log(`  ${idx + 1}. ${addr.toString()}`);
        });
      }
    } else {
      console.log('⚠️  No deposit info found for this proposal');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await api.disconnect();
    console.log('\n🔌 Disconnected');
  }
}

testDepositStructure().catch(console.error);
