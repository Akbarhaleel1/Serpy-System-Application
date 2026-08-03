const mongoose = require('mongoose');

const emergencyOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: [true, 'Order ID is required'],
    trim: true
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  customerPhone: {
    type: String,
    required: [true, 'Customer phone is required'],
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  orderDetails: {
    type: String,
    required: [true, 'Order details are required'],
    trim: true
  },
  estimatedAmount: {
    type: Number,
    required: [true, 'Estimated amount is required'],
    min: [0, 'Estimated amount cannot be negative']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'high'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'converted', 'cancelled'],
    default: 'pending'
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  notes: {
    type: String,
    trim: true
  },
  specialInstructions: {
    type: String,
    trim: true
  },
  deliveryRequired: {
    type: Boolean,
    default: false
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    landmark: String
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Prepaid', 'Partial'],
    default: 'COD'
  },
  expectedCompletion: {
    type: Date
  },
  actualCompletion: {
    type: Date
  },
  convertedAt: {
    type: Date
  },
  conversionNotes: {
    type: String,
    trim: true
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
emergencyOrderSchema.index({ userId: 1, status: 1 });
emergencyOrderSchema.index({ userId: 1, priority: 1 });
emergencyOrderSchema.index({ userId: 1, createdAt: -1 });
emergencyOrderSchema.index({ userId: 1, customerPhone: 1 });

// Virtual for full address
emergencyOrderSchema.virtual('fullAddress').get(function() {
  const addr = this.deliveryAddress;
  if (!addr) return '';
  
  const parts = [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean);
  return parts.join(', ');
});

// Virtual for urgency color
emergencyOrderSchema.virtual('urgencyColor').get(function() {
  const urgencyColors = {
    low: 'green',
    medium: 'blue',
    high: 'orange',
    urgent: 'red'
  };
  return urgencyColors[this.priority] || 'blue';
});

// Virtual for is overdue
emergencyOrderSchema.virtual('isOverdue').get(function() {
  if (!this.expectedCompletion || this.status === 'completed' || this.status === 'cancelled') return false;
  return new Date() > this.expectedCompletion;
});

// Pre-save middleware to generate order ID
emergencyOrderSchema.pre('save', function(next) {
  if (!this.orderId) {
    this.orderId = `EO${Date.now().toString().slice(-6)}`;
  }
  next();
});

// Static method to get orders by status
emergencyOrderSchema.statics.getOrdersByStatus = function(userId, status) {
  return this.find({ userId, status }).sort({ createdAt: -1 });
};

// Static method to get urgent orders
emergencyOrderSchema.statics.getUrgentOrders = function(userId) {
  return this.find({
    userId,
    priority: 'urgent',
    status: { $in: ['pending', 'in_progress'] }
  }).sort({ createdAt: -1 });
};

// Static method to get today's orders
emergencyOrderSchema.statics.getTodaysOrders = function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    userId,
    createdAt: { $gte: today, $lt: tomorrow }
  }).sort({ createdAt: -1 });
};

// Static method to get order statistics
emergencyOrderSchema.statics.getOrderStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$estimatedAmount' }
      }
    }
  ]);
};

// Static method to get orders by priority
emergencyOrderSchema.statics.getOrdersByPriority = function(userId, priority) {
  return this.find({ userId, priority }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('EmergencyOrder', emergencyOrderSchema);
