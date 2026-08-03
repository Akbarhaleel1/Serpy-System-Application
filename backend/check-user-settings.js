const mongoose = require('mongoose');
const Settings = require('./src/models/Settings');
require('dotenv').config();

async function checkUserSettings() {
    try {
        await mongoose.connect('mongodb://localhost:27017/erp_system');
        const settings = await Settings.findOne({ userId: '6987b421f0b7e7a5f4f03d53' });
        console.log('SETTINGS_START');
        console.log(JSON.stringify(settings, null, 2));
        console.log('SETTINGS_END');
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkUserSettings();
