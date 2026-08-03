const mongoose = require('mongoose');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const HsnCode = require('../models/HsnCode');
const SacCode = require('../models/SacCode');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function assignDataScopeToAdmin() {
  try {
    console.log('🔄 Starting Admin DataScope Assignment...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find admin user without dataScope
    const admin = await User.findOne({ email: 'akbarhaleel508@gmail.com' });

    if (!admin) {
      console.log('❌ Admin user not found with email: akbarhaleel508@gmail.com\n');
      await mongoose.connection.close();
      return;
    }

    if (admin.dataScope) {
      console.log(`✅ Admin already has dataScope: ${admin.dataScope}\n`);
      await mongoose.connection.close();
      return;
    }

    // Generate unique dataScope for admin
    const dataScope = `scope_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    console.log(`📌 Generated dataScope for admin: ${dataScope}\n`);

    // Update admin with dataScope
    admin.dataScope = dataScope;
    await admin.save();
    console.log(`✅ Updated admin ${admin.email} with dataScope: ${dataScope}\n`);

    // Update all invoices created by this admin
    const invoiceResult = await Invoice.updateMany(
      { userId: admin._id, dataScope: { $exists: false } },
      { $set: { dataScope } }
    );
    console.log(`📄 Invoices updated: ${invoiceResult.modifiedCount}\n`);

    // Update all customers created by this admin
    const customerResult = await Customer.updateMany(
      { userId: admin._id, dataScope: { $exists: false } },
      { $set: { dataScope } }
    );
    console.log(`👥 Customers updated: ${customerResult.modifiedCount}\n`);

    // Update all inventory items created by this admin
    const inventoryResult = await Inventory.updateMany(
      { userId: admin._id, dataScope: { $exists: false } },
      { $set: { dataScope } }
    );
    console.log(`📦 Inventory items updated: ${inventoryResult.modifiedCount}\n`);

    // Update all HSN codes created by this admin
    const hsnResult = await HsnCode.updateMany(
      { userId: admin._id, dataScope: { $exists: false } },
      { $set: { dataScope } }
    );
    console.log(`🔤 HSN Codes updated: ${hsnResult.modifiedCount}\n`);

    // Update all SAC codes created by this admin
    const sacResult = await SacCode.updateMany(
      { userId: admin._id, dataScope: { $exists: false } },
      { $set: { dataScope } }
    );
    console.log(`🔤 SAC Codes updated: ${sacResult.modifiedCount}\n`);

    // Update all staff/managers created by this admin
    const staffResult = await User.updateMany(
      { createdBy: admin._id, dataScope: { $exists: false } },
      { $set: { dataScope } }
    );
    console.log(`👤 Staff/Managers updated: ${staffResult.modifiedCount}\n`);

    console.log('📊 Summary:');
    console.log(`   ✅ Admin dataScope assigned: ${dataScope}`);
    console.log(`   ✅ Invoices updated: ${invoiceResult.modifiedCount}`);
    console.log(`   ✅ Customers updated: ${customerResult.modifiedCount}`);
    console.log(`   ✅ Inventory items updated: ${inventoryResult.modifiedCount}`);
    console.log(`   ✅ HSN Codes updated: ${hsnResult.modifiedCount}`);
    console.log(`   ✅ SAC Codes updated: ${sacResult.modifiedCount}`);
    console.log(`   ✅ Staff/Managers updated: ${staffResult.modifiedCount}`);
    console.log(`\n🎉 DataScope assignment completed!\n`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the assignment
assignDataScopeToAdmin();
