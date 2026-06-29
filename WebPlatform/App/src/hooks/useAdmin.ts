import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAdminAuth = useCallback(() => {
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');

    if (!token || userRole !== 'admin') {
      navigate('/login');
      return false;
    }
    return true;
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    navigate('/login');
  }, [navigate]);

  const handleError = useCallback((err: any) => {
    const message = err instanceof Error ? err.message : 'An error occurred';
    setError(message);
    console.error('Admin error:', err);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    setLoading,
    error,
    setError,
    handleError,
    clearError,
    checkAdminAuth,
    logout
  };
};

export default useAdmin;
