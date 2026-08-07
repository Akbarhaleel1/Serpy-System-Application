// Step 1 of a support renewal: open a Razorpay order for another year.
//
// The licence itself is permanent - this only buys cloud sync, backups,
// updates and support. Nothing is extended here; that happens in
// verify-renewal once the payment is proven.

const { handler } = require('../lib/http');
const { licences } = require('../lib/store');
const { hashLicenceKey } = require('../lib/keys');

const SUPPORT_PRICE_PAISE = Number(process.env.SUPPORT_PRICE_PAISE || 0);

module.exports = handler(async (req, res) => {
  const { licenceKey } = req.body || {};

  if (!licenceKey) {
    res.status(400).json({ message: 'Licence key is required' });
    return;
  }

  if (!SUPPORT_PRICE_PAISE) {
    throw new Error('SUPPORT_PRICE_PAISE is not configured');
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured');
  }

  const collection = await licences();
  const record = await collection.findOne({
    licenceKeyHash: hashLicenceKey(licenceKey),
    status: 'active',
  });

  if (!record) {
    res.status(404).json({ message: 'That licence key is not recognised' });
    return;
  }

  const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      amount: SUPPORT_PRICE_PAISE,
      currency: 'INR',
      receipt: `serpy-renew-${Date.now()}`,
      notes: { email: record.email, kind: 'support-renewal' },
    }),
  });

  if (!orderResponse.ok) {
    const detail = await orderResponse.text();
    throw new Error(`Razorpay renewal order creation failed: ${detail}`);
  }

  const order = await orderResponse.json();

  // Recorded against the licence so verify-renewal can find its way back here
  // from nothing but the order id Razorpay hands the client.
  await collection.updateOne(
    { _id: record._id },
    { $set: { renewalOrderId: order.id, updatedAt: new Date() } }
  );

  res.status(200).json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    razorpayKeyId: keyId, // publishable, safe to hand to the client
    email: record.email,
  });
});
