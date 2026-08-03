const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const Job = require('../models/Job');
const { protect } = require('../middleware/auth');
const { body, query, param } = require('express-validator');

// Apply auth middleware to all routes
router.use(protect);

// Validation middleware
const taskValidation = [
  body('title').notEmpty().withMessage('Task title is required'),
  body('assignedTo').isMongoId().withMessage('Valid staff assignment is required'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']).withMessage('Invalid status'),
  body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
  body('estimatedHours').optional().isFloat({ min: 0 }).withMessage('Estimated hours must be positive'),
  body('actualHours').optional().isFloat({ min: 0 }).withMessage('Actual hours must be positive')
];

// GET /api/tasks - Get all tasks with advanced filtering
router.get('/', [
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold', 'all']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent', 'all']),
  query('assignedTo').optional().isMongoId(),
  query('jobId').optional().isMongoId(),
  query('search').optional().isString(),
  query('overdue').optional().isBoolean(),
  query('sortBy').optional().isIn(['createdAt', 'dueDate', 'priority', 'status', 'title']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      assignedTo, 
      jobId,
      search, 
      overdue,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;
    
    let query = { userId: req.user.id };

    // Add filters
    if (status && status !== 'all') {
      query.status = status;
    }
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    if (assignedTo && assignedTo !== 'all') {
      query.assignedTo = assignedTo;
    }
    if (jobId && jobId !== 'all') {
      query.jobId = jobId;
    }
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: ['completed', 'cancelled'] };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tasks = await Task.find(query)
      .populate('assignedTo', 'fullName email role department')
      .populate('jobId', 'title status')
      .populate('parentTask', 'title status')
      .populate('comments.author', 'fullName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalTasks = await Task.countDocuments(query);
    
    res.json({ 
      success: true, 
      data: tasks,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(totalTasks / parseInt(limit)),
        total: totalTasks
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/analytics - Get comprehensive task analytics
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const analytics = await Task.getTaskAnalytics(userId);
    
    // Additional analytics
    const [priorityDistribution, statusDistribution, staffWorkload] = await Promise.all([
      Task.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $group: { 
          _id: '$assignedTo', 
          totalTasks: { $sum: 1 },
          completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          avgProgress: { $avg: '$progress' }
        } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'staff' } },
        { $unwind: '$staff' },
        { $project: { 
          staffName: '$staff.fullName',
          totalTasks: 1,
          completedTasks: 1,
          avgProgress: 1
        } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        ...analytics,
        priorityDistribution,
        statusDistribution,
        staffWorkload
      }
    });
  } catch (error) {
    console.error('Error fetching task analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch task analytics' });
  }
});

// GET /api/tasks/stats - Get task statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [totalTasks, completedTasks, overdueTasks, activeTasks] = await Promise.all([
      Task.countDocuments({ userId }),
      Task.countDocuments({ userId, status: 'completed' }),
      Task.getOverdueTasks(userId),
      Task.countDocuments({ userId, status: 'in_progress' })
    ]);

    res.json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        overdueTasks: overdueTasks.length,
        activeTasks
      }
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch task stats' });
  }
});

// GET /api/tasks/overdue - Get overdue tasks
router.get('/overdue', async (req, res) => {
  try {
    const overdueTasks = await Task.getOverdueTasks(req.user.id);
    res.json({ success: true, data: overdueTasks });
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch overdue tasks' });
  }
});

// GET /api/tasks/by-priority/:priority - Get tasks by priority
router.get('/by-priority/:priority', [
  param('priority').isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  try {
    const tasks = await Task.getTasksByPriority(req.user.id, req.params.priority);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching tasks by priority:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks by priority' });
  }
});

// GET /api/tasks/by-staff/:staffId - Get tasks by staff member
router.get('/by-staff/:staffId', [
  param('staffId').isMongoId()
], async (req, res) => {
  try {
    const { staffId } = req.params;
    
    // If staff member is viewing their own tasks, use the simplified method
    let tasks;
    if (staffId === req.user._id.toString()) {
      tasks = await Task.getStaffOwnTasks(staffId);
    } else {
      // For other users (like admins), use the original method
      tasks = await Task.getTasksByStaff(req.user._id, staffId);
    }
    
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching tasks by staff:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks by staff' });
  }
});

