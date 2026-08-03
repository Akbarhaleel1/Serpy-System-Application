const express = require('express');
const { body, query, validationResult } = require('express-validator');
const PurchaseBill = require('../models/PurchaseBill');
const Vendor = require('../models/Vendor');
const Settings = require('../models/Settings');
const PDFService = require('../services/PDFService');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Build company info block for the PDF header (mirrors invoices.js getCompanyInfo)
async function getCompanyInfo(userId) {
  const settings = await Settings.getOrCreateSettings(userId);

  if (!settings.companyName || settings.companyName === 'My Company') {
    return {
      isConfigured: false,
      error: 'Company details not configured. Please go to Settings > Company to add your company information before generating bills.'
    };
  }

  const addressParts = [];
  if (settings.companyAddress) {
    if (settings.companyAddress.street) addressParts.push(settings.companyAddress.street);
    if (settings.companyAddress.city) addressParts.push(settings.companyAddress.city);
    if (settings.companyAddress.state) addressParts.push(settings.companyAddress.state);
    if (settings.companyAddress.zipCode) addressParts.push(settings.companyAddress.zipCode);
  }

  const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : '';

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
    paymentQRCode: settings.paymentQRCode || ''
  };
}

// Validation rules
const billValidation = [
  body('vendorId').notEmpty().withMessage('Vendor is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.description').notEmpty().withMessage('Item description is required'),
  body('items.*.rate').isFloat({ min: 0 }).withMessage('Rate must be a positive number'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0')
];

// @route   GET /api/purchase-bills
// @desc    List purchase bills for the authenticated user
// @access  Private
router.get('/', protect, [
  query('paymentStatus').optional().isIn(['all', 'pending', 'partial', 'paid']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      paymentStatus,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const queryObj = { userId: req.user._id };

    if (paymentStatus && paymentStatus !== 'all') {
      queryObj.paymentStatus = paymentStatus;
    }

    if (search) {
      queryObj.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } },
        { vendorInvoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const bills = await PurchaseBill.find(queryObj)
      .populate('vendorId', 'name email phone gstNumber')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalBills = await PurchaseBill.countDocuments(queryObj);

    res.status(200).json({
      status: 'success',
      data: {
        bills,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalBills / limit),
          count: bills.length,
          totalBills
        }
      }
    });
  } catch (error) {
    console.error('Get purchase bills error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching purchase bills'
    });
  }
});

// @route   GET /api/purchase-bills/stats/summary
// @desc    Purchase bill statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const result = await PurchaseBill.getPurchaseBillStats(req.user._id);
    const stats = result[0] || {
      totalBills: 0,
      totalAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0
    };

    res.status(200).json({
      status: 'success',
      data: { stats }
    });
  } catch (error) {
    console.error('Get purchase bill stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching purchase bill statistics'
    });
  }
});

// @route   GET /api/purchase-bills/:id
// @desc    Get a single purchase bill
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const bill = await PurchaseBill.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('vendorId', 'name email phone gstNumber');

    if (!bill) {
      return res.status(404).json({ status: 'error', message: 'Purchase bill not found' });
    }

    res.status(200).json({ status: 'success', data: { bill } });
  } catch (error) {
    console.error('Get purchase bill error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching purchase bill'
    });
  }
});

// @route   POST /api/purchase-bills
// @desc    Create a purchase bill
// @access  Private
router.post('/', protect, billValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array().map(err => ({ field: err.path || err.param, message: err.msg }))
      });
    }

    // Snapshot vendor details
    const vendor = await Vendor.findOne({ _id: req.body.vendorId, userId: req.user._id });
    if (!vendor) {
      return res.status(404).json({ status: 'error', message: 'Vendor not found' });
    }

    const billNumber = await PurchaseBill.generateBillNumber(req.user._id);

    const bill = await PurchaseBill.create({
      ...req.body,
      billNumber,
      vendorName: vendor.name,
      vendorGstNumber: req.body.vendorGstNumber || vendor.gstNumber || '',
      vendorAddress: req.body.vendorAddress || vendor.fullAddress || '',
      vendorState: req.body.vendorState || vendor.address?.state || '',
      userId: req.user._id
    });

    const populated = await PurchaseBill.findById(bill._id)
      .populate('vendorId', 'name email phone gstNumber');

    res.status(201).json({
      status: 'success',
      message: 'Purchase bill created successfully',
      data: { bill: populated }
    });
  } catch (error) {
    console.error('Create purchase bill error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ status: 'error', message: 'Duplicate bill number. Please try again.' });
    }
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating purchase bill',
      error: error.message
    });
  }
});

