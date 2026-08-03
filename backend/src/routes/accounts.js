const express = require('express');
const { body, query } = require('express-validator');
const AccountTransaction = require('../models/AccountTransaction');
const AccountBalance = require('../models/AccountBalance');
const Cheque = require('../models/Cheque');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const transactionValidation = [
  body('transactionType').isIn(['income', 'expense', 'transfer', 'opening_balance', 'adjustment'])
    .withMessage('Invalid transaction type'),
  body('category').notEmpty().withMessage('Category is required').trim(),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('description').notEmpty().withMessage('Description is required').trim(),
  body('paymentMethod').isIn(['cash', 'bank_transfer', 'cheque', 'card', 'upi', 'wallet', 'other'])
    .withMessage('Invalid payment method'),
  body('accountType').isIn(['cash', 'bank', 'credit_card', 'loan', 'investment'])
    .withMessage('Account type is required (cash, bank, credit_card, loan or investment)'),
  body('accountName').notEmpty().withMessage('Account name is required').trim()
];

// @route   GET /api/accounts/transactions
// @desc    Get all account transactions for the authenticated user
// @access  Private
router.get('/transactions', protect, [
  query('transactionType').optional().isIn(['income', 'expense', 'transfer', 'opening_balance', 'adjustment']),
  query('accountType').optional().isIn(['cash', 'bank', 'credit_card', 'loan', 'investment']),
  query('paymentMethod').optional().isIn(['cash', 'bank_transfer', 'cheque', 'card', 'upi', 'wallet', 'other']),
  query('status').optional().isIn(['pending', 'completed', 'cancelled', 'reversed']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      transactionType,
      accountType,
      paymentMethod,
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query (always scoped to authenticated user)
    const query = { userId: req.user._id };
    
    if (transactionType && transactionType !== 'all') {
      query.transactionType = transactionType;
    }
    
    if (accountType && accountType !== 'all') {
      query.accountType = accountType;
    }
    
    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { transactionNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { accountName: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const transactions = await AccountTransaction.find(query)
      .populate('customerId', 'name email phone')
      .populate('vendorId', 'name email phone')
      .populate('jobId', 'title status')
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalTransactions = await AccountTransaction.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        transactions,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalTransactions / limit),
          count: transactions.length,
          totalTransactions
        }
      }
    });
    
  } catch (error) {
    console.error('Get account transactions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching account transactions'
    });
  }
});

// @route   GET /api/accounts/balances
// @desc    Get account balances for the authenticated user
// @access  Private
router.get('/balances', protect, async (req, res) => {
  try {
    const balances = await AccountTransaction.getAccountBalances(req.user._id);
    
    // Get current account balances from AccountBalance model
    const currentBalances = await AccountBalance.findOne({ userId: req.user._id });
    
    res.status(200).json({
      status: 'success',
      data: {
        balances,
        currentBalances: currentBalances || {
          cashBalance: 0,
          bankBalance: 0,
          creditCardBalance: 0,
          loanBalance: 0,
          investmentBalance: 0
        }
      }
    });
    
  } catch (error) {
    console.error('Get account balances error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching account balances'
    });
  }
});

// @route   GET /api/accounts/cheques
// @desc    Get all cheques for the authenticated user
// @access  Private
router.get('/cheques', protect, [
  query('status').optional().isIn(['issued', 'deposited', 'cleared', 'bounced', 'cancelled']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query (always scoped to authenticated user)
    const query = { userId: req.user._id };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { chequeNumber: { $regex: search, $options: 'i' } },
        { bankName: { $regex: search, $options: 'i' } },
        { branchName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const cheques = await Cheque.find(query)
      .populate('vendorId', 'name email phone')
      .populate('customerId', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalCheques = await Cheque.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        cheques,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalCheques / limit),
          count: cheques.length,
          totalCheques
        }
      }
    });
    
  } catch (error) {
    console.error('Get cheques error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching cheques'
    });
  }
});

// @route   POST /api/accounts/transactions
// @desc    Create new account transaction
// @access  Private
router.post('/transactions', protect, transactionValidation, async (req, res) => {
  try {
    // Check for validation errors
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg
        }))
      });
    }

    console.log('📝 Creating transaction with data:', req.body);
    console.log('👤 User ID:', req.user._id);

    const transactionData = {
      ...req.body,
      userId: req.user._id
    };

    console.log('💾 Transaction data to save:', transactionData);

    const transaction = await AccountTransaction.create(transactionData);
    console.log('✅ Transaction created:', transaction._id);

    // Update account balances
    await updateAccountBalances(req.user._id, transaction);
    console.log('✅ Account balances updated');

    // Populate the created transaction
    const populatedTransaction = await AccountTransaction.findById(transaction._id)
      .populate('customerId', 'name email phone')
      .populate('vendorId', 'name email phone')
      .populate('jobId', 'title status')
      .populate('invoiceId', 'invoiceNumber totalAmount');

    res.status(201).json({
      status: 'success',
      message: 'Account transaction created successfully',
      data: {
        transaction: populatedTransaction
      }
    });

  } catch (error) {
    console.error('❌ Create account transaction error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);

    if (error.stack) {
      console.error('❌ Error stack:', error.stack);
    }

    // Handle specific mongoose errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Duplicate transaction number. Please try again.'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Server error while creating account transaction',
      error: error.message
    });
  }
});

// @route   PUT /api/accounts/transactions/:id
// @desc    Update account transaction
// @access  Private
router.put('/transactions/:id', protect, transactionValidation, async (req, res) => {
  try {
    const transaction = await AccountTransaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('customerId', 'name email phone')
      .populate('vendorId', 'name email phone')
      .populate('jobId', 'title status')
      .populate('invoiceId', 'invoiceNumber totalAmount');
    
    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Account transaction not found'
      });
    }
    
    // Update account balances
    await updateAccountBalances(req.user._id, transaction);
    
    res.status(200).json({
      status: 'success',
      message: 'Account transaction updated successfully',
      data: {
        transaction
      }
    });
    
  } catch (error) {
    console.error('Update account transaction error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating account transaction'
    });
  }
});

// @route   DELETE /api/accounts/transactions/:id
// @desc    Delete account transaction
// @access  Private
router.delete('/transactions/:id', protect, async (req, res) => {
  try {
    const transaction = await AccountTransaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!transaction) {
      return res.status(404).json({
        status: 'error',
        message: 'Account transaction not found'
      });
    }
    
    // Update account balances (reverse the transaction)
    await reverseAccountBalances(req.user._id, transaction);
    
    res.status(200).json({
      status: 'success',
      message: 'Account transaction deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete account transaction error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting account transaction'
    });
  }
});

// @route   GET /api/accounts/stats/summary
// @desc    Get account statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const stats = await AccountTransaction.getTransactionStats(req.user._id);
    
    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
    
  } catch (error) {
    console.error('Get account stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching account statistics'
    });
  }
});

// @route   GET /api/accounts/reports/summary
// @desc    Period-aware financial summary (income/expense/net) + current balances
// @access  Private
router.get('/reports/summary', protect, async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const now = new Date();
    let start;
    switch (period) {
      case 'week': {
        start = new Date(now);
        const day = start.getDay();          // 0 = Sunday
        const diff = day === 0 ? 6 : day - 1; // back to Monday
        start.setDate(start.getDate() - diff);
        start.setHours(0, 0, 0, 0);
        break;
      }
      case 'quarter': {
        const q = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), q * 3, 1);
        break;
      }
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Sum income/expense for the period (completed transactions only)
    const agg = await AccountTransaction.aggregate([
      { $match: { userId: req.user._id, status: 'completed', createdAt: { $gte: start } } },
      { $group: { _id: '$transactionType', total: { $sum: '$amount' } } }
    ]);

    let totalIncome = 0;
    let totalExpenses = 0;
    agg.forEach(g => {
      if (g._id === 'income') totalIncome += g.total;
      else if (g._id === 'expense') totalExpenses += g.total;
    });
    const netProfit = totalIncome - totalExpenses;

    // Current balances (point-in-time, not period-bound)
    const currentBalances = await AccountBalance.findOne({ userId: req.user._id });
    const cashBalance = currentBalances?.cashBalance || 0;
    const bankBalance = currentBalances?.bankBalance || 0;

    res.status(200).json({
      status: 'success',
      data: {
        report: {
          period,
          startDate: start,
          totalIncome,
          totalExpenses,
          netProfit,
          cashFlow: netProfit, // operating cash flow ≈ net for this model
          cashBalance,
          bankBalance
        }
      }
    });
  } catch (error) {
    console.error('Get account report summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while generating report summary'
    });
  }
});

// @route   GET /api/accounts/ledger
// @desc    Get account ledger entries
// @access  Private
router.get('/ledger', protect, [
  query('accountType').optional().isIn(['cash', 'bank', 'credit_card', 'loan', 'investment']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      accountType,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;
    
    // Build query - scoped per admin
    const query = { status: 'completed', userId: req.user._id };
    
    if (accountType && accountType !== 'all') {
      query.accountType = accountType;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute query
    const transactions = await AccountTransaction.find(query)
      .populate('customerId', 'name email phone')
      .populate('vendorId', 'name email phone')
      .populate('jobId', 'title status')
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalTransactions = await AccountTransaction.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        transactions,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalTransactions / limit),
          count: transactions.length,
          totalTransactions
        }
      }
    });
    
  } catch (error) {
    console.error('Get account ledger error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching account ledger'
    });
  }
});

