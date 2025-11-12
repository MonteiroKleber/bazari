/**
 * INVESTIGAÇÃO COMPLETA - Referendum #11 Votes
 */
import { ApiPromise, WsProvider } from '@polkadot/api';

const provider = new WsProvider('ws://127.0.0.1:9944');
const api = await ApiPromise.create({ provider });

console.log('═══════════════════════════════════════════════════════════');
console.log('🔍 INVESTIGAÇÃO COMPLETA - REFERENDUM #11');
console.log('═══════════════════════════════════════════════════════════\n');

// 1. Verificar informações do referendum
console.log('📊 PASSO 1: Informações do Referendum #11\n');
const refInfo = await api.query.democracy.referendumInfoOf(11);

if (refInfo.isSome) {
  const info = refInfo.unwrap();
  if (info.isOngoing) {
    const ongoing = info.asOngoing;
    const tally = ongoing.tally;

    console.log('   Status: ONGOING');
    console.log('   Proposal Hash:', ongoing.proposal.toHex());
    console.log('   End Block:', ongoing.end.toNumber());
    console.log('   Threshold:', ongoing.threshold.toJSON());
    console.log('   Delay:', ongoing.delay.toNumber());
    console.log('\n   📈 TALLY (Votos Agregados):');
    console.log('   - Ayes (A favor):', tally.ayes.toString(), 'planck');
    console.log('   - Nays (Contra):', tally.nays.toString(), 'planck');
    console.log('   - Turnout (Total):', tally.turnout.toString(), 'planck');
    console.log('   - Ayes em BZR:', (parseInt(tally.ayes.toString()) / 1e12).toFixed(2), 'BZR');
    console.log('   - Nays em BZR:', (parseInt(tally.nays.toString()) / 1e12).toFixed(2), 'BZR');
  }
}

// 2. Buscar TODOS os registros de votação
console.log('\n\n📋 PASSO 2: Buscando TODOS os registros de votação (votingOf.entries())\n');

const votingOf = await api.query.democracy.votingOf.entries();
console.log(`   Total de contas com registros de votação: ${votingOf.length}\n`);

// 3. Filtrar votos do referendum #11
console.log('🎯 PASSO 3: Filtrando votos do Referendum #11\n');

const ref11Votes = [];

votingOf.forEach(([key, voting]) => {
  const voter = key.args[0].toString();
  const votingData = voting.toJSON();

  if (votingData?.direct?.votes) {
    const voteRecord = votingData.direct.votes.find(v => v[0] === 11);

    if (voteRecord) {
      const [refId, voteInfo] = voteRecord;

      // Decodificar voto
      let decoded = { direction: 'UNKNOWN', balance: 0, conviction: 0 };

      if (voteInfo?.standard) {
        const voteHex = voteInfo.standard.vote;
        const voteByte = parseInt(voteHex, 16);
        const aye = (voteByte & 0x80) !== 0;
        const conviction = voteByte & 0x7F;

        decoded = {
          direction: aye ? 'AYE' : 'NAY',
          balance: voteInfo.standard.balance,
          conviction,
          voteHex,
          voteByte: '0b' + voteByte.toString(2).padStart(8, '0'),
        };
      }

      ref11Votes.push({
        voter,
        ...decoded,
      });
    }
  }
});

console.log(`   ✅ Total de votos encontrados para Referendum #11: ${ref11Votes.length}\n`);

if (ref11Votes.length === 0) {
  console.log('   ❌ NENHUM VOTO ENCONTRADO!\n');
  console.log('   Possíveis causas:');
  console.log('   1. As transações de voto falharam');
  console.log('   2. Os votos foram feitos em outro referendum');
  console.log('   3. Os votos ainda estão pendentes no mempool\n');
} else {
  // Mostrar cada voto detalhadamente
  ref11Votes.forEach((vote, idx) => {
    console.log(`   📌 Voto ${idx + 1}/${ref11Votes.length}:`);
    console.log(`      Eleitor: ${vote.voter}`);
    console.log(`      Direção: ${vote.direction}`);
    console.log(`      Balance: ${vote.balance} planck = ${(vote.balance / 1e12).toFixed(2)} BZR`);
    console.log(`      Conviction: ${vote.conviction}`);
    console.log(`      Vote Byte: ${vote.voteHex} (${vote.voteByte})`);
    console.log('');
  });

  // Calcular totais
  const totalAye = ref11Votes.filter(v => v.direction === 'AYE').reduce((sum, v) => sum + v.balance, 0);
  const totalNay = ref11Votes.filter(v => v.direction === 'NAY').reduce((sum, v) => sum + v.balance, 0);

  console.log('   📊 TOTAIS CALCULADOS DOS VOTOS:');
  console.log(`      Total AYE: ${totalAye} planck = ${(totalAye / 1e12).toFixed(2)} BZR`);
  console.log(`      Total NAY: ${totalNay} planck = ${(totalNay / 1e12).toFixed(2)} BZR`);
}

// 4. Verificar se há discrepância
console.log('\n\n🔬 PASSO 4: Verificação de Consistência\n');

if (refInfo.isSome) {
  const info = refInfo.unwrap();
  if (info.isOngoing) {
    const tally = info.asOngoing.tally;
    const tallyAyes = parseInt(tally.ayes.toString());
    const tallyNays = parseInt(tally.nays.toString());

    const votesAye = ref11Votes.filter(v => v.direction === 'AYE').reduce((sum, v) => sum + v.balance, 0);
    const votesNay = ref11Votes.filter(v => v.direction === 'NAY').reduce((sum, v) => sum + v.balance, 0);

    console.log('   Tally (blockchain):');
    console.log(`      Ayes: ${tallyAyes} planck`);
    console.log(`      Nays: ${tallyNays} planck`);
    console.log('');
    console.log('   Votos individuais (somados):');
    console.log(`      Ayes: ${votesAye} planck`);
    console.log(`      Nays: ${votesNay} planck`);
    console.log('');

    if (tallyAyes === votesAye && tallyNays === votesNay) {
      console.log('   ✅ CONSISTENTE: Tally = Soma dos votos individuais');
    } else {
      console.log('   ⚠️  INCONSISTÊNCIA DETECTADA!');
      console.log(`      Diferença Ayes: ${tallyAyes - votesAye} planck`);
      console.log(`      Diferença Nays: ${tallyNays - votesNay} planck`);
    }
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('FIM DA INVESTIGAÇÃO');
console.log('═══════════════════════════════════════════════════════════\n');

await api.disconnect();
