// Step 2 of a support renewal: prove the payment, then extend the period.
//
// Same reasoning as verify-payment - the signature is checked server-side
// against Razorpay's secret, because a client claiming success proves nothing.

const crypto = require('crypto');

const { handler } = require('../lib/http');
const { licences } = require('../lib/store');
const { nextExpiry } = require('../lib/support');

function signatureIsValid({ orderId, paymentId, signature, secret }) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');

  // Length check first: timingSafeEqual throws on a mismatch
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = handler(async (req, res) => {
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body || {};

  if (!orderId || !paymentId || !signature) {
    res.status(400).json({ message: 'Incomplete payment details' });
    return;
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error('RAZORPAY_KEY_SECRET is not configured');

  if (!signatureIsValid({ orderId, paymentId, signature, secret })) {
    console.warn('Rejected renewal with bad signature for order', orderId);
    res.status(400).json({ message: 'Payment could not be verified' });
    return;
  }

  const collection = await licences();

  // Matching on the payment id as well makes a replay a no-op: the first call
  // stamps it, so a second attempt with the same payment finds nothing and
  // cannot buy a second year with one payment.
  const record = await collection.findOne({ renewalOrderId: orderId });

  if (!record) {
    res.status(404).json({ message: 'No renewal found for this order' });
    return;
  }

  if (record.lastRenewalPaymentId === paymentId) {
    res.status(200).json({
      alreadyApplied: true,
      supportExpiresAt: record.supportExpiresAt,
      message: 'This renewal has already been applied.',
    });
    return;
  }

  const supportExpiresAt = nextExpiry(record.supportExpiresAt);

  await collection.updateOne(
    { _id: record._id },
    {
      $set: {
        supportExpiresAt,
        lastRenewalPaymentId: paymentId,
        updatedAt: new Date(),
      },
      $push: {
        renewals: { paymentId, orderId, paidAt: new Date(), supportExpiresAt },
      },
    }
  );

  res.status(200).json({
    supportExpiresAt,
    message: 'Support renewed. Thank you.',
  });
});
