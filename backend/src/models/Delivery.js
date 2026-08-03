const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  deliveryId: {
    type: String,
    unique: true,
    required: [true, 'Delivery ID is required'],
    trim: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job ID is required']
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
  deliveryAddress: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true
    },
    landmark: String,
    instructions: String
  },
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true
    },
    alternatePhone: String,
    email: String
  },
  deliveryDate: {
    type: Date,
    required: [true, 'Delivery date is required']
  },
  deliveryTimeSlot: {
    type: String,
    enum: ['Morning (9AM-12PM)', 'Afternoon (12PM-3PM)', 'Evening (3PM-6PM)', 'Flexible'],
    default: 'Flexible'
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_transit', 'delivered', 'failed', 'cancelled'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  driverInfo: {
    name: String,
    phone: String,
    vehicleNumber: String,
    licenseNumber: String
  },
  items: [{
    description: String,
    quantity: {
      type: Number,
      min: [1, 'Quantity must be at least 1']
    },
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    }
  }],
  trackingNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  deliveryNotes: {
    type: String,
    trim: true
  },
  deliveryProof: {
    signature: String,
    photo: String,
    deliveredBy: String,
    receivedBy: String,
    deliveredAt: Date
  },
  charges: {
    deliveryFee: {
      type: Number,
      min: [0, 'Delivery fee cannot be negative'],
      default: 0
    },
    codCharges: {
      type: Number,
      min: [0, 'COD charges cannot be negative'],
      default: 0
    },
    totalCharges: {
      type: Number,
      min: [0, 'Total charges cannot be negative'],
      default: 0
    }
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Prepaid', 'Partial'],
    default: 'Prepaid'
  },
  codAmount: {
    type: Number,
    min: [0, 'COD amount cannot be negative'],
    default: 0
  },
  attempts: {
    type: Number,
    min: [0, 'Attempts cannot be negative'],
    default: 0
  },
  lastAttemptDate: Date,
  rescheduleReason: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
deliverySchema.index({ userId: 1, status: 1 });
deliverySchema.index({ userId: 1, deliveryDate: 1 });
deliverySchema.index({ userId: 1, customerId: 1 });
deliverySchema.index({ userId: 1, jobId: 1 });
deliverySchema.index({ userId: 1, priority: 1 });

// Virtual for full address
deliverySchema.virtual('fullAddress').get(function () {
  const addr = this.deliveryAddress;
  const parts = [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean);
  return parts.join(', ');
});

// Virtual for delivery status color
deliverySchema.virtual('statusColor').get(function () {
  const statusColors = {
    scheduled: 'blue',
    in_transit: 'orange',
    delivered: 'green',
    failed: 'red',
    cancelled: 'gray'
  };
  return statusColors[this.status] || 'gray';
});

// Virtual for is overdue
deliverySchema.virtual('isOverdue').get(function () {
  if (this.status === 'delivered' || this.status === 'cancelled') return false;
  return new Date() > this.deliveryDate;
});

// Pre-save middleware to generate tracking number
deliverySchema.pre('save', function (next) {
  if (!this.trackingNumber) {
    this.trackingNumber = `TRK${Date.now().toString().slice(-8)}`;
  }
  next();
});

// Static method to get deliveries by status
deliverySchema.statics.getDeliveriesByStatus = function (userId, status) {
  return this.find({ userId, status })
    .populate('jobId', 'title')
    .populate('customerId', 'name phone');
};

// Static method to get today's deliveries
deliverySchema.statics.getTodaysDeliveries = function (userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    userId,
    deliveryDate: { $gte: today, $lt: tomorrow }
  }).populate('jobId', 'title').populate('customerId', 'name phone');
};

// Static method to get overdue deliveries
deliverySchema.statics.getOverdueDeliveries = function (userId) {
  return this.find({
    userId,
    status: { $in: ['scheduled', 'in_transit'] },
    deliveryDate: { $lt: new Date() }
  }).populate('jobId', 'title').populate('customerId', 'name phone');
};

// Static method to get delivery statistics
deliverySchema.statics.getDeliveryStats = function (userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalCharges: { $sum: '$charges.totalCharges' }
      }
    }
  ]);
};

module.exports = mongoose.model('Delivery', deliverySchema);
