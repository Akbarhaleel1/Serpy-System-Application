const express = require('express');
const { body, query } = require('express-validator');
const User = require('../models/User');
const Employee = require('../models/Employee');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Validation rules
const userValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name is required').trim(),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('role').optional().isIn(['admin', 'manager', 'staff', 'viewer']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
];

const updateUserValidation = [
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('fullName').optional().notEmpty().withMessage('Full name is required').trim(),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('role').optional().isIn(['admin', 'manager', 'staff']).withMessage('Role must be admin, manager, or staff'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
];

// @route   GET /api/users
// @desc    Get all users in the same dataScope (admin/manager only)
// @access  Private
router.get('/', protect, authorize('admin', 'manager'), [
  query('role').optional().isIn(['admin', 'manager', 'staff', 'viewer']),
  query('isActive').optional().isBoolean(),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      role,
      isActive,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query - filter by dataScope to ensure data isolation
    // Fallback to filtering by createdBy if dataScope is missing (during migration)
    const query = req.user.dataScope
      ? { dataScope: req.user.dataScope }
      : { createdBy: req.user._id };

    if (role && role !== 'all') {
      query.role = role;
    }

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

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalUsers / limit),
          count: users.length,
          totalUsers
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    // Users can only view their own profile unless they're admin/manager
    const canView = req.user.role === 'admin' || req.user.role === 'manager' || req.user._id.toString() === req.params.id;

    if (!canView) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view this user'
      });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching user'
    });
  }
});

/**
 * Mirror a newly created login into the Employees list.
 *
 * The two records answer different questions - a User is "can this person sign
 * in", an Employee is "who works here, on what salary" - but a login created
 * for a colleague implies both. Employee.linkedUserId is what ties them
 * together, so later edits in Employees stay attached to the right account.
 *
 * Scoping copies the admin's, matching how POST /api/hr/employees does it, so
 * the record lands in the same tenant the admin is looking at.
 */
async function createLinkedEmployee({ user, admin }) {
  const scope = admin.dataScope ? { dataScope: admin.dataScope } : { userId: admin._id };

  // An admin may have added the person to Employees before giving them a
  // login. Adopt that record rather than creating a duplicate of them.
  const existing = await Employee.findOne({
    ...scope,
    $or: [{ linkedUserId: user._id }, ...(user.email ? [{ email: user.email }] : [])],
  });

  if (existing) {
    if (!existing.linkedUserId) {
      existing.linkedUserId = user._id;
      await existing.save();
    }
    return existing;
  }

  const employee = new Employee({
    name: user.fullName,
    email: user.email,
    phone: user.phone,
    // A starting point the admin can correct in Employees; the role is the
    // only thing we actually know about the job at this point.
    designation: user.role,
    dateOfJoining: new Date(),
    status: user.isActive === false ? 'inactive' : 'active',
    linkedUserId: user._id,
    createdBy: admin._id,
    userId: admin._id,
  });

  if (admin.dataScope) employee.dataScope = admin.dataScope;

  await employee.save();
  return employee;
}

// @route   POST /api/users
// @desc    Create new user (admin/manager)
// @access  Private
router.post('/', protect, authorize('admin', 'manager'), userValidation, async (req, res) => {
  try {
    const { email, password, fullName, phone, role = 'operator', companyName, isActive = true, permissions = [] } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Admin gets all permissions automatically
    // Staff and Manager roles use explicitly selected permissions
    let finalPermissions = permissions || [];

    if (role === 'admin') {
      // Admin has full access to everything
      finalPermissions = [
        'Dashboard', 'Customers', 'Jobs', 'Quotations', 'Invoicing', 'Invoicing (View No GST)', 'Calendar', 'Inventory',
        'HSN Codes', 'SAC Codes', 'Vendors', 'Purchase Bills', 'Staff & Tasks', 'Human Resources', 'Payroll', 'Delivery', 'Emergency Orders',
        'Cost & Profit', 'Payments', 'Accounts', 'Reports', 'Designer Timer',
        'Discounts', 'Job Proofing', 'WhatsApp', 'Walk-In Jobs', 'Customer Portal',
        'Activity Log', 'User Management', 'Settings'
      ];
    } else {
      // Staff and Manager: use selected permissions
      // Ensure Dashboard is always included
      if (!finalPermissions.includes('Dashboard')) {
        finalPermissions = ['Dashboard', ...finalPermissions];
      }
    }

    // Assign dataScope: new users inherit the creator's (admin's) dataScope
    // This ensures staff/managers created by an admin can access that admin's data
    const userData = {
      email,
      password, // Pass plain password, pre-save hook will hash it
      fullName,
      phone,
      role,
      companyName,
      isActive,
      permissions: finalPermissions
    };

    // Only add dataScope if admin has one (post-migration)
    if (req.user.dataScope) {
      userData.dataScope = req.user.dataScope;
    }

    // Create user - password will be hashed by pre-save hook
    const user = await User.create(userData);

    // Give the new login an HR record too, so the person shows up in Employees
    // instead of existing only as a set of credentials. Best-effort: the login
    // is what was asked for, and failing the whole request would leave an
    // account the admin cannot see but also cannot recreate.
    try {
      await createLinkedEmployee({ user, admin: req.user });
    } catch (err) {
      console.error('Could not create employee record for new user:', err.message);
    }

    // Log activity
    await ActivityLog.logActivity({
      action: 'User Created',
      description: `New user ${fullName} (${email}) created with role ${role} and ${finalPermissions.length} permissions`,
      entityType: 'user',
      entityId: user._id,
      entityName: fullName,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'create',
      userId: req.user._id,
      severity: 'medium',
      userId: req.user._id,
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: { user: userResponse }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating user'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', protect, updateUserValidation, async (req, res) => {
  try {
    const { email, fullName, phone, role, companyName, isActive, permissions } = req.body;

    // Users can only update their own profile unless they're admin/manager
    const canUpdate = req.user.role === 'admin' || req.user.role === 'manager' || req.user._id.toString() === req.params.id;

    if (!canUpdate) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this user'
      });
    }

    // Only admin can change role and active status
    if ((role || isActive !== undefined) && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only admin can change user role and status'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'User with this email already exists'
        });
      }
    }

    const updateData = {};
    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (companyName) updateData.companyName = companyName;
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (permissions && Array.isArray(permissions)) {
        // Admin gets all permissions automatically
        // Staff and Manager roles use selected permissions
        if (role === 'admin') {
          updateData.permissions = [
            'Dashboard', 'Customers', 'Jobs', 'Quotations', 'Invoicing', 'Invoicing (View No GST)', 'Calendar', 'Inventory',
            'HSN Codes', 'SAC Codes', 'Vendors', 'Purchase Bills', 'Staff & Tasks', 'Human Resources', 'Payroll', 'Delivery', 'Emergency Orders',
            'Cost & Profit', 'Payments', 'Accounts', 'Reports', 'Designer Timer',
            'Discounts', 'Job Proofing', 'WhatsApp', 'Walk-In Jobs', 'Customer Portal',
            'Activity Log', 'User Management', 'Settings'
          ];
        } else {
          // Staff and Manager: use selected permissions
          let finalPerms = permissions || [];
          // Ensure Dashboard is always included
          if (!finalPerms.includes('Dashboard')) {
            finalPerms = ['Dashboard', ...finalPerms];
          }
          updateData.permissions = finalPerms;
        }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    // Log activity
    await ActivityLog.logActivity({
      action: 'User Updated',
      description: `User ${updatedUser.fullName} profile updated${permissions ? ` with ${permissions.length} permissions` : ''}`,
      entityType: 'user',
      entityId: updatedUser._id,
      entityName: updatedUser.fullName,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      changes: {
        before: { email: user.email, fullName: user.fullName, role: user.role, isActive: user.isActive, permissions: user.permissions },
        after: updateData,
        fields: Object.keys(updateData)
      },
      
      severity: 'low',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating user'
    });
  }
});

// @route   PUT /api/users/:id/password
// @desc    Change user password
// @access  Private
router.put('/:id/password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Users can only change their own password unless they're admin
    const canChangePassword = req.user.role === 'admin' || req.user._id.toString() === req.params.id;

    if (!canChangePassword) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to change this password'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify current password (unless admin is changing someone else's password)
    if (req.user._id.toString() === req.params.id) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          status: 'error',
          message: 'Current password is incorrect'
        });
      }
    }

    // Update password - pre-save hook will hash it
    user.password = newPassword;
    await user.save();

    // Log activity
    await ActivityLog.logActivity({
      action: 'Password Changed',
      description: `Password changed for user ${user.fullName}`,
      entityType: 'user',
      entityId: user._id,
      entityName: user.fullName,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      
      severity: 'medium',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while changing password'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.logActivity({
      action: 'User Deleted',
      description: `User ${user.fullName} (${user.email}) deleted`,
      entityType: 'user',
      entityId: user._id,
      entityName: user.fullName,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'delete',
      
      severity: 'high',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting user'
    });
  }
});

// @route   PUT /api/users/:id/toggle-status
// @desc    Toggle user active status (admin only)
// @access  Private
router.put('/:id/toggle-status', protect, authorize('admin'), async (req, res) => {
  try {
    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot deactivate your own account'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    // Log activity
    await ActivityLog.logActivity({
      action: 'User Status Changed',
      description: `User ${user.fullName} ${user.isActive ? 'activated' : 'deactivated'}`,
      entityType: 'user',
      entityId: user._id,
      entityName: user.fullName,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      
      severity: 'medium',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user: { ...user.toObject(), password: undefined } }
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while toggling user status'
    });
  }
});

// @route   GET /api/users/stats/summary
// @desc    Get user statistics for the same dataScope
// @access  Private
router.get('/stats/summary', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    // Use dataScope if available, fallback to createdBy during migration
    const dataScopeQuery = req.user.dataScope
      ? { dataScope: req.user.dataScope }
      : { createdBy: req.user._id };

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(dataScopeQuery),
      User.countDocuments({ ...dataScopeQuery, isActive: true }),
      User.countDocuments({ ...dataScopeQuery, isActive: false }),
      User.aggregate([
        { $match: dataScopeQuery },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      User.find(dataScopeQuery)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          activeUsers,
          inactiveUsers,
          usersByRole,
          recentUsers
        }
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching user statistics'
    });
  }
});

module.exports = router;
