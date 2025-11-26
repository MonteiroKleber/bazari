import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Zap,
} from 'lucide-react';
import { useEscrowEvents, EscrowEvent } from '@/hooks/blockchain/useEscrow';
import { cn } from '@/lib/utils';

/**
 * EscrowEventsLog - Real-time event timeline for escrow
 *
 * Shows:
 * - Timeline of all escrow events (Created, Released, Refunded, Disputed, AutoReleased)
 * - Real-time updates via WebSocket
 * - Visual icons for each event type
 * - Block numbers and timestamps
 *
 * @example
 * <EscrowEventsLog orderId="ORD-123" />
 */

interface EscrowEventsLogProps {
  /** Order ID to filter events */
  orderId?: string;

  /** Custom className */
  className?: string;

  /** Compact mode (smaller, no card wrapper) */
  compact?: boolean;
}

export function EscrowEventsLog({
  orderId,
  className,
  compact = false,
}: EscrowEventsLogProps) {
  const events = useEscrowEvents(orderId);

  // Sort events by timestamp (newest first)
  const sortedEvents = [...events].sort((a, b) => b.timestamp - a.timestamp);

  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        {sortedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No events yet. Waiting for updates...
          </p>
        ) : (
          sortedEvents.map((event, index) => (
            <EventItem key={`${event.blockNumber}-${index}`} event={event} />
          ))
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Event Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No events yet. Waiting for updates...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedEvents.map((event, index) => (
              <EventItem
                key={`${event.blockNumber}-${index}`}
                event={event}
                isLast={index === sortedEvents.length - 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * EventItem - Single event in the timeline
 */
function EventItem({
  event,
  isLast = false,
}: {
  event: EscrowEvent;
  isLast?: boolean;
}) {
  const config = getEventConfig(event.type);

  return (
    <div className="flex gap-3 relative">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-[18px] top-10 bottom-0 w-0.5 bg-border" />
      )}

      {/* Icon */}
      <div
        className={cn(
          'rounded-full p-2 h-fit z-10',
          config.bgColor
        )}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h4 className="font-semibold text-sm">{config.title}</h4>
            <p className="text-xs text-muted-foreground">
              {formatTimestamp(event.timestamp)}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            #{event.blockNumber.toLocaleString()}
          </Badge>
        </div>

        {/* Event-specific data */}
        {config.renderData && (
          <div className="mt-2 text-sm text-muted-foreground">
            {config.renderData(event.data)}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Get configuration for each event type
 */
function getEventConfig(eventType: EscrowEvent['type']) {
  const configs = {
    Created: {
      title: 'Escrow Created',
      icon: <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      renderData: (data: any) => (
        <p>
          Buyer: <span className="font-mono text-xs">{data.buyer}</span>
          <br />
          Seller: <span className="font-mono text-xs">{data.seller}</span>
          <br />
          Amount: <span className="font-semibold">{data.amount} BZR</span>
        </p>
      ),
    },
    Released: {
      title: 'Funds Released',
      icon: <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />,
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      renderData: (data: any) => (
        <p>
          Funds transferred to seller
          {data.releasedBy && (
            <>
              <br />
              Released by: <span className="font-mono text-xs">{data.releasedBy}</span>
            </>
          )}
        </p>
      ),
    },
    Refunded: {
      title: 'Buyer Refunded',
      icon: <XCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      renderData: (data: any) => (
        <p>
          Funds returned to buyer
          {data.refundedBy && (
            <>
              <br />
              Refunded by DAO member:{' '}
              <span className="font-mono text-xs">{data.refundedBy}</span>
            </>
          )}
        </p>
      ),
    },
    Disputed: {
      title: 'Dispute Initiated',
      icon: <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />,
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      renderData: (data: any) => (
        <div>
          <p className="font-medium text-red-700 dark:text-red-300">
            {data.reason}
          </p>
          {data.initiatedBy && (
            <p className="mt-1">
              Initiated by: <span className="font-mono text-xs">{data.initiatedBy}</span>
            </p>
          )}
        </div>
      ),
    },
    AutoReleased: {
      title: 'Auto-Released',
      icon: <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      renderData: () => (
        <p>
          Funds automatically released to seller after 7 days
        </p>
      ),
    },
  };

  return configs[eventType] || configs.Created;
}

/**
 * Format timestamp to human-readable string
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Relative time for recent events
  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }

  // Absolute time for older events
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}
