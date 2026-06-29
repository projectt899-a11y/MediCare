import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/footer.css';

interface FooterProps {
  scrollToSection?: (sectionId: string) => void;
}

const Footer: React.FC<FooterProps> = ({ scrollToSection }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLandingPage = location.pathname === '/landing';

  const handleFooterClick = (sectionId: string) => {
    if (isLandingPage || location.pathname !== '/') {
      navigate('/');
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

  const handleNavigation = (path: string) => {
    navigate(path);
  };
  return (
    <footer id="contact" className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-brand">
            <h2>MediCare</h2>
            <p>Your trusted healthcare partner for comprehensive medical services.</p>
          </div>
          
          <div className="footer-links">
            <h3>Quick Links</h3>
            <ul>
              <li><button onClick={() => handleFooterClick('home')}>Home</button></li>
              <li><button onClick={() => handleFooterClick('about')}>About</button></li>
              <li><button onClick={() => handleFooterClick('why-choose-us')}>Why Choose Us</button></li>
              <li><button onClick={() => handleFooterClick('contact')}>Contact Us</button></li>
            </ul>
          </div>
          
          <div className="footer-professionals">
            <h3>For Professionals</h3>
            <ul>
              <li><button onClick={() => handleNavigation('/register')}>Register</button></li>
              <li><button onClick={() => handleNavigation('/login')}>Login</button></li>
            </ul>
          </div>
          
          <div className="footer-contact">
            <h3>Contact</h3>
            <p>Email: hospitalcare@gmail.com</p>
            <p>Phone: +20 01062741741</p>
            <p>24/7 Support Available</p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2026 MediCare. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;