const mongoose = require('mongoose');

const chequeSchema = new mongoose.Schema({
  chequeNumber: {
    type: String,
    required: [true, 'Cheque number is required'],
    trim: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  vendorName: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  issueDate: {
    type: Date,
    required: [true, 'Issue date is required'],
    default: Date.now
  },
  depositDate: {
    type: Date
  },
  bankDetails: {
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true
    },
    accountNumber: String,
    ifscCode: String,
    branchName: String
  },
  status: {
    type: String,
    enum: ['issued', 'deposited', 'cleared', 'bounced', 'cancelled'],
    default: 'issued'
  },
  purpose: {
    type: String,
    trim: true
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  clearedDate: {
    type: Date
  },
  bouncedDate: {
    type: Date
  },
  bouncedReason: {
    type: String,
    trim: true
  },
  penaltyAmount: {
    type: Number,
    min: [0, 'Penalty amount cannot be negative'],
    default: 0
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
chequeSchema.index({ userId: 1, status: 1 });
chequeSchema.index({ userId: 1, issueDate: -1 });
chequeSchema.index({ userId: 1, depositDate: -1 });
chequeSchema.index({ userId: 1, vendorId: 1 });
chequeSchema.index({ chequeNumber: 1 });

// Virtual for status color
chequeSchema.virtual('statusColor').get(function() {
  const statusColors = {
    issued: 'blue',
    deposited: 'orange',
    cleared: 'green',
    bounced: 'red',
    cancelled: 'gray'
  };
  return statusColors[this.status] || 'gray';
});

// Virtual for is overdue
chequeSchema.virtual('isOverdue').get(function() {
  if (!this.depositDate || this.status === 'cleared' || this.status === 'cancelled') return false;
  return new Date() > this.depositDate;
});

// Virtual for days until deposit
chequeSchema.virtual('daysUntilDeposit').get(function() {
  if (!this.depositDate) return null;
  const now = new Date();
  const deposit = new Date(this.depositDate);
  const diffTime = deposit - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Static method to get cheques by status
chequeSchema.statics.getChequesByStatus = function(userId, status) {
  return this.find({ userId, status })
    .populate('vendorId', 'name contactPerson phone')
    .sort({ issueDate: -1 });
};

// Static method to get today's cheques
chequeSchema.statics.getTodaysCheques = function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    userId,
    depositDate: { $gte: today, $lt: tomorrow }
  }).populate('vendorId', 'name contactPerson phone');
};

// Static method to get overdue cheques
chequeSchema.statics.getOverdueCheques = function(userId) {
  return this.find({
    userId,
    status: { $in: ['issued', 'deposited'] },
    depositDate: { $lt: new Date() }
  }).populate('vendorId', 'name contactPerson phone');
};

// Static method to get cheque statistics
chequeSchema.statics.getChequeStats = function(userId) {
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

// Static method to get cheques by vendor
chequeSchema.statics.getChequesByVendor = function(userId, vendorId) {
  return this.find({ userId, vendorId }).sort({ issueDate: -1 });
};

// Static method to get pending cheques
chequeSchema.statics.getPendingCheques = function(userId) {
  return this.find({
    userId,
    status: { $in: ['issued', 'deposited'] }
  }).populate('vendorId', 'name contactPerson phone').sort({ depositDate: 1 });
};

module.exports = mongoose.model('Cheque', chequeSchema);
