const express = require('express');
const { body, query } = require('express-validator');
const DiscountRule = require('../models/DiscountRule');
const CustomerPricing = require('../models/CustomerPricing');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules for discount rules
const discountRuleValidation = [
  body('name').notEmpty().withMessage('Discount rule name is required').trim(),
  body('type').isIn(['percentage', 'fixed', 'bulk']).withMessage('Invalid discount type'),
  body('value').isFloat({ min: 0 }).withMessage('Discount value must be non-negative'),
  body('minimumAmount').optional().isFloat({ min: 0 }).withMessage('Minimum amount must be non-negative'),
  body('customerType').optional().isIn(['all', 'specific', 'new', 'returning']),
  body('jobTypes').optional().isArray(),
  body('validFrom').optional().isISO8601(),
  body('validUntil').optional().isISO8601(),
  body('usageLimit').optional().isInt({ min: 1 }),
  body('isActive').optional().isBoolean()
];

// Validation rules for customer pricing
const customerPricingValidation = [
  body('customerId').isMongoId().withMessage('Valid customer ID is required'),
  body('discountPercentage').isFloat({ min: 0, max: 100 }).withMessage('Discount percentage must be between 0 and 100'),
  body('specialRates').optional().isArray()
];

// @route   GET /api/discounts/rules
// @desc    Get all discount rules for the authenticated user
// @access  Private
router.get('/rules', protect, [
  query('type').optional().isIn(['percentage', 'fixed', 'bulk']),
  query('customerType').optional().isIn(['all', 'specific', 'new', 'returning']),
  query('isActive').optional().isBoolean(),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      type,
      customerType,
      isActive,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (type && type !== 'all') {
      query.type = type;
    }

    if (customerType && customerType !== 'all') {
      query.customerType = customerType;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const discountRules = await DiscountRule.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalRules = await DiscountRule.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        discountRules,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalRules / limit),
          count: discountRules.length,
          totalRules
        }
      }
    });

  } catch (error) {
    console.error('Get discount rules error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching discount rules'
    });
  }
});

// @route   GET /api/discounts/rules/:id
// @desc    Get single discount rule
// @access  Private
router.get('/rules/:id', protect, async (req, res) => {
  try {
    const discountRule = await DiscountRule.findOne({ _id: req.params.id });

    if (!discountRule) {
      return res.status(404).json({
        status: 'error',
        message: 'Discount rule not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { discountRule }
    });

  } catch (error) {
    console.error('Get discount rule error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching discount rule'
    });
  }
});

// @route   POST /api/discounts/rules
// @desc    Create new discount rule
// @access  Private
router.post('/rules', protect, discountRuleValidation, async (req, res) => {
  try {
    const discountRule = await DiscountRule.create({
      ...req.body,
      userId: req.user._id
    });

    res.status(201).json({
      status: 'success',
      message: 'Discount rule created successfully',
      data: { discountRule }
    });

  } catch (error) {
    console.error('Create discount rule error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating discount rule'
    });
  }
});

// @route   PUT /api/discounts/rules/:id
// @desc    Update discount rule
// @access  Private
router.put('/rules/:id', protect, discountRuleValidation, async (req, res) => {
  try {
    const discountRule = await DiscountRule.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!discountRule) {
      return res.status(404).json({
        status: 'error',
        message: 'Discount rule not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Discount rule updated successfully',
      data: { discountRule }
    });

  } catch (error) {
    console.error('Update discount rule error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating discount rule'
    });
  }
});

// @route   DELETE /api/discounts/rules/:id
// @desc    Delete discount rule
// @access  Private
router.delete('/rules/:id', protect, async (req, res) => {
  try {
    const discountRule = await DiscountRule.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!discountRule) {
      return res.status(404).json({
        status: 'error',
        message: 'Discount rule not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Discount rule deleted successfully'
    });

  } catch (error) {
    console.error('Delete discount rule error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting discount rule'
    });
  }
});

// @route   GET /api/discounts/customer-pricing
// @desc    Get all customer pricing rules
// @access  Private
router.get('/customer-pricing', protect, [
  query('customerId').optional().isMongoId(),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      customerId,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (customerId) {
      query.customerId = customerId;
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const customerPricing = await CustomerPricing.find(query)
      .populate('customerId', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalPricing = await CustomerPricing.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        customerPricing,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalPricing / limit),
          count: customerPricing.length,
          totalPricing
        }
      }
    });

  } catch (error) {
    console.error('Get customer pricing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching customer pricing'
    });
  }
});

// @route   GET /api/discounts/customer-pricing/:id
// @desc    Get single customer pricing rule
// @access  Private
router.get('/customer-pricing/:id', protect, async (req, res) => {
  try {
    const customerPricing = await CustomerPricing.findOne({ _id: req.params.id })
      .populate('customerId', 'name email phone');

    if (!customerPricing) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer pricing rule not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { customerPricing }
    });

  } catch (error) {
    console.error('Get customer pricing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching customer pricing'
    });
  }
});

