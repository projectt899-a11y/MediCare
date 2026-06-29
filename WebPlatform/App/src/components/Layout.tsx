import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children?: React.ReactNode;  // Add this line to accept children
  scrollToSection?: (sectionId: string) => void;
  activeSection?: string;
  isLandingPage?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children,  // Add this parameter
  scrollToSection, 
  activeSection, 
  isLandingPage = false 
}) => {
  return (
    <div className="app">
      <Navbar 
        scrollToSection={scrollToSection} 
        activeSection={activeSection || ''} 
        isLandingPage={isLandingPage}
      />
      <main className="main-content">
        {children || <Outlet />} 
      </main>
      <Footer scrollToSection={scrollToSection} />
    </div>
  );
};

export default Layout;