const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Apply auth middleware to all routes
router.use(protect );

// ============= SCHEDULE ROUTES =============

// GET /api/staff/:staffId/schedule - Get staff schedule
router.get('/:staffId/schedule', async (req, res) => {
  try {
    console.log('staff schedule is working')
    const { staffId } = req.params;
    const { weekStart } = req.query;
    
    // Verify user exists and belongs to same dataScope or is staff role
    const user = await User.findOne({ 
      _id: staffId, 
      role: 'staff',
      $or: [
        { dataScope: req.user.dataScope },
        { createdBy: req.user._id },
        { _id: req.user._id } // Allow staff to view their own schedule
      ]
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    
    // If staff member is viewing their own schedule, use the simplified method
    let schedule;
    if (staffId === req.user._id.toString()) {
      schedule = await Schedule.getStaffScheduleOnly(staffId);
    } else {
      // For other users (like admins), use the original method
      schedule = await Schedule.getByStaffId(staffId, req.user._id);
    }
    
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Error fetching staff schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch staff schedule' });
  }
});

// POST /api/staff/:staffId/schedule - Create/update staff schedule
router.post('/:staffId/schedule', async (req, res) => {
  try {
    const { staffId } = req.params;
    const { schedules } = req.body;
    
    // Verify user exists and belongs to same dataScope or is staff role
    const user = await User.findOne({ 
      _id: staffId, 
      role: 'staff',
      $or: [
        { dataScope: req.user.dataScope },
        { createdBy: req.user._id },
        { _id: req.user._id } // Allow staff to manage their own schedule
      ]
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    
    // Delete existing active schedules for this staff
    await Schedule.updateMany(
      { staffId, userId: req.user.id, isActive: true },
      { isActive: false }
    );
    
    // Create new schedules
    const scheduleData = schedules.map(schedule => ({
      ...schedule,
      staffId,
      userId: req.user.id
    }));
    
    const savedSchedules = await Schedule.insertMany(scheduleData);
    
    res.status(201).json({ 
      success: true, 
      data: savedSchedules,
      message: 'Schedule saved successfully'
    });
  } catch (error) {
    console.error('Error saving staff schedule:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Failed to save staff schedule', 
      error: error.message 
    });
  }
});

// PUT /api/staff/:staffId/schedule/:scheduleId - Update specific schedule
router.put('/:staffId/schedule/:scheduleId', async (req, res) => {
  try {
    const { staffId, scheduleId } = req.params;
    
    // Verify user exists and belongs to same dataScope or is staff role
    const user = await User.findOne({ 
      _id: staffId, 
      role: 'staff',
      $or: [
        { dataScope: req.user.dataScope },
        { createdBy: req.user._id },
        { _id: req.user._id } // Allow staff to manage their own schedule
      ]
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    
    const schedule = await Schedule.findOneAndUpdate(
      { _id: scheduleId, staffId, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }
    
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Failed to update schedule', 
      error: error.message 
    });
  }
});

// DELETE /api/staff/:staffId/schedule/:scheduleId - Delete specific schedule
router.delete('/:staffId/schedule/:scheduleId', async (req, res) => {
  try {
    const { staffId, scheduleId } = req.params;
    
    // Verify user exists and belongs to same dataScope or is staff role
    const user = await User.findOne({ 
      _id: staffId, 
      role: 'staff',
      $or: [
        { dataScope: req.user.dataScope },
        { createdBy: req.user._id },
        { _id: req.user._id } // Allow staff to manage their own schedule
      ]
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    
    const schedule = await Schedule.findOneAndUpdate(
      { _id: scheduleId, staffId, userId: req.user.id },
      { isActive: false },
      { new: true }
    );
    
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }
    
    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to delete schedule' });
  }
});

// GET /api/staff/schedule/overview - Get all staff schedules overview
router.get('/schedule/overview', async (req, res) => {
  try {
    const { weekStart } = req.query;
    
    // Get all staff users in the same dataScope
    const staffUsers = await User.find({ 
      role: 'staff',
      $or: [
        { dataScope: req.user.dataScope },
        { createdBy: req.user._id }
      ]
    }).select('_id fullName email role');
    
    const staffIds = staffUsers.map(user => user._id);
    
    // Get all schedules for these staff members
    const schedules = await Schedule.find({
      staffId: { $in: staffIds },
      userId: req.user.id,
      isActive: true
    }).populate('staffId', 'fullName email role');
    
    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('Error fetching schedule overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch schedule overview' });
  }
});

// ============= STAFF MANAGEMENT ROUTES =============

// PUT /api/staff/:staffId/email - Change staff email (admin only)
router.put('/:staffId/email', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { newEmail } = req.body;

    // Validate new email
    if (!newEmail || !newEmail.includes('@')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid email is required' 
      });
    }

    // Verify staff member exists and belongs to same dataScope
    const staff = await User.findOne({ 
      _id: staffId, 
      role: 'staff',
      $or: [
        { dataScope: req.user.dataScope },
        { createdBy: req.user._id }
      ]
    });

    if (!staff) {
      return res.status(404).json({ 
        success: false, 
        message: 'Staff member not found' 
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    const oldEmail = staff.email;
    staff.email = newEmail;
    await staff.save();

    // Log activity
    await ActivityLog.logActivity({
      action: 'Staff Email Changed',
      description: `Email changed for staff ${staff.fullName} from ${oldEmail} to ${newEmail}`,
      entityType: 'user',
      entityId: staff._id,
      entityName: staff.fullName,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      changes: {
        before: { email: oldEmail },
        after: { email: newEmail }
      },
      severity: 'medium',
      userId: req.user._id,
    });

    res.json({ 
      success: true, 
      message: 'Staff email updated successfully',
      data: { email: newEmail }
    });

  } catch (error) {
    console.error('Error changing staff email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to change staff email' 
    });
  }
});

// PUT /api/staff/:staffId/password - Change staff password (admin only)
router.put('/:staffId/password', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { staffId } = req.params;
    const { newPassword } = req.body;

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters' 
      });
    }

    // Verify staff member exists and belongs to same dataScope
    const staff = await User.findOne({ 
      _id: staffId, 
      role: 'staff',
      $or: [
        { dataScope: req.user.dataScope },
        { createdBy: req.user._id }
      ]
    });

    if (!staff) {
      return res.status(404).json({ 
        success: false, 
        message: 'Staff member not found' 
      });
    }

    // Update password - pre-save hook will hash it
    staff.password = newPassword;
    await staff.save();

    // Log activity
    await ActivityLog.logActivity({
      action: 'Staff Password Changed',
      description: `Password changed for staff ${staff.fullName}`,
      entityType: 'user',
      entityId: staff._id,
      entityName: staff.fullName,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      severity: 'medium',
      userId: req.user._id,
    });

    res.json({ 
      success: true, 
      message: 'Staff password updated successfully' 
    });

  } catch (error) {
    console.error('Error changing staff password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to change staff password' 
    });
  }
});

// GET /api/staff/list - Get all staff members for admin (admin/manager only)
router.get('/list', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { search, isActive } = req.query;

    // Build query - filter by dataScope to ensure data isolation
    const query = {
      role: 'staff',
      $or: [
        { dataScope: req.user.dataScope },
        { createdBy: req.user._id }
      ]
    };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const staffMembers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      data: staffMembers 
    });

  } catch (error) {
    console.error('Error fetching staff list:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch staff list' 
    });
  }
});

module.exports = router;
