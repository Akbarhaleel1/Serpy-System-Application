const mongoose = require('mongoose');

const proofSchema = new mongoose.Schema({
  proofNumber: {
    type: String,
    required: [true, 'Proof number is required'],
    unique: true,
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
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Proof title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  files: [{
    fileName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  specifications: {
    paperSize: String,
    paperType: String,
    colorMode: {
      type: String,
      enum: ['black_white', 'color'],
      default: 'color'
    },
    quantity: Number,
    finishing: [String],
    specialInstructions: String
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'approved', 'rejected', 'revised', 'expired'],
    default: 'draft'
  },
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    files: [{
      fileName: String,
      fileUrl: String,
      fileType: String,
      fileSize: Number
    }],
    uploadedAt: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  approval: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    approvedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    approvalNotes: String,
    expiresAt: Date
  },
  feedback: {
    comments: [{
      comment: String,
      commentedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
      },
      commentedAt: {
        type: Date,
        default: Date.now
      },
      isInternal: {
        type: Boolean,
        default: false
      }
    }],
    revisions: [{
      revisionNumber: Number,
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
      },
      requestedAt: Date,
      description: String,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
      }
    }]
  },
  notifications: {
    sentAt: Date,
    reminderSentAt: Date,
    expiryReminderSentAt: Date,
    whatsappSent: {
      type: Boolean,
      default: false
    },
    emailSent: {
      type: Boolean,
      default: false
    }
  },
  settings: {
    autoExpire: {
      type: Boolean,
      default: true
    },
    expiryDays: {
      type: Number,
      default: 7
    },
    allowComments: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: true
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
proofSchema.index({ userId: 1, status: 1 });
proofSchema.index({ userId: 1, jobId: 1 });
proofSchema.index({ userId: 1, customerId: 1 });
proofSchema.index({ userId: 1, 'approval.expiresAt': 1 });

// Virtual for expiry status
proofSchema.virtual('isExpired').get(function () {
  if (!this.approval.expiresAt) return false;
  return new Date() > this.approval.expiresAt && this.approval.status === 'pending';
});

// Virtual for days until expiry
proofSchema.virtual('daysUntilExpiry').get(function () {
  if (!this.approval.expiresAt) return null;
  const now = new Date();
  const expiry = this.approval.expiresAt;
  const diffTime = expiry - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to generate proof number
proofSchema.pre('save', async function (next) {
  if (this.isNew && !this.proofNumber) {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    // Find the last proof number for today
    const prefix = `PRF${year}${month}${day}`;
    const lastProof = await this.constructor.findOne({
      proofNumber: new RegExp(`^${prefix}`),
      userId: this.userId
    }).sort({ proofNumber: -1 });

    let counter = 1;
    if (lastProof) {
      const lastNumber = parseInt(lastProof.proofNumber.split(prefix)[1]);
      if (!isNaN(lastNumber)) {
        counter = lastNumber + 1;
      }
    }

    this.proofNumber = `${prefix}${counter.toString().padStart(3, '0')}`;
  }

  // Set expiry date if not set
  if (this.isNew && this.settings.autoExpire && !this.approval.expiresAt) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.settings.expiryDays);
    this.approval.expiresAt = expiryDate;
  }

  next();
});

// Static method to get proof statistics
proofSchema.statics.getProofStats = async function (userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalProofs,
    todayProofs,
    monthlyProofs,
    pendingProofs,
    approvedProofs,
    rejectedProofs,
    expiredProofs
  ] = await Promise.all([
    this.countDocuments({ userId }),
    this.countDocuments({ userId, createdAt: { $gte: today } }),
    this.countDocuments({ userId, createdAt: { $gte: monthStart } }),
    this.countDocuments({ userId, 'approval.status': 'pending' }),
    this.countDocuments({ userId, 'approval.status': 'approved' }),
    this.countDocuments({ userId, 'approval.status': 'rejected' }),
    this.countDocuments({
      userId,
      'approval.status': 'pending',
      'approval.expiresAt': { $lt: new Date() }
    })
  ]);

  return {
    totalProofs,
    todayProofs,
    monthlyProofs,
    pendingProofs,
    approvedProofs,
    rejectedProofs,
    expiredProofs
  };
};

module.exports = mongoose.model('Proof', proofSchema);
