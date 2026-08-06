// Step 1 of purchase: record the buyer and open a Razorpay order.
// No licence exists yet - one is minted only after payment is verified.

const { handler } = require('../lib/http');
const { licences } = require('../lib/store');

const PRICE_PAISE = Number(process.env.LICENCE_PRICE_PAISE || 0);

module.exports = handler(async (req, res) => {
  const { email, fullName, companyName } = req.body || {};

  if (!email || !fullName) {
    res.status(400).json({ message: 'Name and email are required' });
    return;
  }

  const normalisedEmail = String(email).trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisedEmail)) {
    res.status(400).json({ message: 'That email address does not look right' });
    return;
  }

  if (!PRICE_PAISE) {
    throw new Error('LICENCE_PRICE_PAISE is not configured');
  }

  const collection = await licences();

  // One purchase per email. A buyer returning before paying just gets a fresh
  // order; a buyer who already paid should be activating, not buying again.
  const existing = await collection.findOne({ email: normalisedEmail });

  if (existing?.status === 'active') {
    res.status(409).json({
      message: 'This email already has a licence. Use your licence key to activate.',
    });
    return;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not configured');
  }

  const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      amount: PRICE_PAISE,
      currency: 'INR',
      receipt: `serpy-${Date.now()}`,
      notes: { email: normalisedEmail, companyName: companyName || '' },
    }),
  });

  if (!orderResponse.ok) {
    const detail = await orderResponse.text();
    throw new Error(`Razorpay order creation failed: ${detail}`);
  }

  const order = await orderResponse.json();

  await collection.updateOne(
    { email: normalisedEmail },
    {
      $set: {
        email: normalisedEmail,
        fullName: String(fullName).trim(),
        companyName: (companyName || '').trim(),
        razorpayOrderId: order.id,
        status: 'pending',
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  res.status(200).json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    razorpayKeyId: keyId, // publishable, safe to hand to the client
  });
});
