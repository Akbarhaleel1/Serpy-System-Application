const express = require('express');
const LeaveRequest = require('../models/LeaveRequest');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

function scopeFilter(req, extra = {}) {
  const base = req.user.dataScope
    ? { dataScope: req.user.dataScope }
    : { userId: req.user._id };
  return { ...base, ...extra };
}

function daysBetween(from, to) {
  const a = new Date(from);
  const b = new Date(to);
  const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

// GET /api/hr/leaves?status=&employeeId=
router.get('/', async (req, res) => {
  try {
    const { status, employeeId } = req.query;
    const filter = scopeFilter(req);
    if (status && status !== 'all') filter.status = status;
    if (employeeId) filter.employeeId = employeeId;

    const leaves = await LeaveRequest.find(filter)
      .populate('employeeId', 'name employeeCode designation department')
      .sort({ createdAt: -1 });

    res.json({ status: 'success', data: { leaves } });
  } catch (error) {
    console.error('List leaves error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while fetching leaves' });
  }
});

// POST /api/hr/leaves
router.post('/', async (req, res) => {
  try {
    const { employeeId, leaveType, fromDate, toDate, reason } = req.body;
    if (!employeeId || !fromDate || !toDate) {
      return res.status(400).json({ status: 'error', message: 'employeeId, fromDate and toDate are required' });
    }

    const data = {
      employeeId,
      leaveType: leaveType || 'casual',
      fromDate,
      toDate,
      days: req.body.days || daysBetween(fromDate, toDate),
      reason,
      status: 'pending',
      createdBy: req.user._id,
      userId: req.user._id
    };
    if (req.user.dataScope) data.dataScope = req.user.dataScope;

    const leave = await LeaveRequest.create(data);
    await leave.populate('employeeId', 'name employeeCode designation department');

    res.status(201).json({ status: 'success', message: 'Leave request created', data: { leave } });
  } catch (error) {
    console.error('Create leave error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while creating leave request', error: error.message });
  }
});

// PATCH /api/hr/leaves/:id/status - approve / reject / cancel
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['approved', 'rejected', 'cancelled', 'pending'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status' });
    }

    const update = { status };
    if (status === 'approved') {
      update.approvedBy = req.user._id;
      update.approvedByName = req.user.fullName;
      update.approvedAt = new Date();
    }
    if (status === 'rejected') {
      update.rejectionReason = rejectionReason || '';
      update.approvedBy = req.user._id;
      update.approvedByName = req.user.fullName;
      update.approvedAt = new Date();
    }

    const leave = await LeaveRequest.findOneAndUpdate(
      scopeFilter(req, { _id: req.params.id }),
      update,
      { new: true }
    ).populate('employeeId', 'name employeeCode designation department');

    if (!leave) return res.status(404).json({ status: 'error', message: 'Leave request not found' });

    res.json({ status: 'success', message: `Leave ${status}`, data: { leave } });
  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while updating leave', error: error.message });
  }
});

// DELETE /api/hr/leaves/:id
router.delete('/:id', async (req, res) => {
  try {
    const leave = await LeaveRequest.findOneAndDelete(scopeFilter(req, { _id: req.params.id }));
    if (!leave) return res.status(404).json({ status: 'error', message: 'Leave request not found' });
    res.json({ status: 'success', message: 'Leave request deleted' });
  } catch (error) {
    console.error('Delete leave error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while deleting leave' });
  }
});

module.exports = router;
