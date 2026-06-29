import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import XRayAnalysisSection from './XRayAnalysisSection';
import PatientAssignmentModal from './PatientAssignmentModal';
import '../../styles/patientCaseDetails.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PatientCaseDetail = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [patient, setPatient] = useState<any>(null);
  const [treatmentPlan, setTreatmentPlan] = useState<any[]>([]);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [labReports, setLabReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [treatmentForms, setTreatmentForms] = useState([{ medication_name: '', dosage: '', frequency: '1x daily', meal_timing: 'After meal', notes: '' }]);
  const [savingTreatment, setSavingTreatment] = useState(false);

  // Nurse assignment modal state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignedNurses, setAssignedNurses] = useState<any[]>([]);
  const [loadingNurses, setLoadingNurses] = useState(false);

  // Lab request modal state
  const [showLabModal, setShowLabModal] = useState(false);
  const [labs, setLabs] = useState<any[]>([]);
  const [testTypes, setTestTypes] = useState<any[]>([]);
  const [labForm, setLabForm] = useState({ labId: '', testTypeId: '', priority: 'Normal', doctorNotes: '' });
  const [labFormErrors, setLabFormErrors] = useState<Record<string, string>>({});
  const [submittingLab, setSubmittingLab] = useState(false);
  const [labSuccess, setLabSuccess] = useState('');
  const [patientLabRequests, setPatientLabRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchPatientCase = async () => {
      try {
        setLoading(true);
        const [patientRes, treatmentRes, diagnosesRes, labRes] = await Promise.all([
          api.get(`/doctor/patients/${patientId}`),
          api.get(`/doctor/treatment-plan/${patientId}`),
          api.get(`/doctor/diagnoses/${patientId}`),
          api.get(`/doctor/patient-lab-history/${patientId}`)
        ]);
        setPatient(patientRes.data);
        setTreatmentPlan(treatmentRes.data || []);
        setDiagnoses(diagnosesRes.data || []);
        setLabReports(labRes.data || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load patient case');
      } finally {
        setLoading(false);
      }
    };

    if (patientId) fetchPatientCase();
  }, [patientId]);

  useEffect(() => {
    if (patientId && accessToken) fetchPatientLabRequests();
  }, [patientId, accessToken]);

  useEffect(() => {
    if (patientId && accessToken) fetchAssignedNurses();
  }, [patientId, accessToken]);

  const fetchAssignedNurses = async () => {
    try {
      setLoadingNurses(true);
      const response = await fetch(`http://localhost:5000/api/doctor/patient-nurses/${patientId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assigned nurses');
      }

      const data = await response.json();
      setAssignedNurses(data.data?.nurses || []);
    } catch (err) {
      console.error('Error fetching assigned nurses:', err);
    } finally {
      setLoadingNurses(false);
    }
  };

  const fetchPatientLabRequests = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/labs/doctor/requests`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      const raw = data.data || [];
      const filtered = raw
        .filter((r: any) => r.patientId === patientId || r.patient_id === patientId)
        .map((r: any) => ({
          id: r.id,
          test_type: r.testTypeName || r.test_type || '—',
          lab_name: r.labName || r.lab_name || '—',
          status: r.status,
          priority: r.priority,
          created_at: r.createdAt || r.created_at,
        }));
      setPatientLabRequests(filtered);
    } catch (err) {
      console.error('Failed to fetch patient lab requests:', err);
    }
  };

  const handleRequestLabTest = async () => {
    setShowLabModal(true);
    setLabSuccess('');
    setLabFormErrors({});
    // Fetch labs and test types if not loaded
    if (labs.length === 0) {
      try {
        const [labsRes, typesRes] = await Promise.all([
          fetch(`${API_BASE}/labs/approved`, { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch(`${API_BASE}/labs/test-types`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        ]);
        const labsData = await labsRes.json();
        const typesData = await typesRes.json();
        setLabs(labsData.data || []);
        setTestTypes(typesData.data || []);
      } catch (err) {
        console.error('Failed to load labs/test types:', err);
      }
    }
  };

  const handleSubmitLabRequest = async () => {
    const errors: Record<string, string> = {};
    if (!labForm.labId) errors.labId = 'Please select a lab';
    if (!labForm.testTypeId) errors.testTypeId = 'Please select a test type';
    setLabFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmittingLab(true);
    try {
      const res = await fetch(`${API_BASE}/labs/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          labId: labForm.labId,
          testTypeId: labForm.testTypeId,
          patientId,
          priority: labForm.priority,
          doctorNotes: labForm.doctorNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to create request');
      setLabSuccess('Lab test requested successfully!');
      setLabForm({ labId: '', testTypeId: '', priority: 'Normal', doctorNotes: '' });
      fetchPatientLabRequests();
      setTimeout(() => { setShowLabModal(false); setLabSuccess(''); }, 2000);
    } catch (err: any) {
      setLabFormErrors({ submit: err.message });
    } finally {
      setSubmittingLab(false);
    }
  };

  const handleAddTreatment = async () => {
    const valid = treatmentForms.filter(t => t.medication_name.trim() && t.frequency);
    if (valid.length === 0) return;
    try {
      setSavingTreatment(true);
      const results = await Promise.all(
        valid.map(t => api.post('/doctor/treatment-plan', {
          patient_id: patientId,
          medication_name: t.medication_name.trim(),
          dosage: t.dosage.trim() || null,
          frequency: t.frequency,
          meal_timing: t.meal_timing,
          notes: t.notes.trim() || null
        }))
      );
      setTreatmentPlan(prev => [...prev, ...results.map(r => r.data)]);
      setTreatmentForms([{ medication_name: '', dosage: '', frequency: '1x daily', meal_timing: 'After meal', notes: '' }]);
      setShowTreatmentModal(false);
    } catch (err) {
      console.error('Add treatment plan error:', err);
    } finally {
      setSavingTreatment(false);
    }
  };

  const handleDeleteTreatment = async (treatmentId: string) => {
    try {
      await api.delete(`/doctor/treatment-plan/${treatmentId}`);
      setTreatmentPlan(prev => prev.filter(t => t.id !== treatmentId));
    } catch (err) {
      console.error('Delete treatment plan error:', err);
    }
  };

  const refreshDiagnoses = async () => {
    try {
      const res = await api.get(`/doctor/diagnoses/${patientId}`);
      setDiagnoses(res.data || null);
    } catch (err) {
      console.error('Refresh diagnoses error:', err);
    }
  };

  const handleGoBack = () => {
    navigate('/doctor/patients');
  };

  const handleAssignNurse = async (nurseIds: string[]) => {
    try {
      // Assign each nurse to the patient
      const promises = nurseIds.map(nurseId =>
        fetch('http://localhost:5000/api/doctor/assign-patient-to-nurse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            nurse_id: nurseId,
            patient_id: patientId
          })
        })
      );

      const responses = await Promise.all(promises);

      // Check if all requests were successful
      for (const response of responses) {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to assign nurse');
        }
      }

      console.log('✅ Patient assigned to nurses successfully');
      // Refresh the assigned nurses list
      await fetchAssignedNurses();
      return responses;
    } catch (err: any) {
      console.error('❌ Error assigning nurses:', err.message);
      throw err;
    }
  };

  const handleUnassignNurse = async (nurseId: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/doctor/unassign-patient-from-nurse', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          nurse_id: nurseId,
          patient_id: patientId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unassign nurse');
      }

      console.log('✅ Nurse unassigned successfully');
      // Refresh the assigned nurses list
      await fetchAssignedNurses();
    } catch (err: any) {
      console.error('❌ Error unassigning nurse:', err.message);
      alert('Failed to unassign nurse: ' + err.message);
    }
  };

  if (loading) return <div className='loading'>Loading patient details...</div>;
  if (error) return <div className='error'> Error: </div>;
  if (!patient) return <div className='error'>Patient not found</div>;

  return (
    <div className="patient-case-detail">
      <div className="case-header">
        <button className="back-button" onClick={handleGoBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Patients
        </button>
        <h1>Patient Case: {patient.name}</h1>
      </div>
      
      <div className="case-content">
        <div className="patient-info-card">
          <h2>Patient Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Age:</span>
              <span className="info-value">{patient.age}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Gender:</span>
              <span className="info-value">{patient.gender || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Phone:</span>
              <span className="info-value">{patient.phone ? patient.phone.replace('+20', '0') : 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Blood Type:</span>
              <span className="info-value">{patient.bloodType || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Allergies:</span>
              <span className="info-value">{patient.allergies || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Last Visit:</span>
              <span className="info-value">{patient.lastVisit || 'N/A'}</span>
            </div>
          </div>
          <button className="assign-nurse-button" onClick={() => setShowAssignmentModal(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
              <path d="M16 11h6"></path>
              <path d="M19 8v6"></path>
            </svg>
            Assign Nurse
          </button>
        </div>

        {/* Assigned Nurses Section */}
        <div className="assigned-nurses-card">
          <h2>Assigned Nurses</h2>
          {loadingNurses ? (
            <div className="loading-message">Loading assigned nurses...</div>
          ) : assignedNurses.length === 0 ? (
            <div className="no-nurses-message">No nurses assigned yet</div>
          ) : (
            <div className="nurses-list">
              {assignedNurses.map(nurse => (
                <div key={nurse.id} className="nurse-item">
                  <div className="nurse-info">
                    <div className="nurse-name">{nurse.full_name}</div>
                    <div className="nurse-phone">{nurse.phone_number}</div>
                    <div className="nurse-assigned-date">
                      Assigned: {new Date(nurse.assignment_date).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    className="unassign-button"
                    onClick={() => {
                      if (confirm(`Remove ${nurse.full_name} from this patient?`)) {
                        handleUnassignNurse(nurse.id);
                      }
                    }}
                    title="Remove this nurse"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 4 21 4 23 6 23 20"></polyline>
                      <path d="M23 20a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="case-sections">
          <div className="medical-history-section">
            <h2>Medical History</h2>
            <div className="history-list">
              {diagnoses ? (
                <div className="history-item">
                  <span className="history-date">{new Date(diagnoses.created_at).toLocaleDateString()}</span>
                  <p>{diagnoses.diagnosis}</p>
                </div>
              ) : (
                <p style={{ color: '#999' }}>No History recorded yet.</p>
              )}
            </div>
          </div>

          <XRayAnalysisSection patientId={patientId!} doctorId={patient?.id || ''} onDiagnosisAdded={refreshDiagnoses} />

          {/* Intelligent Lab Report Section */}
          <div className="treatment-section">
            <h2>Lab Reports</h2>
            <div className="treatment-content">
              {loading ? (
                <p style={{ color: '#999' }}>Loading lab reports...</p>
              ) : labReports.length === 0 ? (
                <p style={{ color: '#999' }}>No lab reports available yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {labReports.map(report => (
                    <div 
                      key={report.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        backgroundColor: '#fafafa',
                        borderLeft: '4px solid #3498db',
                        alignItems: 'flex-start'
                      }}
                    >
                      {/* Image Section - With Date Below */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        {report.image_url ? (
                          <>
                            <img 
                              src={report.image_url} 
                              alt="Lab Report" 
                              crossOrigin="anonymous"
                              style={{ 
                                width: '180px', 
                                height: '180px', 
                                borderRadius: '8px',
                                objectFit: 'cover',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              onClick={() => window.open(report.image_url, '_blank')}
                              title="Click to view full size"
                            />
                          </>
                        ) : (
                          <div style={{ 
                            width: '180px', 
                            height: '180px', 
                            backgroundColor: '#f0f0f0',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#999',
                            flexDirection: 'column',
                            fontSize: '0.9rem',
                            textAlign: 'center',
                            padding: '1rem'
                          }}>
                            <div style={{ marginBottom: '0.5rem' }}>📋</div>
                            <small>No Image Available</small>
                          </div>
                        )}
                        <small style={{ color: '#999', fontSize: '0.85rem', textAlign: 'center' }}>
                          {new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </small>
                      </div>

                      {/* Diagnosis Section */}
                      <div style={{ width: '100%' }}>
                        <p style={{ 
                          margin: 0, 
                          lineHeight: '1.7', 
                          color: '#333',
                          fontSize: '0.95rem'
                        }}>
                          {report.diagnosis}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          
          <div className="treatment-section">
            <div className="section-header">
              <h2>Treatment Plan</h2>
            </div>
            <div className="treatment-content">              {treatmentPlan.length === 0 ? (
                <p style={{ color: '#999' }}>No medications prescribed yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e0e0e0', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Medication</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Dosage</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Frequency</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Meal Timing</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Notes</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {treatmentPlan.map(treatment => (
                      <tr key={treatment.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{treatment.medication_name}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{treatment.dosage || '-'}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{treatment.frequency || '-'}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{treatment.meal_timing || '-'}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{treatment.notes || '-'}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <button onClick={() => handleDeleteTreatment(treatment.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c' }} title="Remove">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <button className="edit-treatmentPlan-btn" onClick={() => setShowTreatmentModal(true)}>
              + Add Medication
            </button>
          </div>

          <div className="treatment-section">
            <h2>Lab Tests</h2>
            <div className="treatment-content">
              {patientLabRequests.length === 0 ? (
                <p style={{ color: '#999', marginBottom: '1rem' }}>No lab tests requested yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e0e0e0', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Test Type</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Lab</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Priority</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Date</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientLabRequests.map(req => (
                      <tr key={req.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{req.test_type}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{req.lab_name}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <span style={{ color: req.priority === 'Urgent' ? '#e74c3c' : '#27ae60', fontWeight: 500 }}>
                            {req.priority}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                            backgroundColor: req.status === 'Completed' ? '#d1e7dd' : req.status === 'Pending' ? '#fff3cd' : req.status === 'Processing' ? '#cfe2ff' : '#f8d7da',
                            color: req.status === 'Completed' ? '#0f5132' : req.status === 'Pending' ? '#664d03' : req.status === 'Processing' ? '#084298' : '#721c24',
                          }}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <button className="lab-test-button" onClick={handleRequestLabTest}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2v6"></path>
                <path d="M15 2v6"></path>
                <path d="M12 2v6"></path>
                <path d="M5 9h14l-1 12H6L5 9z"></path>
                <path d="M8 9V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4"></path>
              </svg>
              Request Lab Tests
            </button>
          </div>
        </div>
      </div>

      {/* Lab Request Modal */}
      {showLabModal && (
        <div className="modal-overlay" onClick={() => setShowLabModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>Request Lab Test</h3>

            {labSuccess && (
              <div style={{ background: '#d1e7dd', color: '#0f5132', padding: '0.75rem', borderRadius: '6px', marginTop: '1rem' }}>
                ✓ {labSuccess}
              </div>
            )}

            {labFormErrors.submit && (
              <div style={{ background: '#f8d7da', color: '#721c24', padding: '0.75rem', borderRadius: '6px', marginTop: '1rem' }}>
                {labFormErrors.submit}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Lab *</label>
                <select
                  value={labForm.labId}
                  onChange={e => setLabForm(p => ({ ...p, labId: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', border: `1px solid ${labFormErrors.labId ? '#e74c3c' : '#ddd'}`, borderRadius: '6px' }}
                >
                  <option value="">Select a lab</option>
                  {labs.map(lab => (
                    <option key={lab.id} value={lab.id}>{lab.name} {lab.lab_type ? `(${lab.lab_type})` : ''}</option>
                  ))}
                </select>
                {labFormErrors.labId && <span style={{ color: '#e74c3c', fontSize: '0.8rem' }}>{labFormErrors.labId}</span>}
                {labs.length === 0 && <span style={{ color: '#999', fontSize: '0.8rem' }}>No approved labs available</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Test Type *</label>
                <select
                  value={labForm.testTypeId}
                  onChange={e => setLabForm(p => ({ ...p, testTypeId: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', border: `1px solid ${labFormErrors.testTypeId ? '#e74c3c' : '#ddd'}`, borderRadius: '6px' }}
                >
                  <option value="">Select a test type</option>
                  {testTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {labFormErrors.testTypeId && <span style={{ color: '#e74c3c', fontSize: '0.8rem' }}>{labFormErrors.testTypeId}</span>}
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Priority</label>
                <select
                  value={labForm.priority}
                  onChange={e => setLabForm(p => ({ ...p, priority: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #ddd', borderRadius: '6px' }}
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Doctor Notes (optional)</label>
                <textarea
                  value={labForm.doctorNotes}
                  onChange={e => setLabForm(p => ({ ...p, doctorNotes: e.target.value }))}
                  placeholder="Add any clinical notes for the lab..."
                  rows={3}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid #ddd', borderRadius: '6px', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setShowLabModal(false); setLabForm({ labId: '', testTypeId: '', priority: 'Normal', doctorNotes: '' }); setLabFormErrors({}); }}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSubmitLabRequest} disabled={submittingLab}>
                {submittingLab ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTreatmentModal && (
        <div className="modal-overlay" onClick={() => setShowTreatmentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Add Medication</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              {treatmentForms.map((treatment, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={treatment.medication_name}
                    onChange={e => setTreatmentForms(prev => prev.map((t, i) => i === idx ? { ...t, medication_name: e.target.value } : t))}
                    placeholder="Medication name"
                    style={{ flex: '2', minWidth: '120px', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <input
                    type="text"
                    value={treatment.dosage}
                    onChange={e => setTreatmentForms(prev => prev.map((t, i) => i === idx ? { ...t, dosage: e.target.value } : t))}
                    placeholder="Dosage (e.g., 500mg)"
                    style={{ flex: '1', minWidth: '100px', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  <select
                    value={treatment.frequency}
                    onChange={e => setTreatmentForms(prev => prev.map((t, i) => i === idx ? { ...t, frequency: e.target.value } : t))}
                    style={{ flex: '1', minWidth: '110px', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="1x daily">1x daily</option>
                    <option value="2x daily">2x daily</option>
                    <option value="3x daily">3x daily</option>
                    <option value="Every 8 hours">Every 8 hours</option>
                    <option value="Every 12 hours">Every 12 hours</option>
                    <option value="As needed">As needed</option>
                  </select>
                  <select
                    value={treatment.meal_timing}
                    onChange={e => setTreatmentForms(prev => prev.map((t, i) => i === idx ? { ...t, meal_timing: e.target.value } : t))}
                    style={{ flex: '1', minWidth: '130px', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="Before meal">Before meal</option>
                    <option value="After meal">After meal</option>
                    <option value="Empty stomach">Empty stomach</option>
                    <option value="With meal">With meal</option>
                  </select>
                  <input
                    type="text"
                    value={treatment.notes}
                    onChange={e => setTreatmentForms(prev => prev.map((t, i) => i === idx ? { ...t, notes: e.target.value } : t))}
                    placeholder="Notes (optional)"
                    style={{ flex: '1', minWidth: '100px', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                  {treatmentForms.length > 1 && (
                    <button
                      onClick={() => setTreatmentForms(prev => prev.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: '1.2rem', lineHeight: 1 }}
                    >×</button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setTreatmentForms(prev => [...prev, { medication_name: '', dosage: '', frequency: '1x daily', meal_timing: 'After meal', notes: '' }])}
                style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed #3498db', color: '#3498db', padding: '0.3rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                + more
              </button>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setShowTreatmentModal(false); setTreatmentForms([{ medication_name: '', dosage: '', frequency: '1x daily', meal_timing: 'After meal', notes: '' }]); }}>Cancel</button>
              <button className="btn-save" onClick={handleAddTreatment} disabled={savingTreatment}>
                {savingTreatment ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nurse Assignment Modal */}
      {showAssignmentModal && (
        <PatientAssignmentModal
          patientId={patientId!}
          patientName={patient?.name || 'Unknown'}
          onAssign={handleAssignNurse}
          onClose={() => setShowAssignmentModal(false)}
        />
      )}
    </div>
  );
};

export default PatientCaseDetail;