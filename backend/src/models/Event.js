const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  allDay: {
    type: Boolean,
    default: false
  },
  eventType: {
    type: String,
    enum: ['meeting', 'deadline', 'delivery', 'reminder', 'task', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  // Related entities
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  deliveryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  },
  // Reminder settings
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push', 'in_app'],
      default: 'in_app'
    },
    minutesBefore: {
      type: Number,
      default: 15
    },
    sent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  }],
  // Recurrence settings
  recurrence: {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
      default: 'none'
    },
    interval: {
      type: Number,
      default: 1
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }],
    endDate: Date,
    count: Number
  },
  // Location
  location: {
    type: String,
    trim: true
  },
  // Attendees
  attendees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String,
    name: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    }
  }],
  // Notes and attachments
  notes: {
    type: String,
    trim: true
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Color coding
  color: {
    type: String,
    default: '#3b82f6'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
eventSchema.index({ userId: 1, startDate: 1 });
eventSchema.index({ userId: 1, eventType: 1 });
eventSchema.index({ userId: 1, status: 1 });
eventSchema.index({ userId: 1, priority: 1 });
eventSchema.index({ startDate: 1, endDate: 1 });

// Virtual for duration
eventSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    return Math.floor((this.endDate - this.startDate) / 1000 / 60); // minutes
  }
  return 0;
});

// Virtual for isOverdue
eventSchema.virtual('isOverdue').get(function() {
  return this.endDate < new Date() && this.status === 'scheduled';
});

// Pre-save middleware to validate dates
eventSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

// Static method to get events in date range
eventSchema.statics.getEventsInRange = async function(userId, startDate, endDate) {
  return this.find({
    userId,
    startDate: { $gte: startDate },
    endDate: { $lte: endDate }
  })
    .populate('jobId', 'title status priority')
    .populate('customerId', 'name email phone')
    .populate('taskId', 'title description status')
    .populate('deliveryId', 'deliveryAddress status')
    .populate('attendees.userId', 'name email')
    .sort({ startDate: 1 });
};

// Static method to get upcoming events
eventSchema.statics.getUpcomingEvents = async function(userId, limit = 10) {
  const now = new Date();
  return this.find({
    userId,
    startDate: { $gte: now },
    status: { $in: ['scheduled', 'in_progress'] }
  })
    .populate('jobId', 'title status priority')
    .populate('customerId', 'name email phone')
    .populate('taskId', 'title description status')
    .populate('deliveryId', 'deliveryAddress status')
    .populate('attendees.userId', 'name email')
    .sort({ startDate: 1 })
    .limit(limit);
};

// Static method to get overdue events
eventSchema.statics.getOverdueEvents = async function(userId) {
  const now = new Date();
  return this.find({
    userId,
    endDate: { $lt: now },
    status: { $in: ['scheduled', 'in_progress'] }
  })
    .populate('jobId', 'title status priority')
    .populate('customerId', 'name email phone')
    .populate('taskId', 'title description status')
    .populate('deliveryId', 'deliveryAddress status')
    .populate('attendees.userId', 'name email')
    .sort({ endDate: 1 });
};

module.exports = mongoose.model('Event', eventSchema);
