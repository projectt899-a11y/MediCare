import { useState, useCallback } from 'react';
import type { AuditLog, AuditLogFilters, Pagination } from '../types/admin';
import adminApi from '../services/adminApi';

export const useAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  const fetchAuditLogs = useCallback(async (filters?: AuditLogFilters) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAuditLogs(filters);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch audit logs';
      setError(message);
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAuditLogById = useCallback(async (logId: string) => {
    try {
      setLoading(true);
      setError(null);
      const log = await adminApi.getAuditLogById(logId);
      return log;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch audit log';
      setError(message);
      console.error('Error fetching audit log:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getResourceAuditLogs = useCallback(async (resourceType: string, resourceId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getResourceAuditLogs(resourceType, resourceId);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch resource audit logs';
      setError(message);
      console.error('Error fetching resource audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAdminAuditLogs = useCallback(async (adminId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAdminAuditLogs(adminId);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch admin audit logs';
      setError(message);
      console.error('Error fetching admin audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    logs,
    loading,
    error,
    pagination,
    fetchAuditLogs,
    getAuditLogById,
    getResourceAuditLogs,
    getAdminAuditLogs
  };
};

export default useAuditLogs;
