const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getMailer, EmailNotConfiguredError } = require('../services/MailerService');

const router = express.Router();

// Every business using the desktop app sends from its own mailbox, so the
// transport is resolved per request from that user's saved SMTP settings
// (see services/MailerService.js) rather than from shared environment vars.

// Turns a missing/incomplete SMTP setup into a clear 400 instead of a 500
function respondToMailError(res, error, fallbackMessage) {
  if (error instanceof EmailNotConfiguredError) {
    return res.status(400).json({ status: 'error', message: error.message });
  }

  console.error(`❌ ${fallbackMessage}:`, error);
  return res.status(500).json({
    status: 'error',
    message: fallbackMessage,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Email service unavailable'
  });
}

// Email templates
const getEmailTemplate = (template, data) => {
  switch (template) {
    case 'staff-welcome':
      return {
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Welcome to SerpY ERP</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
              .content { padding: 30px; background: #f9f9f9; }
              .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
              .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to SerpY ERP</h1>
                <p>Your Enterprise Resource Planning System</p>
              </div>
              
              <div class="content">
                <h2>Dear ${data.fullName},</h2>
                <p>Welcome to ${data.companyName}! Your account has been created and you can now access the SerpY ERP system.</p>
                
                <div class="credentials">
                  <h3>Your Login Credentials:</h3>
                  <p><strong>Email:</strong> ${data.email}</p>
                  <p><strong>Password:</strong> ${data.password}</p>
                  <p><strong>Role:</strong> ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}</p>
                </div>
                
                <p>Please click the button below to login to your account:</p>
                <a href="${data.loginUrl}" class="button">Login to SerpY ERP</a>
                
                <p><strong>Important:</strong> For security reasons, please change your password after your first login.</p>
                
                <p>If you have any questions or need assistance, please contact our support team.</p>
              </div>
              
              <div class="footer">
                <p>&copy; 2026 ${data.companyName}. All rights reserved.</p>
                <p>Support: ${data.supportEmail}</p>
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Welcome to SerpY ERP
          
          Dear ${data.fullName},
          
          Welcome to ${data.companyName}! Your account has been created and you can now access the SerpY ERP system.
          
          Your Login Credentials:
          Email: ${data.email}
          Password: ${data.password}
          Role: ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}
          
          Please visit ${data.loginUrl} to login to your account.
          
          Important: For security reasons, please change your password after your first login.
          
          If you have any questions or need assistance, please contact our support team at ${data.supportEmail}.
          
          © 2026 ${data.companyName}. All rights reserved.
        `
      };
    
    default:
      return {
        html: `<p>Email template not found</p>`,
        text: `Email template not found`
      };
  }
};

// @route   POST /api/email/send
// @desc    Send email
// @access  Private
//
// Previously the 'staff-welcome' template was exempt from authentication and
// every other template only checked that an Authorization header existed
// without validating it - which left the company's mailbox open to anyone who
// could reach the API. Sending now always runs through `protect`, both to close
// that hole and because the sender's own SMTP settings are looked up from
// req.user. The protected /send-staff-credentials route below already covered
// the staff-welcome case.
router.post('/send', protect, async (req, res) => {
  try {
    const { to, subject, template, data } = req.body;

    // Validation
    if (!to || !subject || !template) {
      return res.status(400).json({
        status: 'error',
        message: 'Email recipient, subject, and template are required'
      });
    }

    const { transporter, from } = await getMailer(req.user);
    const emailContent = getEmailTemplate(template, data);

    const info = await transporter.sendMail({
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html: emailContent.html,
      text: emailContent.text
    });

    console.log('✅ Email sent successfully:', info.messageId);

    res.status(200).json({
      status: 'success',
      message: 'Email sent successfully',
      data: {
        messageId: info.messageId,
        recipient: to
      }
    });

  } catch (error) {
    respondToMailError(res, error, 'Failed to send email');
  }
});

// @route   POST /api/email/send-staff-credentials
// @desc    Send staff login credentials email
// @access  Private (admin/manager only)
router.post('/send-staff-credentials', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { to, fullName, email, password, role, loginUrl } = req.body;

    // Validation
    if (!to || !fullName || !email || !password || !role) {
      return res.status(400).json({
        status: 'error',
        message: 'All required fields must be provided: to, fullName, email, password, role'
      });
    }

    const { transporter, from, settings } = await getMailer(req.user);

    const emailContent = getEmailTemplate('staff-welcome', {
      fullName,
      email,
      password,
      role,
      loginUrl: loginUrl || 'https://app.serpy.in',
      // The staff member is joining the customer's business, not ours
      companyName: settings?.companyName || 'your organisation',
      supportEmail: settings?.companyEmail || ''
    });

    const info = await transporter.sendMail({
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject: 'Welcome to SerpY ERP - Your Login Credentials',
      html: emailContent.html,
      text: emailContent.text
    });

    console.log('✅ Staff credentials email sent successfully:', info.messageId);

    res.status(200).json({
      status: 'success',
      message: 'Staff credentials email sent successfully',
      data: {
        messageId: info.messageId,
        recipient: to
      }
    });

  } catch (error) {
    respondToMailError(res, error, 'Failed to send staff credentials email');
  }
});

// @route   POST /api/email/test-public
// @desc    Test email configuration without auth (for development)
// The old public /test-public route was removed: it sent mail through the
// configured mailbox with no authentication at all, which any host on the
// network (or any local process, in the desktop build) could abuse. Use the
// authenticated /test below instead.

// @route   POST /api/email/test
// @desc    Test email configuration
// @access  Private (admin only)
router.post('/test', protect, authorize('admin'), async (req, res) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({
        status: 'error',
        message: 'Test email recipient is required'
      });
    }

    const { transporter, from, settings } = await getMailer(req.user);

    // Surfaces bad credentials as a clear failure before anything is sent
    await transporter.verify();

    const companyName = settings?.companyName || 'SerpY ERP';

    const info = await transporter.sendMail({
      from,
      to,
      subject: 'SerpY ERP - Email Configuration Test',
      html: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email to verify that the email configuration is working correctly.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Business:</strong> ${companyName}</p>
      `,
      text: [
        'Email Configuration Test',
        '',
        'This is a test email to verify that the email configuration is working correctly.',
        '',
        `Time: ${new Date().toLocaleString()}`,
        `Business: ${companyName}`
      ].join('\n')
    });

    console.log('✅ Test email sent successfully:', info.messageId);

    res.status(200).json({
      status: 'success',
      message: 'Test email sent successfully',
      data: {
        messageId: info.messageId,
        recipient: to
      }
    });

  } catch (error) {
    respondToMailError(res, error, 'Failed to send test email');
  }
});

module.exports = router;
