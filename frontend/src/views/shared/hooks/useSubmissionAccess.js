import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../../../api';
import { createRealtimeClient } from '../../../utils/realtimeClient';

export default function useSubmissionAccess(userId) {
  const [access, setAccess] = useState({ offices: [], departments: [] });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/account-access/me/summary');
      const data = await response.json();
      if (response.ok) setAccess({ offices: data.offices || [], departments: data.departments || [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return undefined;
    const socket = createRealtimeClient(API_BASE_URL, { secure: true, reconnection: true });
    const subscribe = () => {
      socket.emit('join-user-room', userId);
      socket.emit('join-submission-overview-rooms');
    };
    const refreshAccess = () => {
      socket.emit('join-submission-overview-rooms');
      refresh();
    };
    socket.on('connect', subscribe);
    socket.on('account-access-updated', refreshAccess);
    return () => socket.disconnect();
  }, [refresh, userId]);

  return { ...access, loading, refresh };
}
