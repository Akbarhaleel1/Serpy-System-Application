const express = require('express');
const PDFDocument = require('pdfkit');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');
const AccountTransaction = require('../models/AccountTransaction');
const AccountBalance = require('../models/AccountBalance');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function scopeFilter(req, extra = {}) {
  const base = req.user.dataScope
    ? { dataScope: req.user.dataScope }
    : { userId: req.user._id };
  return { ...base, ...extra };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// GET /api/hr/payroll?month=&year=&employeeId=&status=
router.get('/', async (req, res) => {
  try {
    const { month, year, employeeId, status } = req.query;
    const filter = scopeFilter(req);
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (employeeId) filter.employeeId = employeeId;
    if (status && status !== 'all') filter.status = status;

    const payslips = await Payroll.find(filter)
      .populate('employeeId', 'name employeeCode designation department bankDetails')
      .sort({ year: -1, month: -1, employeeName: 1 });

    res.json({ status: 'success', data: { payslips } });
  } catch (error) {
    console.error('List payroll error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while fetching payroll' });
  }
});

// GET /api/hr/payroll/stats/summary?month=&year=
router.get('/stats/summary', async (req, res) => {
  try {
    const filter = scopeFilter(req);
    if (req.query.month) filter.month = Number(req.query.month);
    if (req.query.year) filter.year = Number(req.query.year);

    const payslips = await Payroll.find(filter);
    const totalNet = payslips.reduce((s, p) => s + (p.netPay || 0), 0);
    const totalGross = payslips.reduce((s, p) => s + (p.grossEarnings || 0), 0);
    const paid = payslips.filter(p => p.status === 'paid');

    res.json({
      status: 'success',
      data: {
        count: payslips.length,
        totalNet: round2(totalNet),
        totalGross: round2(totalGross),
        paidCount: paid.length,
        pendingCount: payslips.length - paid.length,
        paidAmount: round2(paid.reduce((s, p) => s + (p.netPay || 0), 0))
      }
    });
  } catch (error) {
    console.error('Payroll summary error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while building payroll summary' });
  }
});

// POST /api/hr/payroll/generate  body: { month, year, employeeId? }
router.post('/generate', async (req, res) => {
  try {
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    if (!month || !year || month < 1 || month > 12) {
      return res.status(400).json({ status: 'error', message: 'Valid month (1-12) and year are required' });
    }

    const empFilter = scopeFilter(req, { status: 'active' });
    if (req.body.employeeId) empFilter._id = req.body.employeeId;
    const employees = await Employee.find(empFilter);
    if (!employees.length) {
      return res.status(400).json({ status: 'error', message: 'No active employees found to generate payroll' });
    }

    const workingDays = new Date(year, month, 0).getDate(); // calendar days in month
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const attendance = await Attendance.find(scopeFilter(req, { date: { $gte: start, $lt: end } }));
    const attByEmp = {};
    for (const a of attendance) {
      const id = String(a.employeeId);
      if (!attByEmp[id]) attByEmp[id] = { absent: 0, halfDay: 0 };
      if (a.status === 'absent') attByEmp[id].absent++;
      else if (a.status === 'half-day') attByEmp[id].halfDay++;
    }

    const own = { createdBy: req.user._id, userId: req.user._id };
    if (req.user.dataScope) own.dataScope = req.user.dataScope;

    const results = [];
    let skipped = 0;

    for (const emp of employees) {
      // Don't overwrite an already-paid payslip
      const existing = await Payroll.findOne(scopeFilter(req, { employeeId: emp._id, month, year }));
      if (existing && existing.status === 'paid') { skipped++; continue; }

      const s = emp.salary || {};
      const d = emp.deductions || {};
      const gross = (s.basic || 0) + (s.hra || 0) + (s.allowances || 0) + (s.specialAllowance || 0);

      const att = attByEmp[String(emp._id)] || { absent: 0, halfDay: 0 };
      const lopDays = att.absent + att.halfDay * 0.5;
      const paidDays = Math.max(0, workingDays - lopDays);
      const perDay = workingDays > 0 ? gross / workingDays : 0;
      const lopAmount = round2(perDay * lopDays);

      const payslipData = {
        employeeId: emp._id,
        employeeName: emp.name,
        employeeCode: emp.employeeCode,
        designation: emp.designation,
        month,
        year,
        periodLabel: `${MONTHS[month - 1]} ${year}`,
        earnings: {
          basic: s.basic || 0,
          hra: s.hra || 0,
          allowances: s.allowances || 0,
          specialAllowance: s.specialAllowance || 0,
          overtime: 0,
          bonus: 0
        },
        deductions: {
          pf: d.pf || 0,
          professionalTax: d.professionalTax || 0,
          esi: d.esi || 0,
          loan: 0,
          lop: lopAmount,
          other: d.other || 0
        },
        workingDays,
        paidDays: round2(paidDays),
        lopDays: round2(lopDays),
        status: 'generated',
        ...own
      };

      let payslip;
      if (existing) {
        Object.assign(existing, payslipData);
        existing.recompute();
        payslip = await existing.save();
      } else {
        payslip = new Payroll(payslipData);
        payslip.recompute();
        payslip = await payslip.save();
      }
      results.push(payslip);
    }

    res.json({
      status: 'success',
      message: `Payroll generated for ${results.length} employee(s)${skipped ? `, ${skipped} already paid (skipped)` : ''}`,
      data: { payslips: results, generated: results.length, skipped }
    });
  } catch (error) {
    console.error('Generate payroll error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while generating payroll', error: error.message });
  }
});

