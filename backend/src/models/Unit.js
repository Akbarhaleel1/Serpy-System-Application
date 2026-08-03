const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Unit name is required'],
    trim: true,
    unique: true
  },
  abbreviation: {
    type: String,
    required: [true, 'Unit abbreviation is required'],
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['length', 'weight', 'volume', 'quantity', 'area', 'custom'],
    default: 'quantity',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
unitSchema.index({ userId: 1, name: 1 });
unitSchema.index({ userId: 1, abbreviation: 1 });
unitSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Unit', unitSchema);
