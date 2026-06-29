// Validate registration data
const validateRegistration = (req, res, next) => {
  const { userType, fullName, email, phoneNumber, password, confirmPassword } = req.body;
  const errors = {};
  
  // Full Name validation
  if (!fullName || fullName.trim().length <= 10) {
    errors.fullName = 'Full name must be more than 10 characters';
  }
  
  // Email validation
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!email || !emailRegex.test(email)) {
    errors.email = 'Valid email is required';
  }
  
  // Phone validation (Egyptian numbers)
  const phoneRegex = /^01[0-2,5]\d{8}$/;
  if (!phoneNumber || !phoneRegex.test(phoneNumber)) {
    errors.phoneNumber = 'Valid Egyptian phone number is required';
  }
  
  // Password validation
  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  
  // Confirm password validation
  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  // Role-specific validations
  if (userType === 'doctor') {
    if (!req.body.specialty) {
      errors.specialty = 'Specialty is required';
    }
    
    if (!req.file) {
      errors.licenseFile = 'License file is required';
    }
  } else if (userType === 'patient') {
    const age = parseInt(req.body.age);
    if (!age || age <= 0 || age > 120) {
      errors.age = 'Valid age is required';
    }
    
    if (!req.body.bloodType) {
      errors.bloodType = 'Blood type is required';
    }
    
    if (!req.body.address || req.body.address.trim().length === 0) {
      errors.address = 'Address is required';
    }
  }
  
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validation errors', errors });
  }
  
  next();
};

// Validate OTP
const validateOTP = (req, res, next) => {
  const { email, otp } = req.body;
  const errors = {};
  
  if (!email) {
    errors.email = 'Email is required';
  }
  
  if (!otp || !/^\d{6}$/.test(otp)) {
    errors.otp = 'Valid 6-digit OTP is required';
  }
  
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validation errors', errors });
  }
  
  next();
};

// Validate login
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = {};
  
  if (!email) {
    errors.email = 'Email is required';
  }
  
  if (!password) {
    errors.password = 'Password is required';
  }
  
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validation errors', errors });
  }
  
  next();
};

module.exports = {
  validateRegistration,
  validateOTP,
  validateLogin
};