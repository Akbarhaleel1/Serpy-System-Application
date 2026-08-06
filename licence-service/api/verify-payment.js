// Step 2 of purchase: confirm the payment really happened, then provision.
//
// The signature check is the only thing standing between "clicked pay" and a
// working licence, so it is done server-side against Razorpay's secret. A
// client claiming success proves nothing.

const crypto = require('crypto');

const { handler } = require('../lib/http');
const { licences } = require('../lib/store');
const atlas = require('../lib/atlas');
const { generateLicenceKey, hashLicenceKey, generateDbPassword } = require('../lib/keys');

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
    console.warn('Rejected payment with bad signature for order', orderId);
    res.status(400).json({ message: 'Payment could not be verified' });
    return;
  }

  const collection = await licences();
  const record = await collection.findOne({ razorpayOrderId: orderId });

  if (!record) {
    res.status(404).json({ message: 'No purchase found for this order' });
    return;
  }

  // Someone replaying a successful verification should get their existing
  // licence back, not a second database.
  if (record.status === 'active') {
    res.status(200).json({
      alreadyIssued: true,
      message: 'This purchase is already complete. Use the licence key you were given.',
    });
    return;
  }

  // Derived from the record id so it is stable and collision-free
  const customerId = record._id.toString();
  const databaseName = `serpy_${customerId}`;
  const dbUsername = `serpy_${customerId}`;
  const dbPassword = generateDbPassword();

  await atlas.createScopedUser({
    username: dbUsername,
    password: dbPassword,
    databaseName,
  });

  const licenceKey = generateLicenceKey();

  await collection.updateOne(
    { _id: record._id },
    {
      $set: {
        status: 'active',
        licenceKeyHash: hashLicenceKey(licenceKey),
        razorpayPaymentId: paymentId,
        databaseName,
        dbUsername,
        dbPassword, // needed to re-issue the connection string on each activation
        paidAt: new Date(),
        activations: [],
        updatedAt: new Date(),
      },
    }
  );

  // The only time the plaintext key is ever available
  res.status(200).json({
    licenceKey,
    email: record.email,
    message: 'Payment confirmed. Keep this licence key safe.',
  });
});
