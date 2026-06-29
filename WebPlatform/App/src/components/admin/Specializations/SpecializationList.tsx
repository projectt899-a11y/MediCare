import React, { useEffect, useState } from "react";
import api from '../../../lib/api';
import SpecializationTable from "./SpecializationTable";
import SpecializationForm from "./SpecializationForm";
import "../../../styles/adminSpecializations.css";

interface Specialization {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  doctor_count: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const SpecializationList: React.FC = () => {
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specialization | null>(null);

  useEffect(() => {
    fetchSpecializations();
  }, [pagination.page]);

  const fetchSpecializations = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/admin/specializations?page=${pagination.page}&limit=${pagination.limit}`
      );
      // Backend returns { success: true, data: { specializations: [...], pagination: {...} } }
      const data = response.data.data || response.data;
      setSpecializations(data.specializations || []);
      setPagination(data.pagination || pagination);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "An error occurred");
      console.error("Error fetching specializations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingSpec(null);
    setShowForm(true);
  };

  const handleEdit = (spec: Specialization) => {
    setEditingSpec(spec);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSpec(null);
    fetchSpecializations();
  };

  const handlePageChange = (newPage: number) => {
    setPagination({ ...pagination, page: newPage });
  };

  return (
    <div className="specialization-list-page">
      <div className="page-header">
        <h2>Medical Specializations</h2>
        <button className="btn-primary" onClick={handleAddNew}>
          <i className="fa-solid fa-circle-plus"></i> Add Specialization
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-message">Loading specializations...</div>
      ) : (
        <>
          <SpecializationTable
            specializations={specializations}
            onEdit={handleEdit}
            onRefresh={fetchSpecializations}
          />

          {/* Pagination */}
          <div className="pagination">
            <button
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              {" "}
              ← Previous
            </button>

            <span className="page-info">
              Page {pagination.page} of {pagination.pages} ({pagination.total}{" "}
              total)
            </span>
            <button
              disabled={pagination.page === pagination.pages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next →
            </button>
          </div>
        </>
      )}
      {showForm && (
        <SpecializationForm
          specialization={editingSpec}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
};

export default SpecializationList;
