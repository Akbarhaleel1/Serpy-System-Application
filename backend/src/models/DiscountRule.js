const mongoose = require('mongoose');

const discountRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Rule name is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: ['percentage', 'fixed', 'bulk'],
    default: 'percentage'
  },
  value: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  minimumAmount: {
    type: Number,
    min: [0, 'Minimum amount cannot be negative']
  },
  maximumAmount: {
    type: Number,
    min: [0, 'Maximum amount cannot be negative']
  },
  customerType: {
    type: String,
    enum: ['all', 'specific', 'new', 'returning'],
    default: 'all'
  },
  customerIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  }],
  jobTypes: [{
    type: String,
    trim: true
  }],
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required'],
    default: Date.now
  },
  validUntil: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageLimit: {
    type: Number,
    min: [1, 'Usage limit must be at least 1']
  },
  usageCount: {
    type: Number,
    min: [0, 'Usage count cannot be negative'],
    default: 0
  },
  description: {
    type: String,
    trim: true
  },
  conditions: {
    minQuantity: Number,
    maxQuantity: Number,
    specificProducts: [String],
    timeRestrictions: {
      startTime: String,
      endTime: String,
      daysOfWeek: [String]
    }
  },
  priority: {
    type: Number,
    min: [1, 'Priority must be at least 1'],
    max: [10, 'Priority cannot exceed 10'],
    default: 5
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
discountRuleSchema.index({ userId: 1, isActive: 1 });
discountRuleSchema.index({ userId: 1, type: 1 });
discountRuleSchema.index({ userId: 1, validFrom: 1, validUntil: 1 });
discountRuleSchema.index({ userId: 1, priority: -1 });

// Virtual for usage percentage
discountRuleSchema.virtual('usagePercentage').get(function() {
  if (!this.usageLimit) return 0;
  return (this.usageCount / this.usageLimit) * 100;
});

// Virtual for is expired
discountRuleSchema.virtual('isExpired').get(function() {
  if (!this.validUntil) return false;
  return new Date() > this.validUntil;
});

// Virtual for is valid
discountRuleSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive && 
         now >= this.validFrom && 
         (!this.validUntil || now <= this.validUntil) &&
         (!this.usageLimit || this.usageCount < this.usageLimit);
});

// Static method to get active rules
discountRuleSchema.statics.getActiveRules = function(userId) {
  const now = new Date();
  return this.find({
    userId,
    isActive: true,
    validFrom: { $lte: now },
    $or: [
      { validUntil: { $exists: false } },
      { validUntil: { $gte: now } }
    ]
  }).sort({ priority: -1 });
};

// Static method to get rules by type
discountRuleSchema.statics.getRulesByType = function(userId, type) {
  return this.find({ userId, type, isActive: true }).sort({ priority: -1 });
};

// Static method to get applicable rules
discountRuleSchema.statics.getApplicableRules = function(userId, customerId, amount, jobType) {
  const now = new Date();
  return this.find({
    userId,
    isActive: true,
    validFrom: { $lte: now },
    $or: [
      { validUntil: { $exists: false } },
      { validUntil: { $gte: now } }
    ],
    $or: [
      { minimumAmount: { $exists: false } },
      { minimumAmount: { $lte: amount } }
    ],
    $or: [
      { maximumAmount: { $exists: false } },
      { maximumAmount: { $gte: amount } }
    ],
    $or: [
      { customerType: 'all' },
      { customerIds: customerId },
      { customerType: 'specific', customerIds: customerId }
    ],
    $or: [
      { jobTypes: { $size: 0 } },
      { jobTypes: jobType }
    ]
  }).sort({ priority: -1 });
};

// Static method to get expired rules
discountRuleSchema.statics.getExpiredRules = function(userId) {
  const now = new Date();
  return this.find({
    userId,
    $or: [
      { validUntil: { $lt: now } },
      { usageLimit: { $exists: true }, usageCount: { $gte: '$usageLimit' } }
    ]
  });
};

// Static method to get rule statistics
discountRuleSchema.statics.getRuleStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalUsage: { $sum: '$usageCount' }
      }
    }
  ]);
};

module.exports = mongoose.model('DiscountRule', discountRuleSchema);
