const express = require('express');
const { body, query } = require('express-validator');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');
const { createDataScopeQuery } = require('../utils/dataScopeHelper');

const router = express.Router();

// Validation rules
const customerValidation = [
  body('name').notEmpty().withMessage('Customer name is required').trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  body('customerType').optional().isIn(['Individual', 'Business', 'Corporate', 'Walk-in']),
];

// @route   GET /api/customers
// @desc    Get all customers for the authenticated user
// @access  Private
router.get('/', protect, [
  query('status').optional().isIn(['active', 'inactive', 'blacklisted']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
  try {
    const {
      status = 'active',
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query - show only customers in the same dataScope
    // Fallback to userId if dataScope is not available (during migration)
    const query = req.user.dataScope
      ? createDataScopeQuery(req.user.dataScope)
      : { userId: req.user._id };

    if (status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const customers = await Customer.find(query)
      .populate('createdBy', 'fullName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalCustomers = await Customer.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        customers,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalCustomers / limit),
          count: customers.length,
          totalCustomers
        }
      }
    });
    
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching customers'
    });
  }
});

// @route   GET /api/customers/:id
// @desc    Get single customer
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    // Use dataScope if available, fallback to userId during migration
    const query = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const customer = await Customer.findOne(query)
      .populate('createdBy', 'fullName email')
      .populate('wallet')
      .populate({
        path: 'activityLogs',
        options: { sort: { createdAt: -1 }, limit: 10 }
      });
    console.log('customer',customer)
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        customer
      }
    });
    
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching customer'
    });
  }
});

// @route   POST /api/customers
// @desc    Create new customer
// @access  Private
router.post('/', protect, customerValidation, async (req, res) => {
  try {

    console.log('REQUEST BODY IS WORKING', req.body)
    // Check if customer with same email already exists (scoped to the same company/admin)
    // Prefer dataScope isolation when available; fallback to userId during migration
    if (req.body.email) {
      const scopeQuery = req.user.dataScope
        ? { dataScope: req.user.dataScope }
        : { userId: req.user._id };

      const existingCustomer = await Customer.findOne({
        ...scopeQuery,
        email: req.body.email.toLowerCase()
      });
      
      if (existingCustomer) {
        return res.status(400).json({
          status: 'error',
          message: 'Customer with this email already exists'
        });
      }
    }
    
    const customerData = {
      ...req.body,
      createdBy: req.user._id,
      userId: req.user._id
    };

    // Add dataScope if user has it (post-migration), otherwise skip
    if (req.user.dataScope) {
      customerData.dataScope = req.user.dataScope;
    }

    const customer = await Customer.create(customerData);
    
    await customer.populate('createdBy', 'fullName email');
    
    res.status(201).json({
      status: 'success',
      message: 'Customer created successfully',
      data: {
        customer
      }
    });
    
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating customer'
    });
  }
});

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private
router.put('/:id', protect, customerValidation, async (req, res) => {
  try {
    // Use dataScope if available, fallback to userId during migration
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    // Check if customer exists and belongs to the authenticated user
    const existingCustomer = await Customer.findOne(findQuery);

    if (!existingCustomer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }

    // Check for email conflicts
    if (req.body.email && req.body.email !== existingCustomer.email) {
      const scopeQuery = req.user.dataScope
        ? { dataScope: req.user.dataScope }
        : { userId: req.user._id };

      const emailConflict = await Customer.findOne({
        ...scopeQuery,
        email: req.body.email.toLowerCase(),
        _id: { $ne: req.params.id }
      });

      if (emailConflict) {
        return res.status(400).json({
          status: 'error',
          message: 'Customer with this email already exists'
        });
      }
    }

    // Update customer
    const customer = await Customer.findOneAndUpdate(
      findQuery,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'fullName email');
    
    res.status(200).json({
      status: 'success',
      message: 'Customer updated successfully',
      data: {
        customer
      }
    });
    
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating customer'
    });
  }
});

// @route   DELETE /api/customers/:id
// @desc    Delete customer (soft delete)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    // Use dataScope if available, fallback to userId during migration
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const customer = await Customer.findOne(findQuery);

    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }

    // Soft delete - change status to inactive
    customer.status = 'inactive';
    customer.isActive = false;
    await customer.save();

    res.status(200).json({
      status: 'success',
      message: 'Customer deleted successfully'
    });

  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting customer'
    });
  }
});

// @route   POST /api/customers/:id/update-stats
// @desc    Update customer statistics
// @access  Private
router.post('/:id/update-stats', protect, async (req, res) => {
  try {
    // Use dataScope if available, fallback to userId during migration
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const customer = await Customer.findOne(findQuery);

    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }

    await customer.updateStats();

    res.status(200).json({
      status: 'success',
      message: 'Customer statistics updated successfully',
      data: {
        customer
      }
    });

  } catch (error) {
    console.error('Update customer stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating customer statistics'
    });
  }
});

// @route   GET /api/customers/:id/jobs
// @desc    Get customer jobs
// @access  Private
router.get('/:id/jobs', protect, async (req, res) => {
  try {
    const Job = require('../models/Job');

    // Use dataScope if available, fallback to userId during migration
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    // Verify the customer belongs to the authenticated user before fetching jobs
    const customer = await Customer.findOne(findQuery);

    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }

    // Query jobs - use dataScope if available, fallback to userId
    const jobQuery = req.user.dataScope
      ? { customerId: req.params.id, dataScope: req.user.dataScope }
      : { customerId: req.params.id, userId: req.user._id };

    const jobs = await Job.find(jobQuery).sort({ createdAt: -1 });
    
    res.status(200).json({
      status: 'success',
      data: {
        jobs
      }
    });
    
  } catch (error) {
    console.error('Get customer jobs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching customer jobs'
    });
  }
});

module.exports = router;
