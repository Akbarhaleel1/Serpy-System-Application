const mongoose = require('mongoose');
const HsnCode = require('./models/HsnCode');

// Sample HSN codes data for printing and stationery business
const sampleHsnCodes = [
  // Paper & Stationery
  {
    hsnCode: '48021010',
    description: 'Uncoated paper, hand-made sheets for writing/printing',
    gstRate: 12,
    type: 'product',
    category: 'Paper & Stationery',
    subCategory: 'Paper',
    notes: 'Hand-made paper sheets'
  },
  {
    hsnCode: '48025610',
    description: 'A4 / Copy paper',
    gstRate: 12,
    type: 'product',
    category: 'Paper & Stationery',
    subCategory: 'Paper',
    notes: 'Standard office paper'
  },
  {
    hsnCode: '48025620',
    description: 'A3 / Copy paper',
    gstRate: 12,
    type: 'product',
    category: 'Paper & Stationery',
    subCategory: 'Paper',
    notes: 'Large format paper'
  },
  {
    hsnCode: '48025630',
    description: 'A5 / Copy paper',
    gstRate: 12,
    type: 'product',
    category: 'Paper & Stationery',
    subCategory: 'Paper',
    notes: 'Small format paper'
  },
  {
    hsnCode: '48025640',
    description: 'Letter size paper',
    gstRate: 12,
    type: 'product',
    category: 'Paper & Stationery',
    subCategory: 'Paper',
    notes: 'US letter size'
  },
  {
    hsnCode: '48025650',
    description: 'Legal size paper',
    gstRate: 12,
    type: 'product',
    category: 'Paper & Stationery',
    subCategory: 'Paper',
    notes: 'US legal size'
  },
  {
    hsnCode: '48025660',
    description: 'Cardboard paper',
    gstRate: 12,
    type: 'product',
    category: 'Paper & Stationery',
    subCategory: 'Paper',
    notes: 'Thick cardboard sheets'
  },
  {
    hsnCode: '48025670',
    description: 'Art paper',
    gstRate: 12,
    type: 'product',
    category: 'Paper & Stationery',
    subCategory: 'Paper',
    notes: 'High quality art paper'
  },
  {
    hsnCode: '48025680',
    description: 'Glossy paper',
    gstRate: 12,
    type: 'product',
    category: 'Paper & Stationery',
    subCategory: 'Paper',
    notes: 'Glossy finish paper'
  },
  {
    hsnCode: '48025690',
    description: 'Matte paper',
    gstRate: 12,
    type: 'product',
    category: 'Paper & Stationery',
    subCategory: 'Paper',
    notes: 'Matte finish paper'
  },

  // Printing Services
  {
    hsnCode: '9983',
    description: 'Printing services',
    gstRate: 18,
    type: 'service',
    category: 'Printing Services',
    subCategory: 'General Printing',
    notes: 'General printing services'
  },
  {
    hsnCode: '99831',
    description: 'Digital printing services',
    gstRate: 18,
    type: 'service',
    category: 'Printing Services',
    subCategory: 'Digital Printing',
    notes: 'Digital printing services'
  },
  {
    hsnCode: '99832',
    description: 'Offset printing services',
    gstRate: 18,
    type: 'service',
    category: 'Printing Services',
    subCategory: 'Offset Printing',
    notes: 'Offset printing services'
  },
  {
    hsnCode: '99833',
    description: 'Screen printing services',
    gstRate: 18,
    type: 'service',
    category: 'Printing Services',
    subCategory: 'Screen Printing',
    notes: 'Screen printing services'
  },
  {
    hsnCode: '99834',
    description: 'Flex printing services',
    gstRate: 18,
    type: 'service',
    category: 'Printing Services',
    subCategory: 'Flex Printing',
    notes: 'Flex printing services'
  },
  {
    hsnCode: '99835',
    description: 'Vinyl printing services',
    gstRate: 18,
    type: 'service',
    category: 'Printing Services',
    subCategory: 'Vinyl Printing',
    notes: 'Vinyl printing services'
  },
  {
    hsnCode: '99836',
    description: 'Banner printing services',
    gstRate: 18,
    type: 'service',
    category: 'Printing Services',
    subCategory: 'Banner Printing',
    notes: 'Banner printing services'
  },
  {
    hsnCode: '99837',
    description: 'Poster printing services',
    gstRate: 18,
    type: 'service',
    category: 'Printing Services',
    subCategory: 'Poster Printing',
    notes: 'Poster printing services'
  },
  {
    hsnCode: '99838',
    description: 'Brochure printing services',
    gstRate: 18,
    type: 'service',
    category: 'Printing Services',
    subCategory: 'Brochure Printing',
    notes: 'Brochure printing services'
  },
  {
    hsnCode: '99839',
    description: 'Business card printing services',
    gstRate: 18,
    type: 'service',
    category: 'Printing Services',
    subCategory: 'Business Card Printing',
    notes: 'Business card printing services'
  },

  // Printed Materials
  {
    hsnCode: '49011010',
    description: 'Printed books, brochures',
    gstRate: 0,
    type: 'product',
    category: 'Printed Materials',
    subCategory: 'Books',
    notes: 'Educational materials'
  },
  {
    hsnCode: '49011020',
    description: 'Printed brochures',
    gstRate: 0,
    type: 'product',
    category: 'Printed Materials',
    subCategory: 'Brochures',
    notes: 'Marketing brochures'
  },
  {
    hsnCode: '49011030',
    description: 'Printed pamphlets',
    gstRate: 0,
    type: 'product',
    category: 'Printed Materials',
    subCategory: 'Pamphlets',
    notes: 'Information pamphlets'
  },
  {
    hsnCode: '49011040',
    description: 'Printed leaflets',
    gstRate: 0,
    type: 'product',
    category: 'Printed Materials',
    subCategory: 'Leaflets',
    notes: 'Promotional leaflets'
  },
  {
    hsnCode: '49011050',
    description: 'Printed business cards',
    gstRate: 0,
    type: 'product',
    category: 'Printed Materials',
    subCategory: 'Business Cards',
    notes: 'Business cards'
  },
  {
    hsnCode: '49011060',
    description: 'Printed letterheads',
    gstRate: 0,
    type: 'product',
    category: 'Printed Materials',
    subCategory: 'Letterheads',
    notes: 'Official letterheads'
  },
  {
    hsnCode: '49011070',
    description: 'Printed invoices',
    gstRate: 0,
    type: 'product',
    category: 'Printed Materials',
    subCategory: 'Invoices',
    notes: 'Invoice forms'
  },
  {
    hsnCode: '49011080',
    description: 'Printed receipts',
    gstRate: 0,
    type: 'product',
    category: 'Printed Materials',
    subCategory: 'Receipts',
    notes: 'Receipt forms'
  },
  {
    hsnCode: '49011090',
    description: 'Printed forms',
    gstRate: 0,
    type: 'product',
    category: 'Printed Materials',
    subCategory: 'Forms',
    notes: 'Various printed forms'
  },
  {
    hsnCode: '49011100',
    description: 'Printed labels',
    gstRate: 0,
    type: 'product',
    category: 'Printed Materials',
    subCategory: 'Labels',
    notes: 'Product labels'
  },

  // Maps and Charts
  {
    hsnCode: '4905',
    description: 'Maps, Hydrographic charts',
    gstRate: 5,
    type: 'product',
    category: 'Maps & Charts',
    subCategory: 'Maps',
    notes: 'Navigation materials'
  },
  {
    hsnCode: '49051000',
    description: 'Globes',
    gstRate: 5,
    type: 'product',
    category: 'Maps & Charts',
    subCategory: 'Globes',
    notes: 'Educational globes'
  },
  {
    hsnCode: '49052000',
    description: 'Maps and charts',
    gstRate: 5,
    type: 'product',
    category: 'Maps & Charts',
    subCategory: 'Maps',
    notes: 'Various maps and charts'
  },
  {
    hsnCode: '49053000',
    description: 'Wall maps',
    gstRate: 5,
    type: 'product',
    category: 'Maps & Charts',
    subCategory: 'Maps',
    notes: 'Wall-mounted maps'
  },
  {
    hsnCode: '49054000',
    description: 'Road maps',
    gstRate: 5,
    type: 'product',
    category: 'Maps & Charts',
    subCategory: 'Maps',
    notes: 'Road navigation maps'
  },

  // Stationery Items
  {
    hsnCode: '96121000',
    description: 'Typewriter ribbons',
    gstRate: 18,
    type: 'product',
    category: 'Stationery',
    subCategory: 'Office Supplies',
    notes: 'Office equipment'
  },
  {
    hsnCode: '96122000',
    description: 'Ink cartridges',
    gstRate: 18,
    type: 'product',
    category: 'Stationery',
    subCategory: 'Office Supplies',
    notes: 'Printer ink cartridges'
  },
  {
    hsnCode: '96123000',
    description: 'Toner cartridges',
    gstRate: 18,
    type: 'product',
    category: 'Stationery',
    subCategory: 'Office Supplies',
    notes: 'Printer toner cartridges'
  },
  {
    hsnCode: '96124000',
    description: 'Pens and pencils',
    gstRate: 18,
    type: 'product',
    category: 'Stationery',
    subCategory: 'Writing Instruments',
    notes: 'Writing instruments'
  },
  {
    hsnCode: '96125000',
    description: 'Markers and highlighters',
    gstRate: 18,
    type: 'product',
    category: 'Stationery',
    subCategory: 'Writing Instruments',
    notes: 'Marking instruments'
  },
  {
    hsnCode: '96126000',
    description: 'Staplers and staples',
    gstRate: 18,
    type: 'product',
    category: 'Stationery',
    subCategory: 'Office Supplies',
    notes: 'Binding supplies'
  },
  {
    hsnCode: '96127000',
    description: 'Paper clips and pins',
    gstRate: 18,
    type: 'product',
    category: 'Stationery',
    subCategory: 'Office Supplies',
    notes: 'Fastening supplies'
  },
  {
    hsnCode: '96128000',
    description: 'Folders and files',
    gstRate: 18,
    type: 'product',
    category: 'Stationery',
    subCategory: 'Office Supplies',
    notes: 'Filing supplies'
  },
  {
    hsnCode: '96129000',
    description: 'Binders and covers',
    gstRate: 18,
    type: 'product',
    category: 'Stationery',
    subCategory: 'Office Supplies',
    notes: 'Binding supplies'
  },
  {
    hsnCode: '96130000',
    description: 'Envelopes',
    gstRate: 18,
    type: 'product',
    category: 'Stationery',
    subCategory: 'Office Supplies',
    notes: 'Mailing supplies'
  },

  // Design Services
  {
    hsnCode: '9984',
    description: 'Design services',
    gstRate: 18,
    type: 'service',
    category: 'Design Services',
    subCategory: 'Graphic Design',
    notes: 'Graphic design services'
  },
  {
    hsnCode: '99841',
    description: 'Logo design services',
    gstRate: 18,
    type: 'service',
    category: 'Design Services',
    subCategory: 'Logo Design',
    notes: 'Logo design services'
  },
  {
    hsnCode: '99842',
    description: 'Brochure design services',
    gstRate: 18,
    type: 'service',
    category: 'Design Services',
    subCategory: 'Brochure Design',
    notes: 'Brochure design services'
  },
  {
    hsnCode: '99843',
    description: 'Business card design services',
    gstRate: 18,
    type: 'service',
    category: 'Design Services',
    subCategory: 'Business Card Design',
    notes: 'Business card design services'
  },
  {
    hsnCode: '99844',
    description: 'Banner design services',
    gstRate: 18,
    type: 'service',
    category: 'Design Services',
    subCategory: 'Banner Design',
    notes: 'Banner design services'
  },
  {
    hsnCode: '99845',
    description: 'Poster design services',
    gstRate: 18,
    type: 'service',
    category: 'Design Services',
    subCategory: 'Poster Design',
    notes: 'Poster design services'
  },
  {
    hsnCode: '99846',
    description: 'Website design services',
    gstRate: 18,
    type: 'service',
    category: 'Design Services',
    subCategory: 'Web Design',
    notes: 'Website design services'
  },
  {
    hsnCode: '99847',
    description: 'Print design services',
    gstRate: 18,
    type: 'service',
    category: 'Design Services',
    subCategory: 'Print Design',
    notes: 'Print design services'
  },
  {
    hsnCode: '99848',
    description: 'Packaging design services',
    gstRate: 18,
    type: 'service',
    category: 'Design Services',
    subCategory: 'Packaging Design',
    notes: 'Packaging design services'
  },
  {
    hsnCode: '99849',
    description: 'Branding services',
    gstRate: 18,
    type: 'service',
    category: 'Design Services',
    subCategory: 'Branding',
    notes: 'Branding services'
  }
];

