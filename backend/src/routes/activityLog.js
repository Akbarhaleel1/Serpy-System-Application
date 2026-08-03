const express = require('express');
const { query } = require('express-validator');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/activity-log
// @desc    Get activity log entries for the authenticated user
// @access  Private
router.get('/', protect, [
  query('entityType').optional().isIn(['customer', 'job', 'invoice', 'payment', 'inventory', 'vendor', 'staff', 'task', 'delivery', 'emergency_order', 'walk_in_job', 'proof', 'time_entry', 'event', 'discount_rule', 'customer_pricing', 'hsn_code', 'account_transaction', 'cheque', 'cost', 'user', 'system']),
  query('actionType').optional().isIn(['create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import', 'approve', 'reject', 'assign', 'complete', 'cancel', 'start', 'pause', 'stop', 'upload', 'download', 'send', 'receive']),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('performedBy').optional().isMongoId(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      entityType,
      actionType,
      severity,
      performedBy,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (entityType && entityType !== 'all') {
      query.entityType = entityType;
    }

    if (actionType && actionType !== 'all') {
      query.actionType = actionType;
    }

    if (severity && severity !== 'all') {
      query.severity = severity;
    }

    if (performedBy) {
      query.performedBy = performedBy;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { entityName: { $regex: search, $options: 'i' } },
        { performedByName: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const activities = await ActivityLog.find(query)
      .populate('performedBy', 'name email')
      .populate('relatedCustomer', 'name')
      .populate('relatedJob', 'title')
      .populate('relatedInvoice', 'invoiceNumber')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalActivities = await ActivityLog.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        activities,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalActivities / limit),
          count: activities.length,
          totalActivities
        }
      }
    });

  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching activity log'
    });
  }
});

// @route   GET /api/activity-log/:id
// @desc    Get single activity log entry
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const activity = await ActivityLog.findOne({ _id: req.params.id })
      .populate('performedBy', 'name email')
      .populate('relatedCustomer', 'name')
      .populate('relatedJob', 'title')
      .populate('relatedInvoice', 'invoiceNumber');

    if (!activity) {
      return res.status(404).json({
        status: 'error',
        message: 'Activity log entry not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { activity }
    });

  } catch (error) {
    console.error('Get activity log entry error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching activity log entry'
    });
  }
});

// @route   GET /api/activity-log/entity/:entityType/:entityId
// @desc    Get activity log for a specific entity
// @access  Private
router.get('/entity/:entityType/:entityId', protect, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Validate entity type
    const validEntityTypes = ['customer', 'job', 'invoice', 'payment', 'inventory', 'vendor', 'staff', 'task', 'delivery', 'emergency_order', 'walk_in_job', 'proof', 'time_entry', 'event', 'discount_rule', 'customer_pricing', 'hsn_code', 'account_transaction', 'cheque', 'cost', 'user', 'system'];
    
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid entity type'
      });
    }

    const activities = await ActivityLog.getEntityActivity(entityType, entityId, req.user._id);

    // Calculate pagination
    const skip = (page - 1) * limit;
    const paginatedActivities = activities.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      status: 'success',
      data: {
        activities: paginatedActivities,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(activities.length / limit),
          count: paginatedActivities.length,
          totalActivities: activities.length
        }
      }
    });

  } catch (error) {
    console.error('Get entity activity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching entity activity'
    });
  }
});

// @route   GET /api/activity-log/user/:userId
// @desc    Get activity log for a specific user
// @access  Private
router.get('/user/:userId', protect, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const activities = await ActivityLog.getUserActivity(req.user._id, userId, parseInt(limit));

    // Calculate pagination
    const skip = (page - 1) * limit;
    const paginatedActivities = activities.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      status: 'success',
      data: {
        activities: paginatedActivities,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(activities.length / limit),
          count: paginatedActivities.length,
          totalActivities: activities.length
        }
      }
    });

  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching user activity'
    });
  }
});

// @route   GET /api/activity-log/stats/summary
// @desc    Get activity log statistics
// @access  Private
router.get('/stats/summary', protect, [
  query('days').optional().isInt({ min: 1, max: 365 })
], async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = await ActivityLog.getActivityStats(req.user._id, days);

    res.status(200).json({
      status: 'success',
      data: { stats }
    });

  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching activity statistics'
    });
  }
});

// @route   GET /api/activity-log/recent
// @desc    Get recent activity log entries
// @access  Private
router.get('/recent', protect, [
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const activities = await ActivityLog.find({})
      .populate('performedBy', 'name email')
      .populate('relatedCustomer', 'name')
      .populate('relatedJob', 'title')
      .populate('relatedInvoice', 'invoiceNumber')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      status: 'success',
      data: { activities }
    });

  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching recent activity'
    });
  }
});

// @route   GET /api/activity-log/critical
// @desc    Get critical activity log entries
// @access  Private
router.get('/critical', protect, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const query = { 
       
      severity: { $in: ['high', 'critical'] } 
    };

    const skip = (page - 1) * limit;

    const activities = await ActivityLog.find(query)
      .populate('performedBy', 'name email')
      .populate('relatedCustomer', 'name')
      .populate('relatedJob', 'title')
      .populate('relatedInvoice', 'invoiceNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalActivities = await ActivityLog.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        activities,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalActivities / limit),
          count: activities.length,
          totalActivities
        }
      }
    });

  } catch (error) {
    console.error('Get critical activity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching critical activity'
    });
  }
});

// @route   DELETE /api/activity-log/:id
// @desc    Delete activity log entry (admin only)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    // Only allow deletion of own activities or if user is admin
    const activity = await ActivityLog.findOne({ _id: req.params.id });

    if (!activity) {
      return res.status(404).json({
        status: 'error',
        message: 'Activity log entry not found'
      });
    }

    await ActivityLog.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Activity log entry deleted successfully'
    });

  } catch (error) {
    console.error('Delete activity log error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting activity log entry'
    });
  }
});

module.exports = router;
