/**
 * Script para popular referendum #9 manualmente no banco de dados
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[PopulateReferendum] Buscando proposta #9 no banco...');

  const proposal = await prisma.governanceDemocracyProposal.findFirst({
    where: { proposalIndex: 9 },
  });

  if (!proposal) {
    console.error('[PopulateReferendum] ❌ Proposta #9 não encontrada no banco');
    process.exit(1);
  }

  console.log(`[PopulateReferendum] ✅ Proposta encontrada: "${proposal.title}"`);

  // Atualizar status da proposta
  await prisma.governanceDemocracyProposal.update({
    where: { id: proposal.id },
    data: {
      status: 'STARTED',
      startedAt: new Date(),
    },
  });

  console.log(`[PopulateReferendum] ✅ Proposta #9 atualizada para status STARTED`);

  // Criar referendum no banco com formato correto
  const savedReferendum = await prisma.governanceReferendum.create({
    data: {
      refIndex: 9,
      threshold: JSON.stringify({ type: 'SuperMajorityApprove' }),
      title: `Referendum #9: ${proposal.title}`,
      description: proposal.description,
      proposer: proposal.proposer,
      proposalId: proposal.id,
      proposalHash: proposal.proposalHash,
      preimageHash: proposal.preimageHash,
      status: 'ONGOING',
      startTxHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      startBlockNumber: 0,
    },
  });

  console.log(`[PopulateReferendum] ✅ Referendum #9 criado com sucesso!`);
  console.log(`[PopulateReferendum] Dados:`, {
    id: savedReferendum.id,
    refIndex: savedReferendum.refIndex,
    title: savedReferendum.title,
    proposer: savedReferendum.proposer,
  });

  await prisma.$disconnect();
  console.log(`[PopulateReferendum] ✅ Concluído!`);
}

main().catch((error) => {
  console.error('[PopulateReferendum] ❌ Erro fatal:', error);
  process.exit(1);
});
