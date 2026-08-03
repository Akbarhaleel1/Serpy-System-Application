const mongoose = require('mongoose');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function migrateInvoicesToDataScope() {
  try {
    console.log('🔄 Starting Invoice DataScope Migration...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all invoices that don't have dataScope
    const invoicesWithoutDataScope = await Invoice.find({ dataScope: { $exists: false } });
    console.log(`📊 Found ${invoicesWithoutDataScope.length} invoices without dataScope\n`);

    if (invoicesWithoutDataScope.length === 0) {
      console.log('✅ All invoices already have dataScope! Migration not needed.\n');
      await mongoose.connection.close();
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Process each invoice
    for (const invoice of invoicesWithoutDataScope) {
      try {
        // Get the user who created this invoice
        const user = await User.findById(invoice.userId);

        if (!user) {
          console.log(`⚠️  User not found for invoice ${invoice._id} (userId: ${invoice.userId})`);
          errorCount++;
          continue;
        }

        // If user has dataScope, assign it to the invoice
        if (user.dataScope) {
          invoice.dataScope = user.dataScope;
          await invoice.save();
          console.log(`✅ Updated invoice ${invoice.invoiceNumber} → dataScope: ${user.dataScope}`);
          successCount++;
        } else {
          console.log(`⚠️  User ${user.email} has no dataScope (userId: ${user._id})`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing invoice ${invoice._id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successfully updated: ${successCount} invoices`);
    console.log(`   ❌ Errors/Skipped: ${errorCount} invoices`);
    console.log(`\n🎉 Migration completed!\n`);

    // Verify the migration
    const invoicesWithDataScope = await Invoice.find({ dataScope: { $exists: true } });
    console.log(`✅ Total invoices with dataScope: ${invoicesWithDataScope.length}\n`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateInvoicesToDataScope();
