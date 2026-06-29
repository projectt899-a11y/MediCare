import React, { useState, useEffect } from 'react';
import Icon from '../sub-components/Icon';
import api from '../../../lib/api';
import '../../../styles/patientDashboard.css';

interface Diagnosis {
  id: string;
  diagnosis_text: string;
  created_at: string;
  doctor_name: string;
  specialization: string;
}

interface Pill {
  id: string;
  name: string;
  time: string;
  taken: boolean;
  frequency: string;
  meal_timing: string;
}

interface AIAnalysis {
  image_url: string;
  ai_diagnosis: string;
  created_at: string;
}

interface LabReport {
  id: string;
  diagnosis: string;
  image_url: string | null;
  created_at: string;
}

const MedicalRecord: React.FC = () => {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [pills, setPills] = useState<Pill[]>([]);
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysis | null>(null);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [diagRes, pillsRes, aiRes, labRes] = await Promise.all([
          api.get('/patient/diagnoses'),
          api.get('/patient/pills'),
          api.get('/patient/ai-analysis'),
          api.get('/patient/lab-history')
        ]);
        
        setDiagnoses(diagRes.data || []);
        setPills(pillsRes.data || []);
        setAIAnalysis(aiRes.data || null);
        setLabReports(labRes.data || []);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load medical record');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>My Medical Record</h1>
        <p>A detailed timeline of your case history.</p>
      </div>

      <div className="card">
        <h3>Submitted Symptoms</h3>
        <p>"I have been experiencing frequent headaches and occasional dizziness for the past two weeks."</p>
      </div>

      <div className="card">
        <h3>AI-Powered Analysis Summary</h3>
        <p style={{ fontStyle: 'italic', color: 'var(--muted-text)', display: 'flex', alignItems: 'center' }}>
          <Icon name="info" className='icon-info-inline' />
          Disclaimer: This is an AI-generated summary and not a substitute for professional medical advice.
        </p>
        
        {loading ? (
          <p style={{ color: '#999' }}>Loading AI analysis...</p>
        ) : aiAnalysis ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {aiAnalysis.image_url && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', width: 'fit-content' }}>
                <img 
                  src={aiAnalysis.image_url} 
                  alt="X-Ray Analysis" 
                  style={{ 
                    width: '240px', 
                    height: '240px', 
                    borderRadius: '8px',
                    objectFit: 'cover',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }} 
                />
                <small style={{ color: '#999', fontSize: '0.85rem' }}>
                  Analyzed on {new Date(aiAnalysis.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </small>
              </div>
            )}
            <p style={{ margin: 0, lineHeight: '1.6', color: '#333' }}>{aiAnalysis.ai_diagnosis}</p>
          </div>
        ) : (
          <p style={{ color: '#999' }}>No AI analysis available yet. Upload an X-Ray image for analysis.</p>
        )}
      </div>

      <div className="card">
        <h3>Doctor's Diagnosis</h3>
        {loading ? (
          <p style={{ color: '#999' }}>Loading diagnoses...</p>
        ) : error ? (
          <p style={{ color: '#c62828' }}>{error}</p>
        ) : diagnoses.length === 0 ? (
          <p style={{ color: '#999' }}>No diagnoses recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {diagnoses.map(d => (
              <div key={d.id} style={{ borderLeft: '3px solid var(--primary-color)', paddingLeft: '1rem' }}>
                <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>
                  Dr. {d.doctor_name}
                  {d.specialization && <span style={{ fontWeight: 400, color: '#666', marginLeft: '0.5rem' }}>· {d.specialization}</span>}
                </p>
                <p style={{ margin: '0 0 0.25rem' }}>{d.diagnosis_text}</p>
                <small style={{ color: '#999' }}>{new Date(d.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</small>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Treatment Plan</h3>
        {loading ? (
          <p style={{ color: '#999' }}>Loading treatment plan...</p>
        ) : pills.length === 0 ? (
          <p style={{ color: '#999' }}>No treatment plan assigned yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e0e0e0', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem 0.75rem' }}>Medication</th>
                <th style={{ padding: '0.5rem 0.75rem' }}>Time</th>
                <th style={{ padding: '0.5rem 0.75rem' }}>Frequency</th>
                <th style={{ padding: '0.5rem 0.75rem' }}>Meal Timing</th>
              </tr>
            </thead>
            <tbody>
              {pills.map(pill => (
                <tr key={pill.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{pill.name}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{pill.time ? pill.time.slice(0, 5) : '-'}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{pill.frequency || '-'}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{pill.meal_timing || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Intelligent Lab Report</h3>
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
                  borderLeft: '4px solid var(--primary-color)',
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
    </>
  );
};

export default MedicalRecord;
