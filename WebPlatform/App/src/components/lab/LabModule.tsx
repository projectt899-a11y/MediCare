import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LabLayout from './LabLayout';
import LabHome from './LabDashboard';
import RequestsInbox from './RequestsInbox';
import RequestDetails from './RequestDetails';
import ProcessingList from './ProcessingList';
import ProcessingForm from './ProcessingForm';
import HistoryArchive from './HistoryArchive';
import LabProfile from './LabProfile';
import '../../styles/labLayout.css';
import '../../styles/labResponsive.css';

const LabModule: React.FC = () => {
  return (
    <LabLayout>
      <Routes>
        <Route path="/" element={<Navigate to="home" replace />} />
        <Route path="home" element={<LabHome />} />
        <Route path="inbox" element={<RequestsInbox />} />
        <Route path="request/:requestId" element={<RequestDetails />} />
        <Route path="processing" element={<ProcessingList />} />
        <Route path="processing/:requestId" element={<ProcessingForm />} />
        <Route path="history" element={<HistoryArchive />} />
        <Route path="profile" element={<LabProfile />} />
      </Routes>
    </LabLayout>
  );
};

export default LabModule;
