const axios = require('axios');

class EmbeddedSignupService {
  constructor() {
    this.graphApiBaseUrl = 'https://graph.facebook.com';
    this.apiVersion = 'v23.0';
  }

  /**
   * STEP 1: Exchange the code from Facebook Login for a business access token
   */
  async exchangeCodeForToken(code) {
    try {
      const url = `${this.graphApiBaseUrl}/${this.apiVersion}/oauth/access_token`;
      let params = {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        code: code,
        grant_type: 'authorization_code'
      };

      // Try without redirect_uri first (Embedded Signup specific)
      try {
        const response = await axios.get(url, { params });
        if (response.data.access_token) {
          return {
            success: true,
            access_token: response.data.access_token,
            token_type: response.data.token_type || 'bearer',
            expires_in: response.data.expires_in
          };
        }
      } catch (error) {
        // If that fails, try with redirect_uri
      }

      // Fallback: try with redirect_uri
      params.redirect_uri = process.env.FACEBOOK_REDIRECT_URI
        || 'https://www.facebook.com/connect/login_success.html';
      const response = await axios.get(url, { params });
      if (response.data.access_token) {
        return {
          success: true,
          access_token: response.data.access_token,
          token_type: response.data.token_type || 'bearer',
          expires_in: response.data.expires_in
        };
      }
      return { success: false, error: 'No access token received' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * STEP 2: Register phone number for Cloud API use
   */
  async registerPhoneNumber(phoneNumberId, accessToken) {
    try {
      const FIXED_PIN = process.env.WHATSAPP_TWO_STEP_PIN || '345621';
      const url = `${this.graphApiBaseUrl}/${this.apiVersion}/${phoneNumberId}/register`;
      const data = {
        messaging_product: 'whatsapp',
        pin: FIXED_PIN
      };
      const response = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.data.error) {
        return { success: true, data: response.data };
      }
      return { success: false, error: 'Phone number registration failed' };
    } catch (error) {
      // Handle "already registered" as success
      const errorMsg = error.response?.data?.error?.message || '';
      if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
        return { success: true, message: 'Phone number already registered' };
      }
      return { success: false, error: errorMsg || error.message };
    }
  }

  /**
   * STEP 3: Subscribe WABA to webhooks
   */
  async subscribeToWebhooks(wabaId, accessToken) {
    try {
      const url = `${this.graphApiBaseUrl}/${this.apiVersion}/${wabaId}/subscribed_apps`;
      const subscribedFields = [
        'messages',
        'message_template_status_update',
        'phone_number_name_update',
        'account_review_update',
        'phone_number_quality_update',
        'flows',
        'messaging_handovers',
        'account_settings_update',
        'message_echoes',
        'message_template_components_update',
        'message_template_quality_update',
        'account_alerts',
        'business_capability_update',
        'business_status_update'
      ];
      const response = await axios.post(url, {
        subscribed_fields: subscribedFields
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.data.success) {
        return { success: true, data: response.data, subscribedFields };
      }
      return { success: false, error: 'Webhook subscription failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

module.exports = new EmbeddedSignupService();
