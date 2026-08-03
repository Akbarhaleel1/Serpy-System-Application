const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['signup', 'password_reset', 'email_verification'],
    default: 'signup'
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 600 // TTL of 10 minutes (600 seconds)
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

// Index for faster lookups
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ otp: 1 });

// Method to check if OTP is expired
otpSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

// Method to check if attempts exceeded
otpSchema.methods.isAttemptsExceeded = function() {
  return this.attempts >= this.maxAttempts;
};

// Method to increment attempts
otpSchema.methods.incrementAttempts = function() {
  this.attempts += 1;
  return this.save();
};

module.exports = mongoose.model('OTP', otpSchema);
