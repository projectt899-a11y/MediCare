import React, { useEffect, useState } from 'react';
import api from '../../../lib/api';
import TestTypeForm from './TestTypeForm';
import TestTypeTable from './TestTypeTable';
import '../../../styles/adminSpecializations.css';

interface TestType {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
}

const TestTypeList: React.FC = () => {
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<TestType | null>(null);

  useEffect(() => {
    fetchTestTypes();
  }, []);

  const fetchTestTypes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/test-types');
      const data = response.data.data || response.data;
      setTestTypes(data.testTypes || data || []);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingType(null);
    setShowForm(true);
  };

  const handleEdit = (type: TestType) => {
    setEditingType(type);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingType(null);
    fetchTestTypes();
  };

  return (
    <div className="specialization-list-page">
      <div className="page-header">
        <h2>Lab Test Types</h2>
        <button className="btn-primary" onClick={handleAddNew}>
          <i className="fa-solid fa-circle-plus"></i> Add Test Type
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-message">Loading test types...</div>
      ) : (
        <TestTypeTable
          testTypes={testTypes}
          onEdit={handleEdit}
          onRefresh={fetchTestTypes}
        />
      )}

      {showForm && (
        <TestTypeForm
          testType={editingType}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
};

export default TestTypeList;
