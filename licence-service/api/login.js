// Sign in with the email and password the business already uses, and get the
// licence key back.
//
// This is what lets someone set up a new computer without hunting for a key.
// The password is checked against the customer's own database rather than a
// copy kept here, so it is always the current one.
//
// Only the address the licence was bought with can be used - staff accounts are
// not known to this service, and are not meant to be: an employee should be
// signing in to a computer their administrator has already set up.

const bcrypt = require('bcryptjs');

const { handler } = require('../lib/http');
const { licences } = require('../lib/store');
const { findAccount } = require('../lib/customer-db');
const { generateLicenceKey, hashLicenceKey } = require('../lib/keys');
const box = require('../lib/crypto-box');

// This endpoint will happily test a password for anyone who asks, so it has to
// stop being useful long before a guessing attempt gets anywhere.
const MAX_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

// One message for every kind of failure. Saying which part was wrong tells a
// stranger whether an address is a customer, and whether a password was close.
const REJECTED = 'That email and password did not match. Check them and try again.';

module.exports = handler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  const normalisedEmail = String(email).trim().toLowerCase();

  const collection = await licences();
  const record = await collection.findOne({ email: normalisedEmail, status: 'active' });

  if (!record) {
    res.status(401).json({ message: REJECTED });
    return;
  }

  if (record.loginLockedUntil && new Date(record.loginLockedUntil) > new Date()) {
    res.status(429).json({
      message: 'Too many sign-in attempts. Try again in a few minutes.',
    });
    return;
  }

  let account;

  try {
    account = await findAccount(record, normalisedEmail);
  } catch (err) {
    // Their database being unreachable is our problem, not a bad password, and
    // must not be reported as one
    console.error('[login] cannot reach customer database', record.databaseName, err.message);
    res.status(503).json({
      message: 'Could not reach your SerpY database just now. Please try again shortly.',
    });
    return;
  }

  const matches = account?.password
    ? await bcrypt.compare(String(password), account.password)
    : false;

  if (!matches) {
    await registerFailure(collection, record);
    res.status(401).json({ message: REJECTED });
    return;
  }

  if (account.isActive === false) {
    res.status(403).json({
      message: 'That account has been deactivated. Ask your administrator to re-enable it.',
    });
    return;
  }

  // A licence key is stored sealed as well as hashed, so the usual answer is
  // the key they already have. Records predating that - or sealed under a
  // secret that has since changed - have no readable copy, so the only way to
  // hand them a working key is to issue a new one.
  let licenceKey = box.open(record.licenceKeySealed);
  let rotated = false;

  if (!licenceKey) {
    licenceKey = generateLicenceKey();
    rotated = true;
  }

  const update = {
    $set: { updatedAt: new Date() },
    $unset: { loginFailures: '', loginLockedUntil: '' },
  };

  if (rotated) {
    update.$set.licenceKeyHash = hashLicenceKey(licenceKey);
    if (box.isConfigured()) update.$set.licenceKeySealed = box.seal(licenceKey);
  }

  await collection.updateOne({ _id: record._id }, update);

  res.status(200).json({
    licenceKey,
    email: record.email,
    // Lets the app warn that other machines are holding a key that has just
    // stopped working
    rotated,
  });
});

/** Count a wrong password, and lock the licence once there are too many. */
async function registerFailure(collection, record) {
  const failures = (record.loginFailures || 0) + 1;

  const update = { $set: { loginFailures: failures } };
  if (failures >= MAX_ATTEMPTS) {
    update.$set.loginLockedUntil = new Date(Date.now() + LOCKOUT_MS);
    update.$set.loginFailures = 0;
  }

  await collection.updateOne({ _id: record._id }, update);
}
