/**
 * Migration: Add dataScope field to existing data
 *
 * This migration adds the dataScope field to all documents in collections that require it.
 * Run this before deploying the dataScope feature to production.
 *
 * Usage: node migrations/add-datascope-migration.js
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');

// Get database connection string
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp';

// List of models that need dataScope field
const modelsToUpdate = [
  'Customer',
  'Job',
  'Invoice',
  'Payment',
  'Inventory',
  'Task',
  'Staff',
  'Vendor',
  'Category',
  'Unit',
  'HsnCode',
  'Discount',
  'Event',
  'File',
  'Proof',
  'TimeEntry',
  'WalkInJob',
  'EmergencyOrder',
  'InventoryMovement',
  'PurchaseOrder',
  'PortalSession',
  'Settings'
];

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get all users and create a map of userId to dataScope
    console.log('\nFetching all users...');
    const users = await User.find().select('_id dataScope');
    const userDataScopeMap = new Map(users.map(u => [u._id.toString(), u.dataScope]));

    console.log(`Found ${users.length} users with dataScope`);

    // Update each model
    for (const modelName of modelsToUpdate) {
      try {
        const Model = mongoose.model(modelName);
        console.log(`\nUpdating ${modelName}...`);

        // Get all documents without dataScope
        const docsWithoutScope = await Model.find({ dataScope: { $exists: false } }).select('_id userId');

        if (docsWithoutScope.length === 0) {
          console.log(`  ✓ All ${modelName} documents already have dataScope`);
          continue;
        }

        // Update each document
        let successCount = 0;
        let failureCount = 0;

        for (const doc of docsWithoutScope) {
          try {
            const dataScope = userDataScopeMap.get(doc.userId.toString());

            if (!dataScope) {
              console.warn(`  ✗ No dataScope found for user ${doc.userId} in ${modelName} doc ${doc._id}`);
              failureCount++;
              continue;
            }

            await Model.findByIdAndUpdate(doc._id, { dataScope }, { new: true });
            successCount++;
          } catch (error) {
            console.error(`  ✗ Failed to update ${modelName} doc ${doc._id}:`, error.message);
            failureCount++;
          }
        }

        console.log(`  ✓ Updated ${successCount} documents, ${failureCount} failed`);
      } catch (error) {
        if (error.name === 'MongooseError' && error.message.includes('Model')) {
          console.log(`  ⊘ Model ${modelName} not found (skipping)`);
        } else {
          console.error(`  ✗ Error updating ${modelName}:`, error.message);
        }
      }
    }

    console.log('\n✓ Migration completed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

module.exports = migrate;
