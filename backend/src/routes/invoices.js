const express = require('express');
const { body, query } = require('express-validator');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Job = require('../models/Job');
const HsnCode = require('../models/HsnCode');
const Settings = require('../models/Settings');
const PDFService = require('../services/PDFService');
const InventoryService = require('../services/InventoryService');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Helper function to get company info from settings with validation
async function getCompanyInfo(userId) {
  const settings = await Settings.getOrCreateSettings(userId);
  
  // Check if company name is configured
  if (!settings.companyName || settings.companyName === 'My Company') {
    return {
      isConfigured: false,
      error: 'Company details not configured. Please go to Settings > Company to add your company information before generating invoices.'
    };
  }
  
  // Format address
  const addressParts = [];
  if (settings.companyAddress) {
    if (settings.companyAddress.street) addressParts.push(settings.companyAddress.street);
    if (settings.companyAddress.city) addressParts.push(settings.companyAddress.city);
    if (settings.companyAddress.state) addressParts.push(settings.companyAddress.state);
    if (settings.companyAddress.zipCode) addressParts.push(settings.companyAddress.zipCode);
  }
  
  const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : '';

  // Multi-line address block for invoice/quotation header (SynX style)
  const addr = settings.companyAddress || {};
  const addressLines = [];
  if (addr.street) addressLines.push(addr.street);
  if (addr.city) addressLines.push(addr.city + (addr.zipCode ? ' - ' + addr.zipCode : ''));
  else if (addr.zipCode) addressLines.push(addr.zipCode);
  const stateCountry = [addr.state, addr.country].filter(Boolean).join(', ').toUpperCase();
  if (stateCountry) addressLines.push(stateCountry);

  return {
    isConfigured: true,
    name: settings.companyName,
    address: formattedAddress,
    addressLines,
    logo: settings.companyLogo || '',
    currency: settings.currency || 'INR',
    phone: settings.companyPhone || '',
    email: settings.companyEmail || '',
    gstNumber: settings.gstNumber || '',
    panNumber: settings.panNumber || '',
    stateName: settings.companyAddress?.state || '',
    country: settings.companyAddress?.country || '',
    paymentQRCode: settings.paymentQRCode || '',
    // Bank details
    bankName: settings.bankName || '',
    accountNumber: settings.accountNumber || '',
    accountName: settings.companyName || '',
    ifscCode: settings.ifscCode || '',
    branchName: settings.branchName || '',
    upiId: settings.upiId || ''
  };
}

// Validation rules
const invoiceValidation = [
  body('customerId').notEmpty().withMessage('Customer ID is required'),
  body('dueDate').notEmpty().withMessage('Due date is required').isISO8601().withMessage('Due date must be a valid date'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.itemName').notEmpty().withMessage('Item name is required'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price cannot be negative')
];

// @route   GET /api/invoices
// @desc    Get all invoices for the authenticated user
// @access  Private
router.get('/', protect, [
  query('status').optional().isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded']),
  query('paymentStatus').optional().custom(value => {
    const statuses = value.split(',');
    const valid = ['pending', 'partial', 'paid', 'overdue'];
    return statuses.every(s => valid.includes(s));
  }),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('noGst').optional().isBoolean()
], async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      search,
      page = 1,
      limit = 10,
      sortBy = 'invoiceDate',
      sortOrder = 'desc',
      noGst
    } = req.query;

    // Build query - filter by dataScope or userId (fallback for migration)
    const queryConditions = [];

    // Add dataScope filter
    if (req.user.dataScope) {
      queryConditions.push({ dataScope: req.user.dataScope });
    } else {
      queryConditions.push({ userId: req.user._id });
    }

    // Apply noGst filter if specified
    // NOTE: Existing invoices may not have noGst field set (undefined)
    // When noGst=false, we want to show invoices that either have noGst: false OR don't have noGst field at all
    if (noGst !== undefined && noGst !== null) {
      const noGstValue = noGst === 'true' || noGst === true;
      if (noGstValue) {
        // Looking for invoices explicitly marked as no-GST
        queryConditions.push({ noGst: true });
      } else {
        // Looking for invoices with GST (noGst is false or not set)
        // Use $ne (not equal) to match both false and undefined
        queryConditions.push({ noGst: { $ne: true } });
      }
    }

    if (status && status !== 'all') {
      queryConditions.push({ status: status });
    }

    if (paymentStatus && paymentStatus !== 'all') {
      const statuses = paymentStatus.split(',');
      if (statuses.length > 1) {
        queryConditions.push({ paymentStatus: { $in: statuses } });
      } else {
        queryConditions.push({ paymentStatus: paymentStatus });
      }
    }

    // Build final query
    let query = {};
    if (queryConditions.length === 1) {
      query = queryConditions[0];
    } else if (queryConditions.length > 1) {
      query = { $and: queryConditions };
    }

    // Add search filter with proper $and combination
    if (search) {
      const searchCondition = {
        $or: [
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { jobTitle: { $regex: search, $options: 'i' } }
        ]
      };

      if (Object.keys(query).length > 0) {
        // Combine existing query with search using $and
        query = { $and: [query, searchCondition] };
      } else {
        query = searchCondition;
      }
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const invoices = await Invoice.find(query)
      .populate('customerId', 'name email phone gstNumber')
      .populate('jobId', 'title status')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalInvoices = await Invoice.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        invoices,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalInvoices / limit),
          count: invoices.length,
          totalInvoices
        }
      }
    });
    
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching invoices'
    });
  }
});

