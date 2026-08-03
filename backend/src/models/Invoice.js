const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0']
  },
  unit: {
    type: String,
    enum: ['pieces', 'nos', 'kg', 'grams', 'meters', 'rft', 'sqft', 'sqm', 'liters', 'hours', 'days', 'sets', 'reams', 'rolls', 'sheets', 'boxes'],
    default: 'pieces'
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  hsnCode: {
    type: String,
    required: false,  // Made optional to support both HSN codes and SAC codes
    trim: true,
    uppercase: true
  },
  hsnDescription: {
    type: String,
    trim: true
  },
  gstRate: {
    type: Number,
    required: [true, 'GST Rate is required'],
    min: [0, 'GST Rate cannot be negative'],
    max: [100, 'GST Rate cannot exceed 100%']
  },
  cgstAmount: {
    type: Number,
    default: 0,
    min: [0, 'CGST amount cannot be negative']
  },
  sgstAmount: {
    type: Number,
    default: 0,
    min: [0, 'SGST amount cannot be negative']
  },
  igstAmount: {
    type: Number,
    default: 0,
    min: [0, 'IGST amount cannot be negative']
  },
  gstAmount: {
    type: Number,
    required: [true, 'GST Amount is required'],
    min: [0, 'GST Amount cannot be negative']
  },
  itemTotal: {
    type: Number,
    required: [true, 'Item total is required'],
    min: [0, 'Item total cannot be negative']
  },
  itemType: {
    type: String,
    enum: ['Numbers', 'Square Feet'],
    default: 'Numbers'
  },
  totalSquareFeet: {
    type: Number,
    default: 0
  },
  length: {
    type: Number,
    default: 0
  },
  width: {
    type: Number,
    default: 0
  },
  itemQuantity: {
    type: Number,
    default: 0
  }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    trim: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required']
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  customerGstNumber: {
    type: String,
    trim: true
  },
  customerAddress: {
    type: String,
    trim: true
  },
  customerState: {
    type: String,
    trim: true
  },
  customerStateCode: {
    type: String,
    trim: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  jobTitle: {
    type: String,
    trim: true
  },
  invoiceDate: {
    type: Date,
    required: [true, 'Invoice date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100%']
  },
  taxableAmount: {
    type: Number,
    required: [true, 'Taxable amount is required'],
    min: [0, 'Taxable amount cannot be negative']
  },
  totalCgstAmount: {
    type: Number,
    default: 0,
    min: [0, 'Total CGST amount cannot be negative']
  },
  totalSgstAmount: {
    type: Number,
    default: 0,
    min: [0, 'Total SGST amount cannot be negative']
  },
  totalIgstAmount: {
    type: Number,
    default: 0,
    min: [0, 'Total IGST amount cannot be negative']
  },
  totalGstAmount: {
    type: Number,
    required: [true, 'Total GST amount is required'],
    min: [0, 'Total GST amount cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  amountInWords: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  balanceAmount: {
    type: Number,
    default: 0,
    min: [0, 'Balance amount cannot be negative']
  },
  paymentTerms: {
    type: String,
    trim: true,
    default: 'Due on receipt'
  },
  notes: {
    type: String,
    trim: true
  },
  termsAndConditions: {
    type: String,
    trim: true
  },
  isInterState: {
    type: Boolean,
    default: false
  },
  noGst: {
    type: Boolean,
    default: false
  },
  companyDetails: {
    name: String,
    address: String,
    gstNumber: String,
    state: String,
    stateCode: String,
    phone: String,
    email: String,
    website: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dataScope: {
    type: String,
    index: true,
    description: 'Data scope for multi-tenant isolation. Optional during migration.'
  }
}, {
  timestamps: true
});

// Indexes
invoiceSchema.index({ userId: 1, invoiceNumber: 1 });
invoiceSchema.index({ userId: 1, customerId: 1 });
invoiceSchema.index({ userId: 1, invoiceDate: -1 });
invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ userId: 1, paymentStatus: 1 });
invoiceSchema.index({ dataScope: 1, invoiceNumber: 1 });
invoiceSchema.index({ dataScope: 1, status: 1 });
invoiceSchema.index({ dataScope: 1, paymentStatus: 1 });

