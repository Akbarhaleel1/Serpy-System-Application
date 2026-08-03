const express = require('express');
const mongoose = require('mongoose');
const { body, query } = require('express-validator');
const PurchaseOrder = require('../models/PurchaseOrder');
const Inventory = require('../models/Inventory');
const Vendor = require('../models/Vendor');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const purchaseOrderValidation = [
  body('vendorId').notEmpty().withMessage('Vendor is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.inventoryId').notEmpty().withMessage('Inventory item is required'),
  body('items.*.quantity').isNumeric().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('items.*.unitCost').isNumeric().isFloat({ min: 0 }).withMessage('Unit cost must be a positive number'),
  body('expectedDelivery').optional().isISO8601().withMessage('Invalid date format'),
  body('notes').optional().isString().trim(),
  body('terms').optional().isString().trim()
];

// @route   GET /api/purchase-orders
// @desc    Get all purchase orders for the authenticated user
// @access  Private
router.get('/', protect, [
  query('status').optional().isIn(['draft', 'sent', 'acknowledged', 'partial', 'completed', 'cancelled']),
  query('vendorId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      status,
      vendorId,
      page = 1,
      limit = 20,
      search
    } = req.query;

    const userId = req.user._id;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { userId: new mongoose.Types.ObjectId(userId) };
    
    if (status) {
      filter.status = status;
    }
    
    if (vendorId) {
      filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    if (search) {
      filter.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const purchaseOrders = await PurchaseOrder.find(filter)
      .populate('vendorId', 'name contactPerson email phone')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PurchaseOrder.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        purchaseOrders,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: purchaseOrders.length,
          totalPOs: total
        }
      }
    });

  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching purchase orders'
    });
  }
});

// @route   GET /api/purchase-orders/:id
// @desc    Get single purchase order
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
    .populate('vendorId', 'name contactPerson email phone address')
    .populate('items.inventoryId', 'name category unitCost')
    .populate('createdBy', 'name email')
    .populate('approvedBy', 'name email');

    if (!purchaseOrder) {
      return res.status(404).json({
        status: 'error',
        message: 'Purchase order not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        purchaseOrder
      }
    });

  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching purchase order'
    });
  }
});

// @route   POST /api/purchase-orders
// @desc    Create new purchase order
// @access  Private
router.post('/', protect, purchaseOrderValidation, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      vendorId,
      expectedDelivery,
      notes,
      terms,
      items
    } = req.body;

    // Get vendor information
    const vendor = await Vendor.findOne({
      _id: vendorId,
      userId: userId
    });

    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    // Validate inventory items
    const inventoryIds = items.map(item => item.inventoryId);
    const inventoryItems = await Inventory.find({
      _id: { $in: inventoryIds },
      userId: userId
    });

    if (inventoryItems.length !== items.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Some inventory items not found'
      });
    }

    // Generate PO number
    const poNumber = await PurchaseOrder.generatePONumber(userId);

    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map(item => {
      const inventoryItem = inventoryItems.find(inv => inv._id.toString() === item.inventoryId);
      const totalCost = item.quantity * item.unitCost;
      subtotal += totalCost;

      return {
        inventoryId: item.inventoryId,
        itemName: inventoryItem.name,
        category: inventoryItem.category,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: totalCost,
        receivedQuantity: 0,
        pendingQuantity: item.quantity
      };
    });

    const taxAmount = 0; // Can be calculated based on GST rules
    const discountAmount = 0; // Can be applied if needed
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Create purchase order
    const purchaseOrder = new PurchaseOrder({
      userId,
      poNumber,
      vendorId,
      vendorName: vendor.name,
      status: 'draft',
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
      items: processedItems,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      notes,
      terms: terms || 'Net 30',
      createdBy: userId
    });

    await purchaseOrder.save();

    // Populate the response
    await purchaseOrder.populate([
      { path: 'vendorId', select: 'name contactPerson email phone' },
      { path: 'items.inventoryId', select: 'name category unitCost' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      status: 'success',
      message: 'Purchase order created successfully',
      data: {
        purchaseOrder
      }
    });

  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating purchase order'
    });
  }
});

