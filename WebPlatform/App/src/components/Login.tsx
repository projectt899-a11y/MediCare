import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/database';
import '../styles/login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const stateMessage = location.state?.message;
  const stateTheme = location.state?.theme;

  // Theme colors map
  const themes: Record<string, { gradient: string; button: string; buttonHover: string; shadow: string }> = {
    green: {
      gradient: 'linear-gradient(135deg, #21864b 0%, #21864b 100%)',
      button: '#2fcc70',
      buttonHover: '#27ae60',
      shadow: 'rgba(47, 204, 112, 0.3)',
    },
    orange: {
      gradient: 'linear-gradient(135deg, #c0580a 0%, #e67e22 100%)',
      button: '#e67e22',
      buttonHover: '#d35400',
      shadow: 'rgba(230, 126, 34, 0.3)',
    },
    blue: {
      gradient: 'linear-gradient(135deg, #3599db 0%, #3599db 100%)',
      button: '#3498db',
      buttonHover: '#2980b9',
      shadow: 'rgba(52, 152, 219, 0.3)',
    },
  };

  const activeTheme = themes[stateTheme || 'blue'];
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(stateMessage || '');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'This field is required';
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'This field is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (successMessage) setSuccessMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      const user = data.user;
      const session = data.session;

      let fullName = 'User';
      let userRole = user.user_metadata?.role;

      let labRecordId: string | null = null;

      // Check if user is admin first (from admin_users table)
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('full_name, account_status, is_deleted')
        .eq('user_id', user.id)
        .maybeSingle();

      if (adminUser && adminUser.account_status === 'Active' && !adminUser.is_deleted) {
        // User is an admin
        userRole = 'admin';
        fullName = adminUser.full_name;
      } else if (userRole === 'doctor') {
        // User is a doctor
        const { data: doc } = await supabase
          .from('doctors')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();
        fullName = doc?.full_name || 'Dr. User';
        
      } else if (userRole === 'patient') {
        // User is a patient
        const { data: pat } = await supabase
          .from('patients')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();
        fullName = pat?.full_name || 'Patient';
      } else if (userRole === 'nurse') {
        // User is a nurse
        fullName = user.user_metadata?.full_name || 'Nurse';
      } else if (userRole === 'lab') {
        // User is a lab - check via backend to bypass RLS
        const labCheckRes = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/lab-status`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        const labData = await labCheckRes.json();

        if (!labCheckRes.ok || !labData.lab) {
          throw new Error('Lab account not found');
        }

        if (!labData.lab.is_approved || labData.lab.status !== 'Approved') {
          throw new Error('Your lab account is pending admin approval. You will be notified once approved.');
        }

        fullName = labData.lab.name || 'Lab';
        labRecordId = labData.lab.id;
      }

      // Save to store
      setAuth(session.access_token, {
        id: user.id,
        email: user.email,
        role: userRole,
        fullName,
      });

      // Save userRole to localStorage for route protection
      localStorage.setItem('userRole', userRole || '');

      // Record login activity
      try {
        const ipAddress = await fetch('https://api.ipify.org?format=json')
          .then(res => res.json())
          .then(data => data.ip)
          .catch(() => 'unknown');
        
        const userAgent = navigator.userAgent;
        
        await fetch('http://localhost:5000/api/admin/activity-log/record-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            userId: user.id,
            ipAddress,
            userAgent
          })
        });
      } catch (err) {
        console.error('Failed to record login activity:', err);
      }

      // Route based on role
      if (userRole === 'admin') {
        navigate('/admin/dashboard');
      } else if (userRole === 'doctor') {
        navigate('/doctor');
      } else if (userRole === 'patient') {
        navigate('/patient');
      } else if (userRole === 'nurse') {
        navigate('/nurse');
      } else if (userRole === 'lab') {
        localStorage.setItem('labId', labRecordId || '');
        navigate('/lab');
      } else {
        navigate('/');
      }

      setSuccessMessage('Login successful! Redirecting...');
    } catch (error: any) {
      console.error('Login error:', error);
      setErrors({ general: error.message || 'Invalid email or password' });
    } finally {
      setIsSubmitting(false);
    }
  };

    const handleGoBack = () => {
    navigate(-1);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  
  return (
    <div className="login">
      <div className="back-button-container">
        <button className="back-button" onClick={handleGoBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back
        </button>
      </div>
      
      <div className="login-main-container">
        <div className="login-left-side" style={{ background: activeTheme.gradient }}>
          <div className="doctor-image-container">
            <img 
              src="/login.jpg" 
              alt="Doctor" 
              className="doctor-image"
            />
          </div>
          <div className="welcome-section">
            <h2>Welcome to <span className="highlight">MediCare</span></h2>
            <h3>Hospital Management System</h3>
            <p>Cloud Based Streamline Hospital Management system with centralized user friendly platform</p>
          </div>
        </div>

        <div className="login-right-side">
          <div className="login-form-container">  
          <div className="login-header">
              <h1>Login</h1>
              <h5>Enter your credentials to login to your account</h5>
            </div>

            {successMessage && (
              <div className="success-message">
                {successMessage}
              </div>
            )}
            {errors.general && (
              <div className='error-message general'>
                {errors.general}
              </div>
            )}
            
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="example.nazarbeck@gmail.com"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={errors.password ? 'error' : ''}
                    placeholder="••••••••••••••••••••••••"
                  />
                  <button
                    type="button"
                    className='password-toggle'
                    onClick={togglePasswordVisibility}>
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <div className="forgot-password-link">
                <a href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password', { state: { theme: stateTheme } }); }}>Forgot Password?</a>
              </div>
              
              <button type="submit" className="login-button" disabled={isSubmitting}
                style={{ backgroundColor: activeTheme.button }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = activeTheme.buttonHover)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = activeTheme.button)}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
              
              <div className="register-link">
                Don't have an account? <a href="/register" onClick={(e) => { e.preventDefault(); navigate('/register', { state: { theme: 'green' } }); }}>Sign Up</a>
                {' · '}
                <a href="/register-lab" onClick={(e) => { e.preventDefault(); navigate('/register-lab', { state: { theme: 'orange' } }); }}>Register as Lab</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

};

export default Login;