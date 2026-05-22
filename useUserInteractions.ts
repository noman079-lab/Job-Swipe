import { useState, useEffect, useCallback } from 'react';
import { userService } from '../services/userService';
import { useAuth } from './useAuth';

export const useUserInteractions = () => {
  const { user, apiFetch } = useAuth();
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInteractions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { appliedIds, savedIds } = await userService.getUserInteractions(apiFetch);
      setAppliedJobIds(appliedIds || []);
      setSavedJobIds(savedIds || []);
    } catch (err) {
      console.error("Failed to fetch user interactions:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchInteractions();
    } else {
      setAppliedJobIds([]);
      setSavedJobIds([]);
    }
  }, [user, fetchInteractions]);

  return {
    appliedJobIds,
    savedJobIds,
    loading,
    refreshInteractions: fetchInteractions
  };
};
