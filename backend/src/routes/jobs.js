const express = require('express');
const { body, query } = require('express-validator');
const Job = require('../models/Job');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const jobValidation = [
  body('title').notEmpty().withMessage('Job title is required').trim(),
  body('customerId').isMongoId().withMessage('Valid customer ID is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
];

// @route   GET /api/jobs
// @desc    Get all jobs for the authenticated user
// @access  Private
router.get('/', protect, [
  query('status').optional().isIn([
    'inquiry', 'quotation_sent', 'quotation_approved', 'design_in_progress',
    'design_approved', 'production_ready', 'ready_for_print', 'quality_check',
    'completed', 'delivered', 'cancelled'
  ]),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('search').optional().trim(),
], async (req, res) => {
  try {
    const {
      status,
      priority,
      search,
      customerId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query - use dataScope if available, fallback to userId
    const query = req.user.dataScope
      ? { dataScope: req.user.dataScope }
      : { userId: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    if (customerId) {
      query.customerId = customerId;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const jobs = await Job.find(query)
      .populate('customerId', 'name email phone company')
      .populate('assignedTo.handlerId', 'fullName')
      .populate('createdBy', 'fullName')
      .populate({
        path: 'invoices',
        select: '_id invoiceNumber items totalAmount status',
        options: { sort: { createdAt: -1 } }
      })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalJobs = await Job.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        jobs,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalJobs / limit),
          count: jobs.length,
          totalJobs
        }
      }
    });
    
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching jobs'
    });
  }
});

// @route   GET /api/jobs/staff/stats
// @desc    Get total design charge for staff
// @access  Private (Staff role)
// NOTE: This route MUST be before /:id route to avoid matching "staff" as an ID
router.get('/staff/stats', protect, async (req, res) => {
  try {
    console.log('Getting staff stats for user:', req.user._id);

    const { period = 'all' } = req.query; // 'weekly', 'monthly', 'yearly', 'all'
    console.log('Period filter:', period);

    // Calculate date range based on period
    const mongoose = require('mongoose');
    let dateFilter = {};
    const now = new Date();

    if (period === 'weekly') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { createdAt: { $gte: weekAgo } };
    } else if (period === 'monthly') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { createdAt: { $gte: monthAgo } };
    } else if (period === 'yearly') {
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      dateFilter = { createdAt: { $gte: yearAgo } };
    }
    // If period is 'all', no date filter is applied

    // Calculate total design charge for all jobs created by this staff member
    const result = await Job.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user._id),
          'designCharge.amount': { $exists: true, $gt: 0 },
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalDesignCharge: { $sum: '$designCharge.totalAmount' }
        }
      }
    ]);

    const totalDesignCharge = result[0]?.totalDesignCharge || 0;

    console.log(`Total design charge calculated for staff (${period}):`, totalDesignCharge);

    res.status(200).json({
      status: 'success',
      data: {
        totalDesignCharge
      }
    });

  } catch (error) {
    console.error('Get staff stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching staff statistics'
    });
  }
});

// @route   GET /api/jobs/:id
// @desc    Get single job
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };
    const job = await Job.findOne(findQuery)
      .populate('customerId', 'name email phone address company')
      .populate('assignedTo.handlerId', 'fullName')
      .populate('assignedOperator', 'name')
      .populate('createdBy', 'fullName')
      .populate({
        path: 'flowHistory.updatedBy',
        select: 'fullName'
      });
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        job
      }
    });
    
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching job'
    });
  }
});

// @route   POST /api/jobs
// @desc    Create new job
// @access  Private
router.post('/', protect, jobValidation, async (req, res) => {
  try {
    // Verify customer exists and belongs to the authenticated user's dataScope or userId
    const customerQuery = req.user.dataScope
      ? { _id: req.body.customerId, dataScope: req.user.dataScope, status: 'active' }
      : { _id: req.body.customerId, userId: req.user._id, status: 'active' };
    const customer = await Customer.findOne(customerQuery);

    if (!customer) {
      return res.status(400).json({
        status: 'error',
        message: 'Customer not found or inactive'
      });
    }

    const jobData = {
      ...req.body,
      createdBy: req.user._id,
      userId: req.user._id,
      ...(req.user.dataScope && { dataScope: req.user.dataScope }),
      // Explicitly handle items array
      items: req.body.items || [],
      // Explicitly handle design charge
      designCharge: req.body.designCharge || null
    };

    const job = await Job.create(jobData);
    
    await job.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'createdBy', select: 'fullName' }
    ]);
    
    res.status(201).json({
      status: 'success',
      message: 'Job created successfully',
      data: {
        job
      }
    });

  } catch (error) {
    console.error('Create job error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Server error while creating job'
    });
  }
});

