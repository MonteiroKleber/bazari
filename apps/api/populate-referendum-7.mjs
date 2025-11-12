/**
 * Script para popular referendum #7 manualmente no banco de dados
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[PopulateReferendum] Buscando proposta #7 no banco...');

  // Buscar proposta original no banco
  const proposal = await prisma.governanceDemocracyProposal.findFirst({
    where: { proposalIndex: 7 },
  });

  if (!proposal) {
    console.error('[PopulateReferendum] ❌ Proposta #7 não encontrada no banco');
    process.exit(1);
  }

  console.log(`[PopulateReferendum] ✅ Proposta encontrada: "${proposal.title}"`);
  console.log(`[PopulateReferendum] proposalHash: ${proposal.proposalHash}`);
  console.log(`[PopulateReferendum] preimageHash: ${proposal.preimageHash}`);

  // Atualizar status da proposta
  await prisma.governanceDemocracyProposal.update({
    where: { id: proposal.id },
    data: {
      status: 'STARTED',
      startedAt: new Date(),
    },
  });

  console.log(`[PopulateReferendum] ✅ Proposta #7 atualizada para status STARTED`);

  // Criar referendum no banco (usando o proposalHash original da proposta)
  const savedReferendum = await prisma.governanceReferendum.create({
    data: {
      refIndex: 7,
      threshold: JSON.stringify({ type: 'SuperMajorityApprove' }),
      title: proposal.title,
      description: proposal.description,
      proposer: proposal.proposer,
      proposalId: proposal.id,
      proposalHash: proposal.proposalHash, // Usar o hash da proposta original
      preimageHash: proposal.preimageHash,
      status: 'ONGOING',
      startTxHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      startBlockNumber: 0,
    },
  });

  console.log(`[PopulateReferendum] ✅ Referendum #7 criado com sucesso!`);
  console.log(`[PopulateReferendum] Dados:`, {
    id: savedReferendum.id,
    refIndex: savedReferendum.refIndex,
    title: savedReferendum.title,
    proposer: savedReferendum.proposer,
    threshold: savedReferendum.threshold,
  });

  await prisma.$disconnect();

  console.log(`[PopulateReferendum] ✅ Concluído!`);
}

main().catch((error) => {
  console.error('[PopulateReferendum] ❌ Erro fatal:', error);
  process.exit(1);
});
