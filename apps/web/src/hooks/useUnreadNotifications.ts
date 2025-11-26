import { useState, useEffect } from 'react';
import { apiHelpers } from '@/lib/api';
import { isSessionActive } from '@/modules/auth';

export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadUnreadCount = async () => {
    if (!isSessionActive()) {
      setUnreadCount(0);
      return;
    }
    try {
      setLoading(true);
      const res: any = await apiHelpers.getNotifications({ limit: 1, unreadOnly: true });
      setUnreadCount(res.unreadCount || 0);
    } catch (error) {
      console.error('Error loading unread notifications count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return { unreadCount, loading, refresh: loadUnreadCount };
}
