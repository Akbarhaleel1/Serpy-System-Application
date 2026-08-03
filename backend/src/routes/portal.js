const express = require('express');
const { body, query } = require('express-validator');
const PortalSession = require('../models/PortalSession');
const CustomerFile = require('../models/CustomerFile');
const Customer = require('../models/Customer');
const Job = require('../models/Job');
const Invoice = require('../models/Invoice');
const Delivery = require('../models/Delivery');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/customer-files';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, documents, and archives are allowed.'));
    }
  }
});

// Middleware to validate portal session
const validatePortalSession = async (req, res, next) => {
  try {
    const sessionId = req.headers['x-portal-session'] || req.query.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({
        status: 'error',
        message: 'Portal session required'
      });
    }

    const session = await PortalSession.validateSession(sessionId);
    
    if (!session) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired portal session'
      });
    }

    req.portalSession = session;
    next();
  } catch (error) {
    console.error('Portal session validation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while validating portal session'
    });
  }
};

// @route   POST /api/portal/login
// @desc    Customer portal login
// @access  Public
router.post('/login', [
  body('phone').notEmpty().withMessage('Phone number is required').trim(),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const { phone, email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Find customer by phone (and optionally email)
    let customer;
    if (email) {
      customer = await Customer.findOne({
        $or: [
          { phone: phone },
          { email: email }
        ],
        status: 'active'
      });
    } else {
      customer = await Customer.findOne({
        phone: phone,
        status: 'active'
      });
    }

    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found or inactive'
      });
    }

    // Create portal session
    const session = await PortalSession.createSession(
      customer._id,
      {
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      },
      customer.userId,
      ipAddress,
      userAgent
    );

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        sessionId: session.sessionId,
        customer: {
          id: customer._id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone
        }
      }
    });

  } catch (error) {
    console.error('Portal login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during portal login'
    });
  }
});

// @route   POST /api/portal/logout
// @desc    Customer portal logout
// @access  Private (Portal)
router.post('/logout', validatePortalSession, async (req, res) => {
  try {
    req.portalSession.isActive = false;
    await req.portalSession.save();

    res.status(200).json({
      status: 'success',
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Portal logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during portal logout'
    });
  }
});

// @route   GET /api/portal/customer-data
// @desc    Get customer data for portal
// @access  Private (Portal)
router.get('/customer-data', validatePortalSession, async (req, res) => {
  try {
    const customer = await Customer.findById(req.portalSession.customerId)
      .select('name email phone address gstNumber status createdAt');

    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { customer }
    });

  } catch (error) {
    console.error('Get customer data error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching customer data'
    });
  }
});

// @route   GET /api/portal/orders
// @desc    Get customer orders/jobs
// @access  Private (Portal)
router.get('/orders', validatePortalSession, [
  query('status').optional().isIn(['inquiry', 'quotation_sent', 'quotation_approved', 'design_in_progress', 'design_approved', 'production_ready', 'ready_for_print', 'quality_check', 'completed', 'delivered', 'cancelled']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { 
      customerId: req.portalSession.customerId,
      userId: req.portalSession.userId
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const jobs = await Job.find(query)
      .select('title description status priority estimatedCost finalCost createdAt updatedAt')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalJobs = await Job.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        jobs,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalJobs / limit),
          count: jobs.length,
          totalJobs
        }
      }
    });

  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching customer orders'
    });
  }
});

// @route   GET /api/portal/invoices
// @desc    Get customer invoices
// @access  Private (Portal)
router.get('/invoices', validatePortalSession, [
  query('status').optional().isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { 
      'customerId._id': req.portalSession.customerId,
      userId: req.portalSession.userId
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const invoices = await Invoice.find(query)
      .select('invoiceNumber invoiceDate dueDate totalAmount amountPaid balanceDue status paymentStatus')
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
    console.error('Get customer invoices error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching customer invoices'
    });
  }
});

// @route   GET /api/portal/deliveries
// @desc    Get customer deliveries
// @access  Private (Portal)
router.get('/deliveries', validatePortalSession, [
  query('status').optional().isIn(['scheduled', 'in_transit', 'delivered', 'failed', 'cancelled']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { 
      customerId: req.portalSession.customerId,
      userId: req.portalSession.userId
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const deliveries = await Delivery.find(query)
      .populate('jobId', 'title status')
      .select('jobId deliveryAddress scheduledDate status trackingNumber notes')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalDeliveries = await Delivery.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        deliveries,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalDeliveries / limit),
          count: deliveries.length,
          totalDeliveries
        }
      }
    });

  } catch (error) {
    console.error('Get customer deliveries error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching customer deliveries'
    });
  }
});

