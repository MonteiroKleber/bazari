/**
 * Check all votes for referendum #11
 */
import { ApiPromise, WsProvider } from '@polkadot/api';

const provider = new WsProvider('ws://127.0.0.1:9944');
const api = await ApiPromise.create({ provider });

console.log('🔍 Checking all votes for referendum #11...\n');

const votingOf = await api.query.democracy.votingOf.entries();

let voteCount = 0;

votingOf.forEach(([key, voting]) => {
  const voter = key.args[0].toString();
  const votingData = voting.toJSON();

  if (votingData?.direct?.votes) {
    const ref11Vote = votingData.direct.votes.find(v => v[0] === 11);
    if (ref11Vote) {
      voteCount++;
      const [refId, voteInfo] = ref11Vote;

      console.log(`📊 Vote #${voteCount}`);
      console.log(`   Voter: ${voter}`);
      console.log(`   Vote Info:`, JSON.stringify(voteInfo, null, 2));

      // Decode vote byte
      if (voteInfo?.standard) {
        const voteHex = voteInfo.standard.vote;
        const voteByte = parseInt(voteHex, 16);
        const aye = (voteByte & 0x80) !== 0;
        const conviction = voteByte & 0x7F;

        console.log(`   Decoded: ${aye ? 'AYE' : 'NAY'} with conviction ${conviction}`);
        console.log(`   Balance: ${voteInfo.standard.balance}`);
      }
      console.log('');
    }
  }
});

console.log(`\n✅ Total votes found: ${voteCount}`);

// Check referendum tally
const refInfo = await api.query.democracy.referendumInfoOf(11);
if (refInfo.isSome) {
  const info = refInfo.unwrap();
  if (info.isOngoing) {
    const tally = info.asOngoing.tally;
    console.log(`\n📈 Referendum #11 Tally:`);
    console.log(`   Ayes: ${tally.ayes.toString()}`);
    console.log(`   Nays: ${tally.nays.toString()}`);
    console.log(`   Turnout: ${tally.turnout.toString()}`);
  }
}

await api.disconnect();