// @route   GET /api/invoices/:id
// @desc    Get single invoice
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const invoice = await Invoice.findOne(findQuery)
      .populate('customerId', 'name email phone gstNumber address')
      .populate('jobId', 'title status description');
    
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        invoice
      }
    });
    
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching invoice'
    });
  }
});

// @route   POST /api/invoices
// @desc    Create new invoice
// @access  Private
router.post('/', protect, invoiceValidation, async (req, res) => {
  try {
    // Set default due date if not provided (30 days from invoice date)
    if (!req.body.dueDate || req.body.dueDate === '') {
      const invoiceDate = new Date(req.body.invoiceDate);
      const defaultDueDate = new Date(invoiceDate);
      defaultDueDate.setDate(defaultDueDate.getDate() + 30);
      req.body.dueDate = defaultDueDate.toISOString().split('T')[0];
    }

    // First, check stock availability for all items
    const stockCheck = await InventoryService.checkStockAvailability(req.body.items, req.user._id);
    console.log('stockCheck',stockCheck)
    if (!stockCheck.available) {
      return res.status(400).json({
        status: 'error',
        message: 'Insufficient stock for invoice items',
        details: stockCheck.errors,
        stockCheck: stockCheck.items
      });
    }
    
    // Generate invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber(req.user._id, req.user.dataScope);
    console.log('invoiceNumber',invoiceNumber)

    // Extract customer ID from object or string
    let customerId = req.body.customerId;
    if (typeof customerId === 'object' && customerId._id) {
      customerId = customerId._id;
    } else if (typeof customerId === 'object' && customerId.id) {
      customerId = customerId.id;
    }

    // Build customer query with dataScope or userId
    const customerQuery = req.user.dataScope
      ? { _id: customerId, dataScope: req.user.dataScope }
      : { _id: customerId, userId: req.user._id };

    // Get customer details
    const customer = await Customer.findOne(customerQuery);
    console.log('customer11111',customer)
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }
    
    // Process invoice items and calculate totals (No GST)
    const processedItems = [];
    let subtotal = 0;
    console.log('1')
    for (const item of req.body.items) {
      // Skip design charge items - they are processed separately
      if (item.isDesignCharge) {
        continue;
      }

      // Calculate total amount based on itemType
      // For Square Feet items: use totalSquareFeet × unitPrice
      // For Numbers items: use quantity × unitPrice
      const itemQuantity = (item.itemType === 'Square Feet')
        ? (item.totalSquareFeet || 0)
        : (item.quantity || 0);

      const totalAmount = itemQuantity * item.unitPrice;
          console.log('4')

      const processedItem = {
        ...item,
        itemQuantity,  // Store the actual quantity used for calculation
        totalAmount,
        gstRate: 0,
        gstAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        itemTotal: totalAmount
      };

      processedItems.push(processedItem);
      subtotal += totalAmount;
    }
        console.log('6')

    // Process design charge if provided (No GST)
    let designChargeSubtotal = 0;
    let designChargeTotal = 0;

    if (req.body.designCharge && req.body.designCharge.amount) {
      designChargeSubtotal = req.body.designCharge.amount || 0;
      designChargeTotal = designChargeSubtotal;

      // Add design charge to processed items for consistency
      processedItems.push({
        itemName: 'Design Charge',
        description: req.body.designCharge.description || 'Design Charge',
        quantity: 1,
        unitPrice: designChargeSubtotal,
        hsnCode: '9983',
        hsnDescription: 'Service - Design & Consultation',
        gstRate: 0,
        totalAmount: designChargeSubtotal,
        gstAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        itemTotal: designChargeTotal,
        isDesignCharge: true
      });
    }

    // Calculate totals including design charge (No GST)
    const discountAmount = req.body.discountAmount || 0;
    const grandSubtotal = subtotal + designChargeSubtotal;
    const totalAmount = grandSubtotal - discountAmount;
        console.log('7')

    const invoiceData = {
      ...req.body,
      invoiceNumber,
      customerName: customer.name,
      customerGstNumber: customer.gstNumber,
      customerAddress: customer.address,
      items: processedItems,
      subtotal: grandSubtotal,
      taxableAmount: totalAmount,
      totalGstAmount: 0,
      totalAmount,
      noGst: true, // Mark as No GST invoice
      userId: req.user._id
    };

    // Add dataScope if available
    if (req.user.dataScope) {
      invoiceData.dataScope = req.user.dataScope;
    }
    console.log('invoiceData',invoiceData)
    const invoice = await Invoice.create(invoiceData);
        console.log('8')

    // Deduct inventory for all items
    try {
      const inventoryResult = await InventoryService.deductInventoryForInvoice(
        req.body.items,
        invoice._id,
        invoiceNumber,
        req.user._id
      );
          console.log('9')

      if (!inventoryResult.success) {
        // If inventory deduction fails, we should ideally rollback the invoice
        // For now, we'll log the error and continue
        console.error('Inventory deduction failed:', inventoryResult.errors);
        
        // You might want to delete the invoice here or mark it as failed
        // await Invoice.findByIdAndDelete(invoice._id);
      }
    } catch (inventoryError) {
      console.error('Error during inventory deduction:', inventoryError);
      // Log the error but don't fail the invoice creation
      // In a production system, you might want to implement proper rollback
    }
        console.log('10')

    // Populate the created invoice
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customerId', 'name email phone gstNumber')
      .populate('jobId', 'title status');
        console.log('11')

    res.status(201).json({
      status: 'success',
      message: 'Invoice created successfully',
      data: {
        invoice: populatedInvoice
      }
    });
        console.log('12')

  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating invoice'
    });
  }
});

