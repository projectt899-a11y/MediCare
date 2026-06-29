import "../styles/about.css";
import { useEffect, useState } from "react";

const About = () => {
  const [stats, setStats] = useState({
    doctors: 0,
    patients: 0,
    nurses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/doctor/stats");
        const data = await response.json();
        setStats({
          doctors: data.doctors || 0,
          patients: data.patients || 0,
          nurses: data.nurses || 0,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        setStats({
          doctors: 0,
          patients: 0,
          nurses: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <section id="about" className="about">
      <div className="about-container">
        <div className="about-header">
          <h2>About Our Healthcare Platform</h2>
          <p>
            We are a comprehensive healthcare platform connecting patients with
            qualified medical professionals. Our mission is to make quality
            healthcare accessible, convenient, and affordable for everyone.
          </p>
        </div>
        <div className="stats-container">
          <div className="stat-item">
            <h3>{loading ? "..." : stats.doctors}</h3>
            <p>Expert Doctors</p>
          </div>
          <div className="stat-item">
            <h3>{loading ? "..." : stats.patients.toLocaleString()}</h3>
            <p>Happy Patients</p>
          </div>
        </div>
        <div className="feature-cards">
          <div className="feature-card">
            <div className="feature-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </div>
            <h3>Patient-Centered Care</h3>
            <p>
              We prioritize your needs and preferences, providing personalized
              healthcare services tailored to your unique situation.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3>Expert Network</h3>
            <p>
              Access a diverse network of certified medical professionals across
              multiple specialties, ensuring you receive the best possible care.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <h3>Secure Platform</h3>
            <p>
              Your health information is protected with advanced security
              measures, ensuring complete privacy and confidentiality of your
              medical data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
