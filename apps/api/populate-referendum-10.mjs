import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[Test] Simulating referendum #10 creation with fix...');
  
  // The raw proposal hash from referendum (with bounded encoding)
  const rawProposalHash = '0x029c30c74450837b5ea179bf76ea6b2ce8982b9514ca41348f7ea8d892467bceb0c1010000';
  
  // Extract pure hash (skip 0x02 prefix, take 64 chars)
  const extractedHash = '0x' + rawProposalHash.substring(4, 68);
  
  console.log('Raw proposal hash:', rawProposalHash);
  console.log('Extracted hash:', extractedHash);
  
  // Find proposal with extracted hash
  const proposal = await prisma.governanceDemocracyProposal.findFirst({
    where: { proposalHash: extractedHash },
  });
  
  if (!proposal) {
    console.error('❌ Proposal not found with extracted hash');
    process.exit(1);
  }
  
  console.log('✅ Found proposal:', proposal.title);
  
  // Update proposal status
  await prisma.governanceDemocracyProposal.update({
    where: { id: proposal.id },
    data: { status: 'STARTED', startedAt: new Date() },
  });
  
  // Create referendum
  await prisma.governanceReferendum.create({
    data: {
      refIndex: 10,
      threshold: JSON.stringify({ type: 'SuperMajorityApprove' }),
      title: `Referendum #10: ${proposal.title}`,
      description: proposal.description,
      proposer: proposal.proposer,
      proposalId: proposal.id,
      proposalHash: extractedHash,
      preimageHash: proposal.preimageHash,
      status: 'ONGOING',
      startTxHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      startBlockNumber: 0,
    },
  });
  
  console.log('✅ Referendum #10 created successfully!');
  
  await prisma.$disconnect();
}

main().catch(console.error);
