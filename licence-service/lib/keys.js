// Licence key generation and verification.
//
// Keys are stored only as hashes. A leak of the licence database therefore
// cannot be turned into working licences, the same reason passwords are hashed.
// Plain SHA-256 is enough here: keys are 128 bits of randomness, not
// user-chosen, so there is nothing to brute force.

const crypto = require('crypto');

const GROUP = 5;
const GROUPS = 5;

/** Human-transcribable key, e.g. SERPY-4KD2M-8XQ1T-... */
function generateLicenceKey() {
  // Crockford-style alphabet: no I, L, O, U to avoid transcription mistakes
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const bytes = crypto.randomBytes(GROUP * GROUPS);

  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  const groups = [];

  for (let i = 0; i < GROUPS; i += 1) {
    groups.push(chars.slice(i * GROUP, (i + 1) * GROUP).join(''));
  }

  return `SERPY-${groups.join('-')}`;
}

function hashLicenceKey(key) {
  return crypto.createHash('sha256').update(key.trim().toUpperCase()).digest('hex');
}

/** Strong random password for the customer's scoped Atlas user. */
function generateDbPassword() {
  return crypto.randomBytes(24).toString('base64url');
}

module.exports = { generateLicenceKey, hashLicenceKey, generateDbPassword };
