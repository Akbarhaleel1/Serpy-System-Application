const express = require('express');
const { body, query } = require('express-validator');
const SacCode = require('../models/SacCode');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const sacValidation = [
  body('sacCode').notEmpty().withMessage('SAC Code is required').trim(),
  body('description').notEmpty().withMessage('Description is required').trim(),
  body('gstRate').isFloat({ min: 0, max: 100 }).withMessage('GST Rate must be between 0 and 100'),
  body('category').notEmpty().withMessage('Category is required').trim()
];

// @route   GET /api/sac-codes
// @desc    Get all SAC codes for the authenticated user
// @access  Private
router.get('/', protect, [
  query('search').optional().trim(),
  query('category').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      search,
      category,
      page = 1,
      limit = 20,
      sortBy = 'sacCode',
      sortOrder = 'asc'
    } = req.query;

    // Build query - filter by dataScope or userId for data isolation
    const query = req.user.dataScope
      ? { dataScope: req.user.dataScope, isActive: true }
      : { userId: req.user._id, isActive: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { sacCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { subCategory: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const sacCodes = await SacCode.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalSacCodes = await SacCode.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        sacCodes,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalSacCodes / limit),
          count: sacCodes.length,
          totalSacCodes
        }
      }
    });

  } catch (error) {
    console.error('Get SAC codes error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching SAC codes'
    });
  }
});

// @route   GET /api/sac-codes/:id
// @desc    Get single SAC code
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    // Build query - filter by dataScope or userId for data isolation
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const sacCode = await SacCode.findOne(findQuery);

    if (!sacCode) {
      return res.status(404).json({
        status: 'error',
        message: 'SAC Code not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        sacCode
      }
    });

  } catch (error) {
    console.error('Get SAC code error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching SAC code'
    });
  }
});

// @route   POST /api/sac-codes
// @desc    Create new SAC code
// @access  Private
router.post('/', protect, sacValidation, async (req, res) => {
  try {
    // Check if SAC code already exists in user's dataScope
    const existingQuery = req.user.dataScope
      ? { sacCode: req.body.sacCode.toUpperCase(), dataScope: req.user.dataScope }
      : { sacCode: req.body.sacCode.toUpperCase(), userId: req.user._id };

    const existingSacCode = await SacCode.findOne(existingQuery);

    if (existingSacCode) {
      return res.status(400).json({
        status: 'error',
        message: 'SAC Code already exists'
      });
    }

    const sacCodeData = {
      ...req.body,
      userId: req.user._id
    };

    // Add dataScope if user has it (post-migration), otherwise skip
    if (req.user.dataScope) {
      sacCodeData.dataScope = req.user.dataScope;
    }

    const sacCode = await SacCode.create(sacCodeData);

    res.status(201).json({
      status: 'success',
      message: 'SAC Code created successfully',
      data: {
        sacCode
      }
    });

  } catch (error) {
    console.error('Create SAC code error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'SAC Code already exists'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Server error while creating SAC code'
    });
  }
});

// @route   PUT /api/sac-codes/:id
// @desc    Update SAC code
// @access  Private
router.put('/:id', protect, sacValidation, async (req, res) => {
  try {
    // Build query - filter by dataScope or userId for data isolation
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    // Check if SAC code exists and belongs to user
    const existingSacCode = await SacCode.findOne(findQuery);

    if (!existingSacCode) {
      return res.status(404).json({
        status: 'error',
        message: 'SAC Code not found'
      });
    }

    // Check for SAC code conflicts within same dataScope
    if (req.body.sacCode && req.body.sacCode.toUpperCase() !== existingSacCode.sacCode) {
      const conflictQuery = req.user.dataScope
        ? { sacCode: req.body.sacCode.toUpperCase(), dataScope: req.user.dataScope, _id: { $ne: req.params.id } }
        : { sacCode: req.body.sacCode.toUpperCase(), userId: req.user._id, _id: { $ne: req.params.id } };

      const sacConflict = await SacCode.findOne(conflictQuery);

      if (sacConflict) {
        return res.status(400).json({
          status: 'error',
          message: 'SAC Code already exists'
        });
      }
    }

    // Update SAC code
    const sacCode = await SacCode.findOneAndUpdate(
      findQuery,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'SAC Code updated successfully',
      data: {
        sacCode
      }
    });

  } catch (error) {
    console.error('Update SAC code error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'SAC Code already exists'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Server error while updating SAC code'
    });
  }
});

// @route   DELETE /api/sac-codes/:id
// @desc    Delete SAC code (soft delete)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    // Build query - filter by dataScope or userId for data isolation
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const sacCode = await SacCode.findOne(findQuery);

    if (!sacCode) {
      return res.status(404).json({
        status: 'error',
        message: 'SAC Code not found'
      });
    }

    // Soft delete - change status to inactive
    sacCode.isActive = false;
    await sacCode.save();

    res.status(200).json({
      status: 'success',
      message: 'SAC Code deleted successfully'
    });

  } catch (error) {
    console.error('Delete SAC code error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting SAC code'
    });
  }
});

// @route   GET /api/sac-codes/categories/list
// @desc    Get all unique categories for user's dataScope
// @access  Private
router.get('/categories/list', protect, async (req, res) => {
  try {
    // Build query - filter by dataScope or userId for data isolation
    const query = req.user.dataScope
      ? { dataScope: req.user.dataScope, isActive: true }
      : { userId: req.user._id, isActive: true };

    const categories = await SacCode.distinct('category', query);

    res.status(200).json({
      status: 'success',
      data: {
        categories: categories.sort()
      }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching categories'
    });
  }
});

// @route   GET /api/sac-codes/gst-rates/summary
// @desc    Get GST rates summary for user's dataScope
// @access  Private
router.get('/gst-rates/summary', protect, async (req, res) => {
  try {
    const summary = await SacCode.getGstRatesSummary(req.user._id, req.user.dataScope);

    res.status(200).json({
      status: 'success',
      data: {
        gstRatesSummary: summary
      }
    });

  } catch (error) {
    console.error('Get GST rates summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching GST rates summary'
    });
  }
});

// @route   POST /api/sac-codes/bulk-import
// @desc    Bulk import SAC codes from CSV
// @access  Private
router.post('/bulk-import', protect, async (req, res) => {
  try {
    const { sacCodes } = req.body;

    if (!Array.isArray(sacCodes) || sacCodes.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid SAC codes data'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const sacData of sacCodes) {
      try {
        // Check if SAC code already exists in user's dataScope
        const existingQuery = req.user.dataScope
          ? { sacCode: sacData.sacCode?.toUpperCase(), dataScope: req.user.dataScope }
          : { sacCode: sacData.sacCode?.toUpperCase(), userId: req.user._id };

        const existingSacCode = await SacCode.findOne(existingQuery);

        if (existingSacCode) {
          results.failed++;
          results.errors.push({
            sacCode: sacData.sacCode,
            error: 'SAC Code already exists'
          });
          continue;
        }

        // Create SAC code
        const createData = {
          ...sacData,
          userId: req.user._id
        };

        // Add dataScope if user has it (post-migration), otherwise skip
        if (req.user.dataScope) {
          createData.dataScope = req.user.dataScope;
        }

        await SacCode.create(createData);

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          sacCode: sacData.sacCode,
          error: error.message
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Bulk import completed. ${results.success} successful, ${results.failed} failed`,
      data: {
        results
      }
    });

  } catch (error) {
    console.error('Bulk import SAC codes error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while bulk importing SAC codes'
    });
  }
});

module.exports = router;