// @route   PUT /api/jobs/:id
// @desc    Update job
// @access  Private
router.put('/:id', protect, jobValidation, async (req, res) => {
  try {
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };
    const job = await Job.findOne(findQuery);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    // Check customer if customerId is being updated
    if (req.body.customerId && req.body.customerId !== job._id.toString()) {
      const customerQuery = req.user.dataScope
        ? { _id: req.body.customerId, dataScope: req.user.dataScope, status: 'active' }
        : { _id: req.body.customerId, userId: req.user._id, status: 'active' };
      const customer = await Customer.findOne(customerQuery);
      
      if (!customer) {
        return res.status(400).json({
          status: 'error',
          message: 'Customer not found or inactive'
        });
      }
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      // Explicitly handle items array
      items: req.body.items !== undefined ? req.body.items : job.items,
      // Explicitly handle design charge
      designCharge: req.body.designCharge !== undefined ? req.body.designCharge : job.designCharge
    };

    // Update job
    const updatedJob = await Job.findOneAndUpdate(
      findQuery,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'fullName');

    res.status(200).json({
      status: 'success',
      message: 'Job updated successfully',
      data: {
        job: updatedJob
      }
    });

  } catch (error) {
    console.error('Update job error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Server error while updating job'
    });
  }
});

// @route   DELETE /api/jobs/:id
// @desc    Delete job (hard delete)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };
    const job = await Job.findOne(findQuery);
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    // Hard delete - actually remove from database
    await Job.deleteOne(findQuery);
    
    res.status(200).json({
      status: 'success',
      message: 'Job deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting job'
    });
  }
});

// @route   POST /api/jobs/:id/update-status
// @desc    Update job status
// @access  Private
router.post('/:id/update-status', protect, [
  body('status').isIn([
    'inquiry', 'quotation_sent', 'quotation_approved', 'design_in_progress',
    'design_approved', 'production_ready', 'ready_for_print', 'quality_check',
    'completed', 'delivered', 'cancelled'
  ]).withMessage('Invalid status provided'),
  body('remarks').optional().trim(),
], async (req, res) => {
  try {
    const { status, remarks } = req.body;

    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };
    const job = await Job.findOne(findQuery);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    job.status = status;
    
    // Add to flow history if status change affects flow stage
    const flowStageMap = {
      'quotation_sent': 'quotation_sent',
      'quotation_approved': 'quotation_approved',
      'design_in_progress': 'design_in_progress',
      'design_approved': 'design_approved',
      'production_ready': 'production_ready',
      'ready_for_print': 'ready_for_print',
      'quality_check': 'quality_check',
      'completed': 'job_complete',
      'delivered': 'product_received'
    };

    if (flowStageMap[status]) {
      job.flowStage = flowStageMap[status];
      job.flowHistory.push({
        stage: flowStageMap[status],
        handlerName: req.user.fullName,
        remarks: remarks || `Status changed to ${status}`,
        updatedBy: req.user._id
      });
      
      if (status === 'completed') {
        job.completionDate = new Date();
      }
    }

    await job.save();
    
    await job.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'assignedTo.handlerId', select: 'fullName' }
    ]);
    
    res.status(200).json({
      status: 'success',
      message: 'Job status updated successfully',
      data: {
        job
      }
    });
    
  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating job status'
    });
  }
});

// @route   POST /api/jobs/:id/assign
// @desc    Assign job to operator
// @access  Private
router.post('/:id/assign', protect, [
  body('operatorId').isMongoId().withMessage('Valid operator ID is required'),
  body('operatorName').notEmpty().withMessage('Operator name is required').trim(),
], async (req, res) => {
  try {
    const { operatorId, operatorName } = req.body;

    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };
    const job = await Job.findOne(findQuery);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    await job.assignToOperator(operatorId, operatorName);
    
    // Update flow to "job_handler_assigned" if not already assigned
    if (job.flowStage === 'customer_inquiry') {
      await job.updateFlowStage(
        'job_handler_assigned',
        operatorName,
        `Job assigned to ${operatorName}`,
        req.user._id
      );
    }
    
    await job.populate([
      { path: 'assignedOperator', select: 'name' },
      { path: 'customerId', select: 'name email' }
    ]);
    
    res.status(200).json({
      status: 'success',
      message: 'Job assigned successfully',
      data: {
        job
      }
    });
    
  } catch (error) {
    console.error('Assign job error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while assigning job'
    });
  }
});

