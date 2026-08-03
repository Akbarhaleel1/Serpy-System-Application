const express = require('express');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

function scopeFilter(req, extra = {}) {
  const base = req.user.dataScope
    ? { dataScope: req.user.dataScope }
    : { userId: req.user._id };
  return { ...base, ...extra };
}

// Normalize any date to 00:00:00 (UTC) for that calendar day
function normalizeDay(d) {
  const date = new Date(d);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function ownership(req) {
  const own = { createdBy: req.user._id, userId: req.user._id };
  if (req.user.dataScope) own.dataScope = req.user.dataScope;
  return own;
}

// GET /api/hr/attendance?date=YYYY-MM-DD or ?month=&year= or ?employeeId=
router.get('/', async (req, res) => {
  try {
    const { date, month, year, employeeId } = req.query;
    const filter = scopeFilter(req);
    if (employeeId) filter.employeeId = employeeId;

    if (date) {
      filter.date = normalizeDay(date);
    } else if (month && year) {
      const start = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
      const end = new Date(Date.UTC(Number(year), Number(month), 1));
      filter.date = { $gte: start, $lt: end };
    }

    const records = await Attendance.find(filter)
      .populate('employeeId', 'name employeeCode designation department')
      .sort({ date: -1 });

    res.json({ status: 'success', data: { attendance: records } });
  } catch (error) {
    console.error('List attendance error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while fetching attendance' });
  }
});

// GET /api/hr/attendance/summary?month=&year= - paid-day summary per employee
router.get('/summary', async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) {
      return res.status(400).json({ status: 'error', message: 'month and year are required' });
    }
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const records = await Attendance.find(scopeFilter(req, { date: { $gte: start, $lt: end } }));

    const byEmployee = {};
    for (const r of records) {
      const id = String(r.employeeId);
      if (!byEmployee[id]) {
        byEmployee[id] = { present: 0, absent: 0, halfDay: 0, leave: 0, holiday: 0, weekOff: 0, paidDays: 0 };
      }
      const b = byEmployee[id];
      if (r.status === 'present') b.present++;
      else if (r.status === 'absent') b.absent++;
      else if (r.status === 'half-day') b.halfDay++;
      else if (r.status === 'leave') b.leave++;
      else if (r.status === 'holiday') b.holiday++;
      else if (r.status === 'week-off') b.weekOff++;
      b.paidDays += Attendance.paidWeight(r.status);
    }

    res.json({ status: 'success', data: { summary: byEmployee } });
  } catch (error) {
    console.error('Attendance summary error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while building attendance summary' });
  }
});

// POST /api/hr/attendance - upsert a single attendance record
router.post('/', async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, workHours, overtimeHours, notes } = req.body;
    if (!employeeId || !date) {
      return res.status(400).json({ status: 'error', message: 'employeeId and date are required' });
    }

    const day = normalizeDay(date);
    const record = await Attendance.findOneAndUpdate(
      scopeFilter(req, { employeeId, date: day }),
      {
        $set: { status: status || 'present', checkIn, checkOut, workHours, overtimeHours, notes },
        $setOnInsert: { employeeId, date: day, ...ownership(req) }
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ status: 'success', message: 'Attendance saved', data: { attendance: record } });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while saving attendance', error: error.message });
  }
});

// POST /api/hr/attendance/bulk - mark attendance for many employees on one date
// body: { date, records: [{ employeeId, status }] }
router.post('/bulk', async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ status: 'error', message: 'date and records[] are required' });
    }
    const day = normalizeDay(date);
    const own = ownership(req);

    const ops = records.map(r => ({
      updateOne: {
        filter: { ...scopeFilter(req), employeeId: r.employeeId, date: day },
        update: {
          $set: { status: r.status || 'present', notes: r.notes },
          $setOnInsert: { employeeId: r.employeeId, date: day, ...own }
        },
        upsert: true
      }
    }));

    if (ops.length) await Attendance.bulkWrite(ops);

    res.json({ status: 'success', message: `Attendance saved for ${ops.length} employees` });
  } catch (error) {
    console.error('Bulk attendance error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while saving bulk attendance', error: error.message });
  }
});

// DELETE /api/hr/attendance/:id
router.delete('/:id', async (req, res) => {
  try {
    const record = await Attendance.findOneAndDelete(scopeFilter(req, { _id: req.params.id }));
    if (!record) return res.status(404).json({ status: 'error', message: 'Attendance record not found' });
    res.json({ status: 'success', message: 'Attendance deleted' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while deleting attendance' });
  }
});

module.exports = router;
