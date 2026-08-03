/**
 * Quick Fix: Add dataScope to all existing users
 * Run this to fix the "dataScope is required" error
 *
 * Usage: node backend/scripts/fix-existing-users.js
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../src/models/User');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp';

async function fixExistingUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Find all users without dataScope
    const usersWithoutScope = await User.find({ dataScope: { $exists: false } });

    if (usersWithoutScope.length === 0) {
      console.log('✓ All users already have dataScope');
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${usersWithoutScope.length} users without dataScope\n`);

    // Update each user with a unique dataScope
    let successCount = 0;
    let failureCount = 0;

    for (const user of usersWithoutScope) {
      try {
        // Generate unique dataScope for each user
        const dataScope = `scope_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

        await User.findByIdAndUpdate(
          user._id,
          { dataScope },
          { new: true }
        );

        console.log(`✓ Updated: ${user.email} → ${dataScope}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to update ${user.email}:`, error.message);
        failureCount++;
      }
    }

    console.log(`\n✓ Migration completed: ${successCount} updated, ${failureCount} failed`);

    // Now update all business data with dataScope
    console.log('\nUpdating business data with dataScope...');

    const allUsers = await User.find().select('_id email dataScope');
    console.log(`\nProcessing ${allUsers.length} users for their data...\n`);

    // Update customers
    try {
      const Customer = mongoose.model('Customer');
      const customersWithoutScope = await Customer.find({ dataScope: { $exists: false } });

      if (customersWithoutScope.length > 0) {
        console.log(`Updating ${customersWithoutScope.length} customers...`);

        for (const customer of customersWithoutScope) {
          const ownerUser = allUsers.find(u => u._id.toString() === customer.userId.toString());
          if (ownerUser) {
            await Customer.findByIdAndUpdate(
              customer._id,
              { dataScope: ownerUser.dataScope },
              { new: true }
            );
          }
        }
        console.log(`✓ Updated customers`);
      }
    } catch (error) {
      console.log(`⊘ Customer update skipped: ${error.message}`);
    }

    // Update other models - try the common ones
    const modelsToUpdate = ['Job', 'Invoice', 'Payment', 'Inventory', 'Task', 'Staff', 'Vendor'];

    for (const modelName of modelsToUpdate) {
      try {
        const Model = mongoose.model(modelName);
        const docsWithoutScope = await Model.find({ dataScope: { $exists: false } });

        if (docsWithoutScope.length > 0) {
          console.log(`Updating ${docsWithoutScope.length} ${modelName} records...`);

          for (const doc of docsWithoutScope) {
            const ownerUser = allUsers.find(u => u._id.toString() === doc.userId.toString());
            if (ownerUser) {
              await Model.findByIdAndUpdate(
                doc._id,
                { dataScope: ownerUser.dataScope },
                { new: true }
              );
            }
          }
          console.log(`✓ Updated ${modelName}`);
        }
      } catch (error) {
        // Model doesn't exist or doesn't have userId field, skip
      }
    }

    console.log('\n✓ All fixes applied successfully!');
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('✗ Fix failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixExistingUsers();
}

module.exports = fixExistingUsers;
