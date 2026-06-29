// File: src/components/OtpVerification.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/otpVerification.css';

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { email, userType, theme } = location.state || { email: '', userType: 'doctor', theme: 'green' };
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [isExpired, setIsExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const inputRefs = [
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null)
  ];

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          setIsExpired(true);
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time left as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^[0-9]$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Move to next input if current input is filled
    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Check if pasted data is a 6-digit number
    if (/^[0-9]{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs[5].current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join('');
    
    // Validate OTP
    if (otpValue.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    
    if (isExpired) {
      setError('OTP has expired. Please request a new one.');
      return;
    }
    setIsSubmitting(true);
    
    try {
      const res = await fetch('http://localhost:5000/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: otpValue }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Verification failed');

      // Navigate to login page after successful verification
      navigate('/login', { state: { message: result.message, theme: theme || 'green' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
  if (!email) {
    setError('Email not found. Please try registration again.');
    return;
  }

  try {
    setIsSubmitting(true);           // reuse submitting state or create separate
    setError('');

    const response = await fetch('http://localhost:5000/api/auth/resend-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle specific error messages from backend
      if (response.status === 429) {
        setError(`Please wait ${result.retryAfter || 60} seconds before trying again.`);
      } else {
        throw new Error(result.error || 'Failed to resend code');
      }
      return;
    }

    // Success → reset UI
    setTimeLeft(180);
    setIsExpired(false);
    setOtp(['', '', '', '', '', '']);
    inputRefs[0].current?.focus();

    // Optional: show success toast/message
    // You can add a success state if you want
    console.log('New OTP requested successfully');

  } catch (error) {
    console.error('Resend OTP error:', error);
    setError(error instanceof Error ? error.message : 'Failed to resend code. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="otp-verification">
      <div className="back-button-container">
        <button className="back-button" onClick={handleGoBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back
        </button>
      </div>
      
      <div className="otp-container">
        <div className="otp-header">
          <div className="otp-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"></rect>
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M10 14h.01M14 14h.01M18 14h.01"></path>
            </svg>
          </div>
          <h1>Verify Your Email</h1>
          <p>We've sent a verification code to</p>
          <p className="email-display">{email}</p>
        </div>
        
        <form className="otp-form" onSubmit={handleSubmit}>
          <div className="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                ref={inputRefs[index]}
                className={error ? 'error' : ''}
              />
            ))}
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="timer-container">
            <p className={`timer ${isExpired ? 'expired' : ''}`}>
              {isExpired ? 'OTP has expired' : `This code expires in ${formatTime(timeLeft)}`}
            </p>
            {!isExpired ? (
              <button type="button" className="resend-button" disabled>
                Resend Code
              </button>
            ) : (
              <button type="button" className="resend-button" onClick={handleResendOtp} disabled={isSubmitting}>
                {isSubmitting? 'Sending...': 'Resend Code'}
              </button>
            )}
          </div>
          
          <button 
            type="submit" 
            className={`submit-button ${userType === 'doctor' ? 'doctor-submit' : 'patient-submit'}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>
        
        <div className="otp-footer">
          <p>For demo purposes, use OTP: <span className="demo-otp">123456</span></p>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;