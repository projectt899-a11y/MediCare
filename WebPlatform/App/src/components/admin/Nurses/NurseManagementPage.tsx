import React, { useState } from 'react';
import NurseRegistrationForm from './NurseRegistrationForm';
import NurseManagementList from './NurseManagementList';
import '../../../styles/nurseAdmin.css';

const NurseManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'register'>('list');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleRegistrationSuccess = () => {
    setActiveTab('list');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRegistrationError = (error: string) => {
    setGeneralError(error);
    setTimeout(() => setGeneralError(null), 5000);
  };

  return (
    <div className="nurse-management-page">
      <div className="page-header">
        <h1>Nurse Management</h1>
        <p className="page-subtitle">Register and manage nurses in the system</p>
      </div>

      {generalError && (
        <div className="error-message-container">
          <div className="error-message">{generalError}</div>
          <button onClick={() => setGeneralError(null)} className="close-btn">×</button>
        </div>
      )}

      <div className="tabs-container">
        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            Nurse List
          </button>
          <button
            className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register New Nurse
          </button>
        </div>

        <div className="tabs-content">
          {activeTab === 'list' && (
            <div className="tab-pane active">
              <NurseManagementList onRefresh={() => setRefreshTrigger(prev => prev + 1)} />
            </div>
          )}
          {activeTab === 'register' && (
            <div className="tab-pane active">
              <NurseRegistrationForm
                onSuccess={handleRegistrationSuccess}
                onError={handleRegistrationError}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NurseManagementPage;
