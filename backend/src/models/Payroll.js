const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  // Snapshot of employee identity at generation time
  employeeName: { type: String, trim: true },
  employeeCode: { type: String, trim: true },
  designation: { type: String, trim: true },

  // Pay period
  month: {
    type: Number, // 1-12
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  periodLabel: {
    type: String, // e.g. "Jun 2026"
    trim: true
  },

  // Earnings (snapshot, may be edited before finalizing)
  earnings: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 }
  },
  // Deductions (snapshot)
  deductions: {
    pf: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    loan: { type: Number, default: 0 },
    lop: { type: Number, default: 0 }, // loss of pay amount
    other: { type: Number, default: 0 }
  },

  // Attendance summary for the period
  workingDays: { type: Number, default: 0 },
  paidDays: { type: Number, default: 0 },
  lopDays: { type: Number, default: 0 },

  grossEarnings: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  netPay: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['draft', 'generated', 'paid'],
    default: 'generated',
    index: true
  },
  paidDate: { type: Date },
  paymentMethod: {
    type: String,
    enum: ['bank-transfer', 'cash', 'cheque', 'upi', ''],
    default: ''
  },
  notes: { type: String, trim: true },

  // Multi-tenant ownership
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dataScope: {
    type: String,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// One payslip per employee per month/year
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ userId: 1, year: 1, month: 1 });
payrollSchema.index({ dataScope: 1, year: 1, month: 1 });

// Recompute totals from earnings/deductions
payrollSchema.methods.recompute = function () {
  const e = this.earnings || {};
  const d = this.deductions || {};
  this.grossEarnings = (e.basic || 0) + (e.hra || 0) + (e.allowances || 0) +
    (e.specialAllowance || 0) + (e.overtime || 0) + (e.bonus || 0);
  this.totalDeductions = (d.pf || 0) + (d.professionalTax || 0) + (d.esi || 0) +
    (d.loan || 0) + (d.lop || 0) + (d.other || 0);
  this.netPay = Math.max(0, this.grossEarnings - this.totalDeductions);
  return this;
};

module.exports = mongoose.model('Payroll', payrollSchema);
