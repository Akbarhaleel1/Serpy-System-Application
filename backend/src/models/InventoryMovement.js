const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema({
  inventoryItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  movementType: {
    type: String,
    required: true,
    enum: ['sale', 'purchase', 'adjustment', 'return', 'damage', 'transfer'],
    default: 'sale'
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative']
  },
  unit: {
    type: String,
    required: true,
    enum: ['pieces', 'kg', 'meters', 'liters', 'boxes', 'reams'],
    default: 'pieces'
  },
  unitCost: {
    type: Number,
    required: true,
    min: [0, 'Unit cost cannot be negative']
  },
  totalCost: {
    type: Number,
    required: true,
    min: [0, 'Total cost cannot be negative']
  },
  previousQuantity: {
    type: Number,
    required: true,
    min: [0, 'Previous quantity cannot be negative']
  },
  newQuantity: {
    type: Number,
    required: true,
    min: [0, 'New quantity cannot be negative']
  },
  referenceType: {
    type: String,
    enum: ['invoice', 'purchase_order', 'adjustment', 'return', 'damage', 'transfer'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  reason: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
inventoryMovementSchema.index({ userId: 1, createdAt: -1 });
inventoryMovementSchema.index({ inventoryItem: 1, createdAt: -1 });
inventoryMovementSchema.index({ referenceType: 1, referenceId: 1 });

// Update the updatedAt field before saving
inventoryMovementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to create inventory movement
inventoryMovementSchema.statics.createMovement = async function(movementData) {
  const movement = new this(movementData);
  await movement.save();
  return movement;
};

// Static method to get movements by inventory item
inventoryMovementSchema.statics.getMovementsByItem = function(inventoryItemId, userId) {
  return this.find({ 
    inventoryItem: new mongoose.Types.ObjectId(inventoryItemId),
    userId: new mongoose.Types.ObjectId(userId)
  })
  .sort({ createdAt: -1 })
  .populate('inventoryItem', 'name sku category');
};

// Static method to get movements by reference
inventoryMovementSchema.statics.getMovementsByReference = function(referenceType, referenceId, userId) {
  return this.find({ 
    referenceType,
    referenceId: new mongoose.Types.ObjectId(referenceId),
    userId: new mongoose.Types.ObjectId(userId)
  })
  .sort({ createdAt: -1 })
  .populate('inventoryItem', 'name sku category');
};

// Static method to get inventory movement summary
inventoryMovementSchema.statics.getMovementSummary = function(userId, startDate, endDate) {
  const matchStage = { userId: new mongoose.Types.ObjectId(userId) };
  
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$movementType',
        totalMovements: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalCost: { $sum: '$totalCost' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

module.exports = mongoose.model('InventoryMovement', inventoryMovementSchema);