// PUT /api/hr/payroll/:id - adjust earnings/deductions and recompute
router.put('/:id', async (req, res) => {
  try {
    const payslip = await Payroll.findOne(scopeFilter(req, { _id: req.params.id }));
    if (!payslip) return res.status(404).json({ status: 'error', message: 'Payslip not found' });
    if (payslip.status === 'paid') {
      return res.status(400).json({ status: 'error', message: 'Cannot edit a payslip that is already paid' });
    }

    if (req.body.earnings) {
      Object.keys(req.body.earnings).forEach(k => { payslip.earnings[k] = Number(req.body.earnings[k]) || 0; });
      payslip.markModified('earnings');
    }
    if (req.body.deductions) {
      Object.keys(req.body.deductions).forEach(k => { payslip.deductions[k] = Number(req.body.deductions[k]) || 0; });
      payslip.markModified('deductions');
    }
    if (req.body.notes !== undefined) payslip.notes = req.body.notes;
    if (req.body.paidDays !== undefined) payslip.paidDays = req.body.paidDays;
    if (req.body.lopDays !== undefined) payslip.lopDays = req.body.lopDays;

    payslip.recompute();
    await payslip.save();

    res.json({ status: 'success', message: 'Payslip updated', data: { payslip } });
  } catch (error) {
    console.error('Update payslip error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while updating payslip', error: error.message });
  }
});

