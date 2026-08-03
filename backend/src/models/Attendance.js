const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  // Day the attendance belongs to (normalized to 00:00 local)
  date: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'leave', 'holiday', 'week-off'],
    default: 'present',
    required: true
  },
  checkIn: {
    type: String, // "09:30"
    trim: true
  },
  checkOut: {
    type: String, // "18:00"
    trim: true
  },
  workHours: {
    type: Number,
    default: 0,
    min: 0
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
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

// One attendance record per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ userId: 1, date: 1 });
attendanceSchema.index({ dataScope: 1, date: 1 });

// How many "paid" days this record contributes (used by payroll)
attendanceSchema.statics.paidWeight = function (status) {
  switch (status) {
    case 'present':
    case 'holiday':
    case 'week-off':
    case 'leave': // paid leave; unpaid leave handled separately if needed
      return 1;
    case 'half-day':
      return 0.5;
    case 'absent':
    default:
      return 0;
  }
};

module.exports = mongoose.model('Attendance', attendanceSchema);
