const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  leaveType: {
    type: String,
    enum: ['casual', 'sick', 'earned', 'unpaid', 'maternity', 'other'],
    default: 'casual',
    required: true
  },
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true
  },
  days: {
    type: Number,
    default: 1,
    min: 0.5
  },
  reason: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedByName: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },

  // Multi-tenant ownership
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dataScope: {
    type: String,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

leaveRequestSchema.index({ userId: 1, status: 1 });
leaveRequestSchema.index({ dataScope: 1, status: 1 });
leaveRequestSchema.index({ employeeId: 1, fromDate: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