// @route   PUT /api/purchase-orders/:id
// @desc    Update purchase order
// @access  Private
router.put('/:id', protect, purchaseOrderValidation, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      vendorId,
      expectedDelivery,
      notes,
      terms,
      items
    } = req.body;

    const purchaseOrder = await PurchaseOrder.findOne({
      _id: req.params.id,
      userId: userId
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        status: 'error',
        message: 'Purchase order not found'
      });
    }

    // Only allow updates for draft orders
    if (purchaseOrder.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: 'Only draft purchase orders can be updated'
      });
    }

    // Get vendor information
    const vendor = await Vendor.findOne({
      _id: vendorId,
      userId: userId
    });

    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    // Validate inventory items
    const inventoryIds = items.map(item => item.inventoryId);
    const inventoryItems = await Inventory.find({
      _id: { $in: inventoryIds },
      userId: userId
    });

    if (inventoryItems.length !== items.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Some inventory items not found'
      });
    }

    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map(item => {
      const inventoryItem = inventoryItems.find(inv => inv._id.toString() === item.inventoryId);
      const totalCost = item.quantity * item.unitCost;
      subtotal += totalCost;

      return {
        inventoryId: item.inventoryId,
        itemName: inventoryItem.name,
        category: inventoryItem.category,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: totalCost,
        receivedQuantity: 0,
        pendingQuantity: item.quantity
      };
    });

    const taxAmount = 0;
    const discountAmount = 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Update purchase order
    purchaseOrder.vendorId = vendorId;
    purchaseOrder.vendorName = vendor.name;
    purchaseOrder.expectedDelivery = expectedDelivery ? new Date(expectedDelivery) : undefined;
    purchaseOrder.items = processedItems;
    purchaseOrder.subtotal = subtotal;
    purchaseOrder.taxAmount = taxAmount;
    purchaseOrder.discountAmount = discountAmount;
    purchaseOrder.totalAmount = totalAmount;
    purchaseOrder.notes = notes;
    purchaseOrder.terms = terms || 'Net 30';

    await purchaseOrder.save();

    // Populate the response
    await purchaseOrder.populate([
      { path: 'vendorId', select: 'name contactPerson email phone' },
      { path: 'items.inventoryId', select: 'name category unitCost' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(200).json({
      status: 'success',
      message: 'Purchase order updated successfully',
      data: {
        purchaseOrder
      }
    });

  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating purchase order'
    });
  }
});

// @route   PATCH /api/purchase-orders/:id/status
// @desc    Update purchase order status
// @access  Private
router.patch('/:id/status', protect, [
  body('status').isIn(['draft', 'sent', 'acknowledged', 'partial', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('notes').optional().isString().trim()
], async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, notes } = req.body;

    const purchaseOrder = await PurchaseOrder.findOne({
      _id: req.params.id,
      userId: userId
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        status: 'error',
        message: 'Purchase order not found'
      });
    }

    const oldStatus = purchaseOrder.status;
    purchaseOrder.status = status;

    // Set timestamps based on status
    switch (status) {
      case 'sent':
        purchaseOrder.sentAt = new Date();
        break;
      case 'acknowledged':
        purchaseOrder.acknowledgedAt = new Date();
        break;
      case 'completed':
        purchaseOrder.completedAt = new Date();
        break;
    }

    if (notes) {
      purchaseOrder.notes = notes;
    }

    await purchaseOrder.save();

    res.status(200).json({
      status: 'success',
      message: `Purchase order status updated from ${oldStatus} to ${status}`,
      data: {
        purchaseOrder
      }
    });

  } catch (error) {
    console.error('Update purchase order status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating purchase order status'
    });
  }
});

// @route   DELETE /api/purchase-orders/:id
// @desc    Delete purchase order
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const purchaseOrder = await PurchaseOrder.findOne({
      _id: req.params.id,
      userId: userId
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        status: 'error',
        message: 'Purchase order not found'
      });
    }

    // Only allow deletion of draft orders
    if (purchaseOrder.status !== 'draft') {
      return res.status(400).json({
        status: 'error',
        message: 'Only draft purchase orders can be deleted'
      });
    }

    await PurchaseOrder.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Purchase order deleted successfully'
    });

  } catch (error) {
    console.error('Delete purchase order error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting purchase order'
    });
  }
});

// @route   GET /api/purchase-orders/stats/summary
// @desc    Get purchase order statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await PurchaseOrder.getPurchaseOrderStats(userId);

    res.status(200).json({
      status: 'success',
      data: {
        stats: stats[0] || {
          totalPOs: 0,
          totalAmount: 0,
          draftPOs: 0,
          sentPOs: 0,
          completedPOs: 0,
          pendingAmount: 0
        }
      }
    });

  } catch (error) {
    console.error('Get purchase order stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching purchase order statistics'
    });
  }
});

// @route   GET /api/purchase-orders/vendor/:vendorId/summary
// @desc    Get vendor purchase summary
// @access  Private
router.get('/vendor/:vendorId/summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { vendorId } = req.params;

    const summary = await PurchaseOrder.getVendorPurchaseSummary(userId, vendorId);

    res.status(200).json({
      status: 'success',
      data: {
        summary: summary[0] || {
          totalPOs: 0,
          totalAmount: 0,
          completedPOs: 0,
          pendingAmount: 0
        }
      }
    });

  } catch (error) {
    console.error('Get vendor purchase summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching vendor purchase summary'
    });
  }
});

module.exports = router;
