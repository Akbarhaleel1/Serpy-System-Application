const express = require('express');
const { body, query } = require('express-validator');
const { protect } = require('../middleware/auth');

const router = express.Router();

// WhatsApp message template schema (stored in memory for now, could be moved to database)
const messageTemplates = [
  {
    id: 'proof_approval',
    name: 'Proof Approval',
    category: 'job_updates',
    template: 'Hi {{customerName}}, your proof for job {{jobNumber}} is ready for approval. Please review and confirm. - {{businessName}}',
    variables: ['customerName', 'jobNumber', 'businessName']
  },
  {
    id: 'job_completed',
    name: 'Job Completed',
    category: 'job_updates',
    template: 'Hi {{customerName}}, your job {{jobNumber}} has been completed and is ready for pickup. - {{businessName}}',
    variables: ['customerName', 'jobNumber', 'businessName']
  },
  {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    category: 'payments',
    template: 'Hi {{customerName}}, this is a friendly reminder that payment of ₹{{amount}} is due for invoice {{invoiceNumber}}. - {{businessName}}',
    variables: ['customerName', 'amount', 'invoiceNumber', 'businessName']
  },
  {
    id: 'delivery_update',
    name: 'Delivery Update',
    category: 'delivery',
    template: 'Hi {{customerName}}, your order {{jobNumber}} is out for delivery. Expected delivery time: {{deliveryTime}}. - {{businessName}}',
    variables: ['customerName', 'jobNumber', 'deliveryTime', 'businessName']
  },
  {
    id: 'welcome_message',
    name: 'Welcome Message',
    category: 'general',
    template: 'Welcome to {{businessName}}! Thank you for choosing our printing services. We\'ll keep you updated on your order status.',
    variables: ['businessName']
  }
];

// @route   GET /api/whatsapp/stats
// @desc    Get WhatsApp integration statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    // TODO: Implement real WhatsApp API integration
    // For now, return mock statistics
    const stats = {
      messagesSent: 0,
      deliveryRate: 98.4,
      responseRate: 76.2,
      activeContacts: 0,
      templatesUsed: messageTemplates.length,
      lastSync: new Date().toISOString()
    };
    
    res.status(200).json({
      status: 'success',
      data: { stats }
    });
  } catch (error) {
    console.error('Get WhatsApp stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching WhatsApp statistics'
    });
  }
});

// @route   GET /api/whatsapp/templates
// @desc    Get WhatsApp message templates
// @access  Private
router.get('/templates', protect, async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      data: { templates: messageTemplates }
    });
  } catch (error) {
    console.error('Get WhatsApp templates error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching WhatsApp templates'
    });
  }
});

// @route   POST /api/whatsapp/send
// @desc    Send WhatsApp message
// @access  Private
router.post('/send', protect, [
  body('phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
  body('templateId').notEmpty().withMessage('Template ID is required'),
  body('variables').isObject().withMessage('Variables must be an object'),
  body('customerId').optional().isMongoId()
], async (req, res) => {
  try {
    const { phoneNumber, templateId, variables, customerId } = req.body;
    
    const settings = await Settings.findOne({ userId: req.user._id });
    const { wabaId, phoneNumberId, accessToken } = settings?.whatsappIntegration || {};
    
    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({ status: 'error', message: 'WhatsApp API credentials are not configured.' });
    }

    // Prepare components if variables exist
    const components = [];
    if (variables && Object.keys(variables).length > 0) {
      // Create an array of parameters from the variables object values
      const parameters = Object.values(variables).map(val => ({ type: "text", text: String(val) }));
      components.push({
        type: "body",
        parameters
      });
    }

    // Call Meta API
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phoneNumber.replace(/[^0-9]/g, ''), // Strip non-numeric chars
        type: "template",
        template: {
          name: templateId,
          language: { code: "en_US" },
          ...(components.length > 0 && { components })
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Meta API Send Error:', data);
      return res.status(400).json({ status: 'error', message: data.error?.message || 'Failed to send message via Meta' });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'WhatsApp message sent successfully',
      data: { messageId: data.messages?.[0]?.id }
    });
    
  } catch (error) {
    console.error('Send WhatsApp message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while sending WhatsApp message'
    });
  }
});

