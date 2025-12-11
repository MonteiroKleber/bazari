# Governance User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [What is On-Chain Governance?](#what-is-on-chain-governance)
3. [Getting Started](#getting-started)
4. [Democracy Proposals](#democracy-proposals)
5. [Voting on Proposals](#voting-on-proposals)
6. [Treasury Proposals](#treasury-proposals)
7. [Council & Technical Committee](#council--technical-committee)
8. [Multisig Accounts](#multisig-accounts)
9. [FAQ](#faq)

---

## Introduction

Welcome to the Bazari Governance User Guide! This guide will help you understand and participate in the on-chain governance of the Bazari network.

Governance allows BZR token holders to have a say in the future of the network, including:
- Approving protocol upgrades
- Managing the network treasury
- Proposing and voting on network improvements
- Managing multisig accounts for collective decisions

---

## What is On-Chain Governance?

On-chain governance is a system where decisions about the network are made transparently and democratically through the blockchain itself. Unlike traditional organizations where decisions are made behind closed doors, on-chain governance:

- **Is Transparent**: All proposals and votes are publicly recorded on the blockchain
- **Is Democratic**: BZR token holders can propose and vote on changes
- **Is Automatic**: Approved proposals are automatically executed without manual intervention
- **Is Secure**: Uses cryptographic signatures and PIN authentication for all actions

### Key Components

- **Democracy**: Community-driven proposals and referendums
- **Treasury**: Network fund management for public goods and development
- **Council**: Elected representatives who can fast-track proposals
- **Technical Committee**: Technical experts who can veto dangerous proposals
- **Multisig**: Shared accounts requiring multiple approvals

---

## Getting Started

### Prerequisites

1. **BZR Tokens**: You need BZR tokens to participate in governance
2. **Bazari Account**: Create an account with PIN protection
3. **Active Session**: Unlock your account to access governance features

### Accessing Governance

1. Log in to your Bazari account
2. Navigate to the **Governance** section from the main menu
3. You'll see the governance dashboard with:
   - Active proposals count
   - Treasury balance
   - Council members
   - Quick action buttons

---

## Democracy Proposals

Democracy proposals are community-driven initiatives that anyone can create. These are voted on by all BZR token holders.

### Creating a Democracy Proposal

1. Navigate to **Governance** > **Proposals**
2. Click **Create Proposal**
3. Select **Democracy** as the proposal type
4. Fill in the required fields:
   - **Title**: Clear, concise title (max 100 characters)
   - **Description**: Detailed explanation (max 2000 characters)
   - **Preimage Hash** (optional): If you've already submitted a preimage

5. Review the deposit requirement
6. Click **Create Proposal**
7. Enter your PIN to sign the transaction
8. Wait for confirmation

### What Happens Next?

1. **Proposal Created**: Your proposal enters the public referendum queue
2. **Voting Period**: Community members can vote Aye or Nay
3. **Enactment**: If approved, the proposal is automatically executed after a delay

### Tips for Good Proposals

- **Be Clear**: Write a clear, specific proposal
- **Provide Context**: Explain why the proposal is needed
- **Include Details**: Technical details, timeline, budget (if applicable)
- **Engage Community**: Discuss your proposal before submitting

---

## Voting on Proposals

Voting is how you influence the direction of the Bazari network. Every BZR token holder can vote on active proposals.

### How to Vote

1. Navigate to **Governance** > **Proposals**
2. Browse active proposals or use filters
3. Click on a proposal to view details
4. Click **Vote Now**
5. Choose your vote direction:
   - **Aye (Yes)**: Vote in favor
   - **Nay (No)**: Vote against

6. Enter the amount of BZR tokens to vote with
7. Select your conviction level (see below)
8. Review your effective voting power
9. Click **Confirm Vote**
10. Enter your PIN to sign the transaction

### Understanding Conviction

Conviction is a mechanism that allows you to increase your vote weight by locking your tokens for longer periods:

| Conviction | Vote Multiplier | Lock Period |
|-----------|-----------------|-------------|
| None (0x) | 0.1x | No lock (can unlock immediately) |
| Locked1x | 1x | 1 voting period (~7 days) |
| Locked2x | 2x | 2 voting periods (~14 days) |
| Locked3x | 3x | 4 voting periods (~28 days) |
| Locked4x | 4x | 8 voting periods (~56 days) |
| Locked5x | 5x | 16 voting periods (~112 days) |
| Locked6x | 6x | 32 voting periods (~224 days) |

**Example**: If you vote with 100 BZR at Locked3x conviction, your effective voting power is 300 BZR, but your tokens will be locked for ~28 days after the vote ends.

### Voting Strategy

- **High Conviction**: Use for proposals you strongly support and are willing to lock tokens
- **Low Conviction**: Use when you want flexibility to vote on other proposals
- **None (0x)**: Use when you need immediate access to your tokens after voting

---

## Treasury Proposals

The Treasury manages network funds collected from transaction fees and other sources. These funds are used for public goods, development, and network improvements.

### Requesting Treasury Funds

1. Navigate to **Governance** > **Treasury**
2. Click **Create New Proposal**
3. Fill in the required fields:
   - **Title**: Project name
   - **Description**: Detailed project description
   - **Beneficiary**: Address that will receive funds
   - **Value**: Amount of BZR tokens requested

4. Review the deposit requirement (5% of requested amount)
5. Click **Create Proposal**
6. Enter your PIN to sign the transaction

### Treasury Proposal Lifecycle

1. **Submitted**: Proposal enters the treasury queue
2. **Council Review**: Council votes to approve or reject
3. **Spend Period**: Approved proposals are paid out during the next spend period
4. **Burn**: If treasury funds are not spent, a portion is burned

### Tips for Treasury Proposals

- **Justify the Request**: Explain why the network should fund your proposal
- **Provide Milestones**: Break large projects into phases
- **Show Track Record**: Demonstrate ability to deliver
- **Set Realistic Budget**: Request appropriate amounts
- **Include Deliverables**: Specify what the network will receive

---

## Council & Technical Committee

The Council and Technical Committee are elected bodies that help govern the network.

### Council

The Council consists of elected members who:
- Fast-track important proposals
- Vote on treasury proposals
- Can cancel malicious referendums
- Represent the community's interests

**Viewing Council Members**:
1. Navigate to **Governance** > **Council**
2. View current council members and their backing
3. See active council motions

### Technical Committee

The Technical Committee consists of technical experts who:
- Can fast-track urgent technical proposals
- Can veto dangerous proposals
- Provide technical oversight

**Viewing Technical Committee**:
1. Navigate to **Governance** > **Council**
2. Switch to the **Technical** tab
3. View current members and their proposals

---

## Multisig Accounts

Multisig (multi-signature) accounts require multiple approvals for transactions, perfect for organizations and shared funds.

### Creating a Multisig Account

Multisig accounts are created off-chain by deriving an address from:
- List of signatory addresses
- Threshold (minimum approvals needed)

**Example**: A 2-of-3 multisig requires 2 out of 3 signatories to approve each transaction.

### Viewing Multisig Accounts

1. Navigate to **Governance** > **Multisig**
2. Enter a multisig address in the search box
3. View:
   - Signatory list
   - Approval threshold
   - Pending transactions

### Approving Multisig Transactions

1. Search for your multisig account
2. View pending transactions
3. Click **Approve Transaction** on any pending item
4. Enter your PIN to sign the approval
5. Once threshold is reached, any signatory can execute

### Multisig Best Practices

- **Choose Trusted Signatories**: Select reliable, available members
- **Set Appropriate Threshold**: Balance security (higher) vs. availability (lower)
- **Document Decisions**: Keep external records of multisig decisions
- **Test First**: Test with small amounts before large transactions

---

## FAQ

### General Questions

**Q: How many BZR tokens do I need to participate?**
A: Any amount! Even small holders can vote and create proposals.

**Q: Is there a cost to vote?**
A: Voting itself is free (no gas fees), but you need to lock tokens with conviction.

**Q: Can I change my vote?**
A: No, votes are final once submitted. Choose carefully!

**Q: What happens if I lose my PIN?**
A: Use your recovery phrase to restore your account and reset your PIN.

### Proposals

**Q: How long do referendums last?**
A: Typically 7-14 days, depending on proposal type.

**Q: What's the minimum deposit for a proposal?**
A: Varies by type, typically 100-1000 BZR. Check the UI for current amounts.

**Q: Can I cancel my proposal?**
A: Yes, before voting starts. You'll forfeit your deposit.

**Q: What happens to my deposit?**
A: It's returned if your proposal is approved, forfeited if rejected.

### Treasury

**Q: How often does the treasury pay out?**
A: Every spend period (approximately 24 days).

**Q: Can individuals request treasury funds?**
A: Yes! Treasury is open to anyone with valuable proposals.

**Q: What happens to unused treasury funds?**
A: A percentage is burned to prevent excessive accumulation.

### Voting

**Q: Does my vote weight depend on my token balance?**
A: Yes! More tokens = more voting power (multiplied by conviction).

**Q: Can I vote with locked tokens?**
A: Yes, already-locked tokens can still be used to vote.

**Q: When can I unlock my tokens after voting?**
A: After the lock period specified by your conviction level ends.

### Technical

**Q: What is a preimage?**
A: A preimage is the actual code/call data for a proposal, submitted separately from the proposal itself.

**Q: Why use conviction voting?**
A: It prevents vote buying and encourages long-term thinking by those with "skin in the game."

**Q: Is voting data public?**
A: Yes, all votes are publicly recorded on the blockchain.

**Q: Can the council override my vote?**
A: No, but they can fast-track proposals or cancel malicious ones (which can be challenged).

---

## Need Help?

- **Documentation**: https://docs.bazari.com
- **Community Forum**: https://forum.bazari.com
- **Support**: support@bazari.com
- **Discord**: https://discord.gg/bazari

---

**Last Updated**: 2025-01-XX
**Version**: 1.0.0
