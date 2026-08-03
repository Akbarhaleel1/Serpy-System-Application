const express = require('express');
const { body, query } = require('express-validator');
const Vendor = require('../models/Vendor');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const vendorValidation = [
  body('name').notEmpty().withMessage('Vendor name is required').trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  body('vendorType').optional().isIn(['supplier', 'service_provider', 'contractor', 'other']),
  body('status').optional().isIn(['active', 'inactive', 'blacklisted'])
];

// @route   GET /api/vendors
// @desc    Get all vendors for the authenticated user
// @access  Private
router.get('/', protect, [
  query('vendorType').optional().isIn(['supplier', 'service_provider', 'contractor', 'other']),
  query('status').optional().isIn(['active', 'inactive', 'blacklisted']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      vendorType,
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query - filter by authenticated user
    const query = { userId: req.user._id };

    if (vendorType && vendorType !== 'all') {
      query.vendorType = vendorType;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const vendors = await Vendor.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalVendors = await Vendor.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        vendors,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalVendors / limit),
          count: vendors.length,
          totalVendors
        }
      }
    });
    
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching vendors'
    });
  }
});

// @route   GET /api/vendors/analytics
// @desc    Get comprehensive vendor analytics
// @access  Private
router.get('/analytics', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const [analytics, topPerformingVendors, performanceCategories, contractAlerts, paymentTrends, communicationSummary] = await Promise.all([
      Vendor.getVendorAnalytics(userId),
      Vendor.getTopPerformingVendors(userId, 10),
      Vendor.getVendorsByPerformance(userId),
      Vendor.getContractExpiryAlerts(userId, 30),
      Vendor.getVendorPaymentTrends(userId, 12),
      Vendor.getVendorCommunicationSummary(userId, 30)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        analytics: analytics[0] || {
          totalVendors: 0,
          activeVendors: 0,
          totalPendingAmount: 0,
          totalContractValue: 0,
          avgRating: 0,
          avgPerformanceScore: 0
        },
        topPerformingVendors,
        performanceCategories,
        contractAlerts,
        paymentTrends,
        communicationSummary
      }
    });
    
  } catch (error) {
    console.error('Get vendor analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching vendor analytics'
    });
  }
});

// @route   GET /api/vendors/:id
// @desc    Get single vendor
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        vendor
      }
    });
    
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching vendor'
    });
  }
});

// @route   POST /api/vendors
// @desc    Create new vendor
// @access  Private
router.post('/', protect, vendorValidation, async (req, res) => {
  try {
    const vendorData = {
      ...req.body,
      userId: req.user._id
    };
    
    const vendor = await Vendor.create(vendorData);
    
    res.status(201).json({
      status: 'success',
      message: 'Vendor created successfully',
      data: {
        vendor
      }
    });
    
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating vendor'
    });
  }
});

// @route   PUT /api/vendors/:id
// @desc    Update vendor
// @access  Private
router.put('/:id', protect, vendorValidation, async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Vendor updated successfully',
      data: {
        vendor
      }
    });
    
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating vendor'
    });
  }
});

// @route   DELETE /api/vendors/:id
// @desc    Delete vendor
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const vendor = await Vendor.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Vendor deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting vendor'
    });
  }
});

// @route   GET /api/vendors/stats/summary
// @desc    Get vendor statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const [totalVendors, activeVendors, inactiveVendors, blacklistedVendors] = await Promise.all([
      Vendor.countDocuments({ userId }),
      Vendor.countDocuments({ userId, status: 'active' }),
      Vendor.countDocuments({ userId, status: 'inactive' }),
      Vendor.countDocuments({ userId, status: 'blacklisted' })
    ]);
    
    // Get vendor type distribution
    const vendorTypeStats = await Vendor.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId(userId) } },
      { $group: { _id: '$vendorType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalVendors,
          activeVendors,
          inactiveVendors,
          blacklistedVendors,
          vendorTypeStats
        }
      }
    });
    
  } catch (error) {
    console.error('Get vendor stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching vendor statistics'
    });
  }
});

