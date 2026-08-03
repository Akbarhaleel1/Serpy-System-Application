/**
 * Verify DataScope Implementation Status
 *
 * This script checks which models have proper dataScope field
 * Run this to see what still needs to be updated
 *
 * Usage: node backend/scripts/verify-datascope.js
 */

const mongoose = require('mongoose');
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp';

// List of all models to check
const modelsToCheck = [
  'User',
  'Customer',
  'Inventory',
  'Job',
  'Invoice',
  'Payment',
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
  'Settings'
];

async function verifyDataScope() {
  try {
    console.log('Connecting to MongoDB...\n');
    await mongoose.connect(mongoUri);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('DataScope Implementation Status');
    console.log('═══════════════════════════════════════════════════════════\n');

    let completed = 0;
    let pending = 0;
    const results = [];

    for (const modelName of modelsToCheck) {
      try {
        const Model = mongoose.model(modelName);
        const schema = Model.schema;

        // Check if dataScope field exists in schema
        const hasDataScope = schema.paths.dataScope !== undefined;

        // Get sample data
        const totalDocs = await Model.countDocuments();
        const docsWithDataScope = await Model.countDocuments({ dataScope: { $exists: true } });
        const docsWithoutDataScope = totalDocs - docsWithDataScope;

        const status = hasDataScope ? '✅' : '❌';
        const completion = totalDocs > 0 ? Math.round((docsWithDataScope / totalDocs) * 100) : '—';

        results.push({
          model: modelName,
          hasField: hasDataScope,
          totalDocs,
          withDataScope: docsWithDataScope,
          withoutDataScope: docsWithoutDataScope,
          completion
        });

        if (hasDataScope && docsWithDataScope === totalDocs) {
          completed++;
        } else {
          pending++;
        }

        console.log(`${status} ${modelName.padEnd(20)} | Total: ${totalDocs.toString().padStart(5)} | DataScope: ${docsWithDataScope.toString().padStart(5)} | Pending: ${docsWithoutDataScope.toString().padStart(5)} | ${completion}%`);
      } catch (error) {
        console.log(`⊘ ${modelName.padEnd(20)} | Model not found or error`);
        pending++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`Summary: ${completed} completed, ${pending} pending\n`);

    // Models that still need updating
    const pendingModels = results.filter(r => !r.hasField || r.withoutDataScope > 0);
    if (pendingModels.length > 0) {
      console.log('Models Still Needing Updates:');
      pendingModels.forEach(r => {
        if (r.withoutDataScope > 0) {
          console.log(`  - ${r.model} (${r.withoutDataScope} records without dataScope)`);
        } else {
          console.log(`  - ${r.model} (schema field missing)`);
        }
      });
    } else {
      console.log('✅ All models are fully updated with dataScope!');
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  verifyDataScope();
}

module.exports = verifyDataScope;
