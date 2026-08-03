const express = require('express');
const { body, query } = require('express-validator');
const Delivery = require('../models/Delivery');
const Job = require('../models/Job');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const deliveryValidation = [
  body('jobId').isMongoId().withMessage('Valid job ID is required'),
  body('customerId').isMongoId().withMessage('Valid customer ID is required'),
  body('deliveryAddress').notEmpty().withMessage('Delivery address is required').trim(),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date required'),
  body('status').optional().isIn(['scheduled', 'in_transit', 'delivered', 'failed', 'cancelled'])
];

// @route   GET /api/deliveries
// @desc    Get all deliveries for the authenticated user
// @access  Private
router.get('/', protect, [
  query('status').optional().isIn(['scheduled', 'in_transit', 'delivered', 'failed', 'cancelled']),
  query('driver').optional().trim(),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      status,
      driver,
      search,
      page = 1,
      limit = 10,
      sortBy = 'scheduledDate',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (driver && driver !== 'all') {
      query.driver = driver;
    }
    
    if (search) {
      query.$or = [
        { trackingNumber: { $regex: search, $options: 'i' } },
        { deliveryAddress: { $regex: search, $options: 'i' } },
        { driver: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const deliveries = await Delivery.find(query)
      .populate('jobId', 'title status customerId')
      .populate('customerId', 'name phone email address')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalDeliveries = await Delivery.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        deliveries,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalDeliveries / limit),
          count: deliveries.length,
          totalDeliveries
        }
      }
    });
    
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching deliveries'
    });
  }
});

// @route   GET /api/deliveries/:id
// @desc    Get single delivery
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const delivery = await Delivery.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('jobId', 'title status customerId')
      .populate('customerId', 'name phone email address');
    
    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        delivery
      }
    });
    
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching delivery'
    });
  }
});

// @route   POST /api/deliveries
// @desc    Create new delivery
// @access  Private
router.post('/', protect, deliveryValidation, async (req, res) => {
  try {
    // Generate tracking number
    const trackingNumber = `DEL-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
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
    
    // Verify customer exists
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
    
    const deliveryData = {
      ...req.body,
      trackingNumber,
      userId: req.user._id
    };
    
    const delivery = await Delivery.create(deliveryData);
    
    // Populate the created delivery
    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate('jobId', 'title status customerId')
      .populate('customerId', 'name phone email address');
    
    res.status(201).json({
      status: 'success',
      message: 'Delivery created successfully',
      data: {
        delivery: populatedDelivery
      }
    });
    
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating delivery'
    });
  }
});

// @route   PUT /api/deliveries/:id
// @desc    Update delivery
// @access  Private
router.put('/:id', protect, deliveryValidation, async (req, res) => {
  try {
    const delivery = await Delivery.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('jobId', 'title status customerId')
      .populate('customerId', 'name phone email address');
    
    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Delivery updated successfully',
      data: {
        delivery
      }
    });
    
  } catch (error) {
    console.error('Update delivery error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating delivery'
    });
  }
});

// @route   DELETE /api/deliveries/:id
// @desc    Delete delivery
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const delivery = await Delivery.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Delivery deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete delivery error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting delivery'
    });
  }
});

// @route   PUT /api/deliveries/:id/status
// @desc    Update delivery status
// @access  Private
router.put('/:id/status', protect, [
  body('status').isIn(['scheduled', 'in_transit', 'delivered', 'failed', 'cancelled']),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const delivery = await Delivery.findOneAndUpdate(
      { _id: req.params.id },
      { 
        status,
        notes: notes || delivery.notes,
        deliveredDate: status === 'delivered' ? new Date() : delivery.deliveredDate
      },
      { new: true, runValidators: true }
    )
      .populate('jobId', 'title status customerId')
      .populate('customerId', 'name phone email address');
    
    if (!delivery) {
      return res.status(404).json({
        status: 'error',
        message: 'Delivery not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Delivery status updated successfully',
      data: {
        delivery
      }
    });
    
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating delivery status'
    });
  }
});

// @route   GET /api/deliveries/stats/summary
// @desc    Get delivery statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const [
      totalDeliveries,
      todayDeliveries,
      monthlyDeliveries,
      statusStats,
      driverStats
    ] = await Promise.all([
      Delivery.countDocuments({ userId }),
      Delivery.countDocuments({ userId, scheduledDate: { $gte: today } }),
      Delivery.countDocuments({ userId, scheduledDate: { $gte: monthStart } }),
      Delivery.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Delivery.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
        { $group: { _id: '$driver', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalDeliveries,
          todayDeliveries,
          monthlyDeliveries,
          statusStats,
          driverStats
        }
      }
    });
    
  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching delivery statistics'
    });
  }
});

module.exports = router;