// @route   POST /api/whatsapp/send-bulk
// @desc    Send bulk WhatsApp messages
// @access  Private
router.post('/send-bulk', protect, [
  body('recipients').isArray({ min: 1 }).withMessage('Recipients array is required'),
  body('recipients.*.phoneNumber').isMobilePhone().withMessage('Valid phone number is required'),
  body('recipients.*.templateId').notEmpty().withMessage('Template ID is required'),
  body('recipients.*.variables').isObject().withMessage('Variables must be an object')
], async (req, res) => {
  try {
    const { recipients } = req.body;
    
    const results = [];
    const errors = [];
    
    for (const recipient of recipients) {
      try {
        const template = messageTemplates.find(t => t.id === recipient.templateId);
        if (!template) {
          errors.push({
            phoneNumber: recipient.phoneNumber,
            error: 'Template not found'
          });
          continue;
        }
        
        // Replace variables in template
        let message = template.template;
        Object.keys(recipient.variables).forEach(key => {
          const placeholder = `{{${key}}}`;
          message = message.replace(new RegExp(placeholder, 'g'), recipient.variables[key]);
        });
        
        // TODO: Implement actual WhatsApp API call
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        results.push({
          messageId,
          status: 'sent',
          phoneNumber: recipient.phoneNumber,
          message,
          templateId: recipient.templateId,
          sentAt: new Date().toISOString()
        });
        
      } catch (error) {
        errors.push({
          phoneNumber: recipient.phoneNumber,
          error: error.message
        });
      }
    }
    
    res.status(200).json({
      status: 'success',
      message: `Bulk messages processed. ${results.length} sent, ${errors.length} failed`,
      data: {
        results,
        errors,
        summary: {
          total: recipients.length,
          sent: results.length,
          failed: errors.length
        }
      }
    });
    
  } catch (error) {
    console.error('Send bulk WhatsApp messages error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while sending bulk WhatsApp messages'
    });
  }
});

// @route   GET /api/whatsapp/webhook
// @desc    WhatsApp webhook endpoint (for receiving messages)
// @access  Public
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '14551411';
  
  if (mode === 'subscribe' && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
});