// @route   GET /api/vendors/:id/performance
// @desc    Get vendor performance details
// @access  Private
router.get('/:id/performance', protect, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).select('name performanceMetrics communicationHistory paymentHistory');
    
    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        vendor: {
          name: vendor.name,
          performanceMetrics: vendor.performanceMetrics,
          communicationHistory: vendor.communicationHistory.slice(-10), // Last 10 communications
          paymentHistory: vendor.paymentHistory.slice(-10) // Last 10 payments
        }
      }
    });
    
  } catch (error) {
    console.error('Get vendor performance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching vendor performance'
    });
  }
});

// @route   PUT /api/vendors/:id/performance
// @desc    Update vendor performance metrics
// @access  Private
router.put('/:id/performance', protect, [
  body('onTimeDelivery').optional().isFloat({ min: 0, max: 100 }),
  body('qualityRating').optional().isFloat({ min: 1, max: 5 }),
  body('communicationRating').optional().isFloat({ min: 1, max: 5 }),
  body('priceCompetitiveness').optional().isFloat({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const { onTimeDelivery, qualityRating, communicationRating, priceCompetitiveness } = req.body;
    
    // Calculate overall score
    const overallScore = (qualityRating + communicationRating + priceCompetitiveness) / 3;
    
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id },
      {
        $set: {
          'performanceMetrics.onTimeDelivery': onTimeDelivery,
          'performanceMetrics.qualityRating': qualityRating,
          'performanceMetrics.communicationRating': communicationRating,
          'performanceMetrics.priceCompetitiveness': priceCompetitiveness,
          'performanceMetrics.overallScore': overallScore,
          'performanceMetrics.lastEvaluated': new Date()
        }
      },
      { new: true }
    );
    
    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Vendor performance updated successfully',
      data: {
        vendor: {
          name: vendor.name,
          performanceMetrics: vendor.performanceMetrics
        }
      }
    });
    
  } catch (error) {
    console.error('Update vendor performance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating vendor performance'
    });
  }
});

// @route   POST /api/vendors/:id/communication
// @desc    Add communication record
// @access  Private
router.post('/:id/communication', protect, [
  body('type').isIn(['Email', 'Phone', 'Meeting', 'WhatsApp', 'Other']),
  body('subject').notEmpty().trim(),
  body('notes').optional().trim(),
  body('initiatedBy').isIn(['Vendor', 'Company', 'Both'])
], async (req, res) => {
  try {
    const { type, subject, notes, initiatedBy } = req.body;
    
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id },
      {
        $push: {
          communicationHistory: {
            date: new Date(),
            type,
            subject,
            notes,
            initiatedBy
          }
        }
      },
      { new: true }
    );
    
    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Communication record added successfully',
      data: {
        communication: vendor.communicationHistory[vendor.communicationHistory.length - 1]
      }
    });
    
  } catch (error) {
    console.error('Add communication error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while adding communication record'
    });
  }
});

// @route   POST /api/vendors/:id/payment
// @desc    Add payment record
// @access  Private
router.post('/:id/payment', protect, [
  body('amount').isFloat({ min: 0 }),
  body('invoiceNumber').optional().trim(),
  body('paymentMethod').isIn(['Bank Transfer', 'Cheque', 'Cash', 'UPI', 'Other']),
  body('status').isIn(['Pending', 'Paid', 'Overdue', 'Cancelled']),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const { amount, invoiceNumber, paymentMethod, status, notes } = req.body;
    
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id },
      {
        $push: {
          paymentHistory: {
            date: new Date(),
            amount,
            invoiceNumber,
            paymentMethod,
            status,
            notes
          }
        },
        $inc: {
          pendingAmount: status === 'Paid' ? -amount : amount
        }
      },
      { new: true }
    );
    
    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Payment record added successfully',
      data: {
        payment: vendor.paymentHistory[vendor.paymentHistory.length - 1],
        updatedPendingAmount: vendor.pendingAmount
      }
    });
    
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while adding payment record'
    });
  }
});

module.exports = router;