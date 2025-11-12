import { ApiPromise, WsProvider } from '@polkadot/api';

const provider = new WsProvider('ws://127.0.0.1:9944');
const api = await ApiPromise.create({ provider });

console.log('Checking for Democracy.Started event for referendum #10...\n');

const currentBlock = await api.rpc.chain.getBlock();
const currentBlockNumber = currentBlock.block.header.number.toNumber();

console.log(`Current block: ${currentBlockNumber}`);
console.log('Checking last 500 blocks...\n');

for (let i = Math.max(0, currentBlockNumber - 500); i <= currentBlockNumber; i++) {
  const blockHash = await api.rpc.chain.getBlockHash(i);
  const events = await api.query.system.events.at(blockHash);
  
  events.forEach((record) => {
    const { event, phase } = record;
    
    if (event.section === 'democracy' && event.method === 'Started') {
      const refIndex = event.data[0].toNumber();
      if (refIndex === 10) {
        console.log(`✅ Found Democracy.Started for referendum #10`);
        console.log(`   Block: #${i}`);
        console.log(`   Phase: ${phase.type}`);
        console.log(`   Threshold: ${event.data[1]}`);
        console.log('');
      }
    }
  });
}

await api.disconnect();