async function seedHsnCodes(userId) {
  try {
    console.log('🌱 Starting HSN codes seeding...');
    
    // Check if HSN codes already exist for this user
    const existingCount = await HsnCode.countDocuments({ userId });
    if (existingCount > 0) {
      console.log(`📋 HSN codes already exist for user ${userId}. Count: ${existingCount}`);
      return;
    }
    
    // Add userId to each HSN code
    const hsnCodesWithUserId = sampleHsnCodes.map(hsnCode => ({
      ...hsnCode,
      userId: userId
    }));
    
    // Insert HSN codes
    const result = await HsnCode.insertMany(hsnCodesWithUserId);
    console.log(`✅ Successfully seeded ${result.length} HSN codes for user ${userId}`);
    
    return result;
  } catch (error) {
    console.error('❌ Error seeding HSN codes:', error);
    throw error;
  }
}

// Export the seeding function
module.exports = { seedHsnCodes, sampleHsnCodes };

// If this file is run directly, seed for a test user
if (require.main === module) {
  const testUserId = '507f1f77bcf86cd799439011'; // Replace with actual user ID
  
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/print-arts-flow')
    .then(() => {
      console.log('📦 Connected to MongoDB');
      return seedHsnCodes(testUserId);
    })
    .then(() => {
      console.log('🎉 Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}
