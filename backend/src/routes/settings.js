const express = require('express');
const { body } = require('express-validator');
const Settings = require('../models/Settings');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const settingsValidation = [
  body('companyName').optional().notEmpty().withMessage('Company name cannot be empty').trim(),
  body('currency').optional().isIn(['INR', 'USD', 'EUR', 'GBP']).withMessage('Invalid currency'),
  body('timezone').optional().notEmpty().withMessage('Timezone cannot be empty'),
  body('dateFormat').optional().isIn(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).withMessage('Invalid date format'),
  body('timeFormat').optional().isIn(['12', '24']).withMessage('Invalid time format'),
  body('defaultPaymentTerms').optional().isInt({ min: 0, max: 365 }).withMessage('Payment terms must be between 0 and 365 days'),
  body('defaultJobPriority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid job priority'),
  body('sessionTimeout').optional().isInt({ min: 1, max: 24 }).withMessage('Session timeout must be between 1 and 24 hours')
];

// @route   GET /api/settings
// @desc    Get user settings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const settings = await Settings.getOrCreateSettings(req.user._id);

    res.status(200).json({
      status: 'success',
      data: { settings }
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching settings'
    });
  }
});

// @route   PUT /api/settings
// @desc    Update user settings
// @access  Private
router.put('/', protect, settingsValidation, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.userId;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const settings = await Settings.updateSettings(req.user._id, updateData);

    // Log activity
    await ActivityLog.logActivity({
      action: 'Settings Updated',
      description: 'User settings updated',
      entityType: 'system',
      entityId: settings._id,
      entityName: 'Settings',
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      
      severity: 'low',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Settings updated successfully',
      data: { settings }
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating settings'
    });
  }
});

// @route   PUT /api/settings/company
// @desc    Update company settings
// @access  Private
router.put('/company', protect, [
  body('companyName').notEmpty().withMessage('Company name is required').trim(),
  body('companyPhone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('companyEmail').optional().isEmail().withMessage('Valid email required'),
  body('companyWebsite').optional().isURL().withMessage('Valid website URL required'),
  body('gstNumber').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GST number format'),
  body('panNumber').optional().matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('Invalid PAN number format')
], async (req, res) => {
  try {
    const {
      companyName,
      companyLogo,
      companyAddress,
      companyPhone,
      companyEmail,
      companyWebsite,
      gstNumber,
      panNumber,
      paymentQRCode,
      bankName,
      accountNumber,
      ifscCode,
      branchName,
      upiId
    } = req.body;

    const updateData = {
      companyName,
      companyLogo,
      companyAddress,
      companyPhone,
      companyEmail,
      companyWebsite,
      gstNumber,
      panNumber,
      paymentQRCode,
      bankName,
      accountNumber,
      ifscCode,
      branchName,
      upiId
    };

    const settings = await Settings.updateSettings(req.user._id, updateData);

    // Log activity
    await ActivityLog.logActivity({
      action: 'Company Settings Updated',
      description: `Company settings updated for ${companyName}`,
      entityType: 'system',
      entityId: settings._id,
      entityName: 'Company Settings',
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      
      severity: 'medium',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Company settings updated successfully',
      data: { settings }
    });

  } catch (error) {
    console.error('Update company settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating company settings'
    });
  }
});

// @route   PUT /api/settings/business
// @desc    Update business settings
// @access  Private
router.put('/business', protect, [
  body('currency').isIn(['INR', 'USD', 'EUR', 'GBP']).withMessage('Invalid currency'),
  body('timezone').notEmpty().withMessage('Timezone is required'),
  body('dateFormat').isIn(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).withMessage('Invalid date format'),
  body('timeFormat').isIn(['12', '24']).withMessage('Invalid time format')
], async (req, res) => {
  try {
    const {
      currency,
      timezone,
      dateFormat,
      timeFormat,
      invoicePrefix,
      invoiceNumberFormat,
      invoiceFooter,
      invoiceTerms,
      defaultPaymentTerms,
      jobPrefix,
      jobNumberFormat,
      defaultJobPriority
    } = req.body;

    const updateData = {
      currency,
      timezone,
      dateFormat,
      timeFormat,
      invoicePrefix,
      invoiceNumberFormat,
      invoiceFooter,
      invoiceTerms,
      defaultPaymentTerms,
      jobPrefix,
      jobNumberFormat,
      defaultJobPriority
    };

    const settings = await Settings.updateSettings(req.user._id, updateData);

    // Log activity
    await ActivityLog.logActivity({
      action: 'Business Settings Updated',
      description: 'Business settings updated',
      entityType: 'system',
      entityId: settings._id,
      entityName: 'Business Settings',
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      
      severity: 'medium',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Business settings updated successfully',
      data: { settings }
    });

  } catch (error) {
    console.error('Update business settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating business settings'
    });
  }
});

// @route   PUT /api/settings/notifications
// @desc    Update notification settings
// @access  Private
router.put('/notifications', protect, async (req, res) => {
  try {
    const { emailNotifications, smsNotifications } = req.body;

    const updateData = {
      emailNotifications,
      smsNotifications
    };

    const settings = await Settings.updateSettings(req.user._id, updateData);

    // Log activity
    await ActivityLog.logActivity({
      action: 'Notification Settings Updated',
      description: 'Notification preferences updated',
      entityType: 'system',
      entityId: settings._id,
      entityName: 'Notification Settings',
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      
      severity: 'low',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Notification settings updated successfully',
      data: { settings }
    });

  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating notification settings'
    });
  }
});