// @route   PUT /api/invoices/:id
// @desc    Update invoice
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    // Check if invoice exists and belongs to user's dataScope
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const existingInvoice = await Invoice.findOne(findQuery);

    if (!existingInvoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    // Allow updates even for paid or cancelled invoices from the edit dialog
    // Comment out the status check to allow full editing
    // if (existingInvoice.status === 'paid' || existingInvoice.status === 'cancelled') {
    //   return res.status(400).json({
    //     status: 'error',
    //     message: 'Cannot update paid or cancelled invoice'
    //   });
    // }

    // Accept the calculated values directly from frontend
    // The frontend already does all the calculations, so we just update with the provided data
    const updateData = {
      ...req.body,
      // Ensure calculated fields are included
      items: req.body.items,
      subtotal: req.body.subtotal,
      taxableAmount: req.body.taxableAmount,
      totalGstAmount: req.body.totalGstAmount,
      totalAmount: req.body.totalAmount,
      balanceDue: req.body.balanceDue
    };

    // Strip fields that must not be overwritten / are virtuals
    delete updateData._id;
    delete updateData.userId;
    delete updateData.dataScope;
    delete updateData.invoiceNumber;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.balanceDue; // virtual alias of balanceAmount, not a real path

    // ObjectId fields cannot be cast from empty strings — drop/normalize them
    if (!updateData.customerId) {
      // keep the existing customer rather than clearing a required reference
      delete updateData.customerId;
    }
    if (!updateData.jobId) {
      // empty string -> unset the optional job reference
      updateData.jobId = null;
    }

    // Update invoice with the data from frontend (which has already calculated everything)
    const invoice = await Invoice.findOneAndUpdate(
      findQuery,
      updateData,
      { new: true, runValidators: false } // Disable validators to allow direct updates
    ).populate('customerId', 'name email phone gstNumber')
     .populate('jobId', 'title status');

    res.status(200).json({
      status: 'success',
      message: 'Invoice updated successfully',
      data: {
        invoice
      }
    });
    
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating invoice',
      error: error.message
    });
  }
});

