import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/labRegistration.css';

const LabRegistration = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    labName: '',
    email: '',
    phoneDigits: '',
    labType: '',
    licenseNumber: '',
    password: '',
    confirmPassword: '',
    licenseFile: null as File | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.labName.trim()) newErrors.labName = 'Lab name is required';

    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = 'Invalid email format';

    if (!formData.phoneDigits.trim()) newErrors.phoneDigits = 'Phone is required';
    else if (!/^\d{10,11}$/.test(formData.phoneDigits))
      newErrors.phoneDigits = 'Phone must be 10–11 digits';

    if (!formData.labType) newErrors.labType = 'Lab type is required';

    if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8)
      newErrors.password = 'Password must be at least 8 characters';

    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirm password is required';
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';

    if (!formData.licenseFile) newErrors.licenseFile = 'License document is required';
    else {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(formData.licenseFile.type))
        newErrors.licenseFile = 'Only PDF and image files are allowed';
      if (formData.licenseFile.size > 5 * 1024 * 1024)
        newErrors.licenseFile = 'File size must be less than 5MB';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData((prev) => ({ ...prev, licenseFile: e.target.files![0] }));
      if (errors.licenseFile) setErrors((prev) => ({ ...prev, licenseFile: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('labName', formData.labName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phoneDigits', formData.phoneDigits);
      formDataToSend.append('labType', formData.labType);
      formDataToSend.append('licenseNumber', formData.licenseNumber);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('confirmPassword', formData.confirmPassword);
      if (formData.licenseFile) {
        formDataToSend.append('licenseFile', formData.licenseFile);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/register-lab`,
        { method: 'POST', body: formDataToSend }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrors({ general: data.error || 'Registration failed' });
        return;
      }

      // Redirect to OTP verification page - same as doctor/patient flow
      navigate('/verify-email', { state: { email: formData.email, theme: 'orange' } });
    } catch (err: any) {
      setErrors({ general: err?.message || 'An error occurred during registration' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="lab-registration">
      <div className="back-button-container">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back
        </button>
      </div>

      <div className="lab-registration-main-container">
        {/* Left Side */}
        <div className="lab-registration-left-side">
          <div className="lab-image-container">
            <img src="/lab.jpg" alt="Laboratory" className="lab-image" />
          </div>
          <div className="lab-welcome-section">
            <h2>Join to <span className="highlight">MediCare</span></h2>
            <h3>Laboratory Network</h3>
            <p>Register your laboratory to partner with our healthcare platform and serve patients with accurate diagnostics</p>
          </div>
        </div>

        {/* Right Side */}
        <div className="lab-registration-right-side">
          <div className="lab-registration-form-container">
            <div className="lab-registration-header">
              <h1>Register as Lab</h1>
              <p>Create your laboratory account</p>
            </div>

            <form className="lab-registration-form" onSubmit={handleSubmit}>

              {/* Basic Information */}
              <div className="form-section-title">Basic Information</div>

              <div className="form-row">
                <div className="form-group">
                  <label>Lab Name</label>
                  <input
                    type="text"
                    name="labName"
                    value={formData.labName}
                    onChange={handleChange}
                    placeholder="Enter laboratory name"
                  />
                  {errors.labName && <span className="error-message">{errors.labName}</span>}
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="lab@example.com"
                  />
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <div className={`phone-input-container ${errors.phoneDigits ? 'error' : ''}`}>
                  <div className="phone-prefix">+20</div>
                  <input
                    className="phone-input"
                    type="text"
                    name="phoneDigits"
                    value={formData.phoneDigits}
                    onChange={handleChange}
                    maxLength={11}
                    placeholder="1234567890"
                  />
                </div>
                {errors.phoneDigits && <span className="error-message">{errors.phoneDigits}</span>}
              </div>

              {/* Lab Details */}
              <div className="form-section-title">Lab Details</div>

              <div className="form-row">
                <div className="form-group">
                  <label>Lab Type</label>
                  <select name="labType" value={formData.labType} onChange={handleChange}>
                    <option value="">Select lab type</option>
                    <option value="Pathology">Pathology</option>
                    <option value="Radiology">Radiology</option>
                  </select>
                  {errors.labType && <span className="error-message">{errors.labType}</span>}
                </div>

                <div className="form-group">
                  <label>License Number</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    placeholder="Enter license number"
                  />
                  {errors.licenseNumber && <span className="error-message">{errors.licenseNumber}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>License Document (PDF/Image)</label>
                <div className="file-upload-container">
                  <label 
                    className={`file-upload-button ${formData.licenseFile ? 'file-selected' : ''} ${errors.licenseFile ? 'error' : ''}`}
                    style={{ color: formData.licenseFile ? '#2c3e50' : '#bdc3c7' }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    {formData.licenseFile ? formData.licenseFile.name : ' Choose file (PDF, JPG, PNG — Max 5MB)'}
                  </label>
                  {errors.licenseFile && <span className="error-message">{errors.licenseFile}</span>}
                </div>
              </div>

              {/* Security */}
              <div className="form-section-title">Security</div>

              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••••••••••"
                  />
                  {errors.password && <span className="error-message">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••••••••••"
                  />
                  {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                </div>
              </div>

              {errors.general && <div className="error-message general">{errors.general}</div>}

              <button type="submit" className="lab-submit-button" disabled={isSubmitting}>
                {isSubmitting ? 'Registering...' : 'Register Lab'}
              </button>
            </form>

            <p className="login-link">
              Already have an account? <Link to="/login" state={{ theme: 'orange' }}>Login here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabRegistration;