// @route   POST /api/jobs/:id/update-flow-stage
// @desc    Update job flow stage
// @access  Private
router.post('/:id/update-flow-stage', protect, [
  body('stage').isIn([
    'customer_inquiry', 'job_handler_assigned', 'accountant_review',
    'quotation_sent', 'quotation_approved', 'design_in_progress',
    'design_approved', 'production_ready', 'ready_for_print',
    'quality_check', 'payment_pending', 'payment_collected',
    'job_complete', 'product_received', 'exited'
  ]).withMessage('Invalid flow stage provided'),
  body('remarks').optional().trim(),
], async (req, res) => {
  try {
    const { stage, remarks } = req.body;

    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };
    const job = await Job.findOne(findQuery);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    await job.updateFlowStage(
      stage,
      req.user.fullName,
      remarks || `Flow stage updated to ${stage}`,
      req.user._id
    );
    
    await job.populate([
      { path: 'customerId', select: 'name email phone' },
      { path: 'assignedTo.handlerId', select: 'fullName' }
    ]);
    
    res.status(200).json({
      status: 'success',
      message: 'Job flow stage updated successfully',
      data: {
        job
      }
    });
    
  } catch (error) {
    console.error('Update flow stage error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating flow stage'
    });
  }
});

// @route   GET /api/jobs/stats/dashboard
// @desc    Get job statistics for dashboard
// @access  Private
router.get('/stats/dashboard', protect, async (req, res) => {
  try {
    console.log('Getting job stats for dashboard');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const mongoose = require('mongoose');
    const stats = await Job.aggregate([
      // FIXED: Filter by dataScope if available, fallback to userId
      {
        $match: req.user.dataScope
          ? { dataScope: req.user.dataScope }
          : { userId: new mongoose.Types.ObjectId(req.user._id) }
      },
      {
        $facet: {
          totalJobs: [{ $count: "count" }],
          todayJobs: [
            { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
            { $count: "count" }
          ],
          completedToday: [
            {
              $match: {
                status: 'completed',
                completionDate: { $gte: today, $lt: tomorrow }
              }
            },
            { $count: "count" }
          ],
          urgentJobs: [
            { $match: { priority: 'urgent', status: { $nin: ['completed', 'delivered', 'cancelled'] } } },
            { $count: "count" }
          ],
          inProgressJobs: [
            { $match: { status: { $in: ['design_in_progress', 'production_ready', 'ready_for_print'] } } },
            { $count: "count" }
          ],
          monthlyRevenue: [
            {
              $match: {
                status: 'completed',
                completionDate: { $gte: monthStart }
              }
            },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$estimatedCost' }
              }
            }
          ]
        }
      }
    ]);

    const result = {
      totalJobs: stats[0].totalJobs[0]?.count || 0,
      todayJobs: stats[0].todayJobs[0]?.count || 0,
      completedToday: stats[0].completedToday[0]?.count || 0,
      urgentJobs: stats[0].urgentJobs[0]?.count || 0,
      inProgressJobs: stats[0].inProgressJobs[0]?.count || 0,
      monthlyRevenue: stats[0].monthlyRevenue[0]?.totalRevenue || 0
    };

    res.status(200).json({
      status: 'success',
      data: {
        stats: result
      }
    });
    
  } catch (error) {
    console.error('Get job stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching job statistics'
    });
  }
});

// @route   GET /api/jobs/calendar-status
// @desc    Get job completion status for calendar by month
// @access  Private
router.get('/calendar-status', protect, async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        status: 'error',
        message: 'Year and month are required'
      });
    }

    const startDate = new Date(parseInt(year), parseInt(month), 1);
    const endDate = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59);

    const mongoose = require('mongoose');

    // Get all jobs created in the specified month, grouped by creation date
    const jobsByDate = await Job.aggregate([
      {
        $match: req.user.dataScope
          ? { dataScope: req.user.dataScope, createdAt: { $gte: startDate, $lte: endDate } }
          : { userId: new mongoose.Types.ObjectId(req.user._id), createdAt: { $gte: startDate, $lte: endDate } }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalJobs: { $sum: 1 },
          completedJobs: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          totalJobs: 1,
          completedJobs: 1,
          allCompleted: { $eq: ["$totalJobs", "$completedJobs"] }
        }
      }
    ]);

    // Convert to object for easier lookup
    const statusByDate = {};
    jobsByDate.forEach(item => {
      const day = new Date(item.date).getDate();
      statusByDate[day] = {
        totalJobs: item.totalJobs,
        completedJobs: item.completedJobs,
        allCompleted: item.allCompleted
      };
    });

    res.status(200).json({
      status: 'success',
      data: { statusByDate }
    });

  } catch (error) {
    console.error('Get calendar status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching calendar status'
    });
  }
});

module.exports = router;
