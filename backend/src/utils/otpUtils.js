const crypto = require('crypto');

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate a secure token for email verification links
 * @returns {string} Secure token
 */
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash OTP for secure storage
 * @param {string} otp - Plain OTP
 * @returns {string} Hashed OTP
 */
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Verify OTP against hash
 * @param {string} plainOTP - Plain OTP to verify
 * @param {string} hashedOTP - Hashed OTP from database
 * @returns {boolean} True if OTP matches
 */
const verifyOTP = (plainOTP, hashedOTP) => {
  const hashedInput = hashOTP(plainOTP);
  return hashedInput === hashedOTP;
};

/**
 * Generate email OTP template
 * @param {string} otp - 6-digit OTP
 * @param {string} fullName - User's full name
 * @returns {object} Email template with HTML and text versions
 */
const getOTPEmailTemplate = (otp, fullName) => {
  return {
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - SerpY ERP</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); padding: 30px; text-align: center; color: white; }
          .content { padding: 30px; background: #f9f9f9; }
          .otp-box { background: white; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #ff6b35; }
          .otp-code { font-size: 32px; font-weight: bold; color: #ff6b35; letter-spacing: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
            <p>SerpY ERP - Enterprise Resource Planning System</p>
          </div>
          
          <div class="content">
            <h2>Dear ${fullName},</h2>
            <p>Thank you for signing up for SerpY ERP! To complete your registration, please verify your email address using the OTP code below:</p>
            
            <div class="otp-box">
              <h3>Your Verification Code:</h3>
              <div class="otp-code">${otp}</div>
              <p>This code will expire in <strong>10 minutes</strong></p>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> Never share this code with anyone. If you didn't request this verification, please ignore this email.
            </div>
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
          </div>
          
          <div class="footer">
            <p>&copy; 2026 Synx Automation Private Limited. All rights reserved.</p>
            <p>Support: support@serpy.in</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Verify Your Email - SerpY ERP
      
      Dear ${fullName},
      
      Thank you for signing up for SerpY ERP! To complete your registration, please verify your email address using the OTP code below:
      
      Your Verification Code: ${otp}
      
      This code will expire in 10 minutes.
      
      Important: Never share this code with anyone. If you didn't request this verification, please ignore this email.
      
      If you have any questions or need assistance, please contact our support team at support@serpy.in.
      
      © 2026 Synx Automation Private Limited. All rights reserved.
    `
  };
};

module.exports = {
  generateOTP,
  generateSecureToken,
  hashOTP,
  verifyOTP,
  getOTPEmailTemplate
};