// @route   POST /api/discounts/customer-pricing
// @desc    Create new customer pricing rule
// @access  Private
router.post('/customer-pricing', protect, customerPricingValidation, async (req, res) => {
  try {
    const { customerId, ...pricingData } = req.body;

    // Validate customer exists
    const customer = await Customer.findOne({ _id: customerId });
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }

    // Check if pricing rule already exists for this customer
    const existingPricing = await CustomerPricing.findOne({ customerId });
    if (existingPricing) {
      return res.status(400).json({
        status: 'error',
        message: 'Pricing rule already exists for this customer'
      });
    }

    const customerPricing = await CustomerPricing.create({
      ...pricingData,
      customerId,
      customerName: customer.name,
      userId: req.user._id
    });

    const populatedPricing = await CustomerPricing.findById(customerPricing._id)
      .populate('customerId', 'name email phone');

    res.status(201).json({
      status: 'success',
      message: 'Customer pricing rule created successfully',
      data: { customerPricing: populatedPricing }
    });

  } catch (error) {
    console.error('Create customer pricing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating customer pricing rule'
    });
  }
});

// @route   PUT /api/discounts/customer-pricing/:id
// @desc    Update customer pricing rule
// @access  Private
router.put('/customer-pricing/:id', protect, customerPricingValidation, async (req, res) => {
  try {
    const customerPricing = await CustomerPricing.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('customerId', 'name email phone');

    if (!customerPricing) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer pricing rule not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Customer pricing rule updated successfully',
      data: { customerPricing }
    });

  } catch (error) {
    console.error('Update customer pricing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating customer pricing rule'
    });
  }
});

// @route   DELETE /api/discounts/customer-pricing/:id
// @desc    Delete customer pricing rule
// @access  Private
router.delete('/customer-pricing/:id', protect, async (req, res) => {
  try {
    const customerPricing = await CustomerPricing.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!customerPricing) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer pricing rule not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Customer pricing rule deleted successfully'
    });

  } catch (error) {
    console.error('Delete customer pricing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting customer pricing rule'
    });
  }
});

// @route   POST /api/discounts/calculate
// @desc    Calculate discount for a customer and amount
// @access  Private
router.post('/calculate', protect, [
  body('customerId').isMongoId().withMessage('Valid customer ID is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be non-negative'),
  body('jobType').optional().trim(),
  body('isNewCustomer').optional().isBoolean()
], async (req, res) => {
  try {
    const { customerId, amount, jobType, isNewCustomer } = req.body;

    // Get customer pricing rule
    const customerPricing = await CustomerPricing.findOne({ customerId });

    // Get applicable discount rules
    const discountRules = await DiscountRule.find({
      
      isActive: true,
      $or: [
        { validFrom: { $lte: new Date() } },
        { validFrom: { $exists: false } }
      ],
      $or: [
        { validUntil: { $gte: new Date() } },
        { validUntil: { $exists: false } }
      ],
      $or: [
        { minimumAmount: { $lte: amount } },
        { minimumAmount: { $exists: false } }
      ]
    });

    let applicableDiscount = 0;
    let appliedRule = null;

    // Check customer-specific pricing first
    if (customerPricing) {
      applicableDiscount = (amount * customerPricing.discountPercentage) / 100;
      appliedRule = {
        type: 'customer_pricing',
        name: `Customer-specific discount (${customerPricing.discountPercentage}%)`,
        value: customerPricing.discountPercentage,
        discountAmount: applicableDiscount
      };
    } else {
      // Check general discount rules
      for (const rule of discountRules) {
        let isApplicable = false;

        // Check customer type
        if (rule.customerType === 'all') {
          isApplicable = true;
        } else if (rule.customerType === 'new' && isNewCustomer) {
          isApplicable = true;
        } else if (rule.customerType === 'returning' && !isNewCustomer) {
          isApplicable = true;
        }

        // Check job type
        if (isApplicable && rule.jobTypes && rule.jobTypes.length > 0) {
          isApplicable = rule.jobTypes.includes(jobType);
        }

        if (isApplicable) {
          let discountAmount = 0;
          if (rule.type === 'percentage') {
            discountAmount = (amount * rule.value) / 100;
          } else if (rule.type === 'fixed') {
            discountAmount = rule.value;
          }

          if (discountAmount > applicableDiscount) {
            applicableDiscount = discountAmount;
            appliedRule = {
              type: 'discount_rule',
              name: rule.name,
              value: rule.value,
              discountAmount: applicableDiscount
            };
          }
        }
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        originalAmount: amount,
        discountAmount: applicableDiscount,
        finalAmount: amount - applicableDiscount,
        appliedRule
      }
    });

  } catch (error) {
    console.error('Calculate discount error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while calculating discount'
    });
  }
});

// @route   GET /api/discounts/stats/summary
// @desc    Get discount statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      totalRules,
      activeRules,
      totalCustomerPricing,
      ruleTypeStats,
      usageStats
    ] = await Promise.all([
      DiscountRule.countDocuments({ userId }),
      DiscountRule.countDocuments({ userId, isActive: true }),
      CustomerPricing.countDocuments({ userId }),
      DiscountRule.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      DiscountRule.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: null, totalUsage: { $sum: '$usageCount' } } }
      ])
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalRules,
          activeRules,
          totalCustomerPricing,
          ruleTypeStats,
          totalUsage: usageStats[0]?.totalUsage || 0
        }
      }
    });

  } catch (error) {
    console.error('Get discount stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching discount statistics'
    });
  }
});

module.exports = router;
