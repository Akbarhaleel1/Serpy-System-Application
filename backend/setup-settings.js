// Quick script to add default company settings
// Run this once to enable PDF generation

const mongoose = require('mongoose');
const Settings = require('./src/models/Settings');

async function setupDefaultSettings() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/erp_system');

        console.log('Connected to MongoDB');

        // Get the first user ID (you'll need to replace this with actual user ID)
        const User = require('./src/models/User');
        const user = await User.findOne();

        if (!user) {
            console.error('No users found. Please create a user first.');
            process.exit(1);
        }

        // Create or update settings
        const settings = await Settings.findOneAndUpdate(
            { userId: user._id },
            {
                companyName: 'Your Company Name',
                companyAddress: {
                    street: '123 Main Street',
                    city: 'Your City',
                    state: 'Your State',
                    zipCode: '123456',
                    country: 'India'
                },
                companyPhone: '+91 1234567890',
                companyEmail: 'info@yourcompany.com',
                companyWebsite: 'www.yourcompany.com',
                gstNumber: '29ABCDE1234F1Z5',
                panNumber: 'ABCDE1234F',
                invoiceTerms: 'Payment due within 30 days',
                invoiceFooter: 'Thank you for your business!',
                userId: user._id
            },
            { upsert: true, new: true, runValidators: true }
        );

        console.log('✅ Settings created successfully:');
        console.log('Company Name:', settings.companyName);
        console.log('GST Number:', settings.gstNumber);
        console.log('\n✅ You can now generate PDFs!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

setupDefaultSettings();
