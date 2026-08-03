const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  vendorType: {
    type: String,
    required: [true, 'Vendor type is required'],
    enum: ['Supplier', 'Service Provider', 'Contractor', 'Other'],
    default: 'Supplier'
  },
  gstNumber: {
    type: String,
    trim: true
  },
  panNumber: {
    type: String,
    trim: true
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountHolderName: String
  },
  paymentTerms: {
    type: String,
    enum: ['COD', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Advance'],
    default: 'Net 30'
  },
  creditLimit: {
    type: Number,
    min: [0, 'Credit limit cannot be negative'],
    default: 0
  },
  pendingAmount: {
    type: Number,
    min: [0, 'Pending amount cannot be negative'],
    default: 0
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted'],
    default: 'active'
  },
  lastOrderDate: {
    type: Date
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  // Advanced vendor management fields
  contractDetails: {
    contractStartDate: Date,
    contractEndDate: Date,
    contractValue: Number,
    contractType: {
      type: String,
      enum: ['Fixed Price', 'Time & Material', 'Retainer', 'Milestone Based', 'Other'],
      default: 'Fixed Price'
    },
    renewalDate: Date,
    autoRenewal: {
      type: Boolean,
      default: false
    }
  },
  performanceMetrics: {
    onTimeDelivery: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    qualityRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    communicationRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    priceCompetitiveness: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    overallScore: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    lastEvaluated: Date
  },
  communicationHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['Email', 'Phone', 'Meeting', 'WhatsApp', 'Other'],
      default: 'Email'
    },
    subject: String,
    notes: String,
    initiatedBy: {
      type: String,
      enum: ['Vendor', 'Company', 'Both'],
      default: 'Company'
    }
  }],
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['Contract', 'Certificate', 'Insurance', 'License', 'Other'],
      default: 'Other'
    },
    filePath: String,
    uploadedDate: {
      type: Date,
      default: Date.now
    },
    expiryDate: Date
  }],
  paymentHistory: [{
    date: Date,
    amount: Number,
    invoiceNumber: String,
    paymentMethod: {
      type: String,
      enum: ['Bank Transfer', 'Cheque', 'Cash', 'UPI', 'Other'],
      default: 'Bank Transfer'
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Pending'
    },
    notes: String
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
vendorSchema.index({ userId: 1, name: 1 });
vendorSchema.index({ userId: 1, vendorType: 1 });
vendorSchema.index({ userId: 1, status: 1 });
vendorSchema.index({ userId: 1, email: 1 });

// Virtual for full address
vendorSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  if (!addr) return '';
  
  const parts = [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean);
  return parts.join(', ');
});

// Virtual for payment status
vendorSchema.virtual('paymentStatus').get(function() {
  if (this.pendingAmount === 0) return 'clear';
  if (this.pendingAmount <= this.creditLimit * 0.5) return 'good';
  if (this.pendingAmount <= this.creditLimit * 0.8) return 'warning';
  return 'critical';
});

// Static method to get active vendors
vendorSchema.statics.getActiveVendors = function(userId) {
  return this.find({ userId, status: 'active' });
};

// Static method to get vendors by type
vendorSchema.statics.getVendorsByType = function(userId, vendorType) {
  return this.find({ userId, vendorType, status: 'active' });
};

// Static method to get top vendors by amount
vendorSchema.statics.getTopVendors = function(userId, limit = 10) {
  return this.find({ userId, status: 'active' })
    .sort({ totalAmount: -1 })
    .limit(limit);
};

// Static method to get vendors with pending payments
vendorSchema.statics.getVendorsWithPendingPayments = function(userId) {
  return this.find({ userId, pendingAmount: { $gt: 0 } });
};

// Static method to get vendor analytics
vendorSchema.statics.getVendorAnalytics = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalVendors: { $sum: 1 },
        activeVendors: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        totalPendingAmount: { $sum: '$pendingAmount' },
        totalContractValue: { $sum: '$contractDetails.contractValue' },
        avgRating: { $avg: '$rating' },
        avgPerformanceScore: { $avg: '$performanceMetrics.overallScore' }
      }
    }
  ]);
};

// Static method to get top performing vendors
vendorSchema.statics.getTopPerformingVendors = function(userId, limit = 10) {
  return this.find({ 
    userId: new mongoose.Types.ObjectId(userId),
    status: 'active'
  })
  .sort({ 'performanceMetrics.overallScore': -1, rating: -1 })
  .limit(limit)
  .select('name vendorType rating performanceMetrics totalAmount');
};

// Static method to get vendors by performance category
vendorSchema.statics.getVendorsByPerformance = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'active' } },
    {
      $addFields: {
        performanceCategory: {
          $switch: {
            branches: [
              { case: { $gte: ['$performanceMetrics.overallScore', 4.5] }, then: 'Excellent' },
              { case: { $gte: ['$performanceMetrics.overallScore', 3.5] }, then: 'Good' },
              { case: { $gte: ['$performanceMetrics.overallScore', 2.5] }, then: 'Average' },
              { case: { $gte: ['$performanceMetrics.overallScore', 1.5] }, then: 'Poor' }
            ],
            default: 'Very Poor'
          }
        }
      }
    },
    {
      $group: {
        _id: '$performanceCategory',
        count: { $sum: 1 },
        avgScore: { $avg: '$performanceMetrics.overallScore' }
      }
    },
    { $sort: { avgScore: -1 } }
  ]);
};

// Static method to get contract expiry alerts
vendorSchema.statics.getContractExpiryAlerts = function(userId, days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'active',
    'contractDetails.contractEndDate': { $lte: futureDate },
    'contractDetails.contractEndDate': { $gte: new Date() }
  })
  .select('name contractDetails.contractEndDate contractDetails.autoRenewal');
};

// Static method to get vendor payment trends
vendorSchema.statics.getVendorPaymentTrends = function(userId, months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: '$paymentHistory' },
    {
      $match: {
        'paymentHistory.date': { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$paymentHistory.date' },
          month: { $month: '$paymentHistory.date' }
        },
        totalPayments: { $sum: '$paymentHistory.amount' },
        paymentCount: { $sum: 1 },
        avgPaymentAmount: { $avg: '$paymentHistory.amount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
};

// Static method to get vendor communication summary
vendorSchema.statics.getVendorCommunicationSummary = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: '$communicationHistory' },
    {
      $match: {
        'communicationHistory.date': { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$communicationHistory.type',
        count: { $sum: 1 },
        vendors: { $addToSet: '$name' }
      }
    },
    {
      $project: {
        communicationType: '$_id',
        count: 1,
        vendorCount: { $size: '$vendors' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('Vendor', vendorSchema);
