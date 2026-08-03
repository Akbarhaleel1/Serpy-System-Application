const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  entityType: {
    type: String,
    enum: ['customer', 'job', 'invoice', 'payment', 'inventory', 'vendor', 'staff', 'task', 'delivery', 'emergency_order', 'walk_in_job', 'proof', 'time_entry', 'event', 'discount_rule', 'customer_pricing', 'hsn_code', 'account_transaction', 'cheque', 'cost', 'user', 'system'],
    required: [true, 'Entity type is required']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Entity ID is required']
  },
  entityName: {
    type: String,
    trim: true
  },
  // User who performed the action
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Performed by is required']
  },
  performedByName: {
    type: String,
    required: [true, 'Performed by name is required'],
    trim: true
  },
  // Action details
  actionType: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import', 'approve', 'reject', 'assign', 'complete', 'cancel', 'start', 'pause', 'stop', 'upload', 'download', 'send', 'receive'],
    required: [true, 'Action type is required']
  },
  // Changes made (for update actions)
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
    fields: [String]
  },
  // Additional context
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  // Related entities
  relatedCustomer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  relatedJob: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  relatedInvoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  // Severity level
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  // Tags for categorization
  tags: [String],
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
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ performedBy: 1, createdAt: -1 });
activityLogSchema.index({ actionType: 1, createdAt: -1 });
activityLogSchema.index({ severity: 1, createdAt: -1 });
activityLogSchema.index({ tags: 1 });

// Virtual for formatted timestamp
activityLogSchema.virtual('formattedTime').get(function() {
  return this.createdAt.toLocaleString();
});

// Virtual for time ago
activityLogSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffMs = now.getTime() - this.createdAt.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return this.createdAt.toLocaleDateString();
});

// Static method to log activity
activityLogSchema.statics.logActivity = async function(data) {
  const {
    action,
    description,
    entityType,
    entityId,
    entityName,
    performedBy,
    performedByName,
    actionType,
    changes,
    ipAddress,
    userAgent,
    relatedCustomer,
    relatedJob,
    relatedInvoice,
    metadata,
    severity = 'low',
    tags = [],
    userId
  } = data;

  return this.create({
    action,
    description,
    entityType,
    entityId,
    entityName,
    performedBy,
    performedByName,
    actionType,
    changes,
    ipAddress,
    userAgent,
    relatedCustomer,
    relatedJob,
    relatedInvoice,
    metadata,
    severity,
    tags,
    userId
  });
};

// Static method to get activity for an entity
activityLogSchema.statics.getEntityActivity = async function(entityType, entityId, userId) {
  return this.find({ entityType, entityId, userId })
    .populate('performedBy', 'name email')
    .populate('relatedCustomer', 'name')
    .populate('relatedJob', 'title')
    .populate('relatedInvoice', 'invoiceNumber')
    .sort({ createdAt: -1 });
};

// Static method to get user activity
activityLogSchema.statics.getUserActivity = async function(userId, performedBy, limit = 50) {
  const query = { userId };
  if (performedBy) query.performedBy = performedBy;
  
  return this.find(query)
    .populate('performedBy', 'name email')
    .populate('relatedCustomer', 'name')
    .populate('relatedJob', 'title')
    .populate('relatedInvoice', 'invoiceNumber')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get activity statistics
activityLogSchema.statics.getActivityStats = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [
    totalActivities,
    activitiesByType,
    activitiesByUser,
    recentActivities,
    criticalActivities
  ] = await Promise.all([
    this.countDocuments({ userId, createdAt: { $gte: startDate } }),
    this.aggregate([
      { $match: { userId: userId, createdAt: { $gte: startDate } } },
      { $group: { _id: '$actionType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    this.aggregate([
      { $match: { userId: userId, createdAt: { $gte: startDate } } },
      { $group: { _id: '$performedBy', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { userName: '$user.name', count: 1 } },
      { $sort: { count: -1 } }
    ]),
    this.find({ userId, createdAt: { $gte: startDate } })
      .populate('performedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10),
    this.countDocuments({ userId, severity: 'critical', createdAt: { $gte: startDate } })
  ]);

  return {
    totalActivities,
    activitiesByType,
    activitiesByUser,
    recentActivities,
    criticalActivities
  };
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);
