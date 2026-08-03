const express = require('express');
const { protect } = require('../middleware/auth');
const embeddedSignupService = require('../services/embeddedSignup.service');
const Settings = require('../models/Settings');

const router = express.Router();

// @route   POST /api/embedded-signup/exchange-token
// @desc    Exchange code → register phone → subscribe webhooks → save config to Settings
// @access  Private
router.post('/exchange-token', protect, async (req, res) => {
  try {
    const { code, waba_id, phone_number_id } = req.body;
    const userId = req.user._id;

    // Validate
    if (!code || !waba_id || !phone_number_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Code, WABA ID, and Phone Number ID are required'
      });
    }

    console.log('🔄 Initiating Embedded Signup exchange:', { waba_id, phone_number_id });

    // STEP 1: Exchange code for token
    const tokenData = await embeddedSignupService.exchangeCodeForToken(code);
    if (!tokenData.success) {
      console.error('❌ Token exchange failed:', tokenData.error);
      return res.status(400).json({
        status: 'error',
        message: tokenData.error || 'Token exchange failed'
      });
    }

    console.log('✅ Token exchanged successfully');

    // STEP 2: Register phone number
    const phoneRegistration = await embeddedSignupService.registerPhoneNumber(
      phone_number_id, tokenData.access_token
    );
    if (!phoneRegistration.success) {
      console.error('❌ Phone registration failed:', phoneRegistration.error);
      return res.status(400).json({
        status: 'error',
        message: phoneRegistration.error || 'Phone number registration failed'
      });
    }

    console.log('✅ Phone number registered successfully');

    // STEP 3: Subscribe to webhooks (non-blocking — don't fail if this fails)
    const webhookSubscription = await embeddedSignupService.subscribeToWebhooks(
      waba_id, tokenData.access_token
    );
    console.log('📢 Webhook subscription status:', webhookSubscription.success ? 'Success' : 'Failed');

    // STEP 4: Save to database inside Settings (upsert — one settings doc per user)
    const callbackUrl = `${process.env.BASE_URL || 'http://localhost:4001'}/api/whatsapp/webhook`;
    
    const settings = await Settings.findOneAndUpdate(
      { userId },
      {
        $set: {
          'whatsappIntegration.enabled': true,
          'whatsappIntegration.wabaId': waba_id,
          'whatsappIntegration.phoneNumberId': phone_number_id,
          'whatsappIntegration.accessToken': tokenData.access_token,
          'whatsappIntegration.setupMethod': 'embedded_signup',
          'whatsappIntegration.connectionStatus': 'connected',
          'whatsappIntegration.embeddedSignupData': {
            tokenExchangedAt: new Date(),
            phoneRegisteredAt: new Date(),
            webhookSubscribedAt: webhookSubscription.success ? new Date() : null
          },
          'whatsappIntegration.webhookConfig': {
            subscribedFields: webhookSubscription.subscribedFields || [],
            callbackUrl,
            verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '14551411'
          }
        }
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'WhatsApp Embedded Signup completed successfully',
      data: {
        wabaId: waba_id,
        phoneNumberId: phone_number_id,
        webhookSubscribed: webhookSubscription.success,
        settings: settings.whatsappIntegration
      }
    });
  } catch (error) {
    console.error('❌ Error in Embedded Signup:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during WhatsApp setup'
    });
  }
});

// @route   GET /api/embedded-signup/status
// @desc    Get current WhatsApp configuration status
// @access  Private
router.get('/status', protect, async (req, res) => {
  try {
    const settings = await Settings.findOne({ userId: req.user._id });
    if (!settings || !settings.whatsappIntegration || !settings.whatsappIntegration.wabaId) {
      return res.status(200).json({
        status: 'success',
        data: { isConfigured: false, connectionStatus: 'disconnected' }
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        isConfigured: true,
        setupMethod: settings.whatsappIntegration.setupMethod || 'manual',
        connectionStatus: settings.whatsappIntegration.connectionStatus || 'connected',
        wabaId: settings.whatsappIntegration.wabaId,
        phoneNumberId: settings.whatsappIntegration.phoneNumberId,
        enabled: settings.whatsappIntegration.enabled
      }
    });
  } catch (error) {
    console.error('❌ Get status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get WhatsApp status'
    });
  }
});

// @route   DELETE /api/embedded-signup/reset
// @desc    Reset/disconnect WhatsApp configuration
// @access  Private
router.delete('/reset', protect, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          'whatsappIntegration.enabled': false,
          'whatsappIntegration.wabaId': '',
          'whatsappIntegration.phoneNumberId': '',
          'whatsappIntegration.accessToken': '',
          'whatsappIntegration.setupMethod': 'manual',
          'whatsappIntegration.connectionStatus': 'disconnected',
          'whatsappIntegration.embeddedSignupData': null,
          'whatsappIntegration.webhookConfig': null
        }
      },
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'WhatsApp configuration reset successfully',
      data: { settings: settings?.whatsappIntegration }
    });
  } catch (error) {
    console.error('❌ Reset WhatsApp error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset configuration'
    });
  }
});

module.exports = router;
