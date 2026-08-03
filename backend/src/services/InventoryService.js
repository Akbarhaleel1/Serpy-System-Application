const Inventory = require('../models/Inventory');
const InventoryMovement = require('../models/InventoryMovement');
const mongoose = require('mongoose');

class InventoryService {
  /**
   * Deduct inventory for invoice items
   * @param {Array} items - Invoice items
   * @param {String} invoiceId - Invoice ID
   * @param {String} invoiceNumber - Invoice number
   * @param {String} userId - User ID
   * @returns {Object} - Result with success status and movements
   */
  static async deductInventoryForInvoice(items, invoiceId, invoiceNumber, userId) {
    const movements = [];
    const errors = [];
    
    try {
      // Try to use transactions, but fallback to non-transactional if not available
      let session = null;
      let useTransaction = false;
      
      try {
        session = await mongoose.startSession();
        useTransaction = true;
      } catch (sessionError) {
        console.log('MongoDB sessions not available, using non-transactional approach');
        useTransaction = false;
      }
      
      if (useTransaction && session) {
        // Try transactional approach
        try {
          await session.withTransaction(async () => {
            for (const item of items) {
              await this.processInventoryDeduction(item, invoiceId, invoiceNumber, userId, session, movements, errors);
            }
          });
          await session.endSession();
        } catch (txError) {
          console.error('Transaction failed, falling back to non-transactional:', txError.message);
          await session.endSession().catch(() => {});
          // Clear movements and errors from failed transaction
          movements.length = 0;
          errors.length = 0;
          // Fall through to non-transactional approach
          useTransaction = false;
        }
      }
      
      // Non-transactional approach (fallback)
      if (!useTransaction) {
        for (const item of items) {
          await this.processInventoryDeduction(item, invoiceId, invoiceNumber, userId, null, movements, errors);
        }
      }
      
      return {
        success: errors.length === 0,
        movements,
        errors
      };
      
    } catch (error) {
      console.error('Error in deductInventoryForInvoice:', error);
      return {
        success: false,
        movements,
        errors: [...errors, error.message]
      };
    }
  }
  
  /**
   * Helper method to process a single inventory deduction
   */
  static async processInventoryDeduction(item, invoiceId, invoiceNumber, userId, session, movements, errors) {
    // Find inventory item by name
    const query = Inventory.findOne({
      name: item.itemName,
      status: 'active'
    });
    
    const inventoryItem = session ? await query.session(session) : await query;
    
    if (!inventoryItem) {
      errors.push(`Inventory item "${item.itemName}" not found`);
      return;
    }
    
    // Check if sufficient stock is available
    if (inventoryItem.quantity < item.quantity) {
      errors.push(`Insufficient stock for "${item.itemName}". Available: ${inventoryItem.quantity}, Required: ${item.quantity}`);
      return;
    }
    
    // Calculate previous and new quantities
    const previousQuantity = inventoryItem.quantity;
    const newQuantity = previousQuantity - item.quantity;
    
    // Update inventory quantity
    const updateQuery = Inventory.findByIdAndUpdate(
      inventoryItem._id,
      { 
        quantity: newQuantity,
        updatedAt: Date.now()
      },
      session ? { session } : {}
    );
    
    if (session) {
      await updateQuery.session(session);
    } else {
      await updateQuery;
    }
    
    // Create inventory movement record
    const movementData = {
      inventoryItem: inventoryItem._id,
      itemName: item.itemName,
      movementType: 'sale',
      quantity: item.quantity,
      unit: inventoryItem.unit,
      unitCost: inventoryItem.unitCost,
      totalCost: item.quantity * inventoryItem.unitCost,
      previousQuantity,
      newQuantity,
      referenceType: 'invoice',
      referenceId: new mongoose.Types.ObjectId(invoiceId),
      referenceNumber: invoiceNumber,
      reason: 'Invoice sale',
      notes: `Sold ${item.quantity} ${inventoryItem.unit} of ${item.itemName}`,
      userId: new mongoose.Types.ObjectId(userId)
    };
    
    const movement = await InventoryMovement.createMovement(movementData);
    movements.push(movement);
  }
  
