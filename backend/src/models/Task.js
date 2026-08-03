const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Task must be assigned to someone']
  },
  assignedByName: {
    type: String,
    trim: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  jobTitle: {
    type: String,
    trim: true
  },
  dueDate: {
    type: Date
  },
  startDate: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative']
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative'],
    default: 0
  },
  progress: {
    type: Number,
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100'],
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    url: String,
    fileSize: Number,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  comments: [{
    text: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    authorName: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    editedAt: Date,
    isEdited: {
      type: Boolean,
      default: false
    }
  }],
  notes: {
    type: String,
    trim: true
  },
  completedAt: {
    type: Date
  },
  // Advanced features
  parentTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  subtasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  dependencies: [{
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    dependencyType: {
      type: String,
      enum: ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'],
      default: 'finish_to_start'
    }
  }],
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskTemplate'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: {
      type: Number,
      default: 1
    },
    endDate: Date,
    occurrences: Number
  },
  timeEntries: [{
    startTime: Date,
    endTime: Date,
    duration: Number, // in minutes
    description: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['due_soon', 'overdue', 'assigned', 'completed', 'comment']
    },
    message: String,
    sentAt: Date,
    readAt: Date,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  customFields: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'boolean', 'select']
    }
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, assignedTo: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ parentTask: 1 });
taskSchema.index({ jobId: 1 });

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || !this.dueDate) return false;
  return new Date() > this.dueDate;
});

// Virtual for time remaining
taskSchema.virtual('timeRemaining').get(function() {
  if (!this.dueDate || this.status === 'completed') return null;
  const now = new Date();
  const due = new Date(this.dueDate);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
});

// Static methods
taskSchema.statics.getOverdueTasks = async function(userId) {
  return this.find({
    userId,
    dueDate: { $lt: new Date() },
    status: { $nin: ['completed', 'cancelled'] }
  }).populate('assignedTo', 'fullName email');
};

taskSchema.statics.getTasksByPriority = async function(userId, priority) {
  return this.find({ userId, priority })
    .populate('assignedTo', 'fullName email role')
    .populate('jobId', 'title')
    .sort({ dueDate: 1 });
};

taskSchema.statics.getTasksByStaff = async function(userId, staffId) {
  return this.find({ userId, assignedTo: staffId })
    .populate('assignedTo', 'fullName email role')
    .populate('jobId', 'title')
    .sort({ priority: -1, dueDate: 1 });
};

taskSchema.statics.getStaffOwnTasks = async function(staffId) {
  return this.find({ assignedTo: staffId })
    .populate('assignedTo', 'fullName email role')
    .populate('jobId', 'title')
    .sort({ priority: -1, dueDate: 1 });
};

taskSchema.statics.getTaskAnalytics = async function(userId) {
  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$status', 'completed'] },
                  { $ne: ['$status', 'cancelled'] },
                  { $lt: ['$dueDate', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        avgProgress: { $avg: '$progress' },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    avgProgress: 0,
    totalEstimatedHours: 0,
    totalActualHours: 0
  };
};

// Instance methods
taskSchema.methods.addComment = function(text, authorId, authorName) {
  this.comments.push({
    text,
    author: authorId,
    authorName,
    createdAt: new Date()
  });
  return this.save();
};

taskSchema.methods.updateProgress = function(progress, actualHours) {
  this.progress = Math.min(100, Math.max(0, progress));
  if (actualHours !== undefined) {
    this.actualHours = actualHours;
  }
  if (progress === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  return this.save();
};

taskSchema.methods.addTimeEntry = function(startTime, endTime, description, userId) {
  const duration = Math.round((endTime - startTime) / (1000 * 60)); // minutes
  this.timeEntries.push({
    startTime,
    endTime,
    duration,
    description,
    userId,
    createdAt: new Date()
  });
  return this.save();
};

// Pre-save middleware
taskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);