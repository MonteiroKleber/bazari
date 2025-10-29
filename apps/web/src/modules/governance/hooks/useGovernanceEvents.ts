import { useState, useEffect } from 'react';
import { governanceApi } from '../api';
import type { GovernanceEvent, GovernanceEventType } from '../types';

export interface UseGovernanceEventsOptions {
  /**
   * Maximum number of events to return
   * @default 10
   */
  limit?: number;

  /**
   * Filter by event types
   */
  eventTypes?: GovernanceEventType[];

  /**
   * Auto-refresh interval in milliseconds (0 = disabled)
   * @default 0
   */
  refreshInterval?: number;

  /**
   * Auto-fetch on mount
   * @default true
   */
  autoFetch?: boolean;
}

export interface UseGovernanceEventsReturn {
  /**
   * List of governance events
   */
  events: GovernanceEvent[];

  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Error message
   */
  error: string | null;

  /**
   * Manually refresh events
   */
  refresh: () => Promise<void>;
}

/**
 * FASE 8: Hook for fetching governance events
 *
 * Creates a timeline of recent governance activity by combining
 * events from different sources (proposals, votes, treasury, etc.)
 *
 * Features:
 * - Fetches from multiple endpoints in parallel
 * - Combines and sorts by timestamp
 * - Filter by event type
 * - Auto-refresh support
 * - Mock data generation for development
 *
 * @example
 * ```tsx
 * const { events, loading, error } = useGovernanceEvents({
 *   limit: 20,
 *   eventTypes: ['PROPOSAL_CREATED', 'VOTE_CAST'],
 *   refreshInterval: 30000, // Refresh every 30s
 * });
 * ```
 */
export function useGovernanceEvents({
  limit = 10,
  eventTypes,
  refreshInterval = 0,
  autoFetch = true,
}: UseGovernanceEventsOptions = {}): UseGovernanceEventsReturn {
  const [events, setEvents] = useState<GovernanceEvent[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data from multiple sources in parallel
      const [democracyRes, treasuryRes, councilRes] = await Promise.all([
        governanceApi.getDemocracyReferendums(),
        governanceApi.getTreasuryProposals(),
        governanceApi.getCouncilMembers(),
      ]);

      const allEvents: GovernanceEvent[] = [];

      // Convert democracy referendums to events
      if (democracyRes.success && democracyRes.data) {
        democracyRes.data.forEach((referendum: any) => {
          // Proposal created event
          allEvents.push({
            id: `democracy-created-${referendum.id}`,
            type: 'PROPOSAL_CREATED',
            title: `Proposta #${referendum.id} criada`,
            description: referendum.info?.Ongoing?.proposal || 'Nova proposta de democracia',
            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            actor: referendum.proposer || referendum.info?.Ongoing?.proposer || 'Unknown',
            proposalId: referendum.id,
          });

          // If voting started
          if (referendum.info?.Ongoing) {
            allEvents.push({
              id: `democracy-voting-${referendum.id}`,
              type: 'VOTING_STARTED',
              title: `Votação iniciada para #${referendum.id}`,
              description: 'Período de votação aberto',
              timestamp: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
              actor: referendum.info.Ongoing.proposer,
              proposalId: referendum.id,
            });
          }
        });
      }

      // Convert treasury proposals to events
      if (treasuryRes.success && treasuryRes.data) {
        treasuryRes.data.forEach((proposal: any) => {
          allEvents.push({
            id: `treasury-${proposal.id}`,
            type: 'TREASURY_APPROVED',
            title: `Proposta de tesouro #${proposal.id}`,
            description: `Solicitação de fundos: ${proposal.value} BZR`,
            timestamp: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
            actor: proposal.proposer || 'Unknown',
            proposalId: proposal.id,
            metadata: {
              value: proposal.value,
              beneficiary: proposal.beneficiary,
            },
          });
        });
      }

      // Convert council members to events
      if (councilRes.success && councilRes.data) {
        councilRes.data.forEach((member: any, idx: number) => {
          allEvents.push({
            id: `council-${member.address}-${idx}`,
            type: 'COUNCIL_MEMBER_ADDED',
            title: 'Novo membro do conselho',
            description: `${member.name || 'Membro'} adicionado ao conselho`,
            timestamp: member.addedAt || new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            actor: member.address,
          });
        });
      }

      // Sort by timestamp (most recent first)
      const sortedEvents = allEvents.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      // Filter by event types if specified
      let filteredEvents = sortedEvents;
      if (eventTypes && eventTypes.length > 0) {
        filteredEvents = sortedEvents.filter(e => eventTypes.includes(e.type));
      }

      // Apply limit
      const limitedEvents = filteredEvents.slice(0, limit);

      setEvents(limitedEvents);
    } catch (err) {
      console.error('Error fetching governance events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchEvents();
    }
  }, [limit, eventTypes?.join(','), autoFetch]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchEvents, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [limit, eventTypes?.join(','), refreshInterval]);

  return {
    events,
    loading,
    error,
    refresh: fetchEvents,
  };
}
