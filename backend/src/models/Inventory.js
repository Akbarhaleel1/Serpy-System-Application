const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Paper & Printing Materials',
      'Ink & Toner',
      'Binding & Finishing Materials',
      'Office Supplies',
      'Packaging Materials',
      'Machinery Parts',
      'Tools & Equipment',
      'Chemicals & Adhesives',
      'Other'
    ],
    default: 'Other'
  },
  sku: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: [
      'pieces',
      'boxes',
      'reams',
      'kg',
      'grams',
      'liters',
      'meters',
      'sqft',
      'sqm',
      'rolls',
      'sheets'
    ],
    default: 'pieces'
  },
  unitCost: {
    type: Number,
    required: [true, 'Unit cost is required'],
    min: [0, 'Unit cost cannot be negative'],
    default: 0,
    validate: {
      validator: function (v) {
        // Allow 0 only if isFreeItem is true
        if (v === 0 && !this.isFreeItem) {
          return false;
        }
        return true;
      },
      message: 'Unit cost cannot be 0.00 unless item is marked as free/sample'
    }
  },
  isFreeItem: {
    type: Boolean,
    default: false,
    description: 'Allows zero cost for free or sample items'
  },
  minStockLevel: {
    type: Number,
    required: [true, 'Minimum stock level is required'],
    min: [0, 'Minimum stock level cannot be negative'],
    default: 10
  },
  maxStockLevel: {
    type: Number,
    min: [0, 'Maximum stock level cannot be negative']
  },
  supplier: {
    type: String,
    trim: true
  },
  supplierContact: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true,
    description: 'Storage location or warehouse section'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active',
    description: 'Item lifecycle status'
  },
  stockStatus: {
    type: String,
    enum: ['adequate', 'low_stock', 'out_of_stock'],
    description: 'Auto-calculated stock level status'
  },
  hsnCode: {
    type: String,
    trim: true,
    uppercase: true,
    validate: {
      validator: function (v) {
        if (!v) return true; // Optional field
        return /^\d{4,8}$/.test(v);
      },
      message: 'HSN Code must be 4-8 digits'
    }
  },
  gstRate: {
    type: Number,
    min: [0, 'GST Rate cannot be negative'],
    max: [100, 'GST Rate cannot exceed 100%'],
    enum: [0, 5, 12, 18, 28],
    default: 18,
    description: 'Standard GST rates in India'
  },
  autoDeduct: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dataScope: {
    type: String,
    index: true,
    description: 'Data scope for multi-tenant isolation. Optional during migration.'
  }
}, {
  timestamps: true
});

// Indexes
inventorySchema.index({ userId: 1, name: 1 });
inventorySchema.index({ userId: 1, category: 1 });
inventorySchema.index({ userId: 1, sku: 1 });
inventorySchema.index({ userId: 1, status: 1 });
inventorySchema.index({ dataScope: 1, status: 1 });
inventorySchema.index({ dataScope: 1, category: 1 });

// Virtual for total value
inventorySchema.virtual('totalValue').get(function () {
  return this.quantity * this.unitCost;
});

// Virtual for display quantity with unit
inventorySchema.virtual('displayQuantity').get(function () {
  const unitLabels = {
    'pieces': 'pcs',
    'boxes': 'boxes',
    'reams': 'reams',
    'kg': 'kg',
    'grams': 'g',
    'liters': 'L',
    'meters': 'm',
    'sqft': 'sq ft',
    'sqm': 'sq m',
    'rolls': 'rolls',
    'sheets': 'sheets'
  };

  const label = unitLabels[this.unit] || this.unit;
  const qty = ['sqft', 'sqm', 'kg', 'grams', 'liters', 'meters'].includes(this.unit)
    ? this.quantity.toFixed(2)
    : this.quantity;

  return `${qty} ${label}`;
});

// Pre-save middleware to auto-calculate stock status and validate
inventorySchema.pre('save', function (next) {
  this.lastUpdated = new Date();

  // Auto-calculate stock status
  if (this.quantity <= 0) {
    this.stockStatus = 'out_of_stock';
  } else if (this.quantity <= this.minStockLevel) {
    this.stockStatus = 'low_stock';
  } else {
    this.stockStatus = 'adequate';
  }

  // Validate unit cost for non-free items
  if (this.unitCost === 0 && !this.isFreeItem) {
    return next(new Error('Unit cost cannot be 0.00 unless item is marked as free/sample'));
  }

  next();
});

// Static method to get low stock items
inventorySchema.statics.getLowStockItems = function (userId) {
  // userId parameter kept for compatibility but not used in query
  return this.find({
    status: 'active',
    $expr: { $lte: ['$quantity', '$minStockLevel'] }
  });
};

// Static method to get critical stock items
inventorySchema.statics.getCriticalStockItems = function (userId) {
  // userId parameter kept for compatibility but not used in query
  return this.find({
    status: 'active',
    $expr: { $lte: ['$quantity', { $divide: ['$minStockLevel', 2] }] }
  });
};

// Static method to get inventory value
inventorySchema.statics.getTotalValue = function (userId) {
  // userId parameter kept for compatibility but not used in query
  return this.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: null, totalValue: { $sum: { $multiply: ['$quantity', '$unitCost'] } } } }
  ]);
};

// Static method to get category distribution
inventorySchema.statics.getCategoryDistribution = function (userId) {
  // userId parameter kept for compatibility but not used in query
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalValue: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
        totalQuantity: { $sum: '$quantity' }
      }
    },
    { $sort: { totalValue: -1 } }
  ]);
};

// Static method to get inventory analytics
inventorySchema.statics.getInventoryAnalytics = function (userId) {
  // userId parameter kept for compatibility but not used in query
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        totalValue: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
        totalQuantity: { $sum: '$quantity' },
        avgUnitCost: { $avg: '$unitCost' },
        lowStockCount: {
          $sum: {
            $cond: [
              { $lte: ['$quantity', '$minStockLevel'] },
              1,
              0
            ]
          }
        },
        criticalStockCount: {
          $sum: {
            $cond: [
              { $lte: ['$quantity', { $divide: ['$minStockLevel', 2] }] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

// Static method to get top moving items
inventorySchema.statics.getTopMovingItems = function (userId, limit = 10) {
  // userId parameter kept for compatibility but not used in query
  return this.find({
    status: 'active'
  })
    .sort({ quantity: -1 })
    .limit(limit)
    .select('name category quantity unit unitCost minStockLevel');
};

// Static method to get inventory trends
inventorySchema.statics.getInventoryTrends = function (userId, days = 30) {
  // userId parameter kept for compatibility but not used in query
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        status: 'active',
        updatedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$updatedAt' },
          month: { $month: '$updatedAt' },
          day: { $dayOfMonth: '$updatedAt' }
        },
        itemsUpdated: { $sum: 1 },
        valueChange: { $sum: { $multiply: ['$quantity', '$unitCost'] } }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
};

// Static method to get category-specific analytics
inventorySchema.statics.getCategoryAnalytics = function (userId, category) {
  // userId parameter kept for compatibility but not used in query
  const matchQuery = { status: 'active' };
  if (category && category !== 'all') {
    matchQuery.category = category;
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
        avgQuantity: { $avg: '$quantity' },
        avgUnitCost: { $avg: '$unitCost' },
        minQuantity: { $min: '$quantity' },
        maxQuantity: { $max: '$quantity' }
      }
    },
    { $sort: { totalValue: -1 } }
  ]);
};

module.exports = mongoose.model('Inventory', inventorySchema);