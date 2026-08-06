// Step 3: a licensed machine exchanges its key for scoped database credentials.
//
// Called by the Electron main process, not the renderer. Each installation is
// counted so one purchase cannot quietly serve an unlimited number of
// businesses.

const { handler } = require('../lib/http');
const { licences } = require('../lib/store');
const atlas = require('../lib/atlas');
const { hashLicenceKey } = require('../lib/keys');

const MAX_MACHINES = Number(process.env.LICENCE_MAX_MACHINES || 3);

module.exports = handler(async (req, res) => {
  const { licenceKey, machineId } = req.body || {};

  if (!licenceKey || !machineId) {
    res.status(400).json({ message: 'Licence key and machine id are required' });
    return;
  }

  const collection = await licences();
  const record = await collection.findOne({ licenceKeyHash: hashLicenceKey(licenceKey) });

  if (!record) {
    res.status(404).json({ message: 'That licence key was not recognised' });
    return;
  }

  // Checked before the general status test so a refunded customer gets a
  // truthful answer instead of "not recognised"
  if (record.status === 'revoked') {
    res.status(403).json({ message: 'This licence has been revoked' });
    return;
  }

  if (record.status !== 'active') {
    res.status(404).json({ message: 'That licence key was not recognised' });
    return;
  }

  const activations = record.activations || [];
  const known = activations.find((a) => a.machineId === machineId);

  if (!known && activations.length >= MAX_MACHINES) {
    res.status(403).json({
      message: `This licence is already active on ${MAX_MACHINES} machines. Deactivate one first, or contact support.`,
    });
    return;
  }

  if (known) {
    // Reinstall or update on a machine we have already seen
    await collection.updateOne(
      { _id: record._id, 'activations.machineId': machineId },
      { $set: { 'activations.$.lastSeenAt': new Date() } }
    );
  } else {
    // Guard against two machines racing through the last remaining slot
    const claimed = await collection.updateOne(
      {
        _id: record._id,
        [`activations.${MAX_MACHINES - 1}`]: { $exists: false },
        'activations.machineId': { $ne: machineId },
      },
      {
        $push: {
          activations: { machineId, activatedAt: new Date(), lastSeenAt: new Date() },
        },
      }
    );

    if (claimed.modifiedCount === 0) {
      res.status(403).json({
        message: `This licence is already active on ${MAX_MACHINES} machines.`,
      });
      return;
    }
  }

  res.status(200).json({
    customerId: record._id.toString(),
    email: record.email,
    mongoUri: atlas.connectionString({
      username: record.dbUsername,
      password: record.dbPassword,
      databaseName: record.databaseName,
    }),
  });
});
