const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Staff ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  dayOfWeek: {
    type: String,
    required: [true, 'Day of week is required'],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Start time must be in HH:MM format (24-hour)'
    }
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'End time must be in HH:MM format (24-hour)'
    }
  },
  shiftType: {
    type: String,
    required: [true, 'Shift type is required'],
    enum: ['morning', 'afternoon', 'evening', 'night'],
    default: 'morning'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  effectiveDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
scheduleSchema.index({ staffId: 1, dayOfWeek: 1 });
scheduleSchema.index({ userId: 1, staffId: 1 });
scheduleSchema.index({ userId: 1, dayOfWeek: 1 });
scheduleSchema.index({ staffId: 1, isActive: 1 });

// Virtual for duration in hours
scheduleSchema.virtual('duration').get(function() {
  const start = this.startTime.split(':');
  const end = this.endTime.split(':');
  
  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  let endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
  
  // Handle overnight shifts
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
});

// Virtual for shift display name
scheduleSchema.virtual('shiftDisplayName').get(function() {
  const shiftNames = {
    morning: 'Morning (6AM-2PM)',
    afternoon: 'Afternoon (2PM-10PM)',
    evening: 'Evening (4PM-12AM)',
    night: 'Night (10PM-6AM)'
  };
  return shiftNames[this.shiftType] || this.shiftType;
});

// Pre-save middleware to validate time logic
scheduleSchema.pre('save', function(next) {
  // Check if end time is after start time (allowing for overnight shifts)
  const start = this.startTime.split(':');
  const end = this.endTime.split(':');
  
  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  let endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
  
  // If end time is same as start time, it's invalid
  if (endMinutes === startMinutes) {
    return next(new Error('End time must be different from start time'));
  }
  
  next();
});

// Static methods
scheduleSchema.statics.getByStaffId = function(staffId, userId) {
  return this.find({ staffId, userId, isActive: true }).sort({ dayOfWeek: 1, startTime: 1 });
};

scheduleSchema.statics.getStaffScheduleOnly = function(staffId) {
  return this.find({ staffId, isActive: true }).sort({ dayOfWeek: 1, startTime: 1 });
};

scheduleSchema.statics.getByUserId = function(userId) {
  return this.find({ userId, isActive: true }).populate('staffId', 'fullName email role').sort({ dayOfWeek: 1, startTime: 1 });
};

scheduleSchema.statics.getByDayOfWeek = function(userId, dayOfWeek) {
  return this.find({ userId, dayOfWeek, isActive: true }).populate('staffId', 'fullName email role').sort({ startTime: 1 });
};

scheduleSchema.statics.getWeeklySchedule = function(staffId, userId) {
  return this.find({ staffId, userId, isActive: true }).sort({ dayOfWeek: 1, startTime: 1 });
};

scheduleSchema.statics.getTotalWeeklyHours = function(staffId, userId) {
  return this.aggregate([
    { $match: { staffId: new mongoose.Types.ObjectId(staffId), userId: new mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: null,
        totalHours: { $sum: { $divide: [{ $subtract: [{ $toLong: '$endTime' }, { $toLong: '$startTime' }] }, 3600000] } }
      }
    }
  ]);
};

// Instance method to check for overlapping schedules
scheduleSchema.methods.checkOverlap = function(existingSchedules) {
  const newStart = this.startTime.split(':').map(Number);
  const newEnd = this.endTime.split(':').map(Number);
  const newStartMinutes = newStart[0] * 60 + newStart[1];
  let newEndMinutes = newEnd[0] * 60 + newEnd[1];
  
  // Handle overnight shift
  if (newEndMinutes < newStartMinutes) {
    newEndMinutes += 24 * 60;
  }
  
  for (const schedule of existingSchedules) {
    if (schedule._id.toString() === this._id.toString()) continue;
    if (schedule.dayOfWeek !== this.dayOfWeek) continue;
    
    const existingStart = schedule.startTime.split(':').map(Number);
    const existingEnd = schedule.endTime.split(':').map(Number);
    let existingStartMinutes = existingStart[0] * 60 + existingStart[1];
    let existingEndMinutes = existingEnd[0] * 60 + existingEnd[1];
    
    // Handle overnight shift for existing schedule
    if (existingEndMinutes < existingStartMinutes) {
      existingEndMinutes += 24 * 60;
    }
    
    // Check for overlap
    if ((newStartMinutes < existingEndMinutes) && (newEndMinutes > existingStartMinutes)) {
      return true; // Overlap found
    }
  }
  
  return false; // No overlap
};

module.exports = mongoose.model('Schedule', scheduleSchema);
