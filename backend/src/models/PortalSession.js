const mongoose = require('mongoose');

const portalSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  loginTime: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
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

// Index for efficient querying
portalSessionSchema.index({ customerId: 1 });
portalSessionSchema.index({ userId: 1 });
portalSessionSchema.index({ isActive: 1 });

// Static method to create session
portalSessionSchema.statics.createSession = async function (customerId, customerData, userId, ipAddress, userAgent) {
  const sessionId = `portal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return this.create({
    sessionId,
    customerId,
    customerName: customerData.name,
    customerEmail: customerData.email,
    customerPhone: customerData.phone,
    ipAddress,
    userAgent,
    userId
  });
};

// Static method to validate session
portalSessionSchema.statics.validateSession = async function (sessionId) {
  const session = await this.findOne({ sessionId, isActive: true });

  if (session) {
    // Update last activity
    session.lastActivity = new Date();
    await session.save();
  }

  return session;
};

module.exports = mongoose.model('PortalSession', portalSessionSchema);