// Virtual for invoice status display
invoiceSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'draft': 'Draft',
    'sent': 'Sent',
    'paid': 'Paid',
    'overdue': 'Overdue',
    'cancelled': 'Cancelled',
    'refunded': 'Refunded'
  };
  return statusMap[this.status] || this.status;
});

// Virtual for payment status display
invoiceSchema.virtual('paymentStatusDisplay').get(function() {
  const statusMap = {
    'pending': 'Pending',
    'partial': 'Partially Paid',
    'paid': 'Paid',
    'overdue': 'Overdue'
  };
  return statusMap[this.paymentStatus] || this.paymentStatus;
});

// Virtual for GST type (IGST for inter-state, CGST+SGST for intra-state)
invoiceSchema.virtual('gstType').get(function() {
  return this.isInterState ? 'IGST' : 'CGST+SGST';
});

// Virtual for amountPaid (alias for paidAmount for frontend compatibility)
invoiceSchema.virtual('amountPaid').get(function() {
  return this.paidAmount;
});

// Virtual for balanceDue (alias for balanceAmount for frontend compatibility)
invoiceSchema.virtual('balanceDue').get(function() {
  return this.balanceAmount;
});

// Enable virtuals in JSON output
invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

// Pre-save middleware to calculate totals
invoiceSchema.pre('save', function(next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalAmount, 0);
  
  // For No GST invoices, taxable amount equals subtotal minus discount
  this.taxableAmount = this.subtotal - this.discountAmount;
  
  // Set all GST amounts to 0 for No GST invoices
  this.totalCgstAmount = 0;
  this.totalSgstAmount = 0;
  this.totalIgstAmount = 0;
  this.totalGstAmount = 0;
  
  // Calculate total amount (no GST)
  this.totalAmount = this.taxableAmount;
  
  // Calculate balance amount
  this.balanceAmount = this.totalAmount - this.paidAmount;
  
  next();
});

// Static method to generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function(userId, dataScope) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  // Count invoices for this month
  const startOfMonth = new Date(year, today.getMonth(), 1);
  const endOfMonth = new Date(year, today.getMonth() + 1, 0);

  // Use dataScope if available, fallback to userId for migration
  const countQuery = dataScope
    ? { dataScope, createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
    : { userId, createdAt: { $gte: startOfMonth, $lte: endOfMonth } };

  const count = await this.countDocuments(countQuery);

  // Start with the next number in sequence
  let sequenceNumber = count + 1;
  let invoiceNumber = `INV-${year}${month}-${String(sequenceNumber).padStart(4, '0')}`;

  // Keep incrementing until we find a unique invoice number
  const existingQuery = dataScope
    ? { dataScope, invoiceNumber }
    : { userId, invoiceNumber };

  while (await this.findOne(existingQuery)) {
    sequenceNumber++;
    invoiceNumber = `INV-${year}${month}-${String(sequenceNumber).padStart(4, '0')}`;
  }

  return invoiceNumber;
};

// Static method to get invoice statistics
invoiceSchema.statics.getInvoiceStats = function(userId, dataScope) {
  // Use dataScope if available, fallback to userId for migration
  const matchQuery = dataScope
    ? { dataScope }
    : { userId: new mongoose.Types.ObjectId(userId) };

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalInvoices: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        paidAmount: { $sum: '$paidAmount' },
        pendingAmount: { $sum: '$balanceAmount' },
        avgInvoiceValue: { $avg: '$totalAmount' }
      }
    }
  ]);
};

module.exports = mongoose.model('Invoice', invoiceSchema);
