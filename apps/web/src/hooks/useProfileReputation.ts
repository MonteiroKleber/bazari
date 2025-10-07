import { useEffect, useState } from 'react';
import { apiHelpers } from '../lib/api';

interface ReputationEvent {
  eventCode: string;
  delta: number;
  newTotal: number;
  createdAt: string;
}

export function useProfileReputation(handle: string) {
  const [events, setEvents] = useState<ReputationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const result = await apiHelpers.getProfileReputation(handle);
        if (!active) return;
        setEvents(result.events);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [handle]);

  return { events, loading, error };
}
