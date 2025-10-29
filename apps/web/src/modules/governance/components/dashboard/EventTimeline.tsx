import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FileText,
  Vote,
  CheckCircle,
  XCircle,
  Coins,
  Users,
  UserPlus,
  UserMinus,
  PlayCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GovernanceEvent, GovernanceEventType } from '../../types';

export interface EventTimelineProps {
  events: GovernanceEvent[];
  maxEvents?: number;
  showProposalLinks?: boolean;
}

/**
 * Icon mapping for event types
 */
const eventTypeIcons: Record<GovernanceEventType, React.ReactNode> = {
  PROPOSAL_CREATED: <FileText className="h-5 w-5" />,
  PROPOSAL_TABLED: <Clock className="h-5 w-5" />,
  VOTING_STARTED: <PlayCircle className="h-5 w-5" />,
  VOTE_CAST: <Vote className="h-5 w-5" />,
  PROPOSAL_PASSED: <CheckCircle className="h-5 w-5" />,
  PROPOSAL_REJECTED: <XCircle className="h-5 w-5" />,
  PROPOSAL_EXECUTED: <CheckCircle className="h-5 w-5" />,
  TREASURY_APPROVED: <Coins className="h-5 w-5" />,
  COUNCIL_MEMBER_ADDED: <UserPlus className="h-5 w-5" />,
  COUNCIL_MEMBER_REMOVED: <UserMinus className="h-5 w-5" />,
  MULTISIG_APPROVAL: <Users className="h-5 w-5" />,
  MULTISIG_EXECUTED: <CheckCircle className="h-5 w-5" />,
};

/**
 * Color mapping for event types
 */
const eventTypeColors: Record<GovernanceEventType, string> = {
  PROPOSAL_CREATED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  PROPOSAL_TABLED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  VOTING_STARTED: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  VOTE_CAST: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  PROPOSAL_PASSED: 'bg-green-500/10 text-green-600 dark:text-green-400',
  PROPOSAL_REJECTED: 'bg-red-500/10 text-red-600 dark:text-red-400',
  PROPOSAL_EXECUTED: 'bg-green-600/10 text-green-700 dark:text-green-500',
  TREASURY_APPROVED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  COUNCIL_MEMBER_ADDED: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  COUNCIL_MEMBER_REMOVED: 'bg-red-500/10 text-red-600 dark:text-red-400',
  MULTISIG_APPROVAL: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  MULTISIG_EXECUTED: 'bg-green-500/10 text-green-600 dark:text-green-400',
};

/**
 * Format address for display
 */
function formatAddress(address: string): string {
  if (!address) return 'Unknown';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return formatDistance(date, new Date(), {
      addSuffix: true,
      locale: ptBR,
    });
  } catch {
    return timestamp;
  }
}

/**
 * FASE 8: Event Timeline Component
 *
 * Visual timeline of governance events with:
 * - Chronological display
 * - Event type icons and colors
 * - Relative timestamps
 * - Actor information
 * - Links to proposals
 * - Staggered animations
 *
 * @example
 * ```tsx
 * <EventTimeline
 *   events={recentEvents}
 *   maxEvents={10}
 *   showProposalLinks={true}
 * />
 * ```
 */
export function EventTimeline({
  events,
  maxEvents = 10,
  showProposalLinks = true,
}: EventTimelineProps) {
  const displayEvents = events.slice(0, maxEvents);

  if (displayEvents.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">Nenhum evento recente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayEvents.map((event, idx) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.3,
            delay: idx * 0.05, // Staggered animation
          }}
          className="flex gap-4"
        >
          {/* Timeline Icon */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                eventTypeColors[event.type]
              )}
            >
              {eventTypeIcons[event.type]}
            </div>
            {/* Connecting Line */}
            {idx < displayEvents.length - 1 && (
              <div className="w-0.5 flex-1 bg-border mt-2 min-h-[40px]" />
            )}
          </div>

          {/* Event Content */}
          <div className="flex-1 pb-6">
            <div className="flex items-start justify-between gap-4 mb-1">
              <h4 className="font-semibold text-sm">{event.title}</h4>
              <time className="text-xs text-muted-foreground whitespace-nowrap">
                {formatRelativeTime(event.timestamp)}
              </time>
            </div>

            {event.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {event.description}
              </p>
            )}

            {/* Actor */}
            {event.actor && (
              <p className="text-xs text-muted-foreground">
                por {formatAddress(event.actor)}
              </p>
            )}

            {/* Proposal Link */}
            {showProposalLinks && event.proposalId && (
              <Link
                to={`/app/governance/proposals/democracy/${event.proposalId}`}
                className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
              >
                Ver Proposta #{event.proposalId} →
              </Link>
            )}

            {/* Additional Metadata */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                {Object.entries(event.metadata).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="font-medium capitalize">{key}:</span>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
