const mongoose = require('mongoose');

const jobComponentSchema = new mongoose.Schema({
  item: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  total: { type: Number, required: true }
});

// Invoice item schema for new invoice items feature
const invoiceItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true, trim: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  hsnCode: { type: String, trim: true, uppercase: true },
  gstRate: { type: Number, min: 0, max: 100, default: 18 },
  itemTotal: { type: Number, default: 0 },
  itemType: { type: String, enum: ['Numbers', 'Square Feet'], default: 'Numbers' },
  unit: { type: String, default: 'pieces' },
  totalSquareFeet: { type: Number, default: 0 },
  length: { type: Number, default: 0 },
  width: { type: Number, default: 0 }
});

// Design charge schema
const designChargeSchema = new mongoose.Schema({
  amount: { type: Number, required: true, default: 0 },
  sacCode: { type: String, required: true, trim: true, uppercase: true },
  gstRate: { type: Number, required: true, min: 0, max: 100, default: 18 },
  totalAmount: { type: Number, default: 0 }
});

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  status: {
    type: String,
    enum: [
      'inquiry',
      'quotation_sent',
      'quotation_approved',
      'design_in_progress',
      'design_approved',
      'production_ready',
      'ready_for_print',
      'quality_check',
      'completed',
      'delivered',
      'cancelled'
    ],
    default: 'inquiry'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  estimatedCost: {
    type: Number,
    default: 0
  },
  actualCost: {
    type: Number,
    default: 0
  },
  dueDate: {
    type: Date
  },
  completionDate: {
    type: Date
  },
  components: [jobComponentSchema],
  // New invoice items array
  items: [invoiceItemSchema],
  // Design charge
  designCharge: designChargeSchema,
  files: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  notes: {
    type: String,
    trim: true
  },
  specialInstructions: {
    type: String,
    trim: true
  },
  pricingDetails: {
    materialCost: { type: Number, default: 0 },
    laborCost: { type: Number, default: 0 },
    overheadCost: { type: Number, default: 0 },
    profitMargin: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    hsnCode: { type: String, trim: true, uppercase: true },
    gstRate: { type: Number, min: 0, max: 100, default: 18 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    isInterState: { type: Boolean, default: false }
  },
  // Walk-in specific fields
  isWalkIn: {
    type: Boolean,
    default: false
  },
  customerName: {
    type: String,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  agentName: {
    type: String,
    trim: true
  },
  assignedOperator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  // Print specifications
  printSpecs: {
    paperType: { type: String },
    colorType: { type: String, enum: ['color', 'black_white'], default: 'color' },
    printSize: { type: String },
    quantity: { type: Number, default: 1 },
    binding: { type: String },
    lamination: { type: String },
    bindingType: { type: String }
  },
  // Flow tracking
  flowStage: {
    type: String,
    enum: [
      'customer_inquiry',
      'job_handler_assigned',
      'accountant_review',
      'quotation_sent',
      'quotation_approved',
      'design_in_progress',
      'design_approved',
      'production_ready',
      'ready_for_print',
      'quality_check',
      'payment_pending',
      'payment_collected',
      'job_complete',
      'product_received',
      'exited'
    ],
    default: 'customer_inquiry'
  },
  flowHistory: [{
    stage: String,
    enteredAt: { type: Date, default: Date.now },
    handlerName: String,
    remarks: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  // Assignment info
  assignedTo: {
    handlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    handlerName: String,
    assignedAt: { type: Date, default: Date.now }
  },
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
    index: true,
    description: 'Data scope for multi-tenant isolation. All users with same dataScope share this data.'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
jobSchema.index({ title: 'text', description: 'text' });
jobSchema.index({ status: 1, priority: 1 });
jobSchema.index({ customerId: 1 });
jobSchema.index({ userId: 1 });
jobSchema.index({ dataScope: 1 });
jobSchema.index({ dataScope: 1, status: 1 });
jobSchema.index({ dueDate: 1 });
jobSchema.index({ createdAt: -1 });

// Populate virtual relationships
jobSchema.virtual('customer', {
  ref: 'Customer',
  localField: 'customerId',
  foreignField: '_id',
  justOne: true
});

jobSchema.virtual('invoices', {
  ref: 'Invoice',
  localField: '_id',
  foreignField: 'jobId'
});

jobSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'jobId'
});

jobSchema.virtual('proofs', {
  ref: 'Proof',
  localField: '_id',
  foreignField: 'jobId'
});

// Pre-save middleware to calculate totals
jobSchema.pre('save', function(next) {
  if (this.components && this.components.length > 0) {
    this.estimatedCost = this.components.reduce((sum, comp) => sum + comp.total, 0);
  }
  next();
});

// Methods
jobSchema.methods.updateFlowStage = function(newStage, handlerName, remarks, updatedBy) {
  this.flowStage = newStage;
  this.flowHistory.push({
    stage: newStage,
    handlerName: handlerName,
    remarks: remarks,
    updatedBy: updatedBy
  });
  
  // Update status based on flow stage
  if (newStage === 'design_approved') this.status = 'design_approved';
  else if (newStage === 'production_ready') this.status = 'production_ready';
  else if (newStage === 'quality_check') this.status = 'quality_check';
  else if (newStage === 'job_complete') {
    this.status = 'completed';
    this.completionDate = new Date();
  }
  
  return this.save();
};

jobSchema.methods.assignToOperator = function(operatorId, operatorName) {
  this.assignedOperator = operatorId;
  this.assignedTo = {
    handlerId: operatorId,
    handlerName: operatorName,
    assignedAt: new Date()
  };
  return this.save();
};

module.exports = mongoose.model('Job', jobSchema);
