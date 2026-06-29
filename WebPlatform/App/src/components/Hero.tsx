// File: src/components/Hero.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/hero.css';

interface HeroProps {
  scrollToSection: (sectionId: string) => void;
}

const Hero: React.FC<HeroProps> = ({ scrollToSection }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="home" className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1>Welcome to MediCare</h1>
          <h2>Your Health, Our Priority</h2>
          <p>Access top-quality healthcare services with our comprehensive medical platform. Connect with expert doctors, book appointments easily, and receive 24/7 medical assistance.</p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={() => navigate('/landing')}>Get Started</button>
            <button className="btn btn-secondary" onClick={() => scrollToSection('about')}>Learn More</button>
          </div>
        </div>
        <div className="hero-image">
          <div className="image-carousel">
            <div className={`carousel-item ${currentSlide === 0 ? 'active' : ''}`}>
              <img src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=600&h=400&fit=crop" alt="Medical professionals" />
            </div>
            <div className={`carousel-item ${currentSlide === 1 ? 'active' : ''}`}>
              <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&h=400&fit=crop" alt="Healthcare consultation" />
            </div>
            <div className={`carousel-item ${currentSlide === 2 ? 'active' : ''}`}>
              <img src="https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=600&h=400&fit=crop" alt="Medical technology" />
            </div>
            <div className={`carousel-item ${currentSlide === 2 ? 'active' : ''}`}>
              <img src="https://images.unsplash.com/photo-1551076805-e1869033e561?w=600&h=400&fit=crop" alt="Medical technology" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;