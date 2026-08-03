const mongoose = require('mongoose');

const paymentReminderSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: [true, 'Invoice ID is required']
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer ID is required']
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    trim: true
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  balanceAmount: {
    type: Number,
    required: [true, 'Balance amount is required'],
    min: [0, 'Balance amount cannot be negative']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  daysOverdue: {
    type: Number,
    default: 0
  },
  reminderType: {
    type: String,
    enum: ['overdue', 'partial', 'manual'],
    required: [true, 'Reminder type is required']
  },
  messageContent: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  sentAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  failureReason: {
    type: String,
    trim: true
  },
  reminderCount: {
    type: Number,
    default: 1,
    min: [1, 'Reminder count must be at least 1']
  },
  whatsappMessageId: {
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
    description: 'Data scope for multi-tenant isolation.'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
paymentReminderSchema.index({ userId: 1, invoiceId: 1 });
paymentReminderSchema.index({ userId: 1, customerId: 1 });
paymentReminderSchema.index({ userId: 1, status: 1 });
paymentReminderSchema.index({ userId: 1, createdAt: -1 });
paymentReminderSchema.index({ dataScope: 1, status: 1 });
paymentReminderSchema.index({ dataScope: 1, createdAt: -1 });

// Virtual for status display
paymentReminderSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'pending': 'Pending',
    'sent': 'Sent',
    'delivered': 'Delivered',
    'failed': 'Failed'
  };
  return statusMap[this.status] || this.status;
});

// Virtual for status color
paymentReminderSchema.virtual('statusColor').get(function() {
  const colorMap = {
    'pending': 'yellow',
    'sent': 'blue',
    'delivered': 'green',
    'failed': 'red'
  };
  return colorMap[this.status] || 'gray';
});

// Static method to get reminder count for an invoice
paymentReminderSchema.statics.getReminderCountForInvoice = async function(invoiceId, userId) {
  return this.countDocuments({
    invoiceId,
    userId,
    status: { $in: ['sent', 'delivered'] }
  });
};

// Static method to get the last reminder date for an invoice
paymentReminderSchema.statics.getLastReminderDate = async function(invoiceId, userId) {
  const lastReminder = await this.findOne({
    invoiceId,
    userId,
    status: { $in: ['sent', 'delivered'] }
  }).sort({ sentAt: -1 });
  
  return lastReminder ? lastReminder.sentAt : null;
};

// Static method to get reminder stats
paymentReminderSchema.statics.getReminderStats = async function(userId, dataScope) {
  const matchQuery = dataScope ? { dataScope } : { userId: new mongoose.Types.ObjectId(userId) };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalStats, todayStats] = await Promise.all([
    this.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]),
    this.aggregate([
      { $match: { ...matchQuery, createdAt: { $gte: today, $lt: tomorrow } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  return {
    total: totalStats,
    sentToday: todayStats[0]?.count || 0
  };
};

module.exports = mongoose.model('PaymentReminder', paymentReminderSchema);
