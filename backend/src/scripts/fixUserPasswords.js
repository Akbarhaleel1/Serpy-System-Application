// Script to fix double-hashed passwords in existing users
// Run this once: node backend/src/scripts/fixUserPasswords.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env' });

const User = require('../models/User');

async function fixPasswords() {
  try {
    console.log('📁 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find().select('+password');
    console.log(`📊 Found ${users.length} users to check`);

    let fixedCount = 0;

    for (const user of users) {
      try {
        // Check if password looks like it might be double-hashed
        // A bcrypt hash always starts with $2a$, $2b$, or $2y$ and is 60 characters
        const passwordHash = user.password;

        // Try to compare a test password to see if this is already hashed
        // If the password field doesn't look like a proper single hash, skip
        if (!passwordHash.startsWith('$2')) {
          console.log(`⏭️  Skipping user ${user.email} - password format looks plain`);
          continue;
        }

        // Hash the password fresh (this fixes the double-hashing)
        // Disable the pre-save hook by setting a flag
        user.isModified('password', false); // Mark password as not modified

        // Now re-enable and re-hash
        user.password = user.password; // Keep the same hash for now

        // Actually, we can't fix this without the original password
        // So we'll need to delete all users instead
        console.log(`⚠️  User ${user.email} has hashed password - cannot restore`);
      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error.message);
      }
    }

    console.log(`\n⚠️  Double-hashed passwords cannot be recovered without original passwords.`);
    console.log(`💡 Solution: Delete all users and create new ones with the fixed backend.`);
    console.log(`\nRun this command in MongoDB to delete all users:`);
    console.log(`  db.users.deleteMany({})`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPasswords();
