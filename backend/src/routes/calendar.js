const express = require('express');
const { body, query } = require('express-validator');
const Event = require('../models/Event');
const Job = require('../models/Job');
const Customer = require('../models/Customer');
const Task = require('../models/Task');
const Delivery = require('../models/Delivery');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const eventValidation = [
  body('title').notEmpty().withMessage('Event title is required').trim(),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('eventType').optional().isIn(['meeting', 'deadline', 'delivery', 'reminder', 'task', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled'])
];

// @route   GET /api/calendar/events
// @desc    Get all events for the authenticated user
// @access  Private
router.get('/events', protect, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('eventType').optional().isIn(['meeting', 'deadline', 'delivery', 'reminder', 'task', 'other']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('status').optional().isIn(['scheduled', 'in_progress', 'completed', 'cancelled']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      eventType,
      priority,
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'startDate',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = {};

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    if (eventType && eventType !== 'all') {
      query.eventType = eventType;
    }

    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const events = await Event.find(query)
      .populate('jobId', 'title status priority')
      .populate('customerId', 'name email phone')
      .populate('taskId', 'title description status')
      .populate('deliveryId', 'deliveryAddress status')
      .populate('attendees.userId', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalEvents = await Event.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        events,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalEvents / limit),
          count: events.length,
          totalEvents
        }
      }
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching events'
    });
  }
});

// @route   GET /api/calendar/events/:id
// @desc    Get single event
// @access  Private
router.get('/events/:id', protect, async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id })
      .populate('jobId', 'title status priority')
      .populate('customerId', 'name email phone')
      .populate('taskId', 'title description status')
      .populate('deliveryId', 'deliveryAddress status')
      .populate('attendees.userId', 'name email');

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { event }
    });

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching event'
    });
  }
});

// @route   POST /api/calendar/events
// @desc    Create new event
// @access  Private
router.post('/events', protect, eventValidation, async (req, res) => {
  try {
    const { jobId, customerId, taskId, deliveryId, ...eventData } = req.body;

    // Validate related entities if provided
    if (jobId) {
      const job = await Job.findOne({ _id: jobId });
      if (!job) {
        return res.status(404).json({
          status: 'error',
          message: 'Job not found'
        });
      }
    }

    if (customerId) {
      const customer = await Customer.findOne({ _id: customerId });
      if (!customer) {
        return res.status(404).json({
          status: 'error',
          message: 'Customer not found'
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

    if (deliveryId) {
      const delivery = await Delivery.findOne({ _id: deliveryId });
      if (!delivery) {
        return res.status(404).json({
          status: 'error',
          message: 'Delivery not found'
        });
      }
    }

    const event = await Event.create({
      ...eventData,
      jobId,
      customerId,
      taskId,
      deliveryId,
      userId: req.user._id
    });

    const populatedEvent = await Event.findById(event._id)
      .populate('jobId', 'title status priority')
      .populate('customerId', 'name email phone')
      .populate('taskId', 'title description status')
      .populate('deliveryId', 'deliveryAddress status')
      .populate('attendees.userId', 'name email');

    res.status(201).json({
      status: 'success',
      message: 'Event created successfully',
      data: { event: populatedEvent }
    });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating event'
    });
  }
});

// @route   PUT /api/calendar/events/:id
// @desc    Update event
// @access  Private
router.put('/events/:id', protect, eventValidation, async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('jobId', 'title status priority')
      .populate('customerId', 'name email phone')
      .populate('taskId', 'title description status')
      .populate('deliveryId', 'deliveryAddress status')
      .populate('attendees.userId', 'name email');

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Event updated successfully',
      data: { event }
    });

  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating event'
    });
  }
});

// @route   DELETE /api/calendar/events/:id
// @desc    Delete event
// @access  Private
router.delete('/events/:id', protect, async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting event'
    });
  }
});

// @route   GET /api/calendar/events/range/:startDate/:endDate
// @desc    Get events in date range
// @access  Private
router.get('/events/range/:startDate/:endDate', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    const events = await Event.getEventsInRange(
      req.user._id,
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      status: 'success',
      data: { events }
    });

  } catch (error) {
    console.error('Get events in range error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching events in range'
    });
  }
});

// @route   GET /api/calendar/events/upcoming
// @desc    Get upcoming events
// @access  Private
router.get('/events/upcoming', protect, [
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const events = await Event.getUpcomingEvents(req.user._id, limit);

    res.status(200).json({
      status: 'success',
      data: { events }
    });

  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching upcoming events'
    });
  }
});

// @route   GET /api/calendar/events/overdue
// @desc    Get overdue events
// @access  Private
router.get('/events/overdue', protect, async (req, res) => {
  try {
    const events = await Event.getOverdueEvents(req.user._id);

    res.status(200).json({
      status: 'success',
      data: { events }
    });

  } catch (error) {
    console.error('Get overdue events error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching overdue events'
    });
  }
});

// @route   PUT /api/calendar/events/:id/status
// @desc    Update event status
// @access  Private
router.put('/events/:id/status', protect, [
  body('status').isIn(['scheduled', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const { status } = req.body;
    
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id },
      { status },
      { new: true }
    )
      .populate('jobId', 'title status priority')
      .populate('customerId', 'name email phone')
      .populate('taskId', 'title description status')
      .populate('deliveryId', 'deliveryAddress status')
      .populate('attendees.userId', 'name email');

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Event status updated successfully',
      data: { event }
    });

  } catch (error) {
    console.error('Update event status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating event status'
    });
  }
});

// @route   GET /api/calendar/stats/summary
// @desc    Get calendar statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay());
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalEvents,
      todayEvents,
      tomorrowEvents,
      weekEvents,
      monthEvents,
      overdueEvents,
      completedEvents,
      eventTypeStats,
      priorityStats
    ] = await Promise.all([
      Event.countDocuments({ userId }),
      Event.countDocuments({ userId, startDate: { $gte: today, $lt: tomorrow } }),
      Event.countDocuments({ userId, startDate: { $gte: tomorrow, $lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000) } }),
      Event.countDocuments({ userId, startDate: { $gte: weekStart, $lt: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) } }),
      Event.countDocuments({ userId, startDate: { $gte: monthStart } }),
      Event.countDocuments({ userId, endDate: { $lt: today }, status: { $in: ['scheduled', 'in_progress'] } }),
      Event.countDocuments({ userId, status: 'completed' }),
      Event.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Event.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalEvents,
          todayEvents,
          tomorrowEvents,
          weekEvents,
          monthEvents,
          overdueEvents,
          completedEvents,
          eventTypeStats,
          priorityStats
        }
      }
    });

  } catch (error) {
    console.error('Get calendar stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching calendar statistics'
    });
  }
});

module.exports = router;
