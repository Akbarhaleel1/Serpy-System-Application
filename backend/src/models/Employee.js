const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  // Auto-generated human-friendly id, e.g. EMP-0001
  employeeCode: {
    type: String,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Employee name is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', ''],
    default: ''
  },
  dateOfBirth: {
    type: Date
  },
  address: {
    type: String,
    trim: true
  },
  emergencyContact: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relation: { type: String, trim: true }
  },

  // Employment details
  designation: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  dateOfJoining: {
    type: Date,
    default: Date.now
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'intern'],
    default: 'full-time'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated', 'on-leave'],
    default: 'active'
  },

  // Monthly salary structure (earnings)
  salary: {
    basic: { type: Number, default: 0, min: 0 },
    hra: { type: Number, default: 0, min: 0 },
    allowances: { type: Number, default: 0, min: 0 }, // other allowances combined
    specialAllowance: { type: Number, default: 0, min: 0 }
  },
  // Recurring monthly deductions
  deductions: {
    pf: { type: Number, default: 0, min: 0 },            // provident fund
    professionalTax: { type: Number, default: 0, min: 0 },
    esi: { type: Number, default: 0, min: 0 },           // employee state insurance
    other: { type: Number, default: 0, min: 0 }
  },

  // Bank / payment details
  bankDetails: {
    accountName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    bankName: { type: String, trim: true },
    upiId: { type: String, trim: true }
  },

  // Statutory identifiers
  panNumber: { type: String, trim: true },
  aadhaarNumber: { type: String, trim: true },
  pfNumber: { type: String, trim: true },

  notes: {
    type: String,
    trim: true
  },

  // Optional link to a login User account
  linkedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

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

// Indexes
employeeSchema.index({ name: 'text', email: 'text', designation: 'text', department: 'text' });
employeeSchema.index({ userId: 1, status: 1 });
employeeSchema.index({ dataScope: 1, status: 1 });

// Virtual: gross monthly earnings
employeeSchema.virtual('grossSalary').get(function () {
  const s = this.salary || {};
  return (s.basic || 0) + (s.hra || 0) + (s.allowances || 0) + (s.specialAllowance || 0);
});

// Virtual: total recurring deductions
employeeSchema.virtual('totalDeductions').get(function () {
  const d = this.deductions || {};
  return (d.pf || 0) + (d.professionalTax || 0) + (d.esi || 0) + (d.other || 0);
});

// Virtual: net monthly salary
employeeSchema.virtual('netSalary').get(function () {
  return this.grossSalary - this.totalDeductions;
});

// Auto-generate sequential employeeCode within a tenant scope.
// Uses the highest existing code (max + 1) rather than the document count, so
// deleting an employee never causes a reused/duplicate code.
employeeSchema.pre('save', async function (next) {
  if (this.employeeCode) return next();
  try {
    const scopeFilter = this.dataScope
      ? { dataScope: this.dataScope }
      : { userId: this.userId };

    const existing = await this.constructor
      .find(scopeFilter)
      .select('employeeCode')
      .lean();

    let max = 0;
    for (const doc of existing) {
      const m = String(doc.employeeCode || '').match(/(\d+)\s*$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }

    this.employeeCode = `EMP-${String(max + 1).padStart(4, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Employee', employeeSchema);