  /**
   * Restore inventory for cancelled invoice
   * @param {String} invoiceId - Invoice ID
   * @param {String} userId - User ID
   * @returns {Object} - Result with success status and movements
   */
  static async restoreInventoryForCancelledInvoice(invoiceId, userId) {
    try {
      // Get all movements for this invoice
      const movements = await InventoryMovement.find({
        referenceType: 'invoice',
        referenceId: new mongoose.Types.ObjectId(invoiceId)
      });
      
      if (movements.length === 0) {
        return { success: true, message: 'No inventory movements found for this invoice' };
      }
      
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          for (const movement of movements) {
            // Find current inventory item
            const inventoryItem = await Inventory.findById(movement.inventoryItem).session(session);
            
            if (!inventoryItem) {
              console.warn(`Inventory item not found for movement: ${movement._id}`);
              continue;
            }
            
            // Restore quantity
            const newQuantity = inventoryItem.quantity + movement.quantity;
            
            await Inventory.findByIdAndUpdate(
              inventoryItem._id,
              { 
                quantity: newQuantity,
                updatedAt: Date.now()
              },
              { session }
            );
            
            // Create reverse movement record
            const reverseMovementData = {
              inventoryItem: movement.inventoryItem,
              itemName: movement.itemName,
              movementType: 'return',
              quantity: movement.quantity,
              unit: movement.unit,
              unitCost: movement.unitCost,
              totalCost: movement.totalCost,
              previousQuantity: inventoryItem.quantity,
              newQuantity,
              referenceType: 'invoice',
              referenceId: new mongoose.Types.ObjectId(invoiceId),
              referenceNumber: movement.referenceNumber,
              reason: 'Invoice cancellation - stock restoration',
              notes: `Restored ${movement.quantity} ${movement.unit} of ${movement.itemName} due to invoice cancellation`,
              userId: new mongoose.Types.ObjectId(userId)
            };
            
            await InventoryMovement.createMovement(reverseMovementData);
          }
        });
        
        await session.endSession();
        
        return { success: true, message: 'Inventory restored successfully' };
        
      } catch (error) {
        await session.endSession();
        throw error;
      }
      
    } catch (error) {
      console.error('Error in restoreInventoryForCancelledInvoice:', error);
      throw error;
    }
  }
  
  /**
   * Check stock availability for items
   * @param {Array} items - Items to check
   * @param {String} userId - User ID
   * @returns {Object} - Stock check result
   */
  static async checkStockAvailability(items, userId) {
    const stockCheck = {
      available: true,
      items: [],
      errors: []
    };
    
    for (const item of items) {
      const inventoryItem = await Inventory.findOne({
        name: item.itemName,
        status: 'active'
      });
      
      if (!inventoryItem) {
        stockCheck.available = false;
        stockCheck.errors.push(`Inventory item "${item.itemName}" not found`);
        stockCheck.items.push({
          itemName: item.itemName,
          available: false,
          availableQuantity: 0,
          requiredQuantity: item.quantity,
          error: 'Item not found in inventory'
        });
        continue;
      }
      
      const isAvailable = inventoryItem.quantity >= item.quantity;
      
      if (!isAvailable) {
        stockCheck.available = false;
        stockCheck.errors.push(`Insufficient stock for "${item.itemName}". Available: ${inventoryItem.quantity}, Required: ${item.quantity}`);
      }
      
      stockCheck.items.push({
        itemName: item.itemName,
        available: isAvailable,
        availableQuantity: inventoryItem.quantity,
        requiredQuantity: item.quantity,
        unit: inventoryItem.unit,
        unitCost: inventoryItem.unitCost
      });
    }
    
    return stockCheck;
  }
  
  /**
   * Get inventory movement history
   * @param {String} userId - User ID
   * @param {Object} filters - Filter options
   * @returns {Array} - Movement history
   */
  static async getMovementHistory(userId, filters = {}) {
    // userId parameter kept for compatibility but not used in query
    const query = {};
    
    if (filters.inventoryItemId) {
      query.inventoryItem = new mongoose.Types.ObjectId(filters.inventoryItemId);
    }
    
    if (filters.movementType) {
      query.movementType = filters.movementType;
    }
    
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }
    
    return await InventoryMovement.find(query)
      .populate('inventoryItem', 'name sku category')
      .sort({ createdAt: -1 })
      .limit(filters.limit || 100);
  }
}

module.exports = InventoryService;
