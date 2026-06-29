import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import Icon from '../admin/Icon';

interface ReportExportButtonProps {
  followUpId: string;
  patientName: string;
}

const ReportExportButton: React.FC<ReportExportButtonProps> = ({
  followUpId,
  patientName
}) => {
  const accessToken = useAuthStore(state => state.accessToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportPDF = async () => {
    if (!accessToken) {
      setError('Authentication information not found');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:5000/api/nurses/follow-up-requests/${followUpId}/report`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export report');
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `follow-up-report-${patientName}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error exporting report:', err);
      setError(err.message || 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-button-container">
      <button
        className="export-btn"
        onClick={handleExportPDF}
        disabled={loading}
        title="Export follow-up report as PDF"
      >
        {loading ? 'Exporting...' : '📄 Export PDF'}
      </button>
      {error && (
        <div className="export-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default ReportExportButton;
