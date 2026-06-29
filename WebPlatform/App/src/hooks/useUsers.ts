import { useState, useCallback } from 'react';
import type{ User, UserFilters } from '../types/admin';
import adminApi from '../services/adminApi';

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const fetchUsers = useCallback(async (filters?: UserFilters) => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAllUsers(filters);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserById = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      const user = await adminApi.getUserById(userId);
      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user';
      setError(message);
      console.error('Error fetching user:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserStatus = useCallback(async (userId: string, status: 'active' | 'inactive') => {
    try {
      setLoading(true);
      setError(null);
      const updatedUser = await adminApi.updateUserStatus(userId, status);
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      return updatedUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user status';
      setError(message);
      console.error('Error updating user status:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [users]);

  const approveDoctorRegistration = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      const approvedUser = await adminApi.approveDoctorRegistration(userId);
      setUsers(users.map(u => u.id === userId ? approvedUser : u));
      return approvedUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve registration';
      setError(message);
      console.error('Error approving registration:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [users]);

  const rejectDoctorRegistration = useCallback(async (userId: string, reason?: string) => {
    try {
      setLoading(true);
      setError(null);
      const rejectedUser = await adminApi.rejectDoctorRegistration(userId, reason);
      setUsers(users.map(u => u.id === userId ? rejectedUser : u));
      return rejectedUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject registration';
      setError(message);
      console.error('Error rejecting registration:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [users]);

  const assignSpecializationToDoctor = useCallback(async (userId: string, specializationId: string) => {
    try {
      setLoading(true);
      setError(null);
      const updatedUser = await adminApi.assignSpecializationToDoctor(userId, specializationId);
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      return updatedUser;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign specialization';
      setError(message);
      console.error('Error assigning specialization:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [users]);

  return {
    users,
    loading,
    error,
    pagination,
    fetchUsers,
    getUserById,
    updateUserStatus,
    approveDoctorRegistration,
    rejectDoctorRegistration,
    assignSpecializationToDoctor
  };
};

export default useUsers;
