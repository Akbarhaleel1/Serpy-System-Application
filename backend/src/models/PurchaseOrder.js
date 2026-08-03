const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  poNumber: {
    type: String,
    required: true,
    unique: true
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  vendorName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'acknowledged', 'partial', 'completed', 'cancelled'],
    default: 'draft'
  },
  expectedDelivery: {
    type: Date
  },
  actualDelivery: {
    type: Date
  },
  items: [{
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true
    },
    itemName: {
      type: String,
      required: true
    },
    category: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingQuantity: {
      type: Number,
      default: function () {
        return this.quantity;
      }
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String
  },
  terms: {
    type: String,
    default: 'Net 30'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  acknowledgedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
purchaseOrderSchema.index({ userId: 1, status: 1 });
purchaseOrderSchema.index({ vendorId: 1, createdAt: -1 });

// Virtual for calculating completion percentage
purchaseOrderSchema.virtual('completionPercentage').get(function () {
  if (this.items.length === 0) return 0;

  const totalOrdered = this.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalReceived = this.items.reduce((sum, item) => sum + item.receivedQuantity, 0);

  return totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
});

// Method to update received quantities
purchaseOrderSchema.methods.updateReceivedQuantities = function (receivedItems) {
  this.items.forEach(item => {
    const receivedItem = receivedItems.find(ri => ri.inventoryId.toString() === item.inventoryId.toString());
    if (receivedItem) {
      item.receivedQuantity = receivedItem.quantity;
      item.pendingQuantity = Math.max(0, item.quantity - item.receivedQuantity);
    }
  });

  // Update status based on completion
  const completionPercentage = this.completionPercentage;
  if (completionPercentage === 100) {
    this.status = 'completed';
    this.completedAt = new Date();
  } else if (completionPercentage > 0) {
    this.status = 'partial';
  }

  return this.save();
};

// Static method to generate PO number
purchaseOrderSchema.statics.generatePONumber = async function (userId) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  // Find the last PO for this user in current month
  const lastPO = await this.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    poNumber: { $regex: `^PO-${year}${month}` }
  }).sort({ poNumber: -1 });

  let sequence = 1;
  if (lastPO) {
    const lastSequence = parseInt(lastPO.poNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `PO-${year}${month}-${String(sequence).padStart(4, '0')}`;
};

// Static method to get purchase order statistics
purchaseOrderSchema.statics.getPurchaseOrderStats = function (userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalPOs: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        draftPOs: {
          $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
        },
        sentPOs: {
          $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
        },
        completedPOs: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        pendingAmount: {
          $sum: {
            $cond: [
              { $in: ['$status', ['sent', 'acknowledged', 'partial']] },
              '$totalAmount',
              0
            ]
          }
        }
      }
    }
  ]);
};

// Static method to get vendor-wise purchase summary
purchaseOrderSchema.statics.getVendorPurchaseSummary = function (userId, vendorId) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        vendorId: new mongoose.Types.ObjectId(vendorId)
      }
    },
    {
      $group: {
        _id: '$vendorId',
        vendorName: { $first: '$vendorName' },
        totalPOs: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        completedPOs: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        pendingAmount: {
          $sum: {
            $cond: [
              { $in: ['$status', ['sent', 'acknowledged', 'partial']] },
              '$totalAmount',
              0
            ]
          }
        },
        lastOrderDate: { $max: '$createdAt' }
      }
    }
  ]);
};

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
