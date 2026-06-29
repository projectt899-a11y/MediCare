import { useState, useCallback } from 'react';
import type { DashboardStats } from '../types/admin';
import adminApi from '../services/adminApi';

export const useDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [caseStats, setCaseStats] = useState<any>(null);
  const [labTestStats, setLabTestStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAllStatistics();
      setStats(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch statistics';
      setError(message);
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getUserStatistics();
      setUserStats(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user statistics';
      setError(message);
      console.error('Error fetching user statistics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCaseStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getCaseStatistics();
      setCaseStats(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch case statistics';
      setError(message);
      console.error('Error fetching case statistics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLabTestStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getLabTestStatistics();
      setLabTestStats(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch lab test statistics';
      setError(message);
      console.error('Error fetching lab test statistics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [allStats, userSts, caseSts, labSts] = await Promise.all([
        adminApi.getAllStatistics(),
        adminApi.getUserStatistics(),
        adminApi.getCaseStatistics(),
        adminApi.getLabTestStatistics()
      ]);
      setStats(allStats.data);
      setUserStats(userSts.data);
      setCaseStats(caseSts.data);
      setLabTestStats(labSts.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data';
      setError(message);
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    userStats,
    caseStats,
    labTestStats,
    loading,
    error,
    fetchAllStatistics,
    fetchUserStatistics,
    fetchCaseStatistics,
    fetchLabTestStatistics,
    fetchDashboardData
  };
};

export default useDashboard;