// @route   PUT /api/settings/security
// @desc    Update security settings (admin only)
// @access  Private
router.put('/security', protect, authorize(['admin']), [
  body('sessionTimeout').isInt({ min: 1, max: 24 }).withMessage('Session timeout must be between 1 and 24 hours'),
  body('passwordPolicy.minLength').isInt({ min: 6, max: 20 }).withMessage('Password minimum length must be between 6 and 20')
], async (req, res) => {
  try {
    const {
      sessionTimeout,
      passwordPolicy,
      twoFactorAuth
    } = req.body;

    const updateData = {
      sessionTimeout,
      passwordPolicy,
      twoFactorAuth
    };

    const settings = await Settings.updateSettings(req.user._id, updateData);

    // Log activity
    await ActivityLog.logActivity({
      action: 'Security Settings Updated',
      description: 'Security settings updated',
      entityType: 'system',
      entityId: settings._id,
      entityName: 'Security Settings',
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      
      severity: 'high',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Security settings updated successfully',
      data: { settings }
    });

  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating security settings'
    });
  }
});

// @route   PUT /api/settings/integrations
// @desc    Update integration settings
// @access  Private
router.put('/integrations', protect, async (req, res) => {
  try {
    const {
      whatsappIntegration,
      emailIntegration
    } = req.body;

    const updateData = {
      whatsappIntegration,
      emailIntegration
    };

    const settings = await Settings.updateSettings(req.user._id, updateData);

    // Log activity
    await ActivityLog.logActivity({
      action: 'Integration Settings Updated',
      description: 'Integration settings updated',
      entityType: 'system',
      entityId: settings._id,
      entityName: 'Integration Settings',
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      
      severity: 'medium',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Integration settings updated successfully',
      data: { settings }
    });

  } catch (error) {
    console.error('Update integration settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating integration settings'
    });
  }
});

// @route   PUT /api/settings/custom-fields
// @desc    Update custom fields settings
// @access  Private
router.put('/custom-fields', protect, async (req, res) => {
  try {
    const { customFields } = req.body;

    const updateData = { customFields };

    const settings = await Settings.updateSettings(req.user._id, updateData);

    // Log activity
    await ActivityLog.logActivity({
      action: 'Custom Fields Updated',
      description: 'Custom fields configuration updated',
      entityType: 'system',
      entityId: settings._id,
      entityName: 'Custom Fields',
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      
      severity: 'low',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Custom fields updated successfully',
      data: { settings }
    });

  } catch (error) {
    console.error('Update custom fields error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating custom fields'
    });
  }
});

// @route   PUT /api/settings/theme
// @desc    Update theme settings
// @access  Private
router.put('/theme', protect, async (req, res) => {
  try {
    const { theme } = req.body;

    const updateData = { theme };

    const settings = await Settings.updateSettings(req.user._id, updateData);

    // Log activity
    await ActivityLog.logActivity({
      action: 'Theme Settings Updated',
      description: 'Theme preferences updated',
      entityType: 'system',
      entityId: settings._id,
      entityName: 'Theme Settings',
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      
      severity: 'low',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Theme settings updated successfully',
      data: { settings }
    });

  } catch (error) {
    console.error('Update theme settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating theme settings'
    });
  }
});

// @route   POST /api/settings/reset
// @desc    Reset settings to default (admin only)
// @access  Private
router.post('/reset', protect, authorize(['admin']), async (req, res) => {
  try {
    const { section } = req.body; // Optional: specific section to reset

    let updateData = {};
    
    if (!section || section === 'all') {
      // Reset all settings to default
      updateData = {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12',
        defaultPaymentTerms: 30,
        defaultJobPriority: 'medium',
        sessionTimeout: 8,
        invoicePrefix: 'INV',
        invoiceNumberFormat: 'INV-{YYYY}-{MM}-{####}',
        jobPrefix: 'JOB',
        jobNumberFormat: 'JOB-{YYYY}-{MM}-{####}',
        emailNotifications: {
          newJob: true,
          jobCompleted: true,
          paymentReceived: true,
          invoiceOverdue: true,
          lowStock: true,
          systemAlerts: true
        },
        smsNotifications: {
          newJob: false,
          jobCompleted: false,
          paymentReceived: false,
          invoiceOverdue: false
        },
        passwordPolicy: {
          minLength: 6,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: false,
          requireSpecialChars: false
        },
        twoFactorAuth: {
          enabled: false,
          requiredForAdmins: false
        },
        autoBackup: {
          enabled: true,
          frequency: 'daily',
          retentionDays: 30
        },
        theme: {
          primaryColor: '#3b82f6',
          secondaryColor: '#64748b',
          darkMode: false
        }
      };
    }

    const settings = await Settings.updateSettings(req.user._id, updateData);

    // Log activity
    await ActivityLog.logActivity({
      action: 'Settings Reset',
      description: `Settings reset to default${section ? ` (${section})` : ''}`,
      entityType: 'system',
      entityId: settings._id,
      entityName: 'Settings',
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      
      severity: 'high',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Settings reset to default successfully',
      data: { settings }
    });

  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while resetting settings'
    });
  }
});

module.exports = router;
