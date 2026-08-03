const mongoose = require('mongoose');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function verifyInvoiceDataScopeAccess() {
  try {
    console.log('🔍 Verifying Invoice DataScope Access...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get admin
    const admin = await User.findOne({ email: 'akbarhaleel508@gmail.com' });
    if (!admin) {
      console.log('❌ Admin not found\n');
      await mongoose.connection.close();
      return;
    }

    // Get staff
    const staff = await User.findOne({ email: 'akdfd@gmail.com' });
    if (!staff) {
      console.log('❌ Staff not found\n');
      await mongoose.connection.close();
      return;
    }

    console.log(`📋 DataScope Information:\n`);
    console.log(`   Admin (${admin.email}):`);
    console.log(`      • DataScope: ${admin.dataScope}`);
    console.log(`      • Role: ${admin.role}\n`);

    console.log(`   Staff (${staff.email}):`);
    console.log(`      • DataScope: ${staff.dataScope}`);
    console.log(`      • Role: ${staff.role}`);
    console.log(`      • Permissions: ${staff.permissions.join(', ')}\n`);

    // Check if datascopes match
    if (admin.dataScope === staff.dataScope) {
      console.log(`✅ DataScopes MATCH: Both users can access same data\n`);
    } else {
      console.log(`❌ DataScopes DO NOT MATCH: Users cannot access same data\n`);
    }

    // Find invoices for this dataScope
    const invoices = await Invoice.find({ dataScope: admin.dataScope });
    console.log(`📄 Invoices in DataScope (${admin.dataScope}):\n`);

    if (invoices.length === 0) {
      console.log(`   ⚠️  No invoices found in this dataScope\n`);
    } else {
      invoices.forEach((inv, index) => {
        console.log(`   ${index + 1}. Invoice #${inv.invoiceNumber}`);
        console.log(`      • Customer: ${inv.customerName}`);
        console.log(`      • Amount: ₹${inv.totalAmount}`);
        console.log(`      • Status: ${inv.status}`);
        console.log(`      • DataScope: ${inv.dataScope}\n`);
      });
    }

    // Simulate what staff would see when querying invoices
    console.log(`\n🔐 Simulating Staff Query:\n`);
    console.log(`   Query: { dataScope: "${staff.dataScope}", noGst: false }`);

    const staffVisibleInvoices = await Invoice.find({
      dataScope: staff.dataScope,
      noGst: false
    });

    console.log(`   Result: ${staffVisibleInvoices.length} invoices visible\n`);

    if (staffVisibleInvoices.length > 0) {
      console.log(`✅ SUCCESS: Staff can see invoices!\n`);
      staffVisibleInvoices.forEach((inv, index) => {
        console.log(`   ✓ ${index + 1}. ${inv.invoiceNumber} - ${inv.customerName}`);
      });
    } else {
      console.log(`❌ FAILURE: Staff cannot see any invoices\n`);
    }

    console.log(`\n🎉 Verification completed!\n`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run verification
verifyInvoiceDataScopeAccess();