// PATCH /api/hr/payroll/:id/pay - mark as paid (also records an account expense)
router.patch('/:id/pay', async (req, res) => {
  try {
    const payslip = await Payroll.findOne(scopeFilter(req, { _id: req.params.id }));
    if (!payslip) return res.status(404).json({ status: 'error', message: 'Payslip not found' });

    const wasAlreadyPaid = payslip.status === 'paid';

    payslip.status = 'paid';
    payslip.paidDate = req.body.paidDate ? new Date(req.body.paidDate) : new Date();
    payslip.paymentMethod = req.body.paymentMethod || payslip.paymentMethod || 'bank-transfer';
    await payslip.save();

    // Record the salary payout as an expense in Accounts (only once, on first pay)
    if (!wasAlreadyPaid && payslip.netPay > 0) {
      try {
        const pmMap = { 'bank-transfer': 'bank_transfer', cash: 'cash', cheque: 'cheque', upi: 'upi' };
        const paymentMethod = pmMap[payslip.paymentMethod] || 'bank_transfer';
        const accountType = paymentMethod === 'cash' ? 'cash' : 'bank';

        await AccountTransaction.create({
          transactionType: 'expense',
          category: 'Salaries',
          amount: payslip.netPay,
          description: `Salary - ${payslip.employeeName || 'Employee'} (${payslip.periodLabel || ''})`.trim(),
          paymentMethod,
          accountType,
          accountName: 'Payroll',
          reference: payslip.employeeCode || '',
          status: 'completed',
          userId: req.user._id
        });

        // Reduce the corresponding balance (money left the account)
        let balance = await AccountBalance.findOne({ userId: req.user._id });
        if (!balance) {
          balance = new AccountBalance({ userId: req.user._id, cashBalance: 0, bankBalance: 0 });
        }
        if (accountType === 'cash') balance.cashBalance -= payslip.netPay;
        else balance.bankBalance -= payslip.netPay;
        await balance.save();
      } catch (txErr) {
        // Don't fail the payment if the bookkeeping entry has an issue — just log it
        console.warn('⚠️ Payroll expense transaction failed:', txErr.message);
      }
    }

    res.json({ status: 'success', message: 'Payslip marked as paid', data: { payslip } });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while marking payslip paid' });
  }
});

// DELETE /api/hr/payroll/:id
router.delete('/:id', async (req, res) => {
  try {
    const payslip = await Payroll.findOneAndDelete(scopeFilter(req, { _id: req.params.id }));
    if (!payslip) return res.status(404).json({ status: 'error', message: 'Payslip not found' });
    res.json({ status: 'success', message: 'Payslip deleted' });
  } catch (error) {
    console.error('Delete payslip error:', error);
    res.status(500).json({ status: 'error', message: 'Server error while deleting payslip' });
  }
});

