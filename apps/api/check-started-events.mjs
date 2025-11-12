import { ApiPromise, WsProvider } from '@polkadot/api';

const provider = new WsProvider('ws://127.0.0.1:9944');
const api = await ApiPromise.create({ provider });

console.log('Checking recent blocks for Democracy.Started events...\n');

const currentBlock = await api.rpc.chain.getBlock();
const currentBlockNumber = currentBlock.block.header.number.toNumber();

console.log(`Current block: ${currentBlockNumber}`);
console.log('Checking last 1000 blocks...\n');

let foundEvents = 0;

for (let i = Math.max(0, currentBlockNumber - 1000); i <= currentBlockNumber; i++) {
  const blockHash = await api.rpc.chain.getBlockHash(i);
  const events = await api.query.system.events.at(blockHash);
  
  events.forEach((record) => {
    const { event } = record;
    
    if (event.section === 'democracy' && event.method === 'Started') {
      foundEvents++;
      console.log(`Block #${i}: Democracy.Started`);
      console.log(`  refIndex: ${event.data[0]}`);
      console.log(`  threshold: ${event.data[1]}`);
      console.log('');
    }
  });
}

console.log(`\nTotal Democracy.Started events found: ${foundEvents}`);

await api.disconnect();
