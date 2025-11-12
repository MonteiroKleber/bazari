/**
 * Check all votes across all referendums
 */
import { ApiPromise, WsProvider } from '@polkadot/api';

const provider = new WsProvider('ws://127.0.0.1:9944');
const api = await ApiPromise.create({ provider });

console.log('🔍 Checking all votes across all referendums...\n');

const votingOf = await api.query.democracy.votingOf.entries();

// Group votes by referendum
const votesByRef = new Map();

votingOf.forEach(([key, voting]) => {
  const voter = key.args[0].toString();
  const votingData = voting.toJSON();

  if (votingData?.direct?.votes) {
    votingData.direct.votes.forEach(([refId, voteInfo]) => {
      if (!votesByRef.has(refId)) {
        votesByRef.set(refId, []);
      }

      // Decode vote
      let decoded = {};
      if (voteInfo?.standard) {
        const voteHex = voteInfo.standard.vote;
        const voteByte = parseInt(voteHex, 16);
        const aye = (voteByte & 0x80) !== 0;
        const conviction = voteByte & 0x7F;
        decoded = {
          direction: aye ? 'AYE' : 'NAY',
          conviction,
          balance: voteInfo.standard.balance,
        };
      }

      votesByRef.get(refId).push({
        voter: voter.slice(0, 10) + '...',
        ...decoded,
      });
    });
  }
});

// Sort by referendum ID and display
const sortedRefs = Array.from(votesByRef.keys()).sort((a, b) => a - b);

sortedRefs.forEach(refId => {
  const votes = votesByRef.get(refId);
  console.log(`📊 Referendum #${refId} - ${votes.length} vote(s)`);

  votes.forEach((vote, idx) => {
    console.log(`   ${idx + 1}. ${vote.voter}: ${vote.direction} ${vote.balance} BZR (conviction ${vote.conviction})`);
  });

  // Calculate totals
  const ayeTotal = votes.filter(v => v.direction === 'AYE').reduce((sum, v) => sum + v.balance, 0);
  const nayTotal = votes.filter(v => v.direction === 'NAY').reduce((sum, v) => sum + v.balance, 0);

  console.log(`   Total: ${ayeTotal} AYE vs ${nayTotal} NAY\n`);
});

console.log(`✅ Found votes in ${votesByRef.size} referendums`);

await api.disconnect();
