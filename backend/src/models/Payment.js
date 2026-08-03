const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true,
    required: [true, 'Payment ID is required'],
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
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Payment amount cannot be negative']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['cash', 'cheque', 'bank_transfer', 'card', 'upi', 'wallet'],
    default: 'cash'
  },
  paymentDate: {
    type: Date,
    required: [true, 'Payment date is required'],
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'completed'
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  transactionId: {
    type: String,
    trim: true
  },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    branchName: String
  },
  chequeDetails: {
    chequeNumber: String,
    chequeDate: Date,
    bankName: String,
    status: {
      type: String,
      enum: ['pending', 'cleared', 'bounced', 'cancelled'],
      default: 'pending'
    }
  },
  cardDetails: {
    lastFourDigits: String,
    cardType: String,
    issuer: String
  },
  upiDetails: {
    upiId: String,
    transactionId: String
  },
  notes: {
    type: String,
    trim: true
  },
  receiptNumber: {
    type: String,
    trim: true
  },
  receiptUrl: {
    type: String,
    trim: true
  },
  refundDetails: {
    refundAmount: Number,
    refundDate: Date,
    refundReason: String,
    refundMethod: String
  },
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  collectedByName: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ userId: 1, customerId: 1 });
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ userId: 1, paymentDate: -1 });
paymentSchema.index({ userId: 1, paymentMethod: 1 });
paymentSchema.index({ userId: 1, invoiceId: 1 });
paymentSchema.index({ referenceNumber: 1 });

// Virtual for payment status color
paymentSchema.virtual('statusColor').get(function() {
  const statusColors = {
    pending: 'orange',
    completed: 'green',
    failed: 'red',
    cancelled: 'gray',
    refunded: 'blue'
  };
  return statusColors[this.status] || 'gray';
});

// Virtual for payment method icon
paymentSchema.virtual('paymentMethodIcon').get(function() {
  const methodIcons = {
    cash: '💵',
    cheque: '📄',
    bank_transfer: '🏦',
    card: '💳',
    upi: '📱',
    wallet: '👛'
  };
  return methodIcons[this.paymentMethod] || '💰';
});

// Pre-save middleware to generate payment ID
paymentSchema.pre('save', function(next) {
  if (!this.paymentId) {
    this.paymentId = `PAY${Date.now().toString().slice(-6)}`;
  }
  next();
});

// Static method to get payments by status
paymentSchema.statics.getPaymentsByStatus = function(userId, status) {
  return this.find({ userId, status })
    .populate('customerId', 'name email phone')
    .populate('invoiceId', 'invoiceNumber totalAmount')
    .sort({ paymentDate: -1 });
};

// Static method to get payments by customer
paymentSchema.statics.getPaymentsByCustomer = function(userId, customerId) {
  return this.find({ userId, customerId })
    .populate('invoiceId', 'invoiceNumber totalAmount')
    .sort({ paymentDate: -1 });
};

// Static method to get today's payments
paymentSchema.statics.getTodaysPayments = function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    userId,
    paymentDate: { $gte: today, $lt: tomorrow }
  }).populate('customerId', 'name').populate('invoiceId', 'invoiceNumber');
};

// Static method to get monthly payments
paymentSchema.statics.getMonthlyPayments = function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return this.find({
    userId,
    paymentDate: { $gte: startDate, $lte: endDate },
    status: 'completed'
  });
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

// Static method to get payments by method
paymentSchema.statics.getPaymentsByMethod = function(userId, paymentMethod) {
  return this.find({ userId, paymentMethod }).sort({ paymentDate: -1 });
};

// Static method to get pending cheque payments
paymentSchema.statics.getPendingChequePayments = function(userId) {
  return this.find({
    userId,
    paymentMethod: 'cheque',
    'chequeDetails.status': 'pending'
  }).populate('customerId', 'name').sort({ paymentDate: -1 });
};

module.exports = mongoose.model('Payment', paymentSchema);
