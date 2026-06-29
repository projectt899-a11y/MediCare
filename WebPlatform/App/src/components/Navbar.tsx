import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/navbar.css';

interface NavbarProps {
  scrollToSection?: (sectionId: string) => void;
  activeSection: string;
  isLandingPage: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ scrollToSection, activeSection, isLandingPage }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (sectionId: string) => {
    if (isLandingPage || location.pathname !== '/') {
      navigate('/');
      // We can add a small delay to let the page navigate before scrolling
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else if (scrollToSection) {
      scrollToSection(sectionId);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo" onClick={() => handleNavClick('home')}>
          <h2>MediCare</h2>
        </div>
        <ul className="navbar-menu">
          <li className={!isLandingPage && activeSection === 'home' ? 'active' : ''}>
            <button onClick={() => handleNavClick('home')}>Home</button>
          </li>
          <li className={!isLandingPage && activeSection === 'about' ? 'active' : ''}>
            <button onClick={() => handleNavClick('about')}>About</button>
          </li>
          <li className={!isLandingPage && activeSection === 'why-choose-us' ? 'active' : ''}>
            <button onClick={() => handleNavClick('why-choose-us')}>Why Choose Us</button>
          </li>
          <li className={!isLandingPage && activeSection === 'contact' ? 'active' : ''}>
            <button onClick={() => handleNavClick('contact')}>Contact Us</button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;