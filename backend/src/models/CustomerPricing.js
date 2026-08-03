const mongoose = require('mongoose');

const customerPricingSchema = new mongoose.Schema({
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
  discountPercentage: {
    type: Number,
    required: [true, 'Discount percentage is required'],
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100'],
    default: 0
  },
  specialRates: [{
    jobType: {
      type: String,
      required: [true, 'Job type is required'],
      trim: true
    },
    rate: {
      type: Number,
      required: [true, 'Rate is required'],
      min: [0, 'Rate cannot be negative']
    },
    unit: {
      type: String,
      enum: ['per_piece', 'per_sheet', 'per_sqft', 'per_kg', 'per_hour'],
      default: 'per_piece'
    }
  }],
  minimumOrderValue: {
    type: Number,
    min: [0, 'Minimum order value cannot be negative']
  },
  creditLimit: {
    type: Number,
    min: [0, 'Credit limit cannot be negative']
  },
  paymentTerms: {
    type: String,
    enum: ['COD', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Advance'],
    default: 'Net 30'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  conditions: {
    volumeCommitment: {
      type: Number,
      min: [0, 'Volume commitment cannot be negative']
    },
    contractPeriod: {
      startDate: Date,
      endDate: Date
    },
    specialTerms: String
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
customerPricingSchema.index({ userId: 1, customerId: 1 });
customerPricingSchema.index({ userId: 1, isActive: 1 });
customerPricingSchema.index({ userId: 1, validFrom: 1, validUntil: 1 });

// Virtual for is valid
customerPricingSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive && 
         now >= this.validFrom && 
         (!this.validUntil || now <= this.validUntil);
});

// Virtual for is expired
customerPricingSchema.virtual('isExpired').get(function() {
  if (!this.validUntil) return false;
  return new Date() > this.validUntil;
});

// Static method to get pricing by customer
customerPricingSchema.statics.getPricingByCustomer = function(userId, customerId) {
  return this.findOne({ userId, customerId, isActive: true });
};

// Static method to get active pricing
customerPricingSchema.statics.getActivePricing = function(userId) {
  const now = new Date();
  return this.find({
    userId,
    isActive: true,
    validFrom: { $lte: now },
    $or: [
      { validUntil: { $exists: false } },
      { validUntil: { $gte: now } }
    ]
  }).populate('customerId', 'name email phone');
};

// Static method to get special rates for job type
customerPricingSchema.statics.getSpecialRatesForJobType = function(userId, jobType) {
  const now = new Date();
  return this.find({
    userId,
    isActive: true,
    validFrom: { $lte: now },
    $or: [
      { validUntil: { $exists: false } },
      { validUntil: { $gte: now } }
    ],
    'specialRates.jobType': jobType
  }).populate('customerId', 'name email phone');
};

// Static method to get expired pricing
customerPricingSchema.statics.getExpiredPricing = function(userId) {
  const now = new Date();
  return this.find({
    userId,
    $or: [
      { validUntil: { $lt: now } },
      { isActive: false }
    ]
  }).populate('customerId', 'name email phone');
};

// Static method to get pricing statistics
customerPricingSchema.statics.getPricingStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$isActive',
        count: { $sum: 1 },
        avgDiscount: { $avg: '$discountPercentage' }
      }
    }
  ]);
};

module.exports = mongoose.model('CustomerPricing', customerPricingSchema);
