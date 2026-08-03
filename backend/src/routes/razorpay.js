const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Map frontend plan names to the User subscription plan enum
const PLAN_MAP = { STARTER: 'basic', GROWTH: 'premium', ENTERPRISE: 'enterprise' };

const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Warn loudly at startup if Razorpay isn't configured with real credentials
const PLACEHOLDER_ID = 'rzp_test_1D5C4F7B8E9A0B1C';
const PLACEHOLDER_SECRET = 'your_test_secret';
const razorpayConfigured = RZP_KEY_ID && RZP_KEY_SECRET &&
  RZP_KEY_ID !== PLACEHOLDER_ID && RZP_KEY_SECRET !== PLACEHOLDER_SECRET;
if (!razorpayConfigured) {
  console.warn('⚠️  Razorpay is not configured with valid keys. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (a matching pair, same mode) in .env');
}

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: RZP_KEY_ID || PLACEHOLDER_ID,
  key_secret: RZP_KEY_SECRET || PLACEHOLDER_SECRET,
});

// Create order endpoint
router.post('/create-order', async (req, res) => {
  try {
    if (!razorpayConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway is not configured. Please add valid Razorpay API keys in the server .env (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET).',
        code: 'RAZORPAY_NOT_CONFIGURED',
      });
    }

    const { amount, currency, receipt, notes } = req.body;

    if (!amount || Number(amount) < 100) {
      return res.status(400).json({
        success: false,
        message: 'A valid amount (in paise, minimum 100) is required',
      });
    }

    const options = {
      amount: Math.round(Number(amount)), // Amount in paise
      currency: currency || 'INR',
      receipt: receipt,
      notes: notes,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      keyId: RZP_KEY_ID, // frontend must open checkout with the SAME key that created the order
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        notes: order.notes,
      },
    });
  } catch (error) {
    // Surface Razorpay's actual error so failures are diagnosable
    const rzpErr = error && error.error ? error.error : null;
    const statusCode = error && error.statusCode ? error.statusCode : 500;
    const description = rzpErr ? rzpErr.description : (error.message || 'Unknown error');
    console.error('Error creating Razorpay order:', statusCode, description);

    const friendly = statusCode === 401
      ? 'Razorpay authentication failed — the API key/secret in .env are invalid or do not match. Generate a fresh matching pair (same mode) from the Razorpay dashboard.'
      : 'Failed to create order';

    res.status(statusCode === 401 ? 502 : statusCode).json({
      success: false,
      message: friendly,
      error: description,
      code: rzpErr ? rzpErr.code : undefined,
    });
  }
});

// Verify payment endpoint (authenticated — activates the user's subscription)
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planName } = req.body;

    // Generate signature
    const generated_signature = crypto
      .createHmac('sha256', RZP_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Verify signature
    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // Activate the subscription for the authenticated user
    const plan = PLAN_MAP[planName] || 'basic';
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30); // 30-day cycle

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.subscription = {
      isActive: true,
      plan,
      startDate,
      endDate,
      autoRenew: true,
      lastOrderId: razorpay_order_id,
      lastPaymentId: razorpay_payment_id,
    };
    await user.save();

    console.log('✅ Payment verified & subscription activated:', {
      user: user.email, plan, orderId: razorpay_order_id, paymentId: razorpay_payment_id,
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      subscription: user.subscription,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message,
    });
  }
});

// Get order status
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await razorpay.orders.fetch(orderId);

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message,
    });
  }
});

// Get payment details
router.get('/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await razorpay.payments.fetch(paymentId);

    res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment',
      error: error.message,
    });
  }
});

module.exports = router;
