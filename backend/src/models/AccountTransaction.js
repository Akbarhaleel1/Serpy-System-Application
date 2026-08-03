const mongoose = require('mongoose');

const accountTransactionSchema = new mongoose.Schema({
  transactionNumber: {
    type: String,
    unique: true,
    trim: true,
    sparse: true  // Allow null/undefined values temporarily until pre-save hook generates it
  },
  transactionType: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: ['income', 'expense', 'transfer', 'opening_balance', 'adjustment'],
    default: 'expense'
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  subCategory: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['cash', 'bank_transfer', 'cheque', 'card', 'upi', 'wallet', 'other'],
    default: 'cash'
  },
  accountType: {
    type: String,
    required: [true, 'Account type is required'],
    enum: ['cash', 'bank', 'credit_card', 'loan', 'investment'],
    default: 'cash'
  },
  accountName: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true
  },
  reference: {
    type: String,
    trim: true
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  // Related entities
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  // Cheque details (if payment method is cheque)
  chequeDetails: {
    chequeNumber: String,
    bankName: String,
    branchName: String,
    issueDate: Date,
    depositDate: Date,
    clearanceDate: Date,
    status: {
      type: String,
      enum: ['issued', 'deposited', 'cleared', 'bounced', 'cancelled'],
      default: 'issued'
    }
  },
  // Transfer details (if transaction type is transfer)
  transferDetails: {
    fromAccount: String,
    toAccount: String,
    transferFee: {
      type: Number,
      default: 0
    }
  },
  // Tax details
  taxDetails: {
    gstAmount: {
      type: Number,
      default: 0
    },
    tdsAmount: {
      type: Number,
      default: 0
    },
    taxRate: {
      type: Number,
      default: 0
    }
  },
  // Status and workflow
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'reversed'],
    default: 'completed'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  // Attachments
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Notes and comments
  notes: {
    type: String,
    trim: true
  },
  internalNotes: {
    type: String,
    trim: true
  },
  // Reconciliation
  reconciled: {
    type: Boolean,
    default: false
  },
  reconciledAt: Date,
  reconciledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Indexes for efficient querying
accountTransactionSchema.index({ userId: 1, transactionDate: -1 });
accountTransactionSchema.index({ userId: 1, transactionType: 1 });
accountTransactionSchema.index({ userId: 1, accountType: 1 });
accountTransactionSchema.index({ userId: 1, category: 1 });
accountTransactionSchema.index({ userId: 1, status: 1 });

// Virtual for transaction date (using createdAt as transaction date)
accountTransactionSchema.virtual('transactionDate').get(function () {
  return this.createdAt;
});

// Pre-save middleware to generate transaction number
accountTransactionSchema.pre('save', async function (next) {
  if (this.isNew && !this.transactionNumber) {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    // Find the last transaction number for today
    const prefix = `TXN${year}${month}${day}`;
    const lastTransaction = await this.constructor.findOne({
      transactionNumber: new RegExp(`^${prefix}`),
      userId: this.userId
    }).sort({ transactionNumber: -1 });

    let counter = 1;
    if (lastTransaction) {
      const lastNumber = parseInt(lastTransaction.transactionNumber.split(prefix)[1]);
      if (!isNaN(lastNumber)) {
        counter = lastNumber + 1;
      }
    }

    this.transactionNumber = `${prefix}${counter.toString().padStart(4, '0')}`;
  }
  next();
});

// Static method to get account balances
accountTransactionSchema.statics.getAccountBalances = async function (userId) {
  const balances = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'completed' } },
    {
      $group: {
        _id: '$accountType',
        totalIncome: {
          $sum: {
            $cond: [
              { $in: ['$transactionType', ['income', 'opening_balance']] },
              '$amount',
              0
            ]
          }
        },
        totalExpense: {
          $sum: {
            $cond: [
              { $in: ['$transactionType', ['expense', 'transfer']] },
              '$amount',
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        accountType: '$_id',
        balance: { $subtract: ['$totalIncome', '$totalExpense'] },
        totalIncome: 1,
        totalExpense: 1
      }
    }
  ]);

  return balances;
};

// Static method to get transaction statistics
accountTransactionSchema.statics.getTransactionStats = async function (userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalTransactions,
    todayTransactions,
    monthlyTransactions,
    totalIncome,
    totalExpense,
    categoryStats,
    paymentMethodStats
  ] = await Promise.all([
    this.countDocuments({ userId, status: 'completed' }),
    this.countDocuments({ userId, createdAt: { $gte: today }, status: 'completed' }),
    this.countDocuments({ userId, createdAt: { $gte: monthStart }, status: 'completed' }),
    this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), transactionType: 'income', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), transactionType: 'expense', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'completed' } },
      { $group: { _id: '$category', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]),
    this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'completed' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ])
  ]);

  return {
    totalTransactions,
    todayTransactions,
    monthlyTransactions,
    totalIncome: totalIncome[0]?.total || 0,
    totalExpense: totalExpense[0]?.total || 0,
    netIncome: (totalIncome[0]?.total || 0) - (totalExpense[0]?.total || 0),
    categoryStats,
    paymentMethodStats
  };
};

module.exports = mongoose.model('AccountTransaction', accountTransactionSchema);