// GET /api/tasks/:id - Get specific task
router.get('/:id', [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('assignedTo', 'fullName email role department')
      .populate('jobId', 'title status')
      .populate('parentTask', 'title status')
      .populate('subtasks', 'title status progress')
      .populate('dependencies.taskId', 'title status')
      .populate('comments.author', 'fullName email')
      .populate('timeEntries.userId', 'fullName email');
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch task' });
  }
});

// POST /api/tasks - Create new task
router.post('/', taskValidation, async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      userId: req.user.id
    };
    
    // Validate assigned staff exists
    const staff = await User.findOne({ _id: taskData.assignedTo, role: 'staff' });
    if (!staff) {
      return res.status(400).json({ success: false, message: 'Assigned staff not found' });
    }
    taskData.assignedByName = staff.fullName;
    
    // Validate job if provided
    if (taskData.jobId) {
      const job = await Job.findOne({ _id: taskData.jobId, userId: req.user.id });
      if (!job) {
        return res.status(400).json({ success: false, message: 'Job not found' });
      }
      taskData.jobTitle = job.title;
    }
    
    const task = new Task(taskData);
    await task.save();
    
    // Populate the task with related data
    await task.populate('assignedTo', 'fullName email role department');
    await task.populate('jobId', 'title status');
    
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).json({ success: false, message: 'Failed to create task', error: error.message });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', [
  param('id').isMongoId(),
  ...taskValidation
], async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'fullName email role department')
     .populate('jobId', 'title status');
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    
    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).json({ success: false, message: 'Failed to update task', error: error.message });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
});

// PUT /api/tasks/:id/status - Update task status
router.put('/:id/status', [
  param('id').isMongoId(),
  body('status').isIn(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']).withMessage('Invalid status'),
  body('notes').optional().isString().trim()
], async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    // Find task - user can update if they created it OR if it's assigned to them
    const task = await Task.findOne({
      $or: [
        { _id: req.params.id, userId: req.user.id }, // Task creator can update
        { _id: req.params.id, assignedTo: req.user.id } // Assigned staff can update
      ]
    }).populate('assignedTo', 'fullName email role department')
     .populate('jobId', 'title status');
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found or you do not have permission to update this task' });
    }
    
    // Update the task
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { status, notes },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'fullName email role department')
     .populate('jobId', 'title status');
    
    console.log('✅ Task status updated successfully:', {
      taskId: req.params.id,
      newStatus: status,
      updatedBy: req.user.id,
      taskTitle: updatedTask.title
    });
    
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(400).json({ success: false, message: 'Failed to update task status', error: error.message });
  }
});

// PUT /api/tasks/:id/progress - Update task progress
router.put('/:id/progress', [
  param('id').isMongoId(),
  body('progress').isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
  body('actualHours').optional().isFloat({ min: 0 }).withMessage('Actual hours must be positive')
], async (req, res) => {
  try {
    const { progress, actualHours } = req.body;
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { progress, actualHours },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'fullName email role department')
     .populate('jobId', 'title status');
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    
    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error updating task progress:', error);
    res.status(400).json({ success: false, message: 'Failed to update task progress', error: error.message });
  }
});

// POST /api/tasks/:id/comments - Add comment to task
router.post('/:id/comments', [
  param('id').isMongoId(),
  body('text').notEmpty().withMessage('Comment text is required')
], async (req, res) => {
  try {
    const { text } = req.body;
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    
    await task.addComment(text, req.user.id, req.user.name);
    
    const updatedTask = await Task.findById(task._id)
      .populate('comments.author', 'fullName email');
    
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(400).json({ success: false, message: 'Failed to add comment', error: error.message });
  }
});

// POST /api/tasks/:id/time-entries - Add time entry to task
router.post('/:id/time-entries', [
  param('id').isMongoId(),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('description').optional().isString().trim()
], async (req, res) => {
  try {
    const { startTime, endTime, description } = req.body;
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    
    await task.addTimeEntry(new Date(startTime), new Date(endTime), description, req.user.id);
    
    const updatedTask = await Task.findById(task._id)
      .populate('timeEntries.userId', 'fullName email');
    
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    console.error('Error adding time entry:', error);
    res.status(400).json({ success: false, message: 'Failed to add time entry', error: error.message });
  }
});

module.exports = router;
