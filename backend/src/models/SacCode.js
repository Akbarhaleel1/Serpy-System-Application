const mongoose = require('mongoose');

const sacCodeSchema = new mongoose.Schema({
  sacCode: {
    type: String,
    required: [true, 'SAC Code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // SAC codes are typically 6 digits
        return /^\d{6}$/.test(v);
      },
      message: 'SAC Code must be 6 digits'
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  gstRate: {
    type: Number,
    required: [true, 'GST Rate is required'],
    min: [0, 'GST Rate cannot be negative'],
    max: [100, 'GST Rate cannot exceed 100%'],
    default: 18
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  subCategory: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  effectiveTo: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
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

// Indexes for better performance
sacCodeSchema.index({ userId: 1, sacCode: 1 });
sacCodeSchema.index({ userId: 1, category: 1 });
sacCodeSchema.index({ userId: 1, isActive: 1 });
sacCodeSchema.index({ dataScope: 1, sacCode: 1 });
sacCodeSchema.index({ dataScope: 1, category: 1 });
sacCodeSchema.index({ dataScope: 1, isActive: 1 });

// Virtual for formatted GST rate display
sacCodeSchema.virtual('gstRateFormatted').get(function() {
  return `${this.gstRate}%`;
});

// Virtual for CGST/SGST calculation (half of GST rate)
sacCodeSchema.virtual('cgstRate').get(function() {
  return this.gstRate / 2;
});

sacCodeSchema.virtual('sgstRate').get(function() {
  return this.gstRate / 2;
});

// Static method to get SAC codes by category
sacCodeSchema.statics.getByCategory = function(userId, category, dataScope) {
  const query = dataScope ? { dataScope } : { userId };
  return this.find({ ...query, category, isActive: true }).sort({ sacCode: 1 });
};

// Static method to search SAC codes
sacCodeSchema.statics.searchSacCodes = function(userId, searchTerm, dataScope) {
  const query = dataScope ? { dataScope } : { userId };
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    ...query,
    isActive: true,
    $or: [
      { sacCode: regex },
      { description: regex },
      { category: regex },
      { subCategory: regex }
    ]
  }).sort({ sacCode: 1 });
};

// Static method to get GST rates summary
sacCodeSchema.statics.getGstRatesSummary = function(userId, dataScope) {
  const matchQuery = dataScope
    ? { dataScope, isActive: true }
    : { userId: new mongoose.Types.ObjectId(userId), isActive: true };

  return this.aggregate([
    { $match: matchQuery },
    { $group: { _id: '$gstRate', count: { $sum: 1 }, codes: { $push: '$sacCode' } } },
    { $sort: { _id: 1 } }
  ]);
};

// Pre-save middleware to ensure SAC code is uppercase
sacCodeSchema.pre('save', function(next) {
  if (this.sacCode) {
    this.sacCode = this.sacCode.toUpperCase();
  }
  next();
});

module.exports = mongoose.model('SacCode', sacCodeSchema);
