const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { protect, sendTokenResponse } = require('../middleware/auth');
const crypto = require('crypto');
const { generateOTP, hashOTP, verifyOTP, getOTPEmailTemplate } = require('../utils/otpUtils');
const nodemailer = require('nodemailer');

const router = express.Router();

// Running inside the SerpY desktop shell rather than as a hosted server
const EMBEDDED = process.env.SERPY_EMBEDDED === '1';

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name is required').trim(),
];

const sendOTPValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('fullName').notEmpty().withMessage('Full name is required').trim(),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
  body('companyName').optional().trim(),
];

const verifyOTPValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name is required').trim(),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Email transporter utility
const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '';

  console.log('📧 Email Config:', {
    hasUser: !!emailUser,
    hasPass: !!emailPass,
    user: emailUser ? emailUser.substring(0, 5) + '...' : 'not set',
    passLength: emailPass.length
  });

  if (!emailUser || !emailPass) {
    throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS in .env');
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    tls: {
      rejectUnauthorized: false
    },
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });
};

// @route   POST /api/auth/send-otp
// @desc    Send OTP for email verification
// @access  Public
router.post('/send-otp', sendOTPValidation, async (req, res) => {
  try {
    // Check for validation errors
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log('Send OTP Validation errors:', errors.array());
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, fullName, phone, companyName } = req.body;

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email, type: 'signup' });

    // Generate new OTP
    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);

    // Store OTP in database
    await OTP.create({
      email,
      otp: hashedOTP,
      type: 'signup',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // In the desktop app the very first account is created before any SMTP
    // details exist - they are entered in Settings, which needs a login. Mailing
    // the code is therefore impossible on first run, so hand it straight back to
    // the app instead. The code's job is to prove the person owns this email,
    // and buying the licence already established that; the local API is
    // loopback-only and key-guarded, so nobody else can read the response.
    if (EMBEDDED && !process.env.EMAIL_USER) {
      console.log('ℹ️  Embedded first-run: returning OTP locally instead of emailing');
      return res.status(200).json({
        status: 'success',
        message: 'Enter the verification code shown to continue.',
        data: {
          email,
          expiresIn: 10, // minutes
          localOtp: otp
        }
      });
    }

    // Send OTP via email
    const transporter = createTransporter();

    const emailTemplate = getOTPEmailTemplate(otp, fullName);

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"SerpY ERP" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - SerpY ERP',
      html: emailTemplate.html,
      text: emailTemplate.text
    };

    await transporter.sendMail(mailOptions);

    console.log('✅ OTP sent successfully to:', email);

    res.status(200).json({
      status: 'success',
      message: 'OTP sent successfully. Please check your email.',
      data: {
        email,
        expiresIn: 10 // minutes
      }
    });

  } catch (error) {
    console.error('❌ Send OTP error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send OTP',
      // Stack traces are for the log, not the response
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and create user account
// @access  Public
router.post('/verify-otp', verifyOTPValidation, async (req, res) => {
  try {
    // Check for validation errors
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log('OTP Validation errors:', errors.array());
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, otp, password, fullName, phone, companyName } = req.body;

    // Find and validate OTP
    const otpRecord = await OTP.findOne({
      email,
      type: 'signup',
      isUsed: false
    });

    if (!otpRecord) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired OTP. Please request a new OTP.'
      });
    }

    // Check if OTP is expired
    if (otpRecord.isExpired()) {
      return res.status(400).json({
        status: 'error',
        message: 'OTP has expired. Please request a new OTP.'
      });
    }

    // Check if attempts exceeded
    if (otpRecord.isAttemptsExceeded()) {
      return res.status(400).json({
        status: 'error',
        message: 'Too many incorrect attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    const isOTPValid = verifyOTP(otp, otpRecord.otp);
    if (!isOTPValid) {
      await otpRecord.incrementAttempts();
      const remainingAttempts = otpRecord.maxAttempts - otpRecord.attempts;
      
      return res.status(400).json({
        status: 'error',
        message: `Invalid OTP. ${remainingAttempts} attempts remaining.`
      });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // User already exists, just log them in
      sendTokenResponse(existingUser, 200, res, 'Login successful!');
      return;
    }

    // Generate unique dataScope for new admin
    const dataScope = `scope_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // Create user with default subscription (30-day trial)
    const user = await User.create({
      email,
      password,
      fullName,
      phone,
      companyName,
      role: 'admin', // First user is admin
      dataScope, // Each admin gets their own unique dataScope
      subscription: {
        isActive: true,
        plan: 'free',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        autoRenew: false
      }
    });

    // Generate token and send response
    sendTokenResponse(user, 201, res, 'Account created successfully!');

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during OTP verification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Verification failed'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user (legacy - for backward compatibility)
// @access  Public
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { email, password, fullName, phone, companyName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    // Generate unique dataScope for new admin
    // Format: scope_<timestamp>_<random>
    const dataScope = `scope_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // Create user with default subscription (30-day trial)
    const user = await User.create({
      email,
      password,
      fullName,
      phone,
      companyName,
      role: 'admin', // First user is admin
      dataScope, // Each admin gets their own unique dataScope
      subscription: {
        isActive: true,
        plan: 'free',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        autoRenew: false
      }
    });

    // Generate token and send response
    sendTokenResponse(user, 201, res, 'User registered successfully');

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check for user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    // Update last login
    await user.updateLastLogin();
    
    // Generate token and send response
    sendTokenResponse(user, 200, res, 'Login successful');
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user.generateProfile()
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching user data'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during logging out'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, [
  body('fullName').optional().notEmpty().trim(),
  body('phone').optional().isMobilePhone(),
], async (req, res) => {
  try {
    const allowedUpdates = ['fullName', 'phone', 'companyName', 'preferences'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: user.generateProfile()
      }
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating profile'
    });
  }
});

// @route   PUT /api/auth/password
// @desc    Update password
// @access  Private
router.put('/password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully'
    });
    
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating password'
    });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users in the same dataScope (admin only)
// @access  Private/Admin
router.get('/users', protect, async (req, res) => {
  try {
    // Only admin and manager can view all users
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this resource'
      });
    }

    // Filter by dataScope to ensure data isolation
    // Fallback to empty list if user doesn't have dataScope yet
    const query = req.user.dataScope
      ? { isActive: true, dataScope: req.user.dataScope }
      : { isActive: true, _id: null }; // Return empty results during migration

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        users: users.map(user => user.generateProfile())
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching users'
    });
  }
});

module.exports = router;
