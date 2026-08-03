const mongoose = require('mongoose');

const purchaseBillItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Item description is required'],
    trim: true
  },
  hsnCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0']
  },
  gstRate: {
    type: Number,
    default: 0,
    min: [0, 'GST Rate cannot be negative'],
    max: [100, 'GST Rate cannot exceed 100%']
  },
  taxableAmount: {
    type: Number,
    default: 0,
    min: [0, 'Taxable amount cannot be negative']
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
    default: 0,
    min: [0, 'GST amount cannot be negative']
  },
  total: {
    type: Number,
    default: 0,
    min: [0, 'Total cannot be negative']
  }
});

const purchaseBillSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: [true, 'Bill number is required'],
    unique: true,
    trim: true
  },
  vendorInvoiceNumber: {
    type: String,
    trim: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: [true, 'Vendor is required']
  },
  vendorName: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true
  },
  vendorGstNumber: {
    type: String,
    trim: true
  },
  vendorAddress: {
    type: String,
    trim: true
  },
  vendorState: {
    type: String,
    trim: true
  },
  billDate: {
    type: Date,
    required: [true, 'Bill date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  items: [purchaseBillItemSchema],
  isInterState: {
    type: Boolean,
    default: false
  },
  taxableAmount: {
    type: Number,
    default: 0,
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
    default: 0,
    min: [0, 'Total GST amount cannot be negative']
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: [0, 'Total amount cannot be negative']
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  balanceAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['draft', 'recorded', 'cancelled'],
    default: 'recorded'
  },
  notes: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
purchaseBillSchema.index({ userId: 1, billNumber: 1 });
purchaseBillSchema.index({ userId: 1, vendorId: 1 });
purchaseBillSchema.index({ userId: 1, billDate: -1 });
purchaseBillSchema.index({ userId: 1, paymentStatus: 1 });

// Round to 2 decimals to avoid floating point drift
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Pre-save: recompute per-item GST and roll-up totals
purchaseBillSchema.pre('save', function (next) {
  let taxable = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  this.items.forEach((item) => {
    const rate = item.gstRate || 0;
    const itemTaxable = round2((item.rate || 0) * (item.quantity || 0));

    item.taxableAmount = itemTaxable;

    if (this.isInterState) {
      // IGST is the full rate applied to the taxable value
      item.igstAmount = round2(itemTaxable * rate / 100);
      item.cgstAmount = 0;
      item.sgstAmount = 0;
    } else {
      // SGST and CGST are each half the rate applied to the taxable value
      item.sgstAmount = round2(itemTaxable * (rate / 2) / 100);
      item.cgstAmount = round2(itemTaxable * (rate / 2) / 100);
      item.igstAmount = 0;
    }

    item.gstAmount = round2(item.sgstAmount + item.cgstAmount + item.igstAmount);
    item.total = round2(itemTaxable + item.gstAmount);

    taxable += itemTaxable;
    cgst += item.cgstAmount;
    sgst += item.sgstAmount;
    igst += item.igstAmount;
  });

  this.taxableAmount = round2(taxable);
  this.totalCgstAmount = round2(cgst);
  this.totalSgstAmount = round2(sgst);
  this.totalIgstAmount = round2(igst);
  this.totalGstAmount = round2(cgst + sgst + igst);
  this.totalAmount = round2(this.taxableAmount + this.totalGstAmount);
  this.balanceAmount = round2(this.totalAmount - (this.paidAmount || 0));

  // Derive payment status
  if ((this.paidAmount || 0) <= 0) {
    this.paymentStatus = 'pending';
  } else if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
  } else {
    this.paymentStatus = 'partial';
  }

  next();
});

// Generate next bill number: BILL-YYYYMM-####
purchaseBillSchema.statics.generateBillNumber = async function (userId) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const startOfMonth = new Date(year, today.getMonth(), 1);
  const endOfMonth = new Date(year, today.getMonth() + 1, 0, 23, 59, 59, 999);

  const count = await this.countDocuments({
    userId,
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  });

  let sequence = count + 1;
  let billNumber = `BILL-${year}${month}-${String(sequence).padStart(4, '0')}`;

  while (await this.findOne({ userId, billNumber })) {
    sequence++;
    billNumber = `BILL-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  return billNumber;
};

// Aggregate statistics for the dashboard cards
purchaseBillSchema.statics.getPurchaseBillStats = function (userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalBills: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        paidAmount: { $sum: '$paidAmount' },
        outstandingAmount: { $sum: '$balanceAmount' }
      }
    }
  ]);
};

module.exports = mongoose.model('PurchaseBill', purchaseBillSchema);