// @route   POST /api/portal/upload-file
// @desc    Upload file to customer portal
// @access  Private (Portal)
router.post('/upload-file', validatePortalSession, upload.single('file'), [
  body('category').optional().isIn(['design', 'proof', 'final', 'reference', 'other']),
  body('description').optional().trim(),
  body('jobId').optional().isMongoId()
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const { category = 'other', description, jobId } = req.body;

    // Validate job if provided
    if (jobId) {
      const job = await Job.findOne({ _id: jobId, customerId: req.portalSession.customerId });
      if (!job) {
        return res.status(404).json({
          status: 'error',
          message: 'Job not found'
        });
      }
    }

    const customerFile = await CustomerFile.create({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: `/uploads/customer-files/${req.file.filename}`,
      fileType: path.extname(req.file.originalname).toLowerCase(),
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      category,
      description,
      customerId: req.portalSession.customerId,
      jobId,
      uploadedBy: 'customer',
      userId: req.portalSession.userId
    });

    res.status(201).json({
      status: 'success',
      message: 'File uploaded successfully',
      data: { file: customerFile }
    });

  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while uploading file'
    });
  }
});

// @route   GET /api/portal/files
// @desc    Get customer files
// @access  Private (Portal)
router.get('/files', validatePortalSession, [
  query('category').optional().isIn(['design', 'proof', 'final', 'reference', 'other']),
  query('jobId').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const {
      category,
      jobId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { 
      customerId: req.portalSession.customerId,
      userId: req.portalSession.userId
    };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (jobId) {
      query.jobId = jobId;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const files = await CustomerFile.find(query)
      .populate('jobId', 'title status')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalFiles = await CustomerFile.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        files,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalFiles / limit),
          count: files.length,
          totalFiles
        }
      }
    });

  } catch (error) {
    console.error('Get customer files error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching customer files'
    });
  }
});

// @route   GET /api/portal/files/:id/download
// @desc    Download customer file
// @access  Private (Portal)
router.get('/files/:id/download', validatePortalSession, async (req, res) => {
  try {
    const file = await CustomerFile.findOne({
      _id: req.params.id,
      customerId: req.portalSession.customerId,
      userId: req.portalSession.userId
    });

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }

    // Update download count and last downloaded
    file.downloadCount += 1;
    file.lastDownloaded = new Date();
    await file.save();

    const filePath = path.join(process.cwd(), file.fileUrl);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found on server'
      });
    }

    res.download(filePath, file.originalName);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while downloading file'
    });
  }
});

// @route   GET /api/portal/stats/summary
// @desc    Get customer portal statistics
// @access  Private (Portal)
router.get('/stats/summary', validatePortalSession, async (req, res) => {
  try {
    const customerId = req.portalSession.customerId;
    const userId = req.portalSession.userId;

    const [
      totalJobs,
      activeJobs,
      completedJobs,
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalDeliveries,
      deliveredDeliveries,
      totalFiles,
      recentFiles
    ] = await Promise.all([
      Job.countDocuments({ customerId, userId }),
      Job.countDocuments({ customerId, userId, status: { $in: ['in_progress', 'production_ready', 'quality_check'] } }),
      Job.countDocuments({ customerId, userId, status: 'completed' }),
      Invoice.countDocuments({ 'customerId._id': customerId, userId }),
      Invoice.countDocuments({ 'customerId._id': customerId, userId, paymentStatus: 'paid' }),
      Invoice.countDocuments({ 'customerId._id': customerId, userId, paymentStatus: 'pending' }),
      Delivery.countDocuments({ customerId, userId }),
      Delivery.countDocuments({ customerId, userId, status: 'delivered' }),
      CustomerFile.countDocuments({ customerId, userId }),
      CustomerFile.find({ customerId, userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('jobId', 'title')
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalJobs,
          activeJobs,
          completedJobs,
          totalInvoices,
          paidInvoices,
          pendingInvoices,
          totalDeliveries,
          deliveredDeliveries,
          totalFiles,
          recentFiles
        }
      }
    });

  } catch (error) {
    console.error('Get portal stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching portal statistics'
    });
  }
});

module.exports = router;
