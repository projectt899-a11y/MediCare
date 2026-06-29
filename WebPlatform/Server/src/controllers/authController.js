const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/database');
const multer = require('multer');
const path = require('path');
const { sendOTPEmail } = require('../services/emailService');
const { generateOTP } = require('../utils/helpers');

// In-memory store for rate limiting resend-verification requests
// Maps email -> { timestamp: lastRequestTime, count: consecutiveAttempts }
const resendRateLimitStore = new Map();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const register = async (req, res) => {
  const {
    fullName,
    email,
    phoneDigits,
    password,
    confirmPassword,
    specialty,
    age,
    bloodType,
    address,
    userType = 'patient',
  } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    // 1. Supabase Auth Sign Up
    const { data: authUser, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: userType,
          full_name: fullName,
        },
      },
    });

    if (signUpError) throw signUpError;

    const userId = authUser.user.id;

    // 2. Handle license upload (only for doctors)
    let licenseUrl = null;
    if (userType === 'doctor') {
      if (!req.file) {
        // Optional: delete unverified user
        await supabase.auth.admin.deleteUser(userId);
        return res.status(400).json({ error: 'License file required for doctors' });
      }

      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `licenses/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('licenses').getPublicUrl(filePath);
      licenseUrl = urlData.publicUrl;
    }

    // 3. Insert profile
    if (userType === 'doctor') {
      const { error } = await supabase.from('doctors').insert({
        user_id: userId,
        full_name: fullName,
        phone_number: `+20${phoneDigits}`,
        specialty,
        license_file_path: licenseUrl,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('patients').insert({
        user_id: userId,
        full_name: fullName,
        phone_number: `+20${phoneDigits}`,
        age: Number(age),
        blood_type: bloodType,
        address,
      });
      if (error) throw error;
    }

    res.status(201).json({
      message: 'Registration successful. Check your email to verify your account.',
      email,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
};

// ────────────────────────────────────────────────
// POST /api/auth/register
// ────────────────────────────────────────────────
router.post('/register', upload.single('licenseFile'), async (req, res) => {
  const {
    fullName,
    email,
    phoneDigits,
    password,
    confirmPassword,
    specialty,
    age,
    bloodType,
    address,
    userType = 'patient',
  } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    // 1. Create user in Supabase Auth
    const { data: authUser, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: userType, full_name: fullName },
      },
    });

    if (signUpError) throw signUpError;

    const userId = authUser.user.id;

    // 2. Upload license (only for doctors)
    let licenseUrl = null;
    if (userType === 'doctor') {
      if (!req.file) {
        // Optional: delete the unverified auth user
        await supabase.auth.admin.deleteUser(userId);
        return res.status(400).json({ error: 'License file required for doctors' });
      }

      const fileExt = req.file.originalname.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `licenses/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('licenses')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('licenses').getPublicUrl(filePath);
      licenseUrl = urlData.publicUrl;
    }

    // 3. Create profile record
    if (userType === 'doctor') {
      console.log(`[DOCTOR REGISTRATION] Creating doctor profile for user ${userId}, email: ${email}`);
      const { error } = await supabase.from('doctors').insert({
        user_id: userId,
        full_name: fullName,
        phone_number: `+20${phoneDigits}`,
        specialty,
        license_file_path: licenseUrl,
      });

      if (error) throw error;
      console.log(`[DOCTOR REGISTRATION] Doctor profile created successfully`);

      // Send OTP email for doctor
      console.log(`[DOCTOR OTP] Starting OTP generation and sending for email: ${email}`);
      try {
        const otp = generateOTP();
        console.log(`[DOCTOR OTP] Generated OTP: ${otp}`);
        console.log(`[DOCTOR OTP] Calling sendOTPEmail(${email}, ${otp})...`);
        await sendOTPEmail(email, otp);
        console.log(`[DOCTOR OTP] ✅ OTP email sent successfully to ${email}`);
      } catch (emailError) {
        console.error(`[DOCTOR OTP] ❌ Failed to send OTP email for doctor to ${email}:`, emailError);
        console.error(`[DOCTOR OTP] Error message:`, emailError.message);
        console.error(`[DOCTOR OTP] Error stack:`, emailError.stack);
        // Don't block registration if email fails
      }
    } else {
      console.log(`[PATIENT REGISTRATION] Creating patient profile for user ${userId}, email: ${email}`);
      const { error } = await supabase.from('patients').insert({
        user_id: userId,
        full_name: fullName,
        phone_number: `+20${phoneDigits}`,
        age: Number(age),
        blood_type: bloodType,
        address,
      });

      if (error) throw error;
      console.log(`[PATIENT REGISTRATION] Patient profile created successfully`);

      // Send OTP email for patient
      console.log(`[PATIENT OTP] Starting OTP generation and sending for email: ${email}`);
      try {
        const otp = generateOTP();
        console.log(`[PATIENT OTP] Generated OTP: ${otp}`);
        console.log(`[PATIENT OTP] Calling sendOTPEmail(${email}, ${otp})...`);
        await sendOTPEmail(email, otp);
        console.log(`[PATIENT OTP] ✅ OTP email sent successfully to ${email}`);
      } catch (emailError) {
        console.error(`[PATIENT OTP] ❌ Failed to send OTP email for patient to ${email}:`, emailError);
        console.error(`[PATIENT OTP] Error message:`, emailError.message);
        console.error(`[PATIENT OTP] Error stack:`, emailError.stack);
        // Don't block registration if email fails
      }
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      email,
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  const { email, token } = req.body;

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });

    if (error) throw error;

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Verification failed' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  console.log(`[RESEND-OTP] Request received for email: ${email}`);

  try {
    // Rate limiting: max 1 resend per 60 seconds per email
    const now = Date.now();
    const rateLimitData = resendRateLimitStore.get(email);
    
    if (rateLimitData) {
      const timeSinceLastRequest = (now - rateLimitData.timestamp) / 1000; // in seconds
      console.log(`[RESEND-OTP] Rate limit check - last request: ${timeSinceLastRequest.toFixed(2)}s ago`);
      
      if (timeSinceLastRequest < 60) {
        const retryAfter = Math.ceil(60 - timeSinceLastRequest);
        console.warn(`[RESEND-OTP] ⏱️  Rate limit hit for ${email}, retry after ${retryAfter}s`);
        return res.status(429).json({ 
          error: `Please wait ${retryAfter} seconds before requesting another code.`,
          retryAfter 
        });
      }
    }

    console.log(`[RESEND-OTP] No rate limit, proceeding with OTP generation and sending`);

    // Generate and send new OTP
    try {
      const otp = generateOTP();
      console.log(`[RESEND-OTP] Generated OTP: ${otp}`);
      console.log(`[RESEND-OTP] Calling sendOTPEmail(${email}, ${otp})...`);
      await sendOTPEmail(email, otp);
      console.log(`[RESEND-OTP] ✅ Resend verification OTP sent successfully to ${email}`);
    } catch (emailError) {
      console.error(`[RESEND-OTP] ❌ Failed to send resend OTP email to ${email}:`, emailError);
      console.error(`[RESEND-OTP] Error message:`, emailError.message);
      console.error(`[RESEND-OTP] Error stack:`, emailError.stack);
      // Don't block resend if email fails - let user try verification with the OTP they already have
      // or attempt resend again
    }

    // Update rate limit store
    resendRateLimitStore.set(email, { timestamp: now, count: (rateLimitData?.count || 0) + 1 });
    console.log(`[RESEND-OTP] Rate limit store updated for ${email}`);

    res.json({ message: 'Verification code resent successfully. Check your email.' });
  } catch (err) {
    console.error('[RESEND-OTP] General error:', err);
    res.status(400).json({ error: err.message || 'Failed to resend code' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      await supabase.auth.signOut();
    }

    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ────────────────────────────────────────────────
// POST /api/auth/register-lab
// ────────────────────────────────────────────────
router.post('/register-lab', upload.single('licenseFile'), async (req, res) => {
  const {
    labName,
    email,
    phoneDigits,
    password,
    confirmPassword,
    labType,
    licenseNumber,
  } = req.body;

  // Validation
  if (!labName || !email || !phoneDigits || !password || !labType || !licenseNumber) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (!['Pathology', 'Radiology'].includes(labType)) {
    return res.status(400).json({ error: 'Invalid lab type' });
  }

  try {
    // 1. Create user in Supabase Auth with OTP email verification
    const { data: authUser, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'lab', lab_name: labName },
        emailRedirectTo: undefined,
      },
    });

    if (signUpError) throw signUpError;

    const userId = authUser.user.id;

    // 2. Upload license document
    let licenseUrl = null;
    if (!req.file) {
      await supabase.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: 'License document is required' });
    }

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `lab-licenses/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('licenses')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('licenses').getPublicUrl(filePath);
    licenseUrl = urlData.publicUrl;

    // 3. Create lab record with is_approved = false
    const { error: labError } = await supabase.from('labs').insert({
      user_id: userId,
      name: labName,
      email,
      phone_number: `+20${phoneDigits}`,
      license_number: licenseNumber,
      license_file_path: licenseUrl,
      lab_type: labType,
      is_approved: false,
      status: 'Pending Approval',
      address: '', // Will be updated by admin if needed
    });

    if (labError) throw labError;

    // Send OTP email for lab
    console.log(`[LAB OTP] Starting OTP generation and sending for email: ${email}`);
    try {
      const otp = generateOTP();
      console.log(`[LAB OTP] Generated OTP: ${otp}`);
      console.log(`[LAB OTP] Calling sendOTPEmail(${email}, ${otp})...`);
      await sendOTPEmail(email, otp);
      console.log(`[LAB OTP] ✅ OTP email sent successfully to ${email}`);
    } catch (emailError) {
      console.error(`[LAB OTP] ❌ Failed to send OTP email for lab to ${email}:`, emailError);
      console.error(`[LAB OTP] Error message:`, emailError.message);
      console.error(`[LAB OTP] Error stack:`, emailError.stack);
      // Don't block registration if email fails
    }

    res.status(201).json({
      message: 'Lab registration successful. Please check your email to verify your account.',
      email,
    });
  } catch (err) {
    console.error('Lab registration error:', err);
    res.status(500).json({ error: err.message || 'Lab registration failed' });
  }
});

// ────────────────────────────────────────────────
// GET /api/auth/lab-status
// Check lab approval status
// ────────────────────────────────────────────────
router.get('/lab-status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: lab, error: labError } = await supabase
      .from('labs')
      .select('id, name, is_approved, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (labError) throw labError;

    res.json({ lab: lab || null });
  } catch (err) {
    console.error('Lab status error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;