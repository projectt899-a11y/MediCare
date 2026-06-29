import React, { useState } from 'react';
import api from '../../../lib/api';

interface TestType {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
}

interface TestTypeTableProps {
  testTypes: TestType[];
  onEdit: (type: TestType) => void;
  onRefresh: () => void;
}

const TestTypeTable: React.FC<TestTypeTableProps> = ({ testTypes, onEdit, onRefresh }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleStatus = async (type: TestType) => {
    setTogglingId(type.id);
    try {
      const newStatus = type.status === 'Active' ? 'Inactive' : 'Active';
      await api.put(`/admin/test-types/${type.id}/status`, { status: newStatus });
      onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.error || err.message || 'Failed to update status'}`);
    } finally {
      setTogglingId(null);
    }
  };

  if (testTypes.length === 0) {
    return (
      <div className="specialization-table-container">
        <p style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
          No test types found. Click "Add Test Type" to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="specialization-table-container">
      <table className="specialization-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {testTypes.map((type) => (
            <tr key={type.id} className={type.status === 'Inactive' ? 'inactive-row' : ''}>
              <td className="name-cell">{type.name}</td>
              <td className="description-cell">{type.description || '—'}</td>
              <td>
                <span className={`status-badge ${type.status === 'Active' ? 'active' : 'inactive'}`}>
                  {type.status}
                </span>
              </td>
              <td className="actions-cell">
                <button
                  className="action-btn edit-btn"
                  onClick={() => onEdit(type)}
                  title="Edit test type"
                >
                  <i className="fa-solid fa-pen-to-square" style={{ color: 'rgb(30, 48, 80)' }}></i> Edit
                </button>
                <button
                  className="action-btn"
                  onClick={() => handleToggleStatus(type)}
                  disabled={togglingId === type.id}
                  title={type.status === 'Active' ? 'Deactivate' : 'Activate'}
                  style={{ color: type.status === 'Active' ? '#e67e22' : '#2ecc71' }}
                >
                  {togglingId === type.id ? '⏳' : type.status === 'Active' ? '⏸ Deactivate' : '▶ Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TestTypeTable;
