import React, { useState } from "react";
import api from '../../../lib/api';

interface Specialization {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  doctor_count: number;
}

interface SpecializationTableProps {
  specializations: Specialization[];
  onEdit: (spec: Specialization) => void;
  onRefresh: () => void;
}

const SpecializationTable: React.FC<SpecializationTableProps> = ({
  specializations,
  onEdit,
  onRefresh,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const handleDelete = async (id: string) => {
    if (
      !window.confirm("Are you sure you want to delete this specialization?")
    ) {
      return;
    }

    try {
      setDeletingId(id);
      await api.delete(`/admin/specializations/${id}`);
      onRefresh();
    } catch (err: any) {
      alert(
        `Error: ${err.response?.data?.error || err.message || "Failed to delete"}`
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="specialization-table-container">
      <table className="specialization-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Doctors</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {specializations.map((spec) => (
            <tr key={spec.id} className={!spec.is_active ? 'inactive-row' : ''}>
              <td className="name-cell">{spec.name}</td>
              <td className="description-cell">{spec.description || "-"}</td>
              <td className="doctor-count">
                <span className="badge">{spec.doctor_count}</span>
              </td>
              <td>
                <span
                  className={`status-badge ${spec.is_active ? "active" : "inactive"}`}
                >
                  {spec.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="actions-cell">
                <button
                  className="action-btn edit-btn"
                  onClick={() => onEdit(spec)}
                  title="Edit specialization"
                >
                  <i className="fa-solid fa-pen-to-square" style={{color: "rgb(30, 48, 80)"}}></i> Edit
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDelete(spec.id)}
                  disabled={deletingId === spec.id}
                  title="Delete specialization"
                >
                  {deletingId === spec.id ? "⏳" : "🗑️"} Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SpecializationTable;
