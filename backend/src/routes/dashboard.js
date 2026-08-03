const express = require('express');
const { protect } = require('../middleware/auth');
const Job = require('../models/Job');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');

const router = express.Router();

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const userId = req.user._id; // Get the logged-in admin's ID

    // Get user settings for monthly target
    const settings = await Settings.getOrCreateSettings(userId);

    // Get basic statistics using existing models - FILTERED BY USER ID
    const [
      totalCustomers,
      totalJobs,
      todayJobs,
      completedToday,
      pendingJobs,
      inProgressJobs
    ] = await Promise.all([
      Customer.countDocuments({ userId }), // FIXED: Filter by userId
      Job.countDocuments({ userId }), // FIXED: Filter by userId
      Job.countDocuments({
        userId, // FIXED: Filter by userId
        createdAt: { $gte: today }
      }),
      Job.countDocuments({
        userId, // FIXED: Filter by userId
        status: 'completed',
        updatedAt: { $gte: today }
      }),
      Job.countDocuments({
        userId, // FIXED: Filter by userId
        status: 'pending'
      }),
      Job.countDocuments({
        userId, // FIXED: Filter by userId
        status: 'in_progress'
      })
    ]);

    // Calculate real dynamic values
    const [
      unpaidInvoicesCount,
      monthlyRevenue,
      taxPayableAmount,
      cashBalanceAmount,
      bankBalanceAmount,
      todaysChequesCount,
      pendingDeliveriesCount,
      lowStockItemsCount
    ] = await Promise.all([
      // Unpaid invoices (would need Invoice model)
      Job.countDocuments({
        userId,
        status: 'completed',
        paymentStatus: { $ne: 'paid' }
      }),
      // Monthly revenue from completed jobs
      Job.aggregate([
        {
          $match: {
            userId,
            status: 'completed',
            updatedAt: { $gte: monthStart }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' }
          }
        }
      ]),
      // Tax payable (18% of revenue)
      Job.aggregate([
        {
          $match: {
            userId,
            status: 'completed',
            updatedAt: { $gte: monthStart }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' }
          }
        }
      ]).then(result => (result[0]?.totalRevenue || 0) * 0.18),
      // Cash and bank balances (would need Account model)
      Settings.findOne({ userId }).then(settings => settings?.cashBalance || 0),
      Settings.findOne({ userId }).then(settings => settings?.bankBalance || 0),
      // Today's cheques (would need Cheque model)
      Job.countDocuments({
        userId,
        paymentMethod: 'cheque',
        updatedAt: { $gte: today }
      }),
      // Pending deliveries (jobs ready but not delivered)
      Job.countDocuments({
        userId,
        status: 'completed',
        deliveryStatus: 'pending'
      }),
      // Low stock items (would need Inventory model)
      0 // Placeholder until Inventory model is integrated
    ]);

    res.json({
      status: 'success',
      stats: {
        totalCustomers,
        totalJobs,
        todayJobs,
        completedToday,
        pendingJobs,
        inProgressJobs,
        monthlyTarget: settings.monthlyRevenueTarget,
        // Real calculated values
        pendingDeliveries: pendingDeliveriesCount,
        lowStockItems: lowStockItemsCount,
        unpaidInvoices: unpaidInvoicesCount,
        totalRevenue: monthlyRevenue[0]?.totalRevenue || 0,
        taxPayable: Math.round(taxPayableAmount),
        cashBalance: cashBalanceAmount,
        bankBalance: bankBalanceAmount,
        todaysCheques: todaysChequesCount
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

// @route   PUT /api/dashboard/monthly-target
// @desc    Update monthly revenue target
// @access  Private
router.put('/monthly-target', protect, async (req, res) => {
  try {
    const { monthlyTarget } = req.body;
    const userId = req.user._id;

    console.log('📝 Request received:', { userId, monthlyTarget, body: req.body });

    // Validate input
    if (typeof monthlyTarget !== 'number' || monthlyTarget < 0) {
      console.log('❌ Validation failed:', { monthlyTarget, type: typeof monthlyTarget });
      return res.status(400).json({
        status: 'error',
        message: 'Monthly target must be a valid positive number'
      });
    }

    console.log('✅ Validation passed, updating settings...');
    
    // Update settings
    const settings = await Settings.updateSettings(userId, {
      monthlyRevenueTarget: monthlyTarget
    });

    console.log('💾 Monthly target updated:', { userId, monthlyTarget, settings: settings.monthlyRevenueTarget });

    res.json({
      status: 'success',
      message: 'Monthly target updated successfully',
      data: {
        monthlyTarget: settings.monthlyRevenueTarget
      }
    });
  } catch (error) {
    console.error('❌ Error updating monthly target:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update monthly target',
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/monthly-target
// @desc    Get monthly revenue target
// @access  Private
router.get('/monthly-target', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get settings
    const settings = await Settings.getOrCreateSettings(userId);

    res.json({
      status: 'success',
      data: {
        monthlyTarget: settings.monthlyRevenueTarget
      }
    });
  } catch (error) {
    console.error('❌ Error fetching monthly target:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch monthly target'
    });
  }
});

module.exports = router;