// @route   DELETE /api/invoices/:id
// @desc    Delete invoice (soft delete)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const invoice = await Invoice.findOne(findQuery);
    
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }
    
    // Delete the invoice completely
    await Invoice.deleteOne({ _id: req.params.id });
    
    res.status(200).json({
      status: 'success',
      message: 'Invoice deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting invoice'
    });
  }
});

// @route   GET /api/invoices/stats/summary
// @desc    Get invoice statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const stats = await Invoice.getInvoiceStats(req.user._id, req.user.dataScope);
    
    res.status(200).json({
      status: 'success',
      data: {
        stats: stats[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          avgInvoiceValue: 0
        }
      }
    });
    
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching invoice statistics'
    });
  }
});

// @route   PATCH /api/invoices/:id/cancel
// @desc    Cancel invoice and restore inventory
// @access  Private
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const invoice = await Invoice.findOne(findQuery);
    
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }
    
    if (invoice.status === 'cancelled') {
      return res.status(400).json({
        status: 'error',
        message: 'Invoice is already cancelled'
      });
    }
    
    // Update invoice status
    invoice.status = 'cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancellationReason = req.body.reason || 'Invoice cancelled';
    await invoice.save();
    
    // Restore inventory
    try {
      const restoreResult = await InventoryService.restoreInventoryForCancelledInvoice(
        invoice._id,
        req.user._id
      );
      
      res.status(200).json({
        status: 'success',
        message: 'Invoice cancelled and inventory restored successfully',
        data: {
          invoice,
          inventoryRestored: restoreResult.success
        }
      });
      
    } catch (inventoryError) {
      console.error('Error restoring inventory:', inventoryError);
      
      res.status(200).json({
        status: 'success',
        message: 'Invoice cancelled but inventory restoration failed',
        data: {
          invoice,
          inventoryRestored: false,
          warning: 'Please manually restore inventory items'
        }
      });
    }
    
  } catch (error) {
    console.error('Cancel invoice error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while cancelling invoice'
    });
  }
});

// @route   PATCH /api/invoices/:id/payment-status
// @desc    Update invoice payment status
// @access  Private
router.patch('/:id/payment-status', protect, [
  body('paymentStatus').isIn(['pending', 'partial', 'paid', 'overdue']).withMessage('Invalid payment status'),
  body('amountPaid').optional().isFloat({ min: 0 }).withMessage('Amount paid must be greater than or equal to 0')
], async (req, res) => {
  try {
    const { paymentStatus, amountPaid } = req.body;

    // Build query - support both dataScope and userId for backward compatibility
    const query = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const invoice = await Invoice.findOne(query);

    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    console.log('💰 Payment status update:', { paymentStatus, amountPaid, currentPaidAmount: invoice.paidAmount });

    // Validate amount paid
    if (amountPaid !== undefined) {
      if (amountPaid < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Amount paid cannot be negative. Please enter a valid amount.',
          code: 'NEGATIVE_AMOUNT'
        });
      }

      if (amountPaid > invoice.totalAmount) {
        const excessAmount = amountPaid - invoice.totalAmount;
        return res.status(400).json({
          status: 'error',
          message: `Amount paid (₹${amountPaid.toLocaleString()}) exceeds invoice total (₹${invoice.totalAmount.toLocaleString()}) by ₹${excessAmount.toLocaleString()}. Please enter an amount less than or equal to ₹${invoice.totalAmount.toLocaleString()}.`,
          code: 'AMOUNT_EXCEEDS_TOTAL',
          details: {
            amountPaid,
            invoiceTotal: invoice.totalAmount,
            excessAmount
          }
        });
      }

      invoice.paidAmount = amountPaid;
      invoice.balanceAmount = invoice.totalAmount - amountPaid;
      console.log('💰 Updated amounts:', { paidAmount: invoice.paidAmount, balanceAmount: invoice.balanceAmount });
    }

    // Update payment status
    invoice.paymentStatus = paymentStatus;

    // Auto-update invoice status based on payment status
    if (paymentStatus === 'paid') {
      invoice.status = 'paid';
    } else if (paymentStatus === 'partial') {
      if (invoice.status !== 'paid') {
        invoice.status = 'sent';
      }
    }

    await invoice.save();
    console.log('✅ Invoice saved successfully');

    // Populate and return updated invoice
    const updatedInvoice = await Invoice.findById(req.params.id)
      .populate('customerId', 'name email phone gstNumber')
      .populate('jobId', 'title status');

    res.status(200).json({
      status: 'success',
      message: 'Invoice payment status updated successfully',
      data: {
        invoice: updatedInvoice
      }
    });

  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating payment status'
    });
  }
});

