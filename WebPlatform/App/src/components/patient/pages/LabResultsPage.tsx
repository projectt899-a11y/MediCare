import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../store/authStore';
import '../../../styles/patientDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface LabResult {
  id: string;
  lab_request_id: string;
  test_type: string;
  lab_name: string;
  result_type: 'File Upload' | 'Manual Entry';
  file_path: string | null;
  file_name: string | null;
  result_values: Record<string, any> | null;
  doctor_visible_notes: string | null;
  submitted_at: string;
}

const LabResultsPage: React.FC = () => {
  const { accessToken } = useAuthStore();
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/labs/patient/results`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch results');
      setResults(data.data?.results || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleViewResult = async (result: LabResult) => {
    if (result.result_type === 'File Upload' && result.file_path) {
      try {
        const res = await fetch(`${API_BASE}/labs/results/${result.id}/download`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to get download link');
        window.open(data.data?.signedUrl, '_blank');
      } catch (err: any) {
        alert(err.message);
      }
    } else if (result.result_type === 'Manual Entry' && result.result_values) {
      alert(JSON.stringify(result.result_values, null, 2));
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });

  return (
    <>
      <div className="page-header">
        <h1>Lab Results</h1>
        <p>View your completed lab test results.</p>
      </div>

      <div className="card">
        {loading ? (
          <p style={{ padding: '1rem', color: '#888' }}>Loading results...</p>
        ) : error ? (
          <p style={{ padding: '1rem', color: '#c0392b' }}>{error}</p>
        ) : results.length === 0 ? (
          <p style={{ padding: '1rem', color: '#888', textAlign: 'center' }}>
            No lab results available yet.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Lab</th>
                <th>Result Date</th>
                <th>Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map(result => (
                <tr key={result.id}>
                  <td>{result.test_type}</td>
                  <td>{result.lab_name}</td>
                  <td>{formatDate(result.submitted_at)}</td>
                  <td style={{ maxWidth: '200px', fontSize: '0.85rem', color: '#555' }}>
                    {result.doctor_visible_notes || '—'}
                  </td>
                  <td>
                    <button
                      onClick={() => handleViewResult(result)}
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

export default LabResultsPage;