// @route   POST /api/whatsapp/webhook
// @desc    WhatsApp webhook endpoint (for receiving messages)
// @access  Public
router.post('/webhook', (req, res) => {
  try {
    const body = req.body;
    
    // TODO: Process incoming WhatsApp messages
    console.log('Received WhatsApp webhook:', body);
    
    // Handle different types of webhook events
    if (body.object === 'whatsapp_business_account') {
      body.entry.forEach(entry => {
        entry.changes.forEach(change => {
          if (change.field === 'messages') {
            // Process incoming messages
            console.log('New message received:', change.value);
          }
        });
      });
    }
    
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// @route   GET /api/whatsapp/contacts
// @desc    Get WhatsApp contacts
// @access  Private
router.get('/contacts', protect, async (req, res) => {
  try {
    // TODO: Implement real WhatsApp contacts API
    const contacts = [];
    
    res.status(200).json({
      status: 'success',
      data: { contacts }
    });
  } catch (error) {
    console.error('Get WhatsApp contacts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching WhatsApp contacts'
    });
  }
});

const Settings = require('../models/Settings');

// @route   GET /api/whatsapp/settings
// @desc    Get WhatsApp Business API settings
// @access  Private
router.get('/settings', protect, async (req, res) => {
  try {
    const settings = await Settings.getOrCreateSettings(req.user._id);
    res.status(200).json({
      status: 'success',
      data: { settings: settings.whatsappIntegration || {} }
    });
  } catch (error) {
    console.error('Get WhatsApp settings error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// @route   POST /api/whatsapp/settings
// @desc    Setup WhatsApp Business API settings
// @access  Private
router.post('/settings', protect, [
  body('enabled').optional().isBoolean(),
  body('wabaId').optional().isString(),
  body('phoneNumberId').optional().isString(),
  body('accessToken').optional().isString()
], async (req, res) => {
  try {
    const { enabled, wabaId, phoneNumberId, accessToken } = req.body;
    
    const updateData = {};
    if (enabled !== undefined) updateData['whatsappIntegration.enabled'] = enabled;
    if (wabaId !== undefined) updateData['whatsappIntegration.wabaId'] = wabaId;
    if (phoneNumberId !== undefined) updateData['whatsappIntegration.phoneNumberId'] = phoneNumberId;
    if (accessToken !== undefined) updateData['whatsappIntegration.accessToken'] = accessToken;
    
    const settings = await Settings.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateData },
      { new: true, upsert: true }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'WhatsApp Business API settings updated',
      data: { settings: settings.whatsappIntegration }
    });
  } catch (error) {
    console.error('WhatsApp setup error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// @route   GET /api/whatsapp/meta-templates
// @desc    Fetch templates from Meta Graph API
// @access  Private
router.get('/meta-templates', protect, async (req, res) => {
  try {
    const settings = await Settings.findOne({ userId: req.user._id });
    const { wabaId, accessToken } = settings?.whatsappIntegration || {};
    
    if (!wabaId || !accessToken) {
      return res.status(400).json({ status: 'error', message: 'WhatsApp Business API credentials not configured.' });
    }

    // Meta Graph API Bug: If you don't explicitly request fields, it sometimes throws an "Object does not exist" error for System Users
    const fields = 'name,status,category,language,components,id';
    const response = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates?fields=${fields}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Meta API Error (Fetch Templates):', data);
      return res.status(400).json({ status: 'error', message: data.error?.message || 'Failed to fetch templates from Meta' });
    }

    res.status(200).json({
      status: 'success',
      data: { templates: data.data || [] }
    });
  } catch (error) {
    console.error('Fetch Meta templates error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// @route   POST /api/whatsapp/meta-templates
// @desc    Create a new template via Meta Graph API
// @access  Private
router.post('/meta-templates', protect, [
  body('name').notEmpty().withMessage('Template name is required'),
  body('language').notEmpty().withMessage('Language is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('components').isArray().withMessage('Components must be an array')
], async (req, res) => {
  try {
    const settings = await Settings.findOne({ userId: req.user._id });
    const { wabaId, accessToken } = settings?.whatsappIntegration || {};
    
    if (!wabaId || !accessToken) {
      return res.status(400).json({ status: 'error', message: 'WhatsApp credentials not configured.' });
    }

    const { name, language, category, components } = req.body;

    const response = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, language, category, components })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Meta API Error (Create Template):', data);
      return res.status(400).json({ status: 'error', message: data.error?.error_user_msg || data.error?.message || 'Failed to create template' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Template created successfully',
      data: { templateId: data.id }
    });
  } catch (error) {
    console.error('Create Meta template error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// @route   DELETE /api/whatsapp/meta-templates/:name
// @desc    Delete a template via Meta Graph API
// @access  Private
router.delete('/meta-templates/:name', protect, async (req, res) => {
  try {
    const settings = await Settings.findOne({ userId: req.user._id });
    const { wabaId, accessToken } = settings?.whatsappIntegration || {};
    
    if (!wabaId || !accessToken) {
      return res.status(400).json({ status: 'error', message: 'WhatsApp credentials not configured.' });
    }

    const templateName = req.params.name;

    const response = await fetch(`https://graph.facebook.com/v19.0/${wabaId}/message_templates?name=${templateName}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Meta API Error (Delete Template):', data);
      return res.status(400).json({ status: 'error', message: data.error?.message || 'Failed to delete template' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Delete Meta template error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;