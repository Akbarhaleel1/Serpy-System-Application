// Outbound mail for the licence service.
//
// Used for exactly one thing: sending a licence key to the address that bought
// it. The destination is always read from the licence record and never from the
// request, so asking for someone else's key cannot redirect it to you.

const nodemailer = require('nodemailer');

let transporter = null;

/** Whether recovery mail can be sent at all on this deployment. */
function isConfigured() {
  return Boolean(process.env.LICENCE_SMTP_HOST && process.env.LICENCE_SMTP_USER);
}

function getTransport() {
  if (transporter) return transporter;

  const port = Number(process.env.LICENCE_SMTP_PORT) || 587;

  transporter = nodemailer.createTransport({
    host: process.env.LICENCE_SMTP_HOST,
    port,
    // 465 is implicit TLS; everything else starts plain and upgrades
    secure: port === 465,
    auth: {
      user: process.env.LICENCE_SMTP_USER,
      // App passwords are commonly pasted out of the provider UI with spaces
      pass: (process.env.LICENCE_SMTP_PASS || '').replace(/\s+/g, ''),
    },
  });

  return transporter;
}

async function sendLicenceKey({ to, fullName, licenceKey, rotated = true }) {
  const from =
    process.env.LICENCE_MAIL_FROM || `"SerpY" <${process.env.LICENCE_SMTP_USER}>`;

  const greeting = fullName ? `Hello ${fullName},` : 'Hello,';

  // Only says the old key is dead when it actually is - which happens only for
  // licences issued before keys were kept in a readable form.
  const rotationNotice = rotated
    ? [
        'Your previous licence key no longer works. Computers already running SerpY',
        'will keep working, but enter this new key on each of them when convenient so',
        'they all hold the current one.',
        '',
      ]
    : [];

  const text = [
    greeting,
    '',
    'Here is your SerpY licence key:',
    '',
    `    ${licenceKey}`,
    '',
    'Enter it on the SerpY welcome screen to set up a computer.',
    '',
    ...rotationNotice,
    'If you did not ask for this, contact us — someone knows the email address',
    'your licence was bought with.',
    '',
    'SerpY',
  ].join('\n');

  await getTransport().sendMail({
    from,
    to,
    subject: 'Your SerpY licence key',
    text,
  });
}

module.exports = { isConfigured, sendLicenceKey };
