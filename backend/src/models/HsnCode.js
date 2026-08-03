const mongoose = require('mongoose');

const hsnCodeSchema = new mongoose.Schema({
  hsnCode: {
    type: String,
    required: [true, 'HSN Code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // HSN codes are typically 4-8 digits
        return /^\d{4,8}$/.test(v);
      },
      message: 'HSN Code must be 4-8 digits'
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
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: ['product', 'service', 'both'],
    default: 'product'
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
hsnCodeSchema.index({ userId: 1, hsnCode: 1 });
hsnCodeSchema.index({ userId: 1, category: 1 });
hsnCodeSchema.index({ userId: 1, type: 1 });
hsnCodeSchema.index({ userId: 1, isActive: 1 });
hsnCodeSchema.index({ dataScope: 1, hsnCode: 1 });
hsnCodeSchema.index({ dataScope: 1, category: 1 });
hsnCodeSchema.index({ dataScope: 1, type: 1 });
hsnCodeSchema.index({ dataScope: 1, isActive: 1 });

// Virtual for formatted GST rate display
hsnCodeSchema.virtual('gstRateFormatted').get(function() {
  return `${this.gstRate}%`;
});

// Virtual for CGST/SGST calculation (half of GST rate)
hsnCodeSchema.virtual('cgstRate').get(function() {
  return this.gstRate / 2;
});

hsnCodeSchema.virtual('sgstRate').get(function() {
  return this.gstRate / 2;
});

// Static method to get HSN codes by category
hsnCodeSchema.statics.getByCategory = function(userId, category, dataScope) {
  const query = dataScope ? { dataScope } : { userId };
  return this.find({ ...query, category, isActive: true }).sort({ hsnCode: 1 });
};

// Static method to get HSN codes by type
hsnCodeSchema.statics.getByType = function(userId, type, dataScope) {
  const query = dataScope ? { dataScope } : { userId };
  return this.find({ ...query, type, isActive: true }).sort({ hsnCode: 1 });
};

// Static method to search HSN codes
hsnCodeSchema.statics.searchHsnCodes = function(userId, searchTerm, dataScope) {
  const query = dataScope ? { dataScope } : { userId };
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    ...query,
    isActive: true,
    $or: [
      { hsnCode: regex },
      { description: regex },
      { category: regex },
      { subCategory: regex }
    ]
  }).sort({ hsnCode: 1 });
};

// Static method to get GST rates summary
hsnCodeSchema.statics.getGstRatesSummary = function(userId, dataScope) {
  const matchQuery = dataScope
    ? { dataScope, isActive: true }
    : { userId: new mongoose.Types.ObjectId(userId), isActive: true };

  return this.aggregate([
    { $match: matchQuery },
    { $group: { _id: '$gstRate', count: { $sum: 1 }, codes: { $push: '$hsnCode' } } },
    { $sort: { _id: 1 } }
  ]);
};

// Pre-save middleware to ensure HSN code is uppercase
hsnCodeSchema.pre('save', function(next) {
  if (this.hsnCode) {
    this.hsnCode = this.hsnCode.toUpperCase();
  }
  next();
});

module.exports = mongoose.model('HsnCode', hsnCodeSchema);