// @route   PATCH /api/invoices/:id/no-gst
// @desc    Toggle noGst flag on an invoice
// @access  Private
router.patch('/:id/no-gst', protect, [
  body('noGst').isBoolean().withMessage('noGst must be a boolean value')
], async (req, res) => {
  try {
    const { noGst } = req.body;

    // Build query - support both dataScope and userId for backward compatibility
    const query = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const invoice = await Invoice.findOne(query);

    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    invoice.noGst = noGst;
    await invoice.save();

    // Populate and return updated invoice
    const updatedInvoice = await Invoice.findById(req.params.id)
      .populate('customerId', 'name email phone gstNumber')
      .populate('jobId', 'title status');

    res.status(200).json({
      status: 'success',
      message: `Invoice ${noGst ? 'marked as' : 'unmarked from'} No GST`,
      data: {
        invoice: updatedInvoice
      }
    });
  } catch (error) {
    console.error('Update noGst error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating noGst flag'
    });
  }
});

// @route   GET /api/invoices/:id/movements
// @desc    Get inventory movements for an invoice
// @access  Private
router.get('/:id/movements', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }
    
    const movements = await InventoryService.getMovementHistory(req.user._id, {
      referenceType: 'invoice',
      referenceId: req.params.id
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        movements
      }
    });
    
  } catch (error) {
    console.error('Get invoice movements error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching invoice movements'
    });
  }
});

// @route   GET /api/invoices/:id/pdf
// @desc    Generate and download invoice PDF
// @access  Private
router.get('/:id/pdf', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const invoiceId = req.params.id;

    console.log('📄 PDF request for invoice:', invoiceId, 'by user:', userId);

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      userId: userId
    })
    .populate('customerId', 'name email phone address gstNumber')
    .populate('jobId', 'title');

    if (!invoice) {
      console.log('⚠️  Invoice not found:', invoiceId);
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    console.log('✅ Invoice found:', invoice.invoiceNumber);

    // Get company information from settings
    const companyInfoResult = await getCompanyInfo(req.user._id);
    
    if (!companyInfoResult.isConfigured) {
      return res.status(400).json({
        status: 'error',
        message: companyInfoResult.error,
        code: 'COMPANY_NOT_CONFIGURED'
      });
    }

    console.log('🔄 Generating PDF from HTML template...');
    const pdfBuffer = await PDFService.generateInvoicePDFFromHTML(invoice, companyInfoResult);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error('❌ PDF buffer is empty');
      return res.status(500).json({
        status: 'error',
        message: 'Failed to generate PDF - empty buffer'
      });
    }

    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    console.log('✅ PDF sent to client for invoice:', invoice.invoiceNumber);

  } catch (error) {
    console.error('❌ PDF generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate PDF: ' + error.message
    });
  }
});

// @route   POST /api/invoices/:id/send-email
// @desc    Send invoice via email
// @access  Private
router.post('/:id/send-email', protect, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('message').optional().isString().trim()
], async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { email, message } = req.body;

    // Build query - filter by dataScope or userId (fallback for migration)
    const query = { _id: invoiceId };
    if (req.user.dataScope) {
      query.dataScope = req.user.dataScope;
    } else {
      query.userId = req.user._id;
    }

    const invoice = await Invoice.findOne(query)
      .populate('customerId', 'name email phone address gstNumber')
      .populate('jobId', 'title');

    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    // Get company information from settings
    const companyInfoResult = await getCompanyInfo(req.user._id);
    
    if (!companyInfoResult.isConfigured) {
      return res.status(400).json({
        status: 'error',
        message: companyInfoResult.error,
        code: 'COMPANY_NOT_CONFIGURED'
      });
    }

    // Generate PDF using HTML template
    console.log('📧 Generating PDF for email...');
    const pdfBuffer = await PDFService.generateInvoicePDFFromHTML(invoice, companyInfoResult);

    // Send email with custom message
    console.log('📧 Preparing to send invoice email...');
    const invoiceName = `Invoice_${invoice.invoiceNumber}`;
    await PDFService.sendInvoiceEmail(pdfBuffer, email, invoiceName, message);

    res.status(200).json({
      status: 'success',
      message: `Invoice ${invoice.invoiceNumber} sent successfully to ${email}`,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        recipientEmail: email,
        sentAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Email sending error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to send invoice email'
    });
  }
});

