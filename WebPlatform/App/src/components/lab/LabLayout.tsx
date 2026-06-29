import React, { useState } from 'react';
import LabHeader from './LabHeader';
import LabSidebar from './LabSidebar';
import '../../styles/labLayout.css';

interface LabLayoutProps {
  children?: React.ReactNode;
}

const LabLayout: React.FC<LabLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="lab-layout">
      <LabSidebar isOpen={sidebarOpen} />
      <div className="lab-main">
        <LabHeader onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="lab-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default LabLayout;
