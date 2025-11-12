/**
 * Verificar transações de voto recentes
 */
import { ApiPromise, WsProvider } from '@polkadot/api';

const provider = new WsProvider('ws://127.0.0.1:9944');
const api = await ApiPromise.create({ provider });

console.log('🔍 Verificando transações de voto recentes...\n');

// Pegar bloco atual
const header = await api.rpc.chain.getHeader();
const currentBlock = header.number.toNumber();

console.log(`Bloco atual: ${currentBlock}\n`);
console.log('Buscando últimos 100 blocos...\n');

let voteCount = 0;

for (let i = currentBlock; i > currentBlock - 100 && i > 0; i--) {
  const blockHash = await api.rpc.chain.getBlockHash(i);
  const block = await api.rpc.chain.getBlock(blockHash);
  const events = await api.query.system.events.at(blockHash);

  block.block.extrinsics.forEach((ext, index) => {
    if (ext.method.section === 'democracy' && ext.method.method === 'vote') {
      voteCount++;
      const args = ext.method.args;

      console.log(`📌 Voto encontrado no bloco #${i}:`);
      console.log(`   Extrinsic: ${index}`);
      console.log(`   Args:`, args.toJSON());
      console.log('');
    }
  });
}

console.log(`\n✅ Total de votos encontrados nos últimos 100 blocos: ${voteCount}`);

if (voteCount === 0) {
  console.log('\n❌ NENHUMA TRANSAÇÃO DE VOTO FOI ENCONTRADA!');
  console.log('\nIsso significa que:');
  console.log('1. As transações de voto NUNCA foram enviadas à blockchain');
  console.log('2. OU as transações falharam antes de serem incluídas em um bloco');
  console.log('3. OU os votos foram feitos há mais de 100 blocos atrás');
}

await api.disconnect();
