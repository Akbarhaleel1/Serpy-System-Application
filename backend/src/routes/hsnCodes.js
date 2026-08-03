const express = require('express');
const { body, query } = require('express-validator');
const HsnCode = require('../models/HsnCode');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const hsnValidation = [
  body('hsnCode').notEmpty().withMessage('HSN Code is required').trim(),
  body('description').notEmpty().withMessage('Description is required').trim(),
  body('gstRate').isFloat({ min: 0, max: 100 }).withMessage('GST Rate must be between 0 and 100'),
  body('type').optional().isIn(['product', 'service', 'both']),
  body('category').notEmpty().withMessage('Category is required').trim()
];

// @route   GET /api/hsn-codes
// @desc    Get all HSN codes for the authenticated user
// @access  Private
router.get('/', protect, [
  query('search').optional().trim(),
  query('category').optional().trim(),
  query('type').optional().isIn(['product', 'service', 'both']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      search,
      category,
      type,
      page = 1,
      limit = 20,
      sortBy = 'hsnCode',
      sortOrder = 'asc'
    } = req.query;

    // Build query - filter by dataScope or userId for data isolation
    const query = req.user.dataScope
      ? { dataScope: req.user.dataScope, isActive: true }
      : { userId: req.user._id, isActive: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { hsnCode: { $regex: search, $options: 'i' } },
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
    const hsnCodes = await HsnCode.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalHsnCodes = await HsnCode.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        hsnCodes,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalHsnCodes / limit),
          count: hsnCodes.length,
          totalHsnCodes
        }
      }
    });
    
  } catch (error) {
    console.error('Get HSN codes error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching HSN codes'
    });
  }
});

// @route   GET /api/hsn-codes/:id
// @desc    Get single HSN code
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    // Build query - filter by dataScope or userId for data isolation
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const hsnCode = await HsnCode.findOne(findQuery);
    
    if (!hsnCode) {
      return res.status(404).json({
        status: 'error',
        message: 'HSN Code not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        hsnCode
      }
    });
    
  } catch (error) {
    console.error('Get HSN code error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching HSN code'
    });
  }
});

// @route   POST /api/hsn-codes
// @desc    Create new HSN code
// @access  Private
router.post('/', protect, hsnValidation, async (req, res) => {
  try {
    // Check if HSN code already exists in user's dataScope
    const existingQuery = req.user.dataScope
      ? { hsnCode: req.body.hsnCode.toUpperCase(), dataScope: req.user.dataScope }
      : { hsnCode: req.body.hsnCode.toUpperCase(), userId: req.user._id };

    const existingHsnCode = await HsnCode.findOne(existingQuery);

    if (existingHsnCode) {
      return res.status(400).json({
        status: 'error',
        message: 'HSN Code already exists'
      });
    }

    const hsnCodeData = {
      ...req.body,
      userId: req.user._id
    };

    // Add dataScope if user has it (post-migration), otherwise skip
    if (req.user.dataScope) {
      hsnCodeData.dataScope = req.user.dataScope;
    }

    const hsnCode = await HsnCode.create(hsnCodeData);
    
    res.status(201).json({
      status: 'success',
      message: 'HSN Code created successfully',
      data: {
        hsnCode
      }
    });
    
  } catch (error) {
    console.error('Create HSN code error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating HSN code'
    });
  }
});

// @route   PUT /api/hsn-codes/:id
// @desc    Update HSN code
// @access  Private
router.put('/:id', protect, hsnValidation, async (req, res) => {
  try {
    // Build query - filter by dataScope or userId for data isolation
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    // Check if HSN code exists and belongs to user
    const existingHsnCode = await HsnCode.findOne(findQuery);

    if (!existingHsnCode) {
      return res.status(404).json({
        status: 'error',
        message: 'HSN Code not found'
      });
    }

    // Check for HSN code conflicts within same dataScope
    if (req.body.hsnCode && req.body.hsnCode.toUpperCase() !== existingHsnCode.hsnCode) {
      const conflictQuery = req.user.dataScope
        ? { hsnCode: req.body.hsnCode.toUpperCase(), dataScope: req.user.dataScope, _id: { $ne: req.params.id } }
        : { hsnCode: req.body.hsnCode.toUpperCase(), userId: req.user._id, _id: { $ne: req.params.id } };

      const hsnConflict = await HsnCode.findOne(conflictQuery);

      if (hsnConflict) {
        return res.status(400).json({
          status: 'error',
          message: 'HSN Code already exists'
        });
      }
    }

    // Update HSN code
    const hsnCode = await HsnCode.findOneAndUpdate(
      findQuery,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'HSN Code updated successfully',
      data: {
        hsnCode
      }
    });
    
  } catch (error) {
    console.error('Update HSN code error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating HSN code'
    });
  }
});

// @route   DELETE /api/hsn-codes/:id
// @desc    Delete HSN code (soft delete)
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    // Build query - filter by dataScope or userId for data isolation
    const findQuery = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const hsnCode = await HsnCode.findOne(findQuery);

    if (!hsnCode) {
      return res.status(404).json({
        status: 'error',
        message: 'HSN Code not found'
      });
    }

    // Soft delete - change status to inactive
    hsnCode.isActive = false;
    await hsnCode.save();
    
    res.status(200).json({
      status: 'success',
      message: 'HSN Code deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete HSN code error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting HSN code'
    });
  }
});

// @route   GET /api/hsn-codes/categories/list
// @desc    Get all unique categories for user's dataScope
// @access  Private
router.get('/categories/list', protect, async (req, res) => {
  try {
    // Build query - filter by dataScope or userId for data isolation
    const query = req.user.dataScope
      ? { dataScope: req.user.dataScope, isActive: true }
      : { userId: req.user._id, isActive: true };

    const categories = await HsnCode.distinct('category', query);

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

// @route   GET /api/hsn-codes/gst-rates/summary
// @desc    Get GST rates summary for user's dataScope
// @access  Private
router.get('/gst-rates/summary', protect, async (req, res) => {
  try {
    const summary = await HsnCode.getGstRatesSummary(req.user._id, req.user.dataScope);

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

// @route   POST /api/hsn-codes/bulk-import
// @desc    Bulk import HSN codes from CSV
// @access  Private
router.post('/bulk-import', protect, async (req, res) => {
  try {
    const { hsnCodes } = req.body;

    if (!Array.isArray(hsnCodes) || hsnCodes.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid HSN codes data'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const hsnData of hsnCodes) {
      try {
        // Check if HSN code already exists in user's dataScope
        const existingQuery = req.user.dataScope
          ? { hsnCode: hsnData.hsnCode?.toUpperCase(), dataScope: req.user.dataScope }
          : { hsnCode: hsnData.hsnCode?.toUpperCase(), userId: req.user._id };

        const existingHsnCode = await HsnCode.findOne(existingQuery);

        if (existingHsnCode) {
          results.failed++;
          results.errors.push({
            hsnCode: hsnData.hsnCode,
            error: 'HSN Code already exists'
          });
          continue;
        }

        // Create HSN code
        const createData = {
          ...hsnData,
          userId: req.user._id
        };

        // Add dataScope if user has it (post-migration), otherwise skip
        if (req.user.dataScope) {
          createData.dataScope = req.user.dataScope;
        }

        await HsnCode.create(createData);

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          hsnCode: hsnData.hsnCode,
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
    console.error('Bulk import HSN codes error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while bulk importing HSN codes'
    });
  }
});

module.exports = router;
