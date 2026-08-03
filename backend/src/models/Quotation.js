const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  item_name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  quantity: { type: Number, required: true, min: [0.01, 'Quantity must be greater than 0'] },
  unit_price: { type: Number, required: true, min: [0, 'Unit price cannot be negative'] },
  tax_rate: { type: Number, default: 0, min: 0, max: 100 },
  tax_amount: { type: Number, default: 0 },
  total_amount: { type: Number, required: true, min: 0 }
});

const quotationSchema = new mongoose.Schema({
  quotationNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  gst_type: {
    type: String,
    enum: ['gst', 'non_gst'],
    default: 'non_gst'
  },
  is_interstate: {
    type: Boolean,
    default: false
  },
  valid_until: {
    type: Date
  },
  items: [quotationItemSchema],
  subtotal: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  total_amount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'sent', 'approved', 'rejected'],
    default: 'draft'
  },
  payment_link: { type: String, trim: true },
  terms_conditions: { type: String, trim: true },
  notes: { type: String, trim: true },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dataScope: {
    type: String,
    index: true
  }
}, { timestamps: true });

quotationSchema.index({ userId: 1, quotationNumber: 1 });
quotationSchema.index({ dataScope: 1, quotationNumber: 1 });
quotationSchema.index({ userId: 1, status: 1 });

quotationSchema.statics.generateQuotationNumber = async function(userId, dataScope) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const startOfMonth = new Date(year, today.getMonth(), 1);
  const endOfMonth = new Date(year, today.getMonth() + 1, 0);

  const countQuery = dataScope
    ? { dataScope, createdAt: { $gte: startOfMonth, $lte: endOfMonth } }
    : { userId, createdAt: { $gte: startOfMonth, $lte: endOfMonth } };

  const count = await this.countDocuments(countQuery);
  let seq = count + 1;
  let quotationNumber = `QUO-${year}${month}-${String(seq).padStart(4, '0')}`;

  const existingQuery = dataScope ? { dataScope, quotationNumber } : { userId, quotationNumber };
  while (await this.findOne(existingQuery)) {
    seq++;
    quotationNumber = `QUO-${year}${month}-${String(seq).padStart(4, '0')}`;
  }

  return quotationNumber;
};

module.exports = mongoose.model('Quotation', quotationSchema);
