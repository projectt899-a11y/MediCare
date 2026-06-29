import React from 'react';
import Hero from './Hero';
import About from './About';
import WhyChooseUs from './WhyChooseUs';

interface HomePageProps {
  scrollToSection: (sectionId: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ scrollToSection }) => {
  return (
    <>
      <Hero scrollToSection={scrollToSection} />
      <About />
      <WhyChooseUs />
    </>
  );
};

export default HomePage;