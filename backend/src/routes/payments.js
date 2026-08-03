const express = require('express');
const { body, query } = require('express-validator');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const paymentValidation = [
  body('customerId').isMongoId().withMessage('Valid customer ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('paymentMethod').isIn(['cash', 'cheque', 'bank_transfer', 'card', 'upi', 'wallet']),
  body('paymentDate').optional().isISO8601().withMessage('Valid payment date required')
];

// @route   GET /api/payments
// @desc    Get all payments for the authenticated user
// @access  Private
router.get('/', protect, [
  query('status').optional().isIn(['pending', 'completed', 'failed', 'cancelled', 'refunded']),
  query('paymentMethod').optional().isIn(['cash', 'cheque', 'bank_transfer', 'card', 'upi', 'wallet']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      status,
      paymentMethod,
      search,
      page = 1,
      limit = 10,
      sortBy = 'paymentDate',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query - filter by authenticated user
    const query = { userId: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }
    
    if (search) {
      query.$or = [
        { paymentId: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const payments = await Payment.find(query)
      .populate('customerId', 'name email phone')
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalPayments = await Payment.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        payments,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalPayments / limit),
          count: payments.length,
          totalPayments
        }
      }
    });
    
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching payments'
    });
  }
});

// @route   GET /api/payments/:id
// @desc    Get single payment
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('customerId', 'name email phone address')
      .populate('invoiceId', 'invoiceNumber totalAmount items');
    
    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        payment
      }
    });
    
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching payment'
    });
  }
});

// @route   POST /api/payments
// @desc    Create new payment
// @access  Private
router.post('/', protect, paymentValidation, async (req, res) => {
  try {
    // Generate payment ID
    const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Get customer details
    const customer = await Customer.findOne({
      _id: req.body.customerId,
      userId: req.user._id
    });
    
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }
    
    // Get invoice details if provided
    let invoice = null;
    if (req.body.invoiceId) {
      invoice = await Invoice.findOne({
        _id: req.body.invoiceId,
        userId: req.user._id
      });
      
      if (!invoice) {
        return res.status(404).json({
          status: 'error',
          message: 'Invoice not found'
        });
      }
    }
    
    const paymentData = {
      ...req.body,
      paymentId,
      customerName: customer.name,
      invoiceNumber: invoice?.invoiceNumber,
      userId: req.user._id
    };
    
    const payment = await Payment.create(paymentData);
    
    // Update invoice payment status if applicable
    if (invoice) {
      const totalPaid = await Payment.aggregate([
        { $match: { invoiceId: invoice._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      const paidAmount = totalPaid[0]?.total || 0;
      const balanceAmount = invoice.totalAmount - paidAmount;
      
      let paymentStatus = 'pending';
      if (balanceAmount <= 0) {
        paymentStatus = 'paid';
      } else if (paidAmount > 0) {
        paymentStatus = 'partial';
      }
      
      await Invoice.findByIdAndUpdate(invoice._id, {
        paidAmount,
        balanceAmount,
        paymentStatus
      });
    }
    
    // Populate the created payment
    const populatedPayment = await Payment.findById(payment._id)
      .populate('customerId', 'name email phone')
      .populate('invoiceId', 'invoiceNumber totalAmount');
    
    res.status(201).json({
      status: 'success',
      message: 'Payment created successfully',
      data: {
        payment: populatedPayment
      }
    });
    
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating payment'
    });
  }
});

// @route   PUT /api/payments/:id
// @desc    Update payment
// @access  Private
router.put('/:id', protect, paymentValidation, async (req, res) => {
  try {
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('customerId', 'name email phone')
      .populate('invoiceId', 'invoiceNumber totalAmount');
    
    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Payment updated successfully',
      data: {
        payment
      }
    });
    
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating payment'
    });
  }
});

// @route   DELETE /api/payments/:id
// @desc    Delete payment
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const payment = await Payment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Payment deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting payment'
    });
  }
});

// @route   GET /api/payments/stats/summary
// @desc    Get payment statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [
      totalPayments,
      todayPayments,
      monthlyPayments,
      totalAmount,
      todayAmount,
      monthlyAmount,
      paymentMethodStats
    ] = await Promise.all([
      Payment.countDocuments({ userId }),
      Payment.countDocuments({ userId, paymentDate: { $gte: today } }),
      Payment.countDocuments({ userId, paymentDate: { $gte: monthStart } }),
      Payment.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId), status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId), paymentDate: { $gte: today }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId), paymentDate: { $gte: monthStart }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId), status: 'completed' } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }
      ])
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalPayments,
          todayPayments,
          monthlyPayments,
          totalAmount: totalAmount[0]?.total || 0,
          todayAmount: todayAmount[0]?.total || 0,
          monthlyAmount: monthlyAmount[0]?.total || 0,
          paymentMethodStats
        }
      }
    });
    
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching payment statistics'
    });
  }
});

module.exports = router;