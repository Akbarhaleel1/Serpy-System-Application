const mongoose = require('mongoose');
const Settings = require('./src/models/Settings');
require('dotenv').config();

async function fixSettings() {
    try {
        await mongoose.connect('mongodb://localhost:27017/erp_system');
        console.log('📦 Connected to MongoDB');

        const result = await Settings.updateMany(
            { companyName: { $exists: false } },
            { $set: { companyName: 'My Company' } }
        );

        console.log(`✅ Fixed ${result.modifiedCount} settings objects without companyName`);

        const resultEmpty = await Settings.updateMany(
            { companyName: '' },
            { $set: { companyName: 'My Company' } }
        );
        console.log(`✅ Fixed ${resultEmpty.modifiedCount} settings objects with empty companyName`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixSettings();
