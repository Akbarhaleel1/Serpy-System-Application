const express = require('express');
const { body, validationResult } = require('express-validator');
const Employee = require('../models/Employee');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// Build a tenant-scoped filter (dataScope preferred, userId fallback)
function scopeFilter(req, extra = {}) {
  const base = req.user.dataScope
    ? { dataScope: req.user.dataScope }
    : { userId: req.user._id };
  return { ...base, ...extra };
}

// GET /api/hr/employees - list with optional search/status/department filters
router.get('/', async (req, res) => {
  try {
    const { search, status, department } = req.query;
    const filter = scopeFilter(req);
    if (status && status !== 'all') filter.status = status;
    if (department && department !== 'all') filter.department = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const employees = await Employee.find(filter).sort({ createdAt: -1 });

    res.json({ status: 'success', data: { employees } });
  } catch (error) {
    console.error('List employees error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while fetching employees' });
  }
});

// GET /api/hr/employees/stats - headcount & payroll summary
router.get('/stats/summary', async (req, res) => {
  try {
    const employees = await Employee.find(scopeFilter(req));
    const active = employees.filter(e => e.status === 'active');
    const monthlyPayroll = active.reduce((sum, e) => sum + (e.netSalary || 0), 0);
    const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

    res.json({
      status: 'success',
      data: {
        total: employees.length,
        active: active.length,
        inactive: employees.length - active.length,
        departments: departments.length,
        monthlyPayroll
      }
    });
  } catch (error) {
    console.error('Employee stats error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while fetching employee stats' });
  }
});

// GET /api/hr/employees/:id
router.get('/:id', async (req, res) => {
  try {
    const employee = await Employee.findOne(scopeFilter(req, { _id: req.params.id }));
    if (!employee) return res.status(404).json({ status: 'error', message: 'Employee not found' });
    res.json({ status: 'success', data: { employee } });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while fetching employee' });
  }
});

// POST /api/hr/employees
router.post('/', [
  body('name').notEmpty().withMessage('Employee name is required').trim(),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: errors.array()[0].msg, errors: errors.array() });
    }

    const data = { ...req.body };
    delete data._id;
    data.createdBy = req.user._id;
    data.userId = req.user._id;
    if (req.user.dataScope) data.dataScope = req.user.dataScope;

    const employee = await Employee.create(data);

    await ActivityLog.logActivity({
      action: 'Employee Created',
      description: `Employee ${employee.name} (${employee.employeeCode}) added`,
      entityType: 'system',
      entityId: employee._id,
      entityName: employee.name,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'create',
      severity: 'low',
      userId: req.user._id
    }).catch(() => {});

    res.status(201).json({ status: 'success', message: 'Employee created successfully', data: { employee } });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while creating employee', error: error.message });
  }
});

// PUT /api/hr/employees/:id
router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    delete data._id;
    delete data.userId;
    delete data.dataScope;
    delete data.createdBy;
    delete data.employeeCode;
    delete data.createdAt;
    delete data.updatedAt;

    const employee = await Employee.findOneAndUpdate(
      scopeFilter(req, { _id: req.params.id }),
      data,
      { new: true, runValidators: true }
    );
    if (!employee) return res.status(404).json({ status: 'error', message: 'Employee not found' });

    res.json({ status: 'success', message: 'Employee updated successfully', data: { employee } });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while updating employee', error: error.message });
  }
});

// DELETE /api/hr/employees/:id
router.delete('/:id', async (req, res) => {
  try {
    const employee = await Employee.findOneAndDelete(scopeFilter(req, { _id: req.params.id }));
    if (!employee) return res.status(404).json({ status: 'error', message: 'Employee not found' });
    res.json({ status: 'success', message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while deleting employee' });
  }
});

module.exports = router;
