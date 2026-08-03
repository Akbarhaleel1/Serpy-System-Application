const express = require('express');
const { body, query } = require('express-validator');
const TimeEntry = require('../models/TimeEntry');
const Job = require('../models/Job');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const timeEntryValidation = [
  body('jobId').optional().isMongoId().withMessage('Valid job ID required'),
  body('taskId').optional().isMongoId().withMessage('Valid task ID required'),
  body('description').notEmpty().withMessage('Description is required').trim(),
  body('startTime').optional().isISO8601().withMessage('Valid start time required'),
  body('endTime').optional().isISO8601().withMessage('Valid end time required'),
  body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be non-negative'),
  body('notes').optional().trim()
];

// @route   GET /api/time-entries
// @desc    Get all time entries for the authenticated user
// @access  Private
router.get('/', protect, [
  query('jobId').optional().isMongoId(),
  query('taskId').optional().isMongoId(),
  query('staffId').optional().isMongoId(),
  query('status').optional().isIn(['active', 'paused', 'completed']),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      jobId,
      taskId,
      staffId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
      sortBy = 'startTime',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (jobId) query.jobId = jobId;
    if (taskId) query.taskId = taskId;
    if (staffId) query.staffId = staffId;
    if (status) query.status = status;

    // Date range filter
    if (dateFrom || dateTo) {
      query.startTime = {};
      if (dateFrom) query.startTime.$gte = new Date(dateFrom);
      if (dateTo) query.startTime.$lte = new Date(dateTo);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const timeEntries = await TimeEntry.find(query)
      .populate('jobId', 'title status priority')
      .populate('taskId', 'title description status')
      .populate('staffId', 'fullName email role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalEntries = await TimeEntry.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        timeEntries,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalEntries / limit),
          count: timeEntries.length,
          totalEntries
        }
      }
    });

  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching time entries'
    });
  }
});

// @route   GET /api/time-entries/:id
// @desc    Get single time entry
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findOne({ _id: req.params.id })
      .populate('jobId', 'title status priority')
      .populate('taskId', 'title description status')
      .populate('staffId', 'fullName email role');

    if (!timeEntry) {
      return res.status(404).json({
        status: 'error',
        message: 'Time entry not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { timeEntry }
    });

  } catch (error) {
    console.error('Get time entry error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching time entry'
    });
  }
});

// @route   POST /api/time-entries
// @desc    Create new time entry
// @access  Private
router.post('/', protect, timeEntryValidation, async (req, res) => {
  try {
    const { jobId, taskId, description, startTime, endTime, duration, notes } = req.body;

    // Validate job and task if provided
    if (jobId) {
      const job = await Job.findOne({ _id: jobId });
      if (!job) {
        return res.status(404).json({
          status: 'error',
          message: 'Job not found'
        });
      }
    }

    if (taskId) {
      const task = await Task.findOne({ _id: taskId });
      if (!task) {
        return res.status(404).json({
          status: 'error',
          message: 'Task not found'
        });
      }
    }

    const timeEntryData = {
      jobId,
      taskId,
      description,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : null,
      duration: duration || 0,
      notes,
      status: 'active',
      staffId: req.user._id,
      userId: req.user._id
    };

    const timeEntry = await TimeEntry.create(timeEntryData);

    const populatedTimeEntry = await TimeEntry.findById(timeEntry._id)
      .populate('jobId', 'title status priority')
      .populate('taskId', 'title description status')
      .populate('staffId', 'fullName email role');

    res.status(201).json({
      status: 'success',
      message: 'Time entry created successfully',
      data: { timeEntry: populatedTimeEntry }
    });

  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating time entry'
    });
  }
});

// @route   PUT /api/time-entries/:id
// @desc    Update time entry
// @access  Private
router.put('/:id', protect, timeEntryValidation, async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('jobId', 'title status priority')
      .populate('taskId', 'title description status')
      .populate('staffId', 'fullName email role');

    if (!timeEntry) {
      return res.status(404).json({
        status: 'error',
        message: 'Time entry not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Time entry updated successfully',
      data: { timeEntry }
    });

  } catch (error) {
    console.error('Update time entry error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating time entry'
    });
  }
});

// @route   DELETE /api/time-entries/:id
// @desc    Delete time entry
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!timeEntry) {
      return res.status(404).json({
        status: 'error',
        message: 'Time entry not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Time entry deleted successfully'
    });

  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting time entry'
    });
  }
});

