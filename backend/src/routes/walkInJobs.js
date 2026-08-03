const express = require('express');
const { body, query } = require('express-validator');
const WalkInJob = require('../models/WalkInJob');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const walkInJobValidation = [
  body('customerName').notEmpty().withMessage('Customer name is required').trim(),
  body('customerPhone').notEmpty().withMessage('Customer phone is required').trim(),
  body('customerEmail').optional().isEmail().normalizeEmail(),
  body('jobType').isIn(['printing', 'design', 'binding', 'lamination', 'cutting', 'other']),
  body('description').notEmpty().withMessage('Job description is required').trim(),
  body('specifications.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('timeline.estimatedCompletion').isISO8601().withMessage('Valid estimated completion date required'),
  body('timeline.priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('pricing.estimatedCost').optional().isFloat({ min: 0 })
];

// @route   GET /api/walk-in-jobs
// @desc    Get all walk-in jobs for the authenticated user
// @access  Private
router.get('/', protect, [
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'delivered', 'cancelled']),
  query('jobType').optional().isIn(['printing', 'design', 'binding', 'lamination', 'cutting', 'other']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      status,
      jobType,
      priority,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query - filter by authenticated user
    const query = { userId: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (jobType && jobType !== 'all') {
      query.jobType = jobType;
    }
    
    if (priority && priority !== 'all') {
      query['timeline.priority'] = priority;
    }
    
    if (search) {
      query.$or = [
        { jobNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const jobs = await WalkInJob.find(query)
      .populate('assignedTo.operator', 'name email phone')
      .populate('qualityCheck.checkedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalJobs = await WalkInJob.countDocuments(query);
    
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
    console.error('Get walk-in jobs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching walk-in jobs'
    });
  }
});

// @route   GET /api/walk-in-jobs/:id
// @desc    Get single walk-in job
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const job = await WalkInJob.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('assignedTo.operator', 'name email phone')
      .populate('qualityCheck.checkedBy', 'name email');
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Walk-in job not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        job
      }
    });
    
  } catch (error) {
    console.error('Get walk-in job error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching walk-in job'
    });
  }
});

// @route   POST /api/walk-in-jobs
// @desc    Create new walk-in job
// @access  Private
router.post('/', protect, walkInJobValidation, async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      userId: req.user._id
    };
    
    const job = await WalkInJob.create(jobData);
    
    // Populate the created job
    const populatedJob = await WalkInJob.findById(job._id)
      .populate('assignedTo.operator', 'name email phone')
      .populate('qualityCheck.checkedBy', 'name email');
    
    res.status(201).json({
      status: 'success',
      message: 'Walk-in job created successfully',
      data: {
        job: populatedJob
      }
    });
    
  } catch (error) {
    console.error('Create walk-in job error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating walk-in job'
    });
  }
});

// @route   PUT /api/walk-in-jobs/:id
// @desc    Update walk-in job
// @access  Private
router.put('/:id', protect, walkInJobValidation, async (req, res) => {
  try {
    const job = await WalkInJob.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('assignedTo.operator', 'name email phone')
      .populate('qualityCheck.checkedBy', 'name email');
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Walk-in job not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Walk-in job updated successfully',
      data: {
        job
      }
    });
    
  } catch (error) {
    console.error('Update walk-in job error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating walk-in job'
    });
  }
});

// @route   DELETE /api/walk-in-jobs/:id
// @desc    Delete walk-in job
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const job = await WalkInJob.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Walk-in job not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Walk-in job deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete walk-in job error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting walk-in job'
    });
  }
});

// @route   PUT /api/walk-in-jobs/:id/status
// @desc    Update walk-in job status
// @access  Private
router.put('/:id/status', protect, [
  body('status').isIn(['pending', 'in_progress', 'completed', 'delivered', 'cancelled']),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const { status, progress, notes } = req.body;
    
    const updateData = { status };
    if (progress !== undefined) updateData.progress = progress;
    if (notes) updateData.notes = notes;
    
    // Set completion date if status is completed
    if (status === 'completed') {
      updateData['timeline.actualCompletion'] = new Date();
    }
    
    const job = await WalkInJob.findOneAndUpdate(
      { _id: req.params.id },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedTo.operator', 'name email phone')
      .populate('qualityCheck.checkedBy', 'name email');
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Walk-in job not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Walk-in job status updated successfully',
      data: {
        job
      }
    });
    
  } catch (error) {
    console.error('Update walk-in job status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating walk-in job status'
    });
  }
});

// @route   PUT /api/walk-in-jobs/:id/assign
// @desc    Assign walk-in job to operator
// @access  Private
router.put('/:id/assign', protect, [
  body('operatorId').isMongoId().withMessage('Valid operator ID is required')
], async (req, res) => {
  try {
    const { operatorId } = req.body;
    
    // Verify operator exists
    const operator = await User.findOne({
      _id: operatorId,
      role: 'staff',
      isActive: true
    });
    
    if (!operator) {
      return res.status(404).json({
        status: 'error',
        message: 'Operator not found or inactive'
      });
    }
    
    const job = await WalkInJob.findOneAndUpdate(
      { _id: req.params.id },
      {
        'assignedTo.operator': operatorId,
        'assignedTo.operatorName': operator.fullName,
        status: 'in_progress'
      },
      { new: true, runValidators: true }
    )
      .populate('assignedTo.operator', 'name email phone')
      .populate('qualityCheck.checkedBy', 'name email');
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Walk-in job not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Walk-in job assigned successfully',
      data: {
        job
      }
    });
    
  } catch (error) {
    console.error('Assign walk-in job error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while assigning walk-in job'
    });
  }
});

// @route   PUT /api/walk-in-jobs/:id/quality-check
// @desc    Update quality check for walk-in job
// @access  Private
router.put('/:id/quality-check', protect, [
  body('checked').isBoolean(),
  body('approved').optional().isBoolean(),
  body('qualityNotes').optional().trim(),
  body('checkedBy').optional().isMongoId()
], async (req, res) => {
  try {
    const { checked, approved, qualityNotes, checkedBy } = req.body;
    
    const updateData = {
      'qualityCheck.checked': checked,
      'qualityCheck.checkedAt': checked ? new Date() : null
    };
    
    if (approved !== undefined) updateData['qualityCheck.approved'] = approved;
    if (qualityNotes) updateData['qualityCheck.qualityNotes'] = qualityNotes;
    if (checkedBy) updateData['qualityCheck.checkedBy'] = checkedBy;
    
    const job = await WalkInJob.findOneAndUpdate(
      { _id: req.params.id },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedTo.operator', 'name email phone')
      .populate('qualityCheck.checkedBy', 'name email');
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Walk-in job not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Quality check updated successfully',
      data: {
        job
      }
    });
    
  } catch (error) {
    console.error('Update quality check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating quality check'
    });
  }
});

// @route   GET /api/walk-in-jobs/stats/summary
// @desc    Get walk-in job statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const stats = await WalkInJob.getWalkInStats(req.user._id);
    
    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
    
  } catch (error) {
    console.error('Get walk-in job stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching walk-in job statistics'
    });
  }
});

module.exports = router;