// A customer has lost their licence key and has no working machine to read it
// from. Issue a new one and mail it to the address on the licence.
//
// Keys are stored only as hashes (see lib/keys.js), so there is no original to
// look up - recovery necessarily means minting a replacement and retiring the
// old key. That is also the safer behaviour: a key that went missing should
// stop working.

const { handler } = require('../lib/http');
const { licences } = require('../lib/store');
const { generateLicenceKey, hashLicenceKey } = require('../lib/keys');
const mail = require('../lib/mail');
const box = require('../lib/crypto-box');

// How long before the same licence may be mailed again. Stops this endpoint
// being used to flood a customer's inbox, and stops a loop burning through key
// rotations.
const RESEND_INTERVAL_MS = 5 * 60 * 1000;

// The same answer whether or not the address has a licence. Anything else turns
// this into a way to ask which businesses are SerpY customers.
const NEUTRAL = {
  message:
    'If that email address has a SerpY licence, the key is on its way to it. ' +
    'Check your inbox, and your spam folder.',
};

module.exports = handler(async (req, res) => {
  const { email } = req.body || {};

  if (!email) {
    res.status(400).json({ message: 'Email is required' });
    return;
  }

  const normalisedEmail = String(email).trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisedEmail)) {
    res.status(400).json({ message: 'That email address does not look right' });
    return;
  }

  if (!mail.isConfigured()) {
    throw new Error('LICENCE_SMTP_HOST / LICENCE_SMTP_USER are not configured');
  }

  const collection = await licences();
  const record = await collection.findOne({ email: normalisedEmail, status: 'active' });

  if (!record) {
    res.status(200).json(NEUTRAL);
    return;
  }

  // Claim the send slot before doing any work, so two requests racing cannot
  // both get through the rate limit.
  const cutoff = new Date(Date.now() - RESEND_INTERVAL_MS);
  const claimed = await collection.updateOne(
    {
      _id: record._id,
      $or: [{ keyResentAt: { $exists: false } }, { keyResentAt: { $lt: cutoff } }],
    },
    { $set: { keyResentAt: new Date() } }
  );

  if (claimed.modifiedCount === 0) {
    // Already sent one in the last few minutes. Same answer as everything else
    // here - the previous email is on its way.
    res.status(200).json(NEUTRAL);
    return;
  }

  // Their existing key when there is a readable sealed copy, which leaves every
  // other machine untouched. Only records with nothing to unseal need a new key
  // minted, since a hash cannot be reversed.
  const existing = box.open(record.licenceKeySealed);
  const licenceKey = existing || generateLicenceKey();
  const rotated = !existing;

  // Mail first, persist second. If sending fails the record still holds the old
  // hash, so the customer can simply try again; the reverse order would retire
  // their key and leave them with nothing.
  try {
    await mail.sendLicenceKey({
      to: record.email,
      fullName: record.fullName,
      licenceKey,
      rotated,
    });
  } catch (err) {
    // Not surfaced to the caller: saying "sending failed" would confirm the
    // address has a licence. It goes to the log, where it is an ops problem.
    console.error('[recover-key] could not send to', record.email, err.message);
    res.status(200).json(NEUTRAL);
    return;
  }

  if (rotated) {
    await collection.updateOne(
      { _id: record._id },
      {
        $set: {
          licenceKeyHash: hashLicenceKey(licenceKey),
          ...(box.isConfigured() ? { licenceKeySealed: box.seal(licenceKey) } : {}),
          updatedAt: new Date(),
        },
      }
    );
  }

  res.status(200).json(NEUTRAL);
});