// @route   POST /api/time-entries/:id/start
// @desc    Start timer for time entry
// @access  Private
router.post('/:id/start', protect, async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findOne({ _id: req.params.id });

    if (!timeEntry) {
      return res.status(404).json({
        status: 'error',
        message: 'Time entry not found'
      });
    }

    // Check if there's already an active timer
    const activeTimer = await TimeEntry.findOne({
      
      status: 'active',
      _id: { $ne: req.params.id }
    });

    if (activeTimer) {
      return res.status(400).json({
        status: 'error',
        message: 'Another timer is already active. Please stop it first.'
      });
    }

    timeEntry.status = 'active';
    timeEntry.startTime = new Date();
    timeEntry.endTime = null;
    await timeEntry.save();

    res.status(200).json({
      status: 'success',
      message: 'Timer started successfully',
      data: { timeEntry }
    });

  } catch (error) {
    console.error('Start timer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while starting timer'
    });
  }
});

// @route   POST /api/time-entries/:id/pause
// @desc    Pause timer for time entry
// @access  Private
router.post('/:id/pause', protect, async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findOne({ _id: req.params.id });

    if (!timeEntry) {
      return res.status(404).json({
        status: 'error',
        message: 'Time entry not found'
      });
    }

    if (timeEntry.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Timer is not active'
      });
    }

    timeEntry.status = 'paused';
    timeEntry.endTime = new Date();
    
    // Calculate duration
    const duration = Math.floor((timeEntry.endTime - timeEntry.startTime) / 1000 / 60); // minutes
    timeEntry.duration += duration;
    
    await timeEntry.save();

    res.status(200).json({
      status: 'success',
      message: 'Timer paused successfully',
      data: { timeEntry }
    });

  } catch (error) {
    console.error('Pause timer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while pausing timer'
    });
  }
});

// @route   POST /api/time-entries/:id/stop
// @desc    Stop timer for time entry
// @access  Private
router.post('/:id/stop', protect, async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findOne({ _id: req.params.id });

    if (!timeEntry) {
      return res.status(404).json({
        status: 'error',
        message: 'Time entry not found'
      });
    }

    if (timeEntry.status === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Timer is already stopped'
      });
    }

    timeEntry.status = 'completed';
    timeEntry.endTime = new Date();
    
    // Calculate final duration
    if (timeEntry.startTime) {
      const duration = Math.floor((timeEntry.endTime - timeEntry.startTime) / 1000 / 60); // minutes
      timeEntry.duration += duration;
    }
    
    await timeEntry.save();

    res.status(200).json({
      status: 'success',
      message: 'Timer stopped successfully',
      data: { timeEntry }
    });

  } catch (error) {
    console.error('Stop timer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while stopping timer'
    });
  }
});

// @route   GET /api/time-entries/stats/summary
// @desc    Get time entry statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalEntries,
      activeTimers,
      todayEntries,
      monthlyEntries,
      totalTime,
      todayTime,
      monthlyTime,
      jobStats,
      staffStats
    ] = await Promise.all([
      TimeEntry.countDocuments({ userId }),
      TimeEntry.countDocuments({ userId, status: 'active' }),
      TimeEntry.countDocuments({ userId, startTime: { $gte: today } }),
      TimeEntry.countDocuments({ userId, startTime: { $gte: monthStart } }),
      TimeEntry.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: null, total: { $sum: '$duration' } } }
      ]),
      TimeEntry.aggregate([
        { $match: { userId: userId, startTime: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$duration' } } }
      ]),
      TimeEntry.aggregate([
        { $match: { userId: userId, startTime: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$duration' } } }
      ]),
      TimeEntry.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$jobId', totalTime: { $sum: '$duration' }, count: { $sum: 1 } } },
        { $lookup: { from: 'jobs', localField: '_id', foreignField: '_id', as: 'job' } },
        { $unwind: '$job' },
        { $project: { jobTitle: '$job.title', totalTime: 1, count: 1 } },
        { $sort: { totalTime: -1 } },
        { $limit: 10 }
      ]),
      TimeEntry.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$staffId', totalTime: { $sum: '$duration' }, count: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staff' } },
        { $unwind: '$staff' },
        { $project: { staffName: '$staff.fullName', totalTime: 1, count: 1 } },
        { $sort: { totalTime: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalEntries,
          activeTimers,
          todayEntries,
          monthlyEntries,
          totalTime: totalTime[0]?.total || 0,
          todayTime: todayTime[0]?.total || 0,
          monthlyTime: monthlyTime[0]?.total || 0,
          jobStats,
          staffStats
        }
      }
    });

  } catch (error) {
    console.error('Get time entry stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching time entry statistics'
    });
  }
});

// @route   GET /api/time-entries/active
// @desc    Get active timer for user
// @access  Private
router.get('/active', protect, async (req, res) => {
  try {
    const activeTimer = await TimeEntry.findOne({
      
      status: 'active'
    })
      .populate('jobId', 'title status priority')
      .populate('taskId', 'title description status')
      .populate('staffId', 'fullName email role');

    res.status(200).json({
      status: 'success',
      data: { activeTimer }
    });

  } catch (error) {
    console.error('Get active timer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching active timer'
    });
  }
});

module.exports = router;
