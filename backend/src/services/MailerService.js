// Builds mail transports from the business's own saved settings.
//
// The hosted deployment served a single company, so SMTP lived in environment
// variables. The desktop product ships to many companies, each sending invoices
// from their own mailbox, and a packaged app has no .env at all - so settings
// come from the Settings document and env is only a fallback for the hosted
// build.

const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');
const User = require('../models/User');

class EmailNotConfiguredError extends Error {
  constructor() {
    super('Email is not set up yet. Add your SMTP details under Settings → Email.');
    this.name = 'EmailNotConfiguredError';
    this.statusCode = 400;
  }
}

/**
 * Find the Settings document representing this user's business.
 * Settings are keyed per user, but staff accounts share a business through
 * dataScope - so fall back to whichever account in that scope holds them.
 */
async function settingsFor(user) {
  if (!user?._id) return null;

  const own = await Settings.findOne({ userId: user._id });
  if (own) return own;

  if (!user.dataScope) return null;

  const peers = await User.find({ dataScope: user.dataScope }).select('_id');
  if (!peers.length) return null;

  return Settings.findOne({ userId: { $in: peers.map((p) => p._id) } });
}

function transportFromSettings(cfg) {
  // The schema defaults smtpSecure to true, which is wrong for the STARTTLS
  // ports most providers use. Trust the port when we have one.
  const port = cfg.smtpPort || 587;
  const secure = cfg.smtpPort ? cfg.smtpPort === 465 : Boolean(cfg.smtpSecure);

  return nodemailer.createTransport({
    host: cfg.smtpHost,
    port,
    secure,
    auth: {
      user: cfg.smtpUser,
      // App passwords are commonly pasted with spaces
      pass: (cfg.smtpPassword || '').replace(/\s+/g, ''),
    },
  });
}

function transportFromEnv() {
  if (!process.env.EMAIL_USER) return null;

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: (process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || '').replace(/\s+/g, ''),
    },
  });
}

/**
 * Transport plus the From header for the given user's business.
 * Throws EmailNotConfiguredError when nothing is set up.
 */
async function getMailer(user) {
  const settings = await settingsFor(user);
  const cfg = settings?.emailIntegration;

  if (cfg?.enabled && cfg.smtpHost && cfg.smtpUser) {
    const company = settings.companyName || 'SerpY';
    return {
      transporter: transportFromSettings(cfg),
      from: `"${company}" <${settings.companyEmail || cfg.smtpUser}>`,
      settings,
    };
  }

  const envTransport = transportFromEnv();
  if (envTransport) {
    const company = settings?.companyName || process.env.COMPANY_NAME || 'SerpY';
    return {
      transporter: envTransport,
      from: process.env.EMAIL_FROM || `"${company}" <${process.env.EMAIL_USER}>`,
      settings,
    };
  }

  throw new EmailNotConfiguredError();
}

module.exports = { getMailer, settingsFor, EmailNotConfiguredError };