// @route   PUT /api/purchase-bills/:id
// @desc    Update a purchase bill
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const bill = await PurchaseBill.findOne({ _id: req.params.id, userId: req.user._id });
    if (!bill) {
      return res.status(404).json({ status: 'error', message: 'Purchase bill not found' });
    }

    const updatable = [
      'vendorInvoiceNumber', 'billDate', 'dueDate', 'items', 'isInterState',
      'paidAmount', 'notes', 'status'
    ];
    updatable.forEach((field) => {
      if (req.body[field] !== undefined) bill[field] = req.body[field];
    });

    // Re-snapshot vendor if changed
    if (req.body.vendorId && req.body.vendorId !== String(bill.vendorId)) {
      const vendor = await Vendor.findOne({ _id: req.body.vendorId, userId: req.user._id });
      if (!vendor) {
        return res.status(404).json({ status: 'error', message: 'Vendor not found' });
      }
      bill.vendorId = vendor._id;
      bill.vendorName = vendor.name;
      bill.vendorGstNumber = req.body.vendorGstNumber || vendor.gstNumber || '';
      bill.vendorAddress = req.body.vendorAddress || vendor.fullAddress || '';
      bill.vendorState = req.body.vendorState || vendor.address?.state || '';
    } else {
      if (req.body.vendorGstNumber !== undefined) bill.vendorGstNumber = req.body.vendorGstNumber;
      if (req.body.vendorAddress !== undefined) bill.vendorAddress = req.body.vendorAddress;
      if (req.body.vendorState !== undefined) bill.vendorState = req.body.vendorState;
    }

    await bill.save();

    const populated = await PurchaseBill.findById(bill._id)
      .populate('vendorId', 'name email phone gstNumber');

    res.status(200).json({
      status: 'success',
      message: 'Purchase bill updated successfully',
      data: { bill: populated }
    });
  } catch (error) {
    console.error('Update purchase bill error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating purchase bill',
      error: error.message
    });
  }
});

// @route   DELETE /api/purchase-bills/:id
// @desc    Delete a purchase bill
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const bill = await PurchaseBill.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!bill) {
      return res.status(404).json({ status: 'error', message: 'Purchase bill not found' });
    }
    res.status(200).json({ status: 'success', message: 'Purchase bill deleted successfully' });
  } catch (error) {
    console.error('Delete purchase bill error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting purchase bill'
    });
  }
});

// @route   GET /api/purchase-bills/:id/pdf
// @desc    Generate and download purchase bill PDF
// @access  Private
router.get('/:id/pdf', protect, async (req, res) => {
  try {
    const bill = await PurchaseBill.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('vendorId', 'name email phone gstNumber');

    if (!bill) {
      return res.status(404).json({ status: 'error', message: 'Purchase bill not found' });
    }

    const companyInfoResult = await getCompanyInfo(req.user._id);
    if (!companyInfoResult.isConfigured) {
      return res.status(400).json({
        status: 'error',
        message: companyInfoResult.error,
        code: 'COMPANY_NOT_CONFIGURED'
      });
    }

    const pdfBuffer = await PDFService.generatePurchaseBillPDFFromHTML(bill, companyInfoResult);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return res.status(500).json({ status: 'error', message: 'Failed to generate PDF - empty buffer' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PurchaseBill_${bill.billNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Purchase bill PDF generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate PDF: ' + error.message
    });
  }
});

module.exports = router;
