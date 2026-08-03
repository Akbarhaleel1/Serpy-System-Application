const mongoose = require('mongoose');
const Settings = require('./src/models/Settings');
require('dotenv').config();

async function forceCreateSettings() {
    try {
        await mongoose.connect('mongodb://localhost:27017/erp_system');
        const userId = '6987b421f0b7e7a5f4f03d53';

        await Settings.deleteOne({ userId });

        const settings = new Settings({
            userId,
            companyName: 'Print Arts',
            companyAddress: {
                street: 'Main Road',
                city: 'Ernakulam',
                state: 'Kerala',
                zipCode: '682001',
                country: 'India'
            }
        });

        await settings.save();
        console.log('✅ Settings created for user 6987b421f0b7e7a5f4f03d53');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

forceCreateSettings();
