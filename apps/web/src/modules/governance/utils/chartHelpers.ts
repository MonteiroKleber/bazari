import type { GovernanceVote, VotingChartData } from '../types';

/**
 * FASE 8: Chart Helper Functions
 *
 * Utilities for processing and formatting chart data
 */

/**
 * Calculate total votes for a specific direction (aye/nay)
 */
export function calculateTotalVotes(
  votes: GovernanceVote[],
  direction: 'AYE' | 'NAY'
): number {
  if (!votes || votes.length === 0) return 0;

  return votes
    .filter(v => v.voteType === direction)
    .reduce((sum, v) => {
      // Parse balance string and account for conviction multiplier
      const balance = parseFloat(v.balance);
      const convictionMultiplier = getConvictionMultiplier(v.conviction);
      return sum + (balance * convictionMultiplier);
    }, 0);
}

/**
 * Get conviction multiplier
 * 0 = 0.1x (No lockup)
 * 1 = 1x (1 period lockup)
 * 2 = 2x (2 periods lockup)
 * ... up to 6 = 6x (32 periods lockup)
 */
export function getConvictionMultiplier(conviction: number): number {
  const multipliers = [0.1, 1, 2, 3, 4, 5, 6];
  return multipliers[conviction] || 1;
}

/**
 * Format votes for display (with K/M/B suffixes)
 */
export function formatVoteCount(count: number): string {
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(1)}B`;
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return count.toFixed(0);
}

/**
 * Calculate vote percentage
 */
export function calculateVotePercentage(
  votes: number,
  totalVotes: number
): number {
  if (totalVotes === 0) return 0;
  return (votes / totalVotes) * 100;
}

/**
 * Calculate turnout percentage
 */
export function calculateTurnout(
  totalVotes: number,
  totalIssuance: number
): number {
  if (totalIssuance === 0) return 0;
  return (totalVotes / totalIssuance) * 100;
}

/**
 * Transform governance votes into chart data format
 */
export function transformVotesToChartData(
  proposalId: number,
  votes: GovernanceVote[],
  proposalTitle?: string
): VotingChartData {
  const ayeVotes = calculateTotalVotes(votes, 'AYE');
  const nayVotes = calculateTotalVotes(votes, 'NAY');
  const totalVotes = ayeVotes + nayVotes;

  return {
    proposalId,
    proposalTitle,
    ayeVotes,
    nayVotes,
    turnout: totalVotes > 0 ? calculateVotePercentage(totalVotes, totalVotes) : undefined,
  };
}

/**
 * Group votes by time period (for line charts)
 */
export function groupVotesByTimePeriod(
  votes: GovernanceVote[],
  periodHours: number = 24
): VotingChartData[] {
  if (!votes || votes.length === 0) return [];

  const periods = new Map<string, { aye: number; nay: number }>();

  votes.forEach(vote => {
    const timestamp = new Date(vote.timestamp);
    const periodKey = new Date(
      Math.floor(timestamp.getTime() / (periodHours * 60 * 60 * 1000)) *
        (periodHours * 60 * 60 * 1000)
    ).toISOString();

    if (!periods.has(periodKey)) {
      periods.set(periodKey, { aye: 0, nay: 0 });
    }

    const period = periods.get(periodKey)!;
    const balance = parseFloat(vote.balance);
    const multiplier = getConvictionMultiplier(vote.conviction);

    if (vote.voteType === 'AYE') {
      period.aye += balance * multiplier;
    } else {
      period.nay += balance * multiplier;
    }
  });

  return Array.from(periods.entries())
    .map(([timestamp, data], index) => ({
      proposalId: index,
      proposalTitle: new Date(timestamp).toLocaleDateString(),
      ayeVotes: data.aye,
      nayVotes: data.nay,
      timestamp,
    }))
    .sort((a, b) => a.timestamp!.localeCompare(b.timestamp!));
}

/**
 * Calculate vote distribution summary
 */
export interface VoteDistribution {
  totalAye: number;
  totalNay: number;
  totalVotes: number;
  ayePercentage: number;
  nayPercentage: number;
  uniqueVoters: number;
  passingThreshold?: number;
  isPassing?: boolean;
}

export function calculateVoteDistribution(
  votes: GovernanceVote[],
  passingThreshold: number = 50
): VoteDistribution {
  const totalAye = calculateTotalVotes(votes, 'AYE');
  const totalNay = calculateTotalVotes(votes, 'NAY');
  const totalVotes = totalAye + totalNay;
  const uniqueVoters = new Set(votes.map(v => v.voter)).size;

  const ayePercentage = calculateVotePercentage(totalAye, totalVotes);
  const nayPercentage = calculateVotePercentage(totalNay, totalVotes);
  const isPassing = ayePercentage >= passingThreshold;

  return {
    totalAye,
    totalNay,
    totalVotes,
    ayePercentage,
    nayPercentage,
    uniqueVoters,
    passingThreshold,
    isPassing,
  };
}

/**
 * Format chart data for pie chart
 */
export function formatPieChartData(distribution: VoteDistribution) {
  return [
    {
      name: 'Aye',
      value: distribution.totalAye,
      percentage: distribution.ayePercentage,
    },
    {
      name: 'Nay',
      value: distribution.totalNay,
      percentage: distribution.nayPercentage,
    },
  ];
}
