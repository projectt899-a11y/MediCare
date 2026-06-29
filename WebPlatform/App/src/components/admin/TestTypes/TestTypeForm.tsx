import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';

interface TestType {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
}

interface TestTypeFormProps {
  testType: TestType | null;
  onClose: () => void;
}

const TestTypeForm: React.FC<TestTypeFormProps> = ({ testType, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Active' as 'Active' | 'Inactive',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (testType) {
      setFormData({
        name: testType.name,
        description: testType.description || '',
        status: testType.status,
      });
    }
  }, [testType]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.name.trim()) {
      setError('Test type name is required');
      return;
    }
    try {
      setLoading(true);
      if (testType) {
        await api.put(`/admin/test-types/${testType.id}`, formData);
      } else {
        await api.post('/admin/test-types', formData);
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{testType ? 'Edit Test Type' : 'Add Test Type'}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="specialization-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Test Type Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Blood Test"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter test type description"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <><i className="fa-solid fa-floppy-disk"></i> Saving...</>
              ) : testType ? (
                <><i className="fa-solid fa-pen-to-square"></i> Update</>
              ) : (
                <><i className="fa-solid fa-floppy-disk"></i> Create</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TestTypeForm;