// GET /api/hr/payroll/:id/payslip - PDF download
router.get('/:id/payslip', async (req, res) => {
  try {
    const payslip = await Payroll.findOne(scopeFilter(req, { _id: req.params.id }))
      .populate('employeeId', 'name employeeCode designation department dateOfJoining bankDetails panNumber aadhaarNumber pfNumber');
    if (!payslip) return res.status(404).json({ status: 'error', message: 'Payslip not found' });

    const settings = await Settings.getOrCreateSettings(req.user._id);
    const pdfBuffer = await buildPayslipPDF(payslip, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip_${payslip.employeeCode || 'EMP'}_${payslip.month}_${payslip.year}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Payslip PDF error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate payslip: ' + error.message });
  }
});

// ----- Payslip PDF builder (self-contained, PDFKit) — SynX style -----
function decodePayslipLogo(logo) {
  try {
    if (!logo || typeof logo !== 'string') return null;
    const m = logo.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
    return m ? Buffer.from(m[2], 'base64') : null;
  } catch (e) { return null; }
}

const MON3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function buildPayslipPDF(payslip, settings) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const currency = settings.currency || 'INR';
      const num = n => Math.round(Number(n) || 0).toLocaleString('en-IN');
      const margin = 40;
      const pageW = doc.page.width;
      const right = pageW - margin;
      const contentW = right - margin;

      const NAVY = '#22313f', TEAL = '#1aa179', DARK = '#333333', GREY = '#8a8a8a',
        LINE = '#d9d9d9', GREENHDR = '#8ad19a', RED = '#c0392b', DIVIDER = '#9b6dd1';

      const emp = payslip.employeeId || {};
      const e = payslip.earnings || {};
      const d = payslip.deductions || {};
      const bd = emp.bankDetails || {};

      const gradientBand = (yy, h) => {
        const g = doc.linearGradient(margin, yy, right, yy);
        g.stop(0, '#8ad98f').stop(0.5, '#86c9a8').stop(1, '#83b8e6');
        doc.rect(margin, yy, contentW, h).fill(g);
      };

      // ---------- HEADER ----------
      let y = margin;
      const logoBuf = decodePayslipLogo(settings.companyLogo);
      if (logoBuf) {
        try { doc.image(logoBuf, margin, y + 2, { fit: [78, 38] }); } catch (err) { /* ignore */ }
      }
      // vertical divider after logo
      doc.moveTo(margin + 95, y).lineTo(margin + 95, y + 40).strokeColor(DIVIDER).lineWidth(2).stroke();

      doc.fontSize(13).font('Helvetica-Bold').fillColor(NAVY)
        .text((settings.companyName || 'Company').toUpperCase(), margin, y + 6, { width: contentW, align: 'center' });
      const addr = settings.companyAddress || {};
      const addrLine = [addr.street, addr.city, addr.state, addr.country, addr.zipCode].filter(Boolean).join(', ');
      doc.fontSize(7.5).font('Helvetica').fillColor(GREY)
        .text(addrLine, margin, doc.y + 1, { width: contentW, align: 'center' });
      y = Math.max(y + 46, doc.y + 6);

      // ---------- TITLE BANDS ----------
      gradientBand(y, 10);
      y += 10 + 16;
      const period = `${MON3[payslip.month - 1] || ''}-${payslip.year}`;
      doc.fontSize(12).font('Helvetica-Bold').fillColor(NAVY)
        .text(`PAYSLIP FOR THE MONTH ${period}`, margin, y, { width: contentW, align: 'center' });
      y = doc.y + 8;
      gradientBand(y, 3);
      y += 3 + 16;

      // ---------- EMPLOYEE DETAILS (3 columns) ----------
      const colX = [margin, margin + contentW * 0.40, margin + contentW * 0.74];
      const detW = [contentW * 0.40 - 8, contentW * 0.34 - 8, contentW * 0.26];
      const kv = (ci, label, value, yy) => {
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(NAVY)
          .text(label + ' ', colX[ci], yy, { width: detW[ci], continued: true });
        doc.font('Helvetica').fillColor(TEAL).text(value || '-');
      };

      const doj = emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString('en-GB') : '-';
      const aadhaar = emp.aadhaarNumber ? (String(emp.aadhaarNumber).slice(0, 4) + '**** ****') : '-';
      const leftCol = [
        ['Employee ID:', payslip.employeeCode],
        ['Designation:', payslip.designation],
        ['Date of Joining:', doj],
        ['Aadhaar No:', aadhaar],
        ['UAN:', emp.pfNumber || '-']
      ];
      const midCol = [
        ['Employee Name:', payslip.employeeName],
        ['Department:', emp.department || '-'],
        ['Location:', settings.companyName || '-'],
        ['PAN No:', emp.panNumber || '-'],
        ['ESI No:', '-']
      ];
      const rightCol = [
        ['Net Pay:', num(payslip.netPay)],
        ['Payable Days:', String(payslip.paidDays)]
      ];

      const lh = 17;
      for (let i = 0; i < 5; i++) {
        kv(0, leftCol[i][0], leftCol[i][1], y);
        kv(1, midCol[i][0], midCol[i][1], y);
        if (rightCol[i]) kv(2, rightCol[i][0], rightCol[i][1], y);
        y += lh;
      }
      y += 6;

      gradientBand(y, 6);
      y += 6 + 16;

      // ---------- EARNINGS / DEDUCTIONS TABLE ----------
      const w = [contentW * 0.36, contentW * 0.14, contentW * 0.36, contentW * 0.14];
      const cx = [margin, margin + w[0], margin + w[0] + w[1], margin + w[0] + w[1] + w[2]];
      const rowH = 19;

      const cell = (ci, yy, text, opts = {}) => {
        if (opts.fill) doc.rect(cx[ci], yy, w[ci], rowH).fill(opts.fill);
        doc.rect(cx[ci], yy, w[ci], rowH).strokeColor(LINE).lineWidth(0.5).stroke();
        doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(opts.color || DARK)
          .text(text == null ? '' : String(text), cx[ci] + 6, yy + 5.5, { width: w[ci] - 12, align: opts.align || 'left' });
      };

      let ty = y;
      cell(0, ty, 'Earnings', { bold: true, fill: GREENHDR, color: NAVY, align: 'center' });
      cell(1, ty, 'Amount', { bold: true, fill: GREENHDR, color: NAVY, align: 'center' });
      cell(2, ty, 'Deductions', { bold: true, fill: GREENHDR, color: NAVY, align: 'center' });
      cell(3, ty, 'Amount', { bold: true, fill: GREENHDR, color: NAVY, align: 'center' });
      ty += rowH;

      const earnRows = [
        ['Basic Earning', e.basic],
        ['House Rent Allowance', e.hra],
        ['Special Allowance', e.specialAllowance]
      ];
      if (e.allowances) earnRows.push(['Allowances', e.allowances]);
      if (e.overtime) earnRows.push(['Overtime', e.overtime]);
      if (e.bonus) earnRows.push(['Bonus', e.bonus]);

      const dedRows = [
        ['Income Tax', 0],
        ['Professional Tax', d.professionalTax || 0],
        ['Provident Fund (PF)', d.pf || 0],
        ['Employee State Insurance (ESI)', d.esi || 0]
      ];
      if (d.lop) dedRows.push(['Loss of Pay', d.lop]);
      if (d.loan) dedRows.push(['Loan', d.loan]);
      if (d.other) dedRows.push(['Other', d.other]);

      const rc = Math.max(earnRows.length, dedRows.length);
      for (let i = 0; i < rc; i++) {
        const er = earnRows[i];
        const dr = dedRows[i];
        cell(0, ty, er ? er[0] : '', { color: TEAL });
        cell(1, ty, er ? num(er[1]) : '', { color: DARK });
        cell(2, ty, dr ? dr[0] : '', { color: TEAL });
        cell(3, ty, dr ? num(dr[1]) : '', { color: DARK });
        ty += rowH;
      }
      // Gross totals row
      cell(0, ty, 'Gross Earnings', { bold: true, color: NAVY });
      cell(1, ty, num(payslip.grossEarnings), { bold: true, color: DARK });
      cell(2, ty, 'Gross Deductions', { bold: true, color: NAVY });
      cell(3, ty, num(payslip.totalDeductions), { bold: true, color: DARK });
      ty += rowH;
      y = ty + 20;

      // ---------- BANK DETAILS ----------
      const bankLine = (label, value) => {
        doc.fontSize(9).font('Helvetica-Bold').fillColor(NAVY).text(label + ' ', margin, y, { continued: true });
        doc.font('Helvetica').fillColor(TEAL).text(value || '-');
        y = doc.y + 4;
      };
      bankLine('Bank Name:', bd.bankName);
      bankLine('A/C Number:', bd.accountNumber);
      bankLine('IFSC Code:', bd.ifscCode);

      // ---------- FOOTER ----------
      y += 8;
      doc.moveTo(margin, y).lineTo(right, y).strokeColor(LINE).lineWidth(0.7).stroke();
      y += 16;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(NAVY).text('Tax Regime: ', margin, y, { continued: true });
      doc.font('Helvetica').fillColor(TEAL).text('Old Regime');
      y = doc.y + 10;
      doc.fontSize(8).font('Helvetica-Bold').fillColor(RED).text('** Note: ', margin, y, { continued: true });
      doc.font('Helvetica').fillColor(RED).text('This is a System generated Payslip, hence does not require any Signature');
      y = doc.y + 6;
      doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY).text(`** All Figures mentioned are in ${currency}`, margin, y);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = router;
