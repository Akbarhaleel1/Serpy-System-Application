const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function verifyAndFixStaffDataScope() {
  try {
    console.log('🔄 Verifying Staff DataScope...\n');

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

    console.log(`📌 Admin dataScope: ${admin.dataScope}\n`);

    // Get staff member
    const staff = await User.findOne({ email: 'akdfd@gmail.com' });
    if (!staff) {
      console.log('❌ Staff member not found\n');
      await mongoose.connection.close();
      return;
    }

    console.log(`📌 Staff email: ${staff.email}`);
    console.log(`📌 Staff current dataScope: ${staff.dataScope || 'NONE'}`);
    console.log(`📌 Staff role: ${staff.role}`);
    console.log(`📌 Staff permissions: ${JSON.stringify(staff.permissions)}\n`);

    // If staff doesn't have dataScope, assign admin's dataScope
    if (!staff.dataScope) {
      staff.dataScope = admin.dataScope;
      await staff.save();
      console.log(`✅ Updated staff ${staff.email} with admin's dataScope: ${admin.dataScope}\n`);
    } else {
      console.log(`✅ Staff already has dataScope: ${staff.dataScope}\n`);
    }

    // Get all users in same dataScope as admin
    const sameDataScopeUsers = await User.find({ dataScope: admin.dataScope }).select('-password');
    console.log(`👥 Users in same dataScope (${admin.dataScope}):\n`);
    sameDataScopeUsers.forEach(user => {
      console.log(`   • ${user.email} (${user.role}) - ${user.fullName}`);
    });

    console.log(`\n🎉 Verification completed!\n`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run verification
verifyAndFixStaffDataScope();
