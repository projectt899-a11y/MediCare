import React, { useState, useEffect } from "react";
import api from '../../../lib/api';

interface Specialization {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  doctor_count: number;
}

interface SpecializationFormProps {
  specialization: Specialization | null;
  onClose: () => void;
}
const SpecializationForm: React.FC<SpecializationFormProps> = ({
  specialization,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (specialization) {
      setFormData({
        name: specialization.name,
        description: specialization.description,
        is_active: specialization.is_active,
      });
    }
  }, [specialization]);
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.name.trim()) {
      setError("Specialization name is required");
      return;
    }
    try {
      setLoading(true);

      if (specialization) {
        // Update existing
        await api.put(`/admin/specializations/${specialization.id}`, formData);
      } else {
        // Create new
        await api.post('/admin/specializations', formData);
      }

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {specialization ? "Edit Specialization" : "Add Specialization"}
          </h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="specialization-form">
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="name">Specialization Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Cardiology"
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
              placeholder="Enter specialization description"
              rows={4}
            />
          </div>

          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
            />
            <label htmlFor="is_active">Active</label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <i className="fa-solid fa-floppy-disk"></i> Saving...
                </>
              ) : specialization ? (
                <>
                  <i className="fa-solid fa-pen-to-square"></i> Update
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i> Create
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SpecializationForm;
