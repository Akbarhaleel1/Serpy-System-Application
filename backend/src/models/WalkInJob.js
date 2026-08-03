const mongoose = require('mongoose');

const walkInJobSchema = new mongoose.Schema({
  jobNumber: {
    type: String,
    required: [true, 'Job number is required'],
    unique: true,
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
  jobType: {
    type: String,
    required: [true, 'Job type is required'],
    enum: ['printing', 'design', 'binding', 'lamination', 'cutting', 'other'],
    default: 'printing'
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true
  },
  specifications: {
    paperSize: String,
    paperType: String,
    colorMode: {
      type: String,
      enum: ['black_white', 'color'],
      default: 'black_white'
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    copies: {
      type: Number,
      default: 1,
      min: [1, 'Copies must be at least 1']
    },
    finishing: [{
      type: String,
      enum: ['stapling', 'binding', 'lamination', 'cutting', 'folding', 'perforation']
    }],
    specialInstructions: String
  },
  pricing: {
    estimatedCost: {
      type: Number,
      default: 0
    },
    actualCost: {
      type: Number,
      default: 0
    },
    advancePaid: {
      type: Number,
      default: 0
    },
    balanceAmount: {
      type: Number,
      default: 0
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'cheque'],
      default: 'cash'
    }
  },
  timeline: {
    estimatedCompletion: {
      type: Date,
      required: [true, 'Estimated completion time is required']
    },
    actualCompletion: Date,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    rushOrder: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'delivered', 'cancelled'],
    default: 'pending'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  assignedTo: {
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    operatorName: String
  },
  files: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now },
    fileType: String,
    fileSize: Number
  }],
  notes: {
    type: String,
    trim: true
  },
  deliveryInfo: {
    pickupRequired: {
      type: Boolean,
      default: false
    },
    deliveryAddress: String,
    deliveryDate: Date,
    deliveryNotes: String
  },
  qualityCheck: {
    checked: {
      type: Boolean,
      default: false
    },
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    checkedAt: Date,
    qualityNotes: String,
    approved: {
      type: Boolean,
      default: false
    }
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

// Indexes
walkInJobSchema.index({ userId: 1, status: 1 });
walkInJobSchema.index({ userId: 1, jobNumber: 1 });
walkInJobSchema.index({ userId: 1, customerPhone: 1 });
walkInJobSchema.index({ userId: 1, 'timeline.estimatedCompletion': 1 });

// Virtual for total amount
walkInJobSchema.virtual('totalAmount').get(function() {
  return this.pricing.actualCost || this.pricing.estimatedCost;
});

// Virtual for remaining amount
walkInJobSchema.virtual('remainingAmount').get(function() {
  return this.totalAmount - this.pricing.advancePaid;
});

// Pre-save middleware to generate job number
walkInJobSchema.pre('save', async function(next) {
  if (this.isNew && !this.jobNumber) {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    // Find the last job number for today
    const prefix = `WI${year}${month}${day}`;
    const lastJob = await this.constructor.findOne({
      jobNumber: new RegExp(`^${prefix}`),
      userId: this.userId
    }).sort({ jobNumber: -1 });
    
    let counter = 1;
    if (lastJob) {
      const lastNumber = parseInt(lastJob.jobNumber.split(prefix)[1]);
      if (!isNaN(lastNumber)) {
        counter = lastNumber + 1;
      }
    }
    
    this.jobNumber = `${prefix}${counter.toString().padStart(3, '0')}`;
  }
  next();
});

// Static method to get walk-in job statistics
walkInJobSchema.statics.getWalkInStats = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [
    totalJobs,
    todayJobs,
    monthlyJobs,
    pendingJobs,
    completedJobs,
    totalRevenue,
    todayRevenue,
    monthlyRevenue
  ] = await Promise.all([
    this.countDocuments({ userId }),
    this.countDocuments({ userId, createdAt: { $gte: today } }),
    this.countDocuments({ userId, createdAt: { $gte: monthStart } }),
    this.countDocuments({ userId, status: 'pending' }),
    this.countDocuments({ userId, status: 'completed' }),
    this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: { $in: ['completed', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$pricing.actualCost' } } }
    ]),
    this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: today }, status: { $in: ['completed', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$pricing.actualCost' } } }
    ]),
    this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: monthStart }, status: { $in: ['completed', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$pricing.actualCost' } } }
    ])
  ]);
  
  return {
    totalJobs,
    todayJobs,
    monthlyJobs,
    pendingJobs,
    completedJobs,
    totalRevenue: totalRevenue[0]?.total || 0,
    todayRevenue: todayRevenue[0]?.total || 0,
    monthlyRevenue: monthlyRevenue[0]?.total || 0
  };
};

module.exports = mongoose.model('WalkInJob', walkInJobSchema);
