// Setup aid: shows which configuration is present without revealing any of it.
//
// Every other endpoint answers a generic 500 when something is unset, which is
// right for strangers but useless while wiring the service up. This reports
// only whether each variable exists - never a value, so a leaked response
// discloses nothing usable.

const REQUIRED = [
  'LICENCE_DB_URI',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'LICENCE_PRICE_PAISE',
  'SUPPORT_PRICE_PAISE',
  'ATLAS_PUBLIC_KEY',
  'ATLAS_PRIVATE_KEY',
  'ATLAS_PROJECT_ID',
  'ATLAS_CLUSTER_NAME',
  'ATLAS_CLUSTER_HOST',
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const missing = REQUIRED.filter((name) => !process.env[name]);

  // Razorpay keys are prefixed rzp_test_ / rzp_live_, so this says which mode
  // is active without exposing the key itself
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const razorpayMode = keyId.startsWith('rzp_live_')
    ? 'live'
    : keyId.startsWith('rzp_test_')
      ? 'test'
      : 'unknown';

  res.status(missing.length ? 503 : 200).json({
    ready: missing.length === 0,
    missing,
    razorpayMode,
    maxMachinesPerLicence: Number(process.env.LICENCE_MAX_MACHINES || 3),
    // Not in REQUIRED: the service still sells and activates licences without
    // it. What breaks is customers recovering a lost key on their own.
    canMailLostKeys: Boolean(
      process.env.LICENCE_SMTP_HOST && process.env.LICENCE_SMTP_USER
    ),
    // Without it, signing in still works but rotates the customer's licence key
    // every time, which breaks the key their other machines hold
    sealsLicenceKeys: Boolean(process.env.LICENCE_KEY_SECRET),
    // Confirms the prices are what you think they are before real money moves
    priceRupees: process.env.LICENCE_PRICE_PAISE
      ? Number(process.env.LICENCE_PRICE_PAISE) / 100
      : null,
    supportPriceRupees: process.env.SUPPORT_PRICE_PAISE
      ? Number(process.env.SUPPORT_PRICE_PAISE) / 100
      : null,
  });
};
