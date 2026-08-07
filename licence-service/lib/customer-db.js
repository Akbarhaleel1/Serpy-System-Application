// Reaching into a customer's own database to check who is signing in.
//
// The alternative was keeping a copy of the owner's password here, which goes
// stale the moment they change it in the app. Their database already holds the
// real, current answer, and this service already holds the credentials to read
// it - so it asks the authoritative source instead of duplicating it.
//
// Read-only by intent: nothing here writes to customer data.

const { MongoClient } = require('mongodb');
const atlas = require('./atlas');

// Serverless invocations are reused, so hold connections open per customer
// rather than dialling Atlas again on every request.
const clients = new Map();

async function clientFor(record) {
  const existing = clients.get(record.dbUsername);
  if (existing) return existing;

  const uri = atlas.connectionString({
    username: record.dbUsername,
    password: record.dbPassword,
    databaseName: record.databaseName,
  });

  const connecting = new MongoClient(uri, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 8000,
  }).connect();

  clients.set(record.dbUsername, connecting);

  try {
    return await connecting;
  } catch (err) {
    // Do not cache a failed connection - the next request should retry
    clients.delete(record.dbUsername);
    throw err;
  }
}

/**
 * The account a sign-in attempt should be checked against.
 *
 * Normally the user whose email was typed. The fallback exists because the
 * owner account's email is editable during first-run setup: someone can buy a
 * licence as one address and set the business up under another, leaving the
 * typed address matching the licence but not any user. When that database has
 * exactly one administrator there is no ambiguity about who they mean.
 *
 * Returns null when there is no unambiguous account, which callers must treat
 * exactly like a wrong password.
 */
async function findAccount(record, email) {
  const client = await clientFor(record);
  // Mongoose pluralises and lowercases the model name
  const users = client.db(record.databaseName).collection('users');

  const byEmail = await users.findOne({ email: String(email).trim().toLowerCase() });
  if (byEmail) return byEmail;

  const admins = await users.find({ role: 'admin' }).limit(2).toArray();
  return admins.length === 1 ? admins[0] : null;
}

module.exports = { findAccount };
