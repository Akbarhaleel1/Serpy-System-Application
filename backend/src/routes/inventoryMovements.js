const express = require('express');
const { query } = require('express-validator');
const InventoryMovement = require('../models/InventoryMovement');
const InventoryService = require('../services/InventoryService');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/inventory-movements
// @desc    Get inventory movements with filters
// @access  Private
router.get('/', protect, [
  query('inventoryItemId').optional().isMongoId(),
  query('movementType').optional().isIn(['sale', 'purchase', 'adjustment', 'return', 'damage', 'transfer']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      inventoryItemId,
      movementType,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;
    
    const filters = {
      inventoryItemId,
      movementType,
      startDate,
      endDate,
      limit: parseInt(limit)
    };
    
    const movements = await InventoryService.getMovementHistory(req.user._id, filters);
    
    res.status(200).json({
      status: 'success',
      data: {
        movements,
        count: movements.length
      }
    });
    
  } catch (error) {
    console.error('Get inventory movements error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching inventory movements'
    });
  }
});

// @route   GET /api/inventory-movements/summary
// @desc    Get inventory movement summary
// @access  Private
router.get('/summary', protect, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const summary = await InventoryMovement.getMovementSummary(req.user._id, startDate, endDate);
    
    res.status(200).json({
      status: 'success',
      data: {
        summary
      }
    });
    
  } catch (error) {
    console.error('Get inventory movement summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching movement summary'
    });
  }
});

// @route   GET /api/inventory-movements/:id
// @desc    Get specific inventory movement
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const movement = await InventoryMovement.findOne({
      _id: req.params.id
    }).populate('inventoryItem', 'name sku category');
    
    if (!movement) {
      return res.status(404).json({
        status: 'error',
        message: 'Inventory movement not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        movement
      }
    });
    
  } catch (error) {
    console.error('Get inventory movement error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching inventory movement'
    });
  }
});

// @route   GET /api/inventory-movements/item/:itemId
// @desc    Get movements for specific inventory item
// @access  Private
router.get('/item/:itemId', protect, async (req, res) => {
  try {
    const movements = await InventoryMovement.getMovementsByItem(req.params.itemId, req.user._id);
    
    res.status(200).json({
      status: 'success',
      data: {
        movements,
        count: movements.length
      }
    });
    
  } catch (error) {
    console.error('Get item movements error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching item movements'
    });
  }
});

// @route   GET /api/inventory-movements/reference/:type/:id
// @desc    Get movements for specific reference (invoice, purchase order, etc.)
// @access  Private
router.get('/reference/:type/:id', protect, async (req, res) => {
  try {
    const { type, id } = req.params;
    
    const movements = await InventoryMovement.getMovementsByReference(type, id, req.user._id);
    
    res.status(200).json({
      status: 'success',
      data: {
        movements,
        count: movements.length
      }
    });
    
  } catch (error) {
    console.error('Get reference movements error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching reference movements'
    });
  }
});

module.exports = router;
