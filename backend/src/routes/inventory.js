const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Inventory = require('../models/Inventory');
const { protect } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(protect);

// GET /api/inventory - Get all inventory items for user's dataScope
router.get('/', async (req, res) => {
  try {
    const { category, status, search } = req.query;

    // Build query with dataScope or userId filtering
    let query = req.user.dataScope
      ? { dataScope: req.user.dataScope }
      : { userId: req.user._id };

    // Add filters
    if (category && category !== 'all') {
      query.category = category;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const inventory = await Inventory.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: inventory });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
});

// GET /api/inventory/stats - Get inventory statistics for user's dataScope
router.get('/stats', async (req, res) => {
  try {
    // Build query with dataScope or userId filtering
    const query = req.user.dataScope
      ? { dataScope: req.user.dataScope, status: 'active' }
      : { userId: req.user._id, status: 'active' };

    const [totalItems, lowStockItems, criticalItems, totalValue] = await Promise.all([
      Inventory.countDocuments(query),
      Inventory.getLowStockItems(req.user._id),
      Inventory.getCriticalStockItems(req.user._id),
      Inventory.getTotalValue(req.user._id)
    ]);

    res.json({
      success: true,
      data: {
        totalItems,
        lowStockItems: lowStockItems.length,
        criticalItems: criticalItems.length,
        totalValue: totalValue[0]?.totalValue || 0
      }
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory stats' });
  }
});

// GET /api/inventory/analytics - Get comprehensive inventory analytics for user's dataScope
router.get('/analytics', async (req, res) => {
  try {
    const { category } = req.query;

    // Build query with dataScope or userId filtering
    const filterQuery = req.user.dataScope
      ? { dataScope: req.user.dataScope }
      : { userId: req.user._id };

    const [analytics, categoryDistribution, topMovingItems, trends, categoryAnalytics] = await Promise.all([
      Inventory.getInventoryAnalytics(req.user._id),
      Inventory.getCategoryDistribution(req.user._id),
      Inventory.getTopMovingItems(req.user._id, 10),
      Inventory.getInventoryTrends(req.user._id, 30),
      Inventory.getCategoryAnalytics(req.user._id, category)
    ]);

    res.json({
      success: true,
      data: {
        analytics: analytics[0] || {
          totalItems: 0,
          totalValue: 0,
          totalQuantity: 0,
          avgUnitCost: 0,
          lowStockCount: 0,
          criticalStockCount: 0
        },
        categoryDistribution,
        categoryAnalytics,
        topMovingItems,
        trends
      }
    });
  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory analytics' });
  }
});

// GET /api/inventory/reports/low-stock - Get low stock report for user's dataScope
router.get('/reports/low-stock', async (req, res) => {
  try {
    const { category } = req.query;

    // Build query with dataScope or userId filtering
    const query = req.user.dataScope
      ? { dataScope: req.user.dataScope }
      : { userId: req.user._id };

    let lowStockItems = await Inventory.find({
      ...query,
      $expr: { $lte: ['$quantity', '$minStockLevel'] }
    });

    // Filter by category if specified
    if (category && category !== 'all') {
      lowStockItems = lowStockItems.filter(item => item.category === category);
    }

    res.json({
      success: true,
      data: {
        items: lowStockItems,
        count: lowStockItems.length,
        totalValue: lowStockItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0),
        byCategory: {
          Numbers: lowStockItems.filter(item => item.category === 'Numbers').length,
          'Square Feet': lowStockItems.filter(item => item.category === 'Square Feet').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching low stock report:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch low stock report' });
  }
});

// GET /api/inventory/reports/critical-stock - Get critical stock report for user's dataScope
router.get('/reports/critical-stock', async (req, res) => {
  try {
    const { category } = req.query;

    // Build query with dataScope or userId filtering
    const query = req.user.dataScope
      ? { dataScope: req.user.dataScope }
      : { userId: req.user._id };

    let criticalItems = await Inventory.find({
      ...query,
      $expr: { $lte: ['$quantity', { $divide: ['$minStockLevel', 2] }] }
    });

    // Filter by category if specified
    if (category && category !== 'all') {
      criticalItems = criticalItems.filter(item => item.category === category);
    }

    res.json({
      success: true,
      data: {
        items: criticalItems,
        count: criticalItems.length,
        totalValue: criticalItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0),
        byCategory: {
          Numbers: criticalItems.filter(item => item.category === 'Numbers').length,
          'Square Feet': criticalItems.filter(item => item.category === 'Square Feet').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching critical stock report:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch critical stock report' });
  }
});

// GET /api/inventory/reports/valuation - Get inventory valuation report for user's dataScope
router.get('/reports/valuation', async (req, res) => {
  try {
    const { category } = req.query;

    // Build match query with dataScope or userId filtering
    let matchQuery = req.user.dataScope
      ? { dataScope: req.user.dataScope, status: 'active' }
      : { userId: req.user._id, status: 'active' };

    if (category && category !== 'all') {
      matchQuery.category = category;
    }

    const valuation = await Inventory.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
          avgUnitCost: { $avg: '$unitCost' },
          minValue: { $min: { $multiply: ['$quantity', '$unitCost'] } },
          maxValue: { $max: { $multiply: ['$quantity', '$unitCost'] } },
          unit: { $first: '$unit' }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    const totalValuation = valuation.reduce((sum, cat) => sum + cat.totalValue, 0);

    res.json({
      success: true,
      data: {
        valuation,
        totalValuation,
        summary: {
          totalCategories: valuation.length,
          totalItems: valuation.reduce((sum, cat) => sum + cat.count, 0),
          totalQuantity: valuation.reduce((sum, cat) => sum + cat.totalQuantity, 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching valuation report:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch valuation report' });
  }
});

// GET /api/inventory/reports/movement-summary - Get movement summary
router.get('/reports/movement-summary', async (req, res) => {
  try {
    const { days = 30, category } = req.query;

    // This would typically use InventoryMovement model
    // For now, we'll return a placeholder structure
    res.json({
      success: true,
      data: {
        period: `${days} days`,
        category: category || 'all',
        movements: [],
        summary: {
          totalMovements: 0,
          totalQuantityMoved: 0,
          totalValueMoved: 0,
          movementTypes: {}
        }
      }
    });
  } catch (error) {
    console.error('Error fetching movement summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch movement summary' });
  }
});

// GET /api/inventory/reports/category-comparison - Get category comparison report for user's dataScope
router.get('/reports/category-comparison', async (req, res) => {
  try {
    // Build match query with dataScope or userId filtering
    let matchQuery = req.user.dataScope
      ? { dataScope: req.user.dataScope, status: 'active' }
      : { userId: req.user._id, status: 'active' };

    const comparison = await Inventory.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$unitCost'] } },
          avgUnitCost: { $avg: '$unitCost' },
          lowStockItems: {
            $sum: {
              $cond: [{ $lte: ['$quantity', '$minStockLevel'] }, 1, 0]
            }
          },
          criticalStockItems: {
            $sum: {
              $cond: [{ $lte: ['$quantity', { $divide: ['$minStockLevel', 2] }] }, 1, 0]
            }
          },
          unit: { $first: '$unit' }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        comparison,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching category comparison:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category comparison' });
  }
});

// GET /api/inventory/:id - Get specific inventory item
router.get('/:id', async (req, res) => {
  try {
    // Build query with dataScope or userId filtering
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const item = await Inventory.findOne(findQuery);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory item' });
  }
});

// POST /api/inventory - Create new inventory item
router.post('/', async (req, res) => {
  try {
    const inventoryData = {
      ...req.body,
      userId: req.user._id
    };

    // Add dataScope if user has it (post-migration), otherwise skip
    if (req.user.dataScope) {
      inventoryData.dataScope = req.user.dataScope;
    }

    // Auto-generate SKU if not provided
    if (!inventoryData.sku) {
      const timestamp = Date.now().toString().slice(-6);
      const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
      inventoryData.sku = `INV-${timestamp}-${randomStr}`;
    }

    const item = new Inventory(inventoryData);
    await item.save();

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(400).json({ success: false, message: 'Failed to create inventory item', error: error.message });
  }
});

// PUT /api/inventory/:id - Update inventory item
router.put('/:id', async (req, res) => {
  try {
    // Build query with dataScope or userId filtering
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    // Prevent SKU changes after creation (immutable)
    if (req.body.sku) {
      delete req.body.sku;
    }

    const item = await Inventory.findOneAndUpdate(
      findQuery,
      req.body,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(400).json({ success: false, message: 'Failed to update inventory item', error: error.message });
  }
});

// DELETE /api/inventory/:id - Delete inventory item
router.delete('/:id', async (req, res) => {
  try {
    // Build query with dataScope or userId filtering
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const item = await Inventory.findOneAndDelete(findQuery);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }
    res.json({ success: true, message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ success: false, message: 'Failed to delete inventory item' });
  }
});

// POST /api/inventory/:id/adjust - Adjust inventory quantity
router.post('/:id/adjust', async (req, res) => {
  try {
    const { quantity, reason, notes } = req.body;

    // Build query with dataScope or userId filtering
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const item = await Inventory.findOne(findQuery);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    // Validate quantity is a positive number
    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity cannot be negative'
      });
    }

    item.quantity = quantity;
    await item.save();

    res.json({ success: true, data: item, message: 'Inventory adjusted successfully' });
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    res.status(400).json({ success: false, message: 'Failed to adjust inventory', error: error.message });
  }
});

// POST /api/inventory/bulk-update - Bulk update inventory items
router.post('/bulk-update', async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, updates }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid items array' });
    }

    const updatePromises = items.map(({ id, updates }) => {
      // Build query with dataScope or userId filtering
      const findQuery = req.user.dataScope
        ? { _id: id, dataScope: req.user.dataScope }
        : { _id: id, userId: req.user._id };

      // Prevent SKU changes in bulk updates (immutable)
      if (updates.sku) {
        delete updates.sku;
      }

      return Inventory.findOneAndUpdate(
        findQuery,
        updates,
        { new: true, runValidators: true }
      );
    });

    const updatedItems = await Promise.all(updatePromises);

    res.json({
      success: true,
      data: updatedItems.filter(item => item !== null),
      message: 'Bulk update completed successfully'
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(400).json({ success: false, message: 'Failed to bulk update inventory', error: error.message });
  }
});

module.exports = router;