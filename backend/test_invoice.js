const mongoose = require('mongoose');
const Invoice = require('./src/models/Invoice');
require('dotenv').config();

const testInvoiceData = {
  customerId: {"_id": "69b1d5c9d072cd3f7f410ca0", "name": "Akbar Haleel H", "email": "akbarhaleel508@gmail.com", "phone": "8590740343", "id": "69b1d5c9d072cd3f7f410ca0"},
  jobId: "69b251a87599beece158e3de",
  billingType: "b2c",
  invoiceDate: "2026-03-12",
  dueDate: "2026-04-11",
  items: [{
    itemName: "Laptop Mother Bord",
    itemType: "Numbers",
    quantity: 4,
    totalSquareFeet: 0,
    length: 0,
    width: 0,
    unitPrice: 100,
    gstRate: 18,
    itemTotal: 472
  }],
  designCharge: null,
  subtotal: 400,
  taxAmount: 72,
  totalAmount: 472,
  paymentTerms: "Immediate",
  notes: "Test",
  po_reference: "",
  terms_conditions: "",
  isInterstate: false,
  customerGSTIN: ""
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/print_arts_flow')
.then(async () => {
  console.log('Testing invoice creation with customerId object...');
  
  // Extract customer ID from object or string (same logic as in route)
  let customerId = testInvoiceData.customerId;
  if (typeof customerId === 'object' && customerId._id) {
    customerId = customerId._id;
  } else if (typeof customerId === 'object' && customerId.id) {
    customerId = customerId.id;
  }
  
  console.log('Extracted customerId:', customerId);
  
  try {
    const invoice = new Invoice({
      ...testInvoiceData,
      customerId: customerId,
      invoiceNumber: 'TEST-' + Date.now()
    });
    
    const result = await invoice.save();
    console.log('✅ Invoice created successfully:', result.invoiceNumber);
    process.exit(0);
  } catch (error) {
    console.error('❌ Invoice creation failed:', error.message);
    process.exit(1);
  }
})
.catch(err => {
  console.error('Connection error:', err);
  process.exit(1);
});