// @route   POST /api/invoices/:id/send-whatsapp
// @desc    Send invoice via WhatsApp
// @access  Private
router.post('/:id/send-whatsapp', protect, [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('message').optional().isString().trim()
], async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { phone, message } = req.body;

    // Build query - filter by dataScope or userId (fallback for migration)
    const query = { _id: invoiceId };
    if (req.user.dataScope) {
      query.dataScope = req.user.dataScope;
    } else {
      query.userId = req.user._id;
    }

    const invoice = await Invoice.findOne(query)
      .populate('customerId', 'name email phone address gstNumber')
      .populate('jobId', 'title');

    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    // Get company information from settings
    const companyInfoResult = await getCompanyInfo(req.user._id);
    
    if (!companyInfoResult.isConfigured) {
      return res.status(400).json({
        status: 'error',
        message: companyInfoResult.error,
        code: 'COMPANY_NOT_CONFIGURED'
      });
    }

    // Generate PDF
    console.log('📱 Generating PDF for WhatsApp...');
    const pdfBuffer = await PDFService.generateInvoicePDFFromHTML(invoice, companyInfoResult);

    // Save PDF to temporary public folder
    const fs = require('fs');
    const path = require('path');
    const publicDir = path.join(__dirname, '../../public/temp');

    // Create directory if it doesn't exist
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const fileName = `Invoice_${invoice.invoiceNumber}_${Date.now()}.pdf`;
    const filePath = path.join(publicDir, fileName);

    // Save the PDF
    fs.writeFileSync(filePath, pdfBuffer);
    console.log('📱 PDF saved to:', filePath);

    // Create public URL for the PDF
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const pdfUrl = `${baseUrl}/temp/${fileName}`;

    // Create WhatsApp message with PDF link
    const whatsappMessage = message
      ? `${message}\n\nDownload Invoice: ${pdfUrl}`
      : `Invoice ${invoice.invoiceNumber} - Amount: ₹${invoice.totalAmount.toFixed(2)}\n\nDownload PDF: ${pdfUrl}`;

    const encodedMessage = encodeURIComponent(whatsappMessage);
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    console.log('📱 WhatsApp URL generated:', whatsappUrl);

    // Schedule file deletion after 1 hour
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('📱 Temporary PDF deleted:', fileName);
        }
      } catch (err) {
        console.error('Error deleting temporary PDF:', err);
      }
    }, 60 * 60 * 1000); // 1 hour

    res.status(200).json({
      status: 'success',
      message: `Invoice ${invoice.invoiceNumber} prepared for WhatsApp`,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        recipientPhone: phone,
        whatsappUrl: whatsappUrl,
        pdfUrl: pdfUrl,
        sentAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ WhatsApp sending error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to send invoice via WhatsApp'
    });
  }
});

// @route   GET /api/invoices/:id/print-data
// @desc    Get invoice data formatted for printing
// @access  Private
router.get('/:id/print-data', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const invoiceId = req.params.id;

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      userId: userId
    })
    .populate('customerId', 'name email phone address gstNumber')
    .populate('jobId', 'title');

    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    // Get company information from settings
    const companyInfoResult = await getCompanyInfo(req.user._id);
    
    if (!companyInfoResult.isConfigured) {
      return res.status(400).json({
        status: 'error',
        message: companyInfoResult.error,
        code: 'COMPANY_NOT_CONFIGURED'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        invoice,
        companyInfo: companyInfoResult
      }
    });

  } catch (error) {
    console.error('Print data error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get print data'
    });
  }
});

// @route   DELETE /api/invoices/clear-duplicate
// @desc    Clear duplicate invoice (temporary fix)
// @access  Private
router.delete('/clear-duplicate', protect, async (req, res) => {
  try {
    const result = await Invoice.deleteOne({ invoiceNumber: 'INV-202603-0001' });
    res.status(200).json({
      status: 'success',
      message: `Deleted ${result.deletedCount} duplicate invoice(s)`
    });
  } catch (error) {
    console.error('Clear duplicate error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while clearing duplicate'
    });
  }
});

module.exports = router;
