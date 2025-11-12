/**
 * Script para popular proposta #7 manualmente no banco de dados
 * Necessário porque a proposta foi criada ANTES do worker estar rodando
 */
import { PrismaClient } from '@prisma/client';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { blake2AsHex } from '@polkadot/util-crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('[PopulateProposal] Conectando à blockchain...');

  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });

  console.log('[PopulateProposal] Buscando proposta #7...');

  const proposalsRaw = await api.query.democracy.publicProps();
  const proposalsArray = proposalsRaw.toJSON();

  const proposal = proposalsArray.find((p) => p[0] === 7);

  if (!proposal) {
    console.error('[PopulateProposal] ❌ Proposta #7 não encontrada na blockchain');
    process.exit(1);
  }

  const [proposalId, proposalData] = proposal;
  const proposalHash = proposalData?.lookup?.hash || proposalData?.hash;
  const proposer = proposalData?.lookup?.depositor || proposalData?.depositor;

  console.log(`[PopulateProposal] Proposta encontrada:`, {
    proposalId,
    proposalHash,
    proposer,
  });

  // Extrair metadata do preimage
  let title = `Proposal #${proposalId}`;
  let description = 'Democracy proposal';
  let preimageHash = null;

  try {
    const callHash = blake2AsHex(proposalHash);
    preimageHash = callHash;

    console.log(`[PopulateProposal] Tentando buscar preimage com hash: ${callHash}`);

    const preimageStatus = await api.query.preimage.requestStatusFor(callHash);

    if (preimageStatus.isSome) {
      const status = preimageStatus.unwrap();
      const len = status.isUnrequested
        ? status.asUnrequested.len.toNumber()
        : status.asRequested.len.toNumber();
      const preimageData = await api.query.preimage.preimageFor([callHash, len]);

      if (preimageData.isSome) {
        const bytes = preimageData.unwrap();
        const call = api.registry.createType('Call', bytes);

        if (call.section === 'system' && call.method === 'remark') {
          try {
            const remarkHex = call.args[0].toHex();
            const remarkData = Buffer.from(remarkHex.slice(2), 'hex').toString('utf8');
            const metadata = JSON.parse(remarkData);

            if (metadata.title) title = metadata.title;
            if (metadata.description) description = metadata.description;

            console.log(`[PopulateProposal] ✅ Metadata extraído: "${title}"`);
          } catch (parseErr) {
            console.warn(`[PopulateProposal] ⚠️  Não foi possível parsear metadata do preimage`);
          }
        } else {
          description = `${call.section}.${call.method}`;
          console.log(`[PopulateProposal] Proposta é ${description}`);
        }
      }
    }
  } catch (preimageErr) {
    console.warn(`[PopulateProposal] ⚠️  Erro ao buscar preimage:`, preimageErr.message);
  }

  // Salvar no banco
  console.log(`[PopulateProposal] Salvando no banco de dados...`);

  try {
    const saved = await prisma.governanceDemocracyProposal.create({
      data: {
        proposalIndex: proposalId,
        proposalHash: proposalHash,
        preimageHash,
        title,
        description,
        proposer: proposer || null,
        deposit: '1000000000000', // Depósito padrão (1000 BZR)
        status: 'PROPOSED',
        txHash: '0x0000000000000000000000000000000000000000000000000000000000000000', // Placeholder
        blockNumber: 0, // Placeholder
      },
    });

    console.log(`[PopulateProposal] ✅ Proposta #${proposalId} salva com sucesso no banco!`);
    console.log(`[PopulateProposal] Dados salvos:`, {
      id: saved.id,
      title: saved.title,
      description: saved.description.slice(0, 100) + '...',
      proposer: saved.proposer,
    });
  } catch (dbErr) {
    console.error(`[PopulateProposal] ❌ Erro ao salvar no banco:`, dbErr);
    throw dbErr;
  }

  await api.disconnect();
  await prisma.$disconnect();

  console.log(`[PopulateProposal] ✅ Concluído!`);
}

main().catch((error) => {
  console.error('[PopulateProposal] ❌ Erro fatal:', error);
  process.exit(1);
});
