import { useState, useCallback } from 'react';
import type { Specialization, SpecializationFormData } from '../types/admin';
import adminApi from '../services/adminApi';

export const useSpecializations = () => {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSpecializations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAllSpecializations();
      setSpecializations(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch specializations';
      setError(message);
      console.error('Error fetching specializations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSpecialization = useCallback(async (data: SpecializationFormData) => {
    try {
      setLoading(true);
      setError(null);
      const newSpecialization = await adminApi.createSpecialization(data);
      setSpecializations([...specializations, newSpecialization]);
      return newSpecialization;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create specialization';
      setError(message);
      console.error('Error creating specialization:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [specializations]);

  const updateSpecialization = useCallback(async (specializationId: string, data: SpecializationFormData) => {
    try {
      setLoading(true);
      setError(null);
      const updatedSpecialization = await adminApi.updateSpecialization(specializationId, data);
      setSpecializations(specializations.map(s => s.id === specializationId ? updatedSpecialization : s));
      return updatedSpecialization;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update specialization';
      setError(message);
      console.error('Error updating specialization:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [specializations]);

  const deleteSpecialization = useCallback(async (specializationId: string) => {
    try {
      setLoading(true);
      setError(null);
      await adminApi.deleteSpecialization(specializationId);
      setSpecializations(specializations.filter(s => s.id !== specializationId));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete specialization';
      setError(message);
      console.error('Error deleting specialization:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [specializations]);

  return {
    specializations,
    loading,
    error,
    fetchSpecializations,
    createSpecialization,
    updateSpecialization,
    deleteSpecialization
  };
};

export default useSpecializations;