// Helper function to update account balances
async function updateAccountBalances(userId, transaction) {
  try {
    let accountBalance = await AccountBalance.findOne({ userId });
    
    if (!accountBalance) {
      accountBalance = new AccountBalance({
        userId,
        cashBalance: 0,
        bankBalance: 0,
        creditCardBalance: 0,
        loanBalance: 0,
        investmentBalance: 0
      });
    }
    
    const amount = transaction.amount;
    const isIncome = ['income', 'opening_balance'].includes(transaction.transactionType);
    const isExpense = ['expense', 'transfer'].includes(transaction.transactionType);
    
    // Update balances based on account type and transaction type
    switch (transaction.accountType) {
      case 'cash':
        accountBalance.cashBalance += isIncome ? amount : -amount;
        break;
      case 'bank':
        accountBalance.bankBalance += isIncome ? amount : -amount;
        break;
      case 'credit_card':
        accountBalance.creditCardBalance += isIncome ? -amount : amount;
        break;
      case 'loan':
        accountBalance.loanBalance += isIncome ? -amount : amount;
        break;
      case 'investment':
        accountBalance.investmentBalance += isIncome ? amount : -amount;
        break;
    }
    
    await accountBalance.save();
  } catch (error) {
    console.error('Error updating account balances:', error);
  }
}

// Helper function to reverse account balances
async function reverseAccountBalances(userId, transaction) {
  try {
    let accountBalance = await AccountBalance.findOne({ userId });
    
    if (!accountBalance) return;
    
    const amount = transaction.amount;
    const isIncome = ['income', 'opening_balance'].includes(transaction.transactionType);
    const isExpense = ['expense', 'transfer'].includes(transaction.transactionType);
    
    // Reverse balances based on account type and transaction type
    switch (transaction.accountType) {
      case 'cash':
        accountBalance.cashBalance += isIncome ? -amount : amount;
        break;
      case 'bank':
        accountBalance.bankBalance += isIncome ? -amount : amount;
        break;
      case 'credit_card':
        accountBalance.creditCardBalance += isIncome ? amount : -amount;
        break;
      case 'loan':
        accountBalance.loanBalance += isIncome ? amount : -amount;
        break;
      case 'investment':
        accountBalance.investmentBalance += isIncome ? -amount : amount;
        break;
    }
    
    await accountBalance.save();
  } catch (error) {
    console.error('Error reversing account balances:', error);
  }
}

// @route   GET /api/accounts/reports/export
// @desc    Export account report to Excel with invoice data
// @access  Private
router.get('/reports/export', protect, [
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
  query('format').optional().isIn(['pdf', 'excel']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('userId').optional().isMongoId()
], async (req, res) => {
  try {
    const {
      period = 'month',
      format = 'excel',
      startDate,
      endDate,
      userId
    } = req.query;

    // Calculate date range based on period
    let start, end;
    const now = new Date();

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      switch (period) {
        case 'week':
          start = new Date(now.setDate(now.getDate() - 7));
          end = new Date();
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          start = new Date(now.getFullYear(), quarter * 3, 1);
          end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31);
          break;
      }
    }

    // Fetch account transactions for the period
    const transactionQuery = {
      createdAt: { $gte: start, $lte: end },
      status: 'completed',
      userId: req.user._id
    };

    const transactions = await AccountTransaction.find(transactionQuery)
      .populate('customerId', 'name email phone')
      .populate('vendorId', 'name email phone')
      .populate('jobId', 'title status')
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${transactions.length} transactions for the period`);
    console.log(`📅 Date range: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`);

    // Generate Excel file
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions Report');

    // Set column headers for transactions
    worksheet.columns = [
      { header: 'Transaction Date', key: 'transactionDate', width: 18 },
      { header: 'Transaction #', key: 'transactionNumber', width: 20 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Payment Method', key: 'paymentMethod', width: 18 },
      { header: 'Account Type', key: 'accountType', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 12 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true, size: 11 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add transaction data
    transactions.forEach(transaction => {
      worksheet.addRow({
        transactionDate: new Date(transaction.createdAt).toLocaleDateString('en-GB'),
        transactionNumber: transaction.transactionNumber || 'N/A',
        description: transaction.description,
        category: transaction.category,
        type: transaction.transactionType === 'income' ? 'Income' : 'Expense',
        paymentMethod: transaction.paymentMethod ? transaction.paymentMethod.replace('_', ' ').toUpperCase() : 'N/A',
        accountType: transaction.accountType ? transaction.accountType.replace('_', ' ').toUpperCase() : 'N/A',
        amount: transaction.amount,
        status: transaction.status ? transaction.status.toUpperCase() : 'COMPLETED'
      });
    });

    // Add number formatting for amount column
    worksheet.getColumn('amount').numFmt = '₹#,##0.00';
    worksheet.getColumn('amount').alignment = { horizontal: 'right' };

    // Center align some columns
    ['type', 'status', 'paymentMethod', 'accountType'].forEach(col => {
      worksheet.getColumn(col).alignment = { horizontal: 'center' };
    });

    // Set response headers for Excel download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transactions-report-${period}-${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export account report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while exporting account report'
    });
  }
});

module.exports = router;