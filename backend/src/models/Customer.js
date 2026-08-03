const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  customerType: {
    type: String,
    enum: ['Individual', 'Business', 'Corporate', 'Walk-in'],
    default: 'Individual'
  },
  gstNumber: {
    type: String,
    trim: true
  },
  gstVerified: {
    type: Boolean,
    default: false
  },
  gstVerificationDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted'],
    default: 'active'
  },
  isBlacklisted: {
    type: Boolean,
    default: false
  },
  blacklistReason: {
    type: String,
    trim: true
  },
  creditLimit: {
    type: Number,
    default: 0
  },
  outstandingBalance: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['current', 'overdue', 'bad_debt'],
    default: 'current'
  },
  lastOrderDate: {
    type: Date
  },
  lastPaymentDate: {
    type: Date
  },
  lastPaymentAmount: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  revenueSegment: {
    type: String,
    enum: ['low', 'medium', 'high', 'premium'],
    default: 'medium'
  },
  preferredJobTypes: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true
  },
  whatsappConsent: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dataScope: {
    type: String,
    index: true,
    description: 'Data scope for multi-tenant isolation. All users with same dataScope share this data. Optional during migration.'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ name: 'text', company: 'text' });
customerSchema.index({ userId: 1, status: 1 });
customerSchema.index({ dataScope: 1, status: 1 });

// Virtual for customer wallet
customerSchema.virtual('wallet', {
  ref: 'CustomerWallet',
  localField: '_id',
  foreignField: 'customerId',
  justOne: true
});

// Virtual for customer activity logs
customerSchema.virtual('activityLogs', {
  ref: 'CustomerActivityLog',
  localField: '_id',
  foreignField: 'customerId'
});

// Methods
customerSchema.methods.updateStats = async function() {
  const Job = mongoose.model('Job');
  const Payment = mongoose.model('Payment');
  
  // Calculate total orders and revenue
  const jobs = await Job.find({ customerId: this._id });
  const payments = await Payment.find({ customerId: this._id });
  
  this.totalOrders = jobs.length;
  this.totalRevenue = jobs.reduce((sum, job) => sum + (job.estimatedCost || 0), 0);
  this.totalSpent = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  this.lastOrderDate = jobs.length > 0 ? jobs[jobs.length - 1].createdAt : null;
  this.lastPaymentAmount = payments.length > 0 ? payments[payments.length - 1].amount : 0;
  this.lastPaymentDate = payments.length > 0 ? payments[payments.length - 1].paymentDate : null;
  
  // Calculate outstanding balance
  const Invoice = mongoose.model('Invoice');
  const paidAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const billedAmount = await Invoice.aggregate([
    { $match: { customerId: this._id } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } }
  ]);
  
  this.outstandingBalance = (billedAmount[0]?.total || 0) - paidAmount;
  
  return this.save();
};

module.exports = mongoose.model('Customer', customerSchema);
