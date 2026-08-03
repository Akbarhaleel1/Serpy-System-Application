const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
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
  taskName: {
    type: String,
    required: [true, 'Task name is required'],
    trim: true
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Staff ID is required']
  },
  staffName: {
    type: String,
    required: [true, 'Staff name is required'],
    trim: true
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number,
    min: [0, 'Duration cannot be negative'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['running', 'paused', 'completed', 'cancelled'],
    default: 'running'
  },
  notes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  hourlyRate: {
    type: Number,
    min: [0, 'Hourly rate cannot be negative']
  },
  totalCost: {
    type: Number,
    min: [0, 'Total cost cannot be negative'],
    default: 0
  },
  breaks: [{
    startTime: Date,
    endTime: Date,
    duration: Number,
    reason: String
  }],
  productivity: {
    type: Number,
    min: [0, 'Productivity cannot be negative'],
    max: [100, 'Productivity cannot exceed 100'],
    default: 100
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
timeEntrySchema.index({ userId: 1, staffId: 1 });
timeEntrySchema.index({ userId: 1, jobId: 1 });
timeEntrySchema.index({ userId: 1, startTime: -1 });
timeEntrySchema.index({ userId: 1, status: 1 });
timeEntrySchema.index({ userId: 1, isActive: 1 });

// Virtual for formatted duration
timeEntrySchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  return `${hours}h ${minutes}m`;
});

// Virtual for current duration if active
timeEntrySchema.virtual('currentDuration').get(function() {
  if (!this.isActive || !this.startTime) return this.duration;
  const now = new Date();
  const diffMs = now.getTime() - new Date(this.startTime).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return this.duration + diffMinutes;
});

// Virtual for total break time
timeEntrySchema.virtual('totalBreakTime').get(function() {
  return this.breaks.reduce((total, breakItem) => total + (breakItem.duration || 0), 0);
});

// Virtual for net working time
timeEntrySchema.virtual('netWorkingTime').get(function() {
  return this.currentDuration - this.totalBreakTime;
});

// Pre-save middleware to calculate total cost
timeEntrySchema.pre('save', function(next) {
  if (this.hourlyRate && this.duration) {
    this.totalCost = (this.duration / 60) * this.hourlyRate;
  }
  next();
});

// Static method to get active time entries
timeEntrySchema.statics.getActiveTimeEntries = function(userId) {
  return this.find({ userId, isActive: true })
    .populate('jobId', 'title')
    .populate('staffId', 'fullName email role');
};

// Static method to get time entries by staff
timeEntrySchema.statics.getTimeEntriesByStaff = function(userId, staffId) {
  return this.find({ userId, staffId })
    .populate('jobId', 'title')
    .sort({ startTime: -1 });
};

// Static method to get time entries by job
timeEntrySchema.statics.getTimeEntriesByJob = function(userId, jobId) {
  return this.find({ userId, jobId })
    .populate('staffId', 'fullName email role')
    .sort({ startTime: -1 });
};

// Static method to get today's time entries
timeEntrySchema.statics.getTodaysTimeEntries = function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    userId,
    startTime: { $gte: today, $lt: tomorrow }
  }).populate('jobId', 'title').populate('staffId', 'fullName email role');
};

// Static method to get time statistics
timeEntrySchema.statics.getTimeStats = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        startTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$staffId',
        totalDuration: { $sum: '$duration' },
        totalCost: { $sum: '$totalCost' },
        entryCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'staff'
      }
    }
  ]);
};

// Static method to get monthly time summary
timeEntrySchema.statics.getMonthlyTimeSummary = function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return this.find({
    userId,
    startTime: { $gte: startDate, $lte: endDate }
  }).populate('jobId', 'title').populate('staffId', 'fullName email role');
};

module.exports = mongoose.model('TimeEntry', timeEntrySchema);
