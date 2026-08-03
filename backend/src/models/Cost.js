const mongoose = require('mongoose');

const costSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job ID is required']
  },
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Cost category is required'],
    enum: ['Materials', 'Labor', 'Overhead', 'Equipment', 'Transport', 'Other'],
    default: 'Materials'
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  quantity: {
    type: Number,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  unit: {
    type: String,
    enum: ['pieces', 'kg', 'meters', 'liters', 'hours', 'days'],
    default: 'pieces'
  },
  unitCost: {
    type: Number,
    min: [0, 'Unit cost cannot be negative']
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  vendorName: {
    type: String,
    trim: true
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  invoiceDate: {
    type: Date
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'overdue'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'cheque', 'bank_transfer', 'card', 'upi'],
    default: 'cash'
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
  },
  tags: [{
    type: String,
    trim: true
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
costSchema.index({ userId: 1, jobId: 1 });
costSchema.index({ userId: 1, category: 1 });
costSchema.index({ userId: 1, paymentStatus: 1 });
costSchema.index({ userId: 1, createdAt: -1 });
costSchema.index({ userId: 1, vendorId: 1 });

// Virtual for total cost
costSchema.virtual('totalCost').get(function() {
  return this.amount * this.quantity;
});

// Virtual for payment status color
costSchema.virtual('paymentStatusColor').get(function() {
  const statusColors = {
    pending: 'orange',
    paid: 'green',
    partial: 'blue',
    overdue: 'red'
  };
  return statusColors[this.paymentStatus] || 'gray';
});

// Pre-save middleware to calculate unit cost
costSchema.pre('save', function(next) {
  if (this.quantity && this.amount && !this.unitCost) {
    this.unitCost = this.amount / this.quantity;
  }
  next();
});

// Static method to get costs by job
costSchema.statics.getCostsByJob = function(userId, jobId) {
  return this.find({ userId, jobId }).sort({ createdAt: -1 });
};

// Static method to get costs by category
costSchema.statics.getCostsByCategory = function(userId, category) {
  return this.find({ userId, category }).sort({ createdAt: -1 });
};

// Static method to get unpaid costs
costSchema.statics.getUnpaidCosts = function(userId) {
  return this.find({ userId, paymentStatus: { $in: ['pending', 'partial', 'overdue'] } });
};

// Static method to get cost statistics
costSchema.statics.getCostStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: { $multiply: ['$amount', '$quantity'] } },
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get monthly costs
costSchema.statics.getMonthlyCosts = function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return this.find({
    userId,
    createdAt: { $gte: startDate, $lte: endDate }
  });
};

// Static method to get costs by vendor
costSchema.statics.getCostsByVendor = function(userId, vendorId) {
  return this.find({ userId, vendorId }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Cost', costSchema);
