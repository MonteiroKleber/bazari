import { PrismaClient } from '@prisma/client';
import { ApiPromise, WsProvider } from '@polkadot/api';

const prisma = new PrismaClient();

async function main() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });

  // Buscar referendo #9 para obter o proposer da proposta original
  const refInfo = await api.query.democracy.referendumInfoOf(9);
  
  if (refInfo.isSome) {
    const info = refInfo.unwrap();
    if (info.isOngoing) {
      const ongoing = info.asOngoing;
      const proposalHash = ongoing.proposal.toHex();
      
      console.log('Proposal hash:', proposalHash);
      
      // Buscar em propostas ativas (se ainda existir)
      const proposalsRaw = await api.query.democracy.publicProps();
      const proposalsArray = proposalsRaw.toJSON();
      
      console.log('Active proposals:', proposalsArray.length);
      
      const proposal = proposalsArray.find((p) => {
        const hash = p[1]?.lookup?.hash || p[1]?.hash;
        return hash === proposalHash;
      });
      
      if (proposal) {
        const proposer = proposal[1]?.lookup?.depositor || proposal[1]?.depositor;
        console.log('Found proposer:', proposer);
        
        // Atualizar proposta
        await prisma.governanceDemocracyProposal.updateMany({
          where: { proposalIndex: 9 },
          data: { proposer },
        });
        
        // Atualizar referendum
        await prisma.governanceReferendum.updateMany({
          where: { refIndex: 9 },
          data: { proposer },
        });
        
        console.log('✅ Updated proposer for proposal #9 and referendum #9');
      } else {
        console.log('⚠️ Proposal not found in active proposals (already converted to referendum)');
        console.log('Using Alice as proposer (5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY)');
        
        const proposer = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
        
        await prisma.governanceDemocracyProposal.updateMany({
          where: { proposalIndex: 9 },
          data: { proposer },
        });
        
        await prisma.governanceReferendum.updateMany({
          where: { refIndex: 9 },
          data: { proposer },
        });
        
        console.log('✅ Updated with default proposer');
      }
    }
  }

  await api.disconnect();
  await prisma.$disconnect();
}

main().catch(console.error);
