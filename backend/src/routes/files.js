const express = require('express');
const { body, query } = require('express-validator');
const File = require('../models/File');
const ActivityLog = require('../models/ActivityLog');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/files';
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
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|mp4|mp3|wav|avi|mov|psd|ai|eps|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only common file types are allowed.'));
    }
  }
});

// @route   GET /api/files
// @desc    Get all files for the authenticated user
// @access  Private
router.get('/', protect, [
  query('category').optional().isIn(['document', 'image', 'design', 'proof', 'final', 'reference', 'invoice', 'contract', 'other']),
  query('entityType').optional().isIn(['customer', 'job', 'invoice', 'payment', 'inventory', 'vendor', 'staff', 'task', 'delivery', 'emergency_order', 'walk_in_job', 'proof', 'time_entry', 'event', 'discount_rule', 'customer_pricing', 'hsn_code', 'account_transaction', 'cheque', 'cost', 'user', 'system']),
  query('entityId').optional().isMongoId(),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      category,
      entityType,
      entityId,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query - show all company files
    const query = { status: { $ne: 'deleted' } };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (entityType && entityId) {
      query['relatedEntity.type'] = entityType;
      query['relatedEntity.id'] = entityId;
    }

    if (search) {
      query.$or = [
        { fileName: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const files = await File.find(query)
      .populate('uploadedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalFiles = await File.countDocuments(query);

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
    console.error('Get files error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching files'
    });
  }
});

// @route   GET /api/files/:id
// @desc    Get single file
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id })
      .populate('uploadedBy', 'name email');

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }

    // Update access time
    await file.updateAccessTime();

    res.status(200).json({
      status: 'success',
      data: { file }
    });

  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching file'
    });
  }
});

// @route   POST /api/files/upload
// @desc    Upload file
// @access  Private
router.post('/upload', protect, upload.single('file'), [
  body('category').optional().isIn(['document', 'image', 'design', 'proof', 'final', 'reference', 'invoice', 'contract', 'other']),
  body('description').optional().trim(),
  body('entityType').optional().isIn(['customer', 'job', 'invoice', 'payment', 'inventory', 'vendor', 'staff', 'task', 'delivery', 'emergency_order', 'walk_in_job', 'proof', 'time_entry', 'event', 'discount_rule', 'customer_pricing', 'hsn_code', 'account_transaction', 'cheque', 'cost', 'user', 'system']),
  body('entityId').optional().isMongoId(),
  body('entityName').optional().trim(),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean(),
  body('accessLevel').optional().isIn(['private', 'internal', 'public'])
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const {
      category = 'other',
      description,
      entityType,
      entityId,
      entityName,
      tags = [],
      isPublic = false,
      accessLevel = 'private'
    } = req.body;

    const file = await File.create({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: `/uploads/files/${req.file.filename}`,
      fileType: path.extname(req.file.originalname).toLowerCase(),
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      category,
      description,
      relatedEntity: entityType && entityId ? {
        type: entityType,
        id: entityId,
        name: entityName
      } : undefined,
      tags,
      isPublic,
      accessLevel,
      uploadedBy: req.user._id,
      uploadedByName: req.user.fullName,
      userId: req.user._id
    });

    // Log activity
    await ActivityLog.logActivity({
      action: 'File Uploaded',
      description: `File ${req.file.originalname} uploaded`,
      entityType: 'system',
      entityId: file._id,
      entityName: req.file.originalname,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'upload',
      metadata: {
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        category
      },
      
      severity: 'low',
      userId: req.user._id,
    });

    res.status(201).json({
      status: 'success',
      message: 'File uploaded successfully',
      data: { file }
    });

  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while uploading file'
    });
  }
});

// @route   PUT /api/files/:id
// @desc    Update file metadata
// @access  Private
router.put('/:id', protect, [
  body('description').optional().trim(),
  body('category').optional().isIn(['document', 'image', 'design', 'proof', 'final', 'reference', 'invoice', 'contract', 'other']),
  body('tags').optional().isArray(),
  body('isPublic').optional().isBoolean(),
  body('accessLevel').optional().isIn(['private', 'internal', 'public'])
], async (req, res) => {
  try {
    const { description, category, tags, isPublic, accessLevel } = req.body;

    const file = await File.findOneAndUpdate(
      { _id: req.params.id },
      { description, category, tags, isPublic, accessLevel },
      { new: true, runValidators: true }
    )
      .populate('uploadedBy', 'name email');

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }

    // Log activity
    await ActivityLog.logActivity({
      action: 'File Updated',
      description: `File ${file.originalName} metadata updated`,
      entityType: 'system',
      entityId: file._id,
      entityName: file.originalName,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'update',
      
      severity: 'low',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'File updated successfully',
      data: { file }
    });

  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating file'
    });
  }
});

// @route   GET /api/files/:id/download
// @desc    Download file
// @access  Private
router.get('/:id/download', protect, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id });

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }

    // Check if file is expired
    if (file.isExpired) {
      return res.status(410).json({
        status: 'error',
        message: 'File has expired'
      });
    }

    // Increment download count
    await file.incrementDownloadCount();

    const filePath = path.join(process.cwd(), file.fileUrl);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found on server'
      });
    }

    // Log activity
    await ActivityLog.logActivity({
      action: 'File Downloaded',
      description: `File ${file.originalName} downloaded`,
      entityType: 'system',
      entityId: file._id,
      entityName: file.originalName,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'download',
      
      severity: 'low',
      userId: req.user._id,
    });

    res.download(filePath, file.originalName);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while downloading file'
    });
  }
});

// @route   DELETE /api/files/:fileId
// @desc    Delete file
// @access  Private
router.delete('/:fileId', protect, async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.fileId });

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }

    // Soft delete - mark as deleted instead of removing from database
    file.status = 'deleted';
    await file.save();

    // Optionally delete physical file
    const filePath = path.join(process.cwd(), file.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Log activity
    await ActivityLog.logActivity({
      action: 'File Deleted',
      description: `File ${file.originalName} deleted`,
      entityType: 'system',
      entityId: file._id,
      entityName: file.originalName,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      actionType: 'delete',
      
      severity: 'medium',
      userId: req.user._id,
    });

    res.status(200).json({
      status: 'success',
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting file'
    });
  }
});

// @route   GET /api/files/stats/summary
// @desc    Get file statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const stats = await File.getFileStats(req.user._id);

    res.status(200).json({
      status: 'success',
      data: { stats }
    });

  } catch (error) {
    console.error('Get file stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching file statistics'
    });
  }
});

module.exports = router;