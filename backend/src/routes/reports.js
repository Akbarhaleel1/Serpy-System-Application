const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', protect, async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        totalCustomers: 0,
        totalJobs: 0,
        totalRevenue: 0,
        pendingDeliveries: 0,
        lowStockItems: 0,
        unpaidInvoices: 0
      }
    }
  });
});

router.get('/revenue', protect, async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { reports: [] }
  });
});

module.exports = router;
