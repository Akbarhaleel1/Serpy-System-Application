// Licence records: who bought, what they may access, and where.
//
// This is our own small database, entirely separate from the per-customer
// databases the app writes to. Serverless functions reuse one connection across
// invocations via a module-level promise, otherwise every request would open a
// new pool.

const { MongoClient } = require('mongodb');

let clientPromise = null;

function getClient() {
  if (!clientPromise) {
    const uri = process.env.LICENCE_DB_URI;
    if (!uri) throw new Error('LICENCE_DB_URI is not configured');

    clientPromise = new MongoClient(uri, { maxPoolSize: 5 }).connect();
  }

  return clientPromise;
}

async function licences() {
  const client = await getClient();
  const collection = client.db('serpy_licences').collection('licences');

  // Cheap and idempotent; Mongo skips it once the index exists.
  //
  // sparse: true matters here. A record only gets licenceKeyHash once payment
  // is verified - at signup it has none. A plain unique index treats every
  // document missing the field as equal to null, so only the first signup ever
  // would succeed and all later ones would collide on that shared "null" slot.
  // sparse excludes fieldless documents from the index entirely, so uniqueness
  // is enforced only once a real hash exists.
  await collection.createIndex({ licenceKeyHash: 1 }, { unique: true, sparse: true });
  await collection.createIndex({ email: 1 });
  await collection.createIndex({ razorpayOrderId: 1 });

  return collection;
}

module.exports = { licences };
