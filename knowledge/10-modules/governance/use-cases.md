# Governance Module - Use Cases

## UC-01: View Active Referendums
1. User navigates to `/app/governance`
2. Client requests `GET /api/governance/democracy/referendums`
3. System queries Substrate Democracy pallet
4. System returns list of active referendums with:
   - Referendum ID
   - Proposal hash
   - Voting deadline
   - Current tally (ayes/nays)
5. User sees all active governance proposals

## UC-02: View Referendum Details and Votes
1. User clicks on referendum
2. Client requests `GET /api/governance/democracy/referendums/:id/votes`
3. System returns:
   - Referendum info (proposer, threshold, end block)
   - All votes with addresses and amounts
   - Current vote tally
4. User sees who voted and how much weight

## UC-03: Vote on Referendum (On-Chain)
1. User sees referendum details
2. User selects vote: Aye or Nay
3. User selects conviction level (0x-6x)
4. Client constructs extrinsic: `democracy.vote(refIndex, vote)`
5. User signs with wallet (Polkadot.js, SubWallet)
6. Transaction submitted to chain
7. Vote recorded on-chain
8. User's tokens locked based on conviction

## UC-04: Submit Treasury Proposal
1. User wants to request funding from treasury
2. User navigates to `/app/governance/treasury/propose`
3. User fills form:
   - Amount requested (BZR)
   - Beneficiary address
   - Description/justification
4. Client constructs extrinsic: `treasury.proposeSpend(value, beneficiary)`
5. User signs transaction (5% deposit required)
6. Proposal submitted on-chain
7. Council notified for review

## UC-05: Council Reviews Treasury Proposal
1. Council member sees pending proposals
2. Client requests `GET /api/governance/treasury/proposals`
3. Council member reviews proposal details
4. Council votes: Approve or Reject
5. Client constructs extrinsic: `council.vote(proposal, index, approve)`
6. If majority approves → Proposal queued for payment
7. If rejected → Proposer's deposit slashed

## UC-06: View Treasury Approvals
1. User wants to see approved proposals awaiting payment
2. Client requests `GET /api/governance/treasury/approvals`
3. System returns list of approved proposals
4. System shows:
   - Proposal ID
   - Amount
   - Beneficiary
   - Payment scheduled for next spend period
5. Funds released automatically on-chain

## UC-07: View Council Members
1. User navigates to `/app/governance/council`
2. Client requests `GET /api/governance/council/members`
3. System queries Council pallet
4. System returns list of elected council members with SS58 addresses
5. User sees current council composition

## UC-08: View Council Proposals
1. User wants to see what council is working on
2. Client requests `GET /api/governance/council/proposals`
3. System returns:
   - Proposal hashes
   - Proposal details (call data)
   - Voting status (ayes, nays, threshold)
4. User sees active council proposals

## UC-09: Council Member Votes on Proposal
1. Council member sees proposal
2. Member reviews call data
3. Member votes via wallet
4. Client constructs: `council.vote(proposalHash, proposalIndex, approve)`
5. Vote recorded on-chain
6. If threshold met → Proposal executes
7. If rejected → Proposal closed

## UC-10: View Technical Committee Members
1. User navigates to `/app/governance/tech-committee`
2. Client requests `GET /api/governance/tech-committee/members`
3. System returns list of tech committee members
4. User sees specialized members for emergency actions

## UC-11: Technical Committee Fast-Tracks Upgrade
1. Critical bug discovered in runtime
2. Tech committee member proposes fix
3. Client constructs: `technicalCommittee.propose(threshold, proposal)`
4. Other members vote
5. If approved → Proposal fast-tracked
6. Referendum bypassed (emergency)
7. Upgrade enacted immediately

## UC-12: Create Multisig Account
1. User wants shared control of funds
2. User gathers co-signers' addresses
3. Client derives multisig address from signatories
4. Client constructs: `multisig.asMulti(threshold, otherSignatories, call)`
5. First signer approves transaction
6. Transaction pending in multisig storage
7. Other signers notified

## UC-13: Approve Multisig Transaction
1. Co-signer receives multisig notification
2. Client requests `GET /api/governance/multisig/:address`
3. System returns pending multisigs
4. Co-signer reviews call data
5. Co-signer approves via wallet
6. Client constructs: `multisig.approveAsMulti(...)`
7. If threshold met → Transaction executes

## UC-14: View Governance Statistics
1. User wants overview of governance activity
2. Client requests `GET /api/governance/stats`
3. System returns:
   - Total treasury proposals
   - Active referendums count
   - Council member count
   - Tech committee size
   - Treasury balance
4. User sees governance health metrics

## UC-15: Delegate Voting Power
1. User doesn't want to vote on every proposal
2. User selects trusted delegate
3. Client constructs: `democracy.delegate(to, conviction, balance)`
4. Voting power transferred to delegate
5. Delegate can now vote with delegated power
6. User can revoke anytime

## UC-16: Submit Public Proposal
1. User wants to propose runtime change
2. User prepares proposal (call data)
3. Client constructs: `democracy.propose(proposalHash, value)`
4. User deposits bond (proportional to proposal impact)
5. Proposal enters public queue
6. Community can second proposal
7. If enough seconds → Becomes referendum

## UC-17: Second a Public Proposal
1. User sees public proposal they support
2. User clicks "Second"
3. Client constructs: `democracy.second(proposal, secondsUpperBound)`
4. User's tokens locked as support
5. Proposal gains traction
6. Most seconded proposals become referendums

## UC-18: Cancel Malicious Referendum
1. Council detects malicious proposal
2. Council member proposes cancellation
3. Council votes on cancellation
4. If approved → Referendum cancelled
5. Proposer's deposit slashed
6. Network protected from attack

## UC-19: View Treasury Balance
1. User wants to know available treasury funds
2. Client requests `GET /api/governance/stats`
3. System queries Treasury pallet account
4. System returns treasury balance in BZR
5. User sees funds available for proposals

## UC-20: Emergency Protocol Upgrade
1. Critical vulnerability discovered
2. Tech committee convenes
3. Upgrade proposal submitted
4. Fast-track threshold met
5. Runtime upgrade enacted
6. Network secured
7. Community notified post-facto

**Status:** ✅ Implemented (On-Chain via Substrate)
