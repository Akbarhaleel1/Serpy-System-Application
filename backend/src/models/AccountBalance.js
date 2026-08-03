const mongoose = require('mongoose');

const accountBalanceSchema = new mongoose.Schema({
  balanceDate: {
    type: Date,
    required: [true, 'Balance date is required'],
    default: Date.now
  },
  cashBalance: {
    type: Number,
    required: [true, 'Cash balance is required'],
    min: [0, 'Cash balance cannot be negative'],
    default: 0
  },
  bankBalance: {
    type: Number,
    required: [true, 'Bank balance is required'],
    min: [0, 'Bank balance cannot be negative'],
    default: 0
  },
  openingCashBalance: {
    type: Number,
    min: [0, 'Opening cash balance cannot be negative'],
    default: 0
  },
  openingBankBalance: {
    type: Number,
    min: [0, 'Opening bank balance cannot be negative'],
    default: 0
  },
  totalIncome: {
    type: Number,
    min: [0, 'Total income cannot be negative'],
    default: 0
  },
  totalExpenses: {
    type: Number,
    min: [0, 'Total expenses cannot be negative'],
    default: 0
  },
  netCashFlow: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  isOpeningBalance: {
    type: Boolean,
    default: false
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
accountBalanceSchema.index({ userId: 1, balanceDate: -1 });
accountBalanceSchema.index({ userId: 1, isOpeningBalance: 1 });

// Virtual for total balance
accountBalanceSchema.virtual('totalBalance').get(function() {
  return this.cashBalance + this.bankBalance;
});

// Virtual for total opening balance
accountBalanceSchema.virtual('totalOpeningBalance').get(function() {
  return this.openingCashBalance + this.openingBankBalance;
});

// Pre-save middleware to calculate net cash flow
accountBalanceSchema.pre('save', function(next) {
  this.netCashFlow = this.totalIncome - this.totalExpenses;
  next();
});

// Static method to get latest balance
accountBalanceSchema.statics.getLatestBalance = function(userId) {
  return this.findOne({ userId }).sort({ balanceDate: -1 });
};

// Static method to get balance by date
accountBalanceSchema.statics.getBalanceByDate = function(userId, date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  return this.findOne({
    userId,
    balanceDate: { $gte: startDate, $lte: endDate }
  });
};

// Static method to get opening balance
accountBalanceSchema.statics.getOpeningBalance = function(userId) {
  return this.findOne({ userId, isOpeningBalance: true }).sort({ balanceDate: -1 });
};

// Static method to get balance history
accountBalanceSchema.statics.getBalanceHistory = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    userId,
    balanceDate: { $gte: startDate }
  }).sort({ balanceDate: -1 });
};

// Static method to get monthly balance summary
accountBalanceSchema.statics.getMonthlyBalanceSummary = function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return this.find({
    userId,
    balanceDate: { $gte: startDate, $lte: endDate }
  }).sort({ balanceDate: -1 });
};

module.exports = mongoose.model('AccountBalance', accountBalanceSchema);
