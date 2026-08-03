const express = require('express');
const { body, query } = require('express-validator');
const Cost = require('../models/Cost');
const Job = require('../models/Job');
const Vendor = require('../models/Vendor');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const costValidation = [
  body('jobId').isMongoId().withMessage('Valid job ID is required'),
  body('jobTitle').notEmpty().withMessage('Job title is required').trim(),
  body('category').isIn(['Materials', 'Labor', 'Overhead', 'Equipment', 'Transport', 'Other']),
  body('description').notEmpty().withMessage('Description is required').trim(),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('quantity').optional().isFloat({ min: 0.01 }),
  body('unit').optional().isIn(['pieces', 'kg', 'meters', 'liters', 'hours', 'days']),
  body('unitCost').optional().isFloat({ min: 0 })
];

// @route   GET /api/costs
// @desc    Get all costs for the authenticated user
// @access  Private
router.get('/', protect, [
  query('category').optional().isIn(['Materials', 'Labor', 'Overhead', 'Equipment', 'Transport', 'Other']),
  query('jobId').optional().isMongoId(),
  query('vendorId').optional().isMongoId(),
  query('paymentStatus').optional().isIn(['pending', 'paid', 'partial', 'overdue']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      category,
      jobId,
      vendorId,
      paymentStatus,
      search,
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    const query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (jobId) {
      query.jobId = jobId;
    }
    
    if (vendorId) {
      query.vendorId = vendorId;
    }
    
    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }
    
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const costs = await Cost.find(query)
      .populate('jobId', 'title status customerId')
      .populate('vendorId', 'name contactPerson')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalCosts = await Cost.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        costs,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalCosts / limit),
          count: costs.length,
          totalCosts
        }
      }
    });
    
  } catch (error) {
    console.error('Get costs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching costs'
    });
  }
});

// @route   GET /api/costs/:id
// @desc    Get single cost
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const cost = await Cost.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('jobId', 'title status customerId')
      .populate('vendorId', 'name contactPerson email phone');
    
    if (!cost) {
      return res.status(404).json({
        status: 'error',
        message: 'Cost not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        cost
      }
    });
    
  } catch (error) {
    console.error('Get cost error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching cost'
    });
  }
});

// @route   POST /api/costs
// @desc    Create new cost
// @access  Private
router.post('/', protect, costValidation, async (req, res) => {
  try {
    // Verify job exists
    const job = await Job.findOne({
      _id: req.body.jobId,
      userId: req.user._id
    });
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }
    
    // Verify vendor exists if provided
    if (req.body.vendorId) {
      const vendor = await Vendor.findOne({
        _id: req.body.vendorId,
        userId: req.user._id
      });
      
      if (!vendor) {
        return res.status(404).json({
          status: 'error',
          message: 'Vendor not found'
        });
      }
      
      req.body.vendorName = vendor.name;
    }
    
    const costData = {
      ...req.body,
      userId: req.user._id
    };
    
    const cost = await Cost.create(costData);
    
    // Update job actual cost
    const jobCosts = await Cost.aggregate([
      { $match: { jobId: job._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalCost = jobCosts[0]?.total || 0;
    await Job.findByIdAndUpdate(job._id, { actualCost: totalCost });
    
    // Populate the created cost
    const populatedCost = await Cost.findById(cost._id)
      .populate('jobId', 'title status customerId')
      .populate('vendorId', 'name contactPerson');
    
    res.status(201).json({
      status: 'success',
      message: 'Cost created successfully',
      data: {
        cost: populatedCost
      }
    });
    
  } catch (error) {
    console.error('Create cost error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating cost'
    });
  }
});

// @route   PUT /api/costs/:id
// @desc    Update cost
// @access  Private
router.put('/:id', protect, costValidation, async (req, res) => {
  try {
    const cost = await Cost.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('jobId', 'title status customerId')
      .populate('vendorId', 'name contactPerson');
    
    if (!cost) {
      return res.status(404).json({
        status: 'error',
        message: 'Cost not found'
      });
    }
    
    // Update job actual cost
    const jobCosts = await Cost.aggregate([
      { $match: { jobId: cost.jobId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalCost = jobCosts[0]?.total || 0;
    await Job.findByIdAndUpdate(cost.jobId, { actualCost: totalCost });
    
    res.status(200).json({
      status: 'success',
      message: 'Cost updated successfully',
      data: {
        cost
      }
    });
    
  } catch (error) {
    console.error('Update cost error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating cost'
    });
  }
});

// @route   DELETE /api/costs/:id
// @desc    Delete cost
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const cost = await Cost.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!cost) {
      return res.status(404).json({
        status: 'error',
        message: 'Cost not found'
      });
    }
    
    // Update job actual cost
    const jobCosts = await Cost.aggregate([
      { $match: { jobId: cost.jobId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const totalCost = jobCosts[0]?.total || 0;
    await Job.findByIdAndUpdate(cost.jobId, { actualCost: totalCost });
    
    res.status(200).json({
      status: 'success',
      message: 'Cost deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete cost error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting cost'
    });
  }
});

// @route   GET /api/costs/stats/summary
// @desc    Get cost statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [
      totalCosts,
      todayCosts,
      monthlyCosts,
      totalAmount,
      todayAmount,
      monthlyAmount,
      categoryStats,
      paymentStatusStats
    ] = await Promise.all([
      Cost.countDocuments({ userId }),
      Cost.countDocuments({ userId, date: { $gte: today } }),
      Cost.countDocuments({ userId, date: { $gte: monthStart } }),
      Cost.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Cost.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId), date: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Cost.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId), date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Cost.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
        { $group: { _id: '$category', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }
      ]),
      Cost.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
        { $group: { _id: '$paymentStatus', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }
      ])
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalCosts,
          todayCosts,
          monthlyCosts,
          totalAmount: totalAmount[0]?.total || 0,
          todayAmount: todayAmount[0]?.total || 0,
          monthlyAmount: monthlyAmount[0]?.total || 0,
          categoryStats,
          paymentStatusStats
        }
      }
    });
    
  } catch (error) {
    console.error('Get cost stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching cost statistics'
    });
  }
});

module.exports = router;