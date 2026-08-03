const express = require('express');
const { body, query } = require('express-validator');
const Proof = require('../models/Proof');
const Job = require('../models/Job');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const proofValidation = [
  body('jobId').isMongoId().withMessage('Valid job ID is required'),
  body('customerId').isMongoId().withMessage('Valid customer ID is required'),
  body('title').notEmpty().withMessage('Proof title is required').trim(),
  body('description').optional().trim(),
  body('files').isArray({ min: 1 }).withMessage('At least one file is required'),
  body('files.*.fileName').notEmpty().withMessage('File name is required'),
  body('files.*.fileUrl').notEmpty().withMessage('File URL is required'),
  body('files.*.fileType').notEmpty().withMessage('File type is required'),
  body('files.*.fileSize').isInt({ min: 1 }).withMessage('File size must be greater than 0')
];

// @route   GET /api/proofs
// @desc    Get all proofs for the authenticated user
// @access  Private
router.get('/', protect, [
  query('status').optional().isIn(['draft', 'sent', 'approved', 'rejected', 'revised', 'expired']),
  query('approvalStatus').optional().isIn(['pending', 'approved', 'rejected', 'expired']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const {
      status,
      approvalStatus,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (approvalStatus && approvalStatus !== 'all') {
      query['approval.status'] = approvalStatus;
    }
    
    if (search) {
      query.$or = [
        { proofNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const proofs = await Proof.find(query)
      .populate('jobId', 'title status customerId')
      .populate('customerId', 'name email phone')
      .populate('approval.approvedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalProofs = await Proof.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        proofs,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(totalProofs / limit),
          count: proofs.length,
          totalProofs
        }
      }
    });
    
  } catch (error) {
    console.error('Get proofs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching proofs'
    });
  }
});

// @route   GET /api/proofs/:id
// @desc    Get single proof
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const proof = await Proof.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('jobId', 'title status customerId')
      .populate('customerId', 'name email phone address')
      .populate('approval.approvedBy', 'name email')
      .populate('feedback.comments.commentedBy', 'name email');
    
    if (!proof) {
      return res.status(404).json({
        status: 'error',
        message: 'Proof not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        proof
      }
    });
    
  } catch (error) {
    console.error('Get proof error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching proof'
    });
  }
});

// @route   POST /api/proofs
// @desc    Create new proof
// @access  Private
router.post('/', protect, proofValidation, async (req, res) => {
  try {
    // Verify job exists
    const job = await Job.findOne({
      _id: req.body.jobId,
      userId: req.user._id
    });
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }
    
    // Verify customer exists
    const customer = await Customer.findOne({
      _id: req.body.customerId,
      userId: req.user._id
    });
    
    if (!customer) {
      return res.status(404).json({
        status: 'error',
        message: 'Customer not found'
      });
    }
    
    const proofData = {
      ...req.body,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      userId: req.user._id
    };
    
    const proof = await Proof.create(proofData);
    
    // Populate the created proof
    const populatedProof = await Proof.findById(proof._id)
      .populate('jobId', 'title status customerId')
      .populate('customerId', 'name email phone')
      .populate('approval.approvedBy', 'name email');
    
    res.status(201).json({
      status: 'success',
      message: 'Proof created successfully',
      data: {
        proof: populatedProof
      }
    });
    
  } catch (error) {
    console.error('Create proof error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while creating proof'
    });
  }
});

// @route   PUT /api/proofs/:id
// @desc    Update proof
// @access  Private
router.put('/:id', protect, proofValidation, async (req, res) => {
  try {
    const proof = await Proof.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    )
      .populate('jobId', 'title status customerId')
      .populate('customerId', 'name email phone')
      .populate('approval.approvedBy', 'name email');
    
    if (!proof) {
      return res.status(404).json({
        status: 'error',
        message: 'Proof not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Proof updated successfully',
      data: {
        proof
      }
    });
    
  } catch (error) {
    console.error('Update proof error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while updating proof'
    });
  }
});

// @route   DELETE /api/proofs/:id
// @desc    Delete proof
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const proof = await Proof.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!proof) {
      return res.status(404).json({
        status: 'error',
        message: 'Proof not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Proof deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete proof error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while deleting proof'
    });
  }
});

// @route   PUT /api/proofs/:id/approve
// @desc    Approve proof
// @access  Private
router.put('/:id/approve', protect, [
  body('approvalNotes').optional().trim()
], async (req, res) => {
  try {
    const { approvalNotes } = req.body;
    
    const proof = await Proof.findOneAndUpdate(
      { _id: req.params.id },
      {
        'approval.status': 'approved',
        'approval.approvedAt': new Date(),
        'approval.approvalNotes': approvalNotes,
        status: 'approved'
      },
      { new: true, runValidators: true }
    )
      .populate('jobId', 'title status customerId')
      .populate('customerId', 'name email phone')
      .populate('approval.approvedBy', 'name email');
    
    if (!proof) {
      return res.status(404).json({
        status: 'error',
        message: 'Proof not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Proof approved successfully',
      data: {
        proof
      }
    });
    
  } catch (error) {
    console.error('Approve proof error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while approving proof'
    });
  }
});

// @route   PUT /api/proofs/:id/reject
// @desc    Reject proof
// @access  Private
router.put('/:id/reject', protect, [
  body('rejectionReason').notEmpty().withMessage('Rejection reason is required').trim()
], async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    const proof = await Proof.findOneAndUpdate(
      { _id: req.params.id },
      {
        'approval.status': 'rejected',
        'approval.rejectedAt': new Date(),
        'approval.rejectionReason': rejectionReason,
        status: 'rejected'
      },
      { new: true, runValidators: true }
    )
      .populate('jobId', 'title status customerId')
      .populate('customerId', 'name email phone')
      .populate('approval.approvedBy', 'name email');
    
    if (!proof) {
      return res.status(404).json({
        status: 'error',
        message: 'Proof not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Proof rejected successfully',
      data: {
        proof
      }
    });
    
  } catch (error) {
    console.error('Reject proof error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while rejecting proof'
    });
  }
});

// @route   POST /api/proofs/:id/comments
// @desc    Add comment to proof
// @access  Private
router.post('/:id/comments', protect, [
  body('comment').notEmpty().withMessage('Comment is required').trim(),
  body('isInternal').optional().isBoolean()
], async (req, res) => {
  try {
    const { comment, isInternal = false } = req.body;
    
    const proof = await Proof.findOneAndUpdate(
      { _id: req.params.id },
      {
        $push: {
          'feedback.comments': {
            comment,
            commentedBy: req.user._id,
            commentedAt: new Date(),
            isInternal
          }
        }
      },
      { new: true, runValidators: true }
    )
      .populate('jobId', 'title status customerId')
      .populate('customerId', 'name email phone')
      .populate('approval.approvedBy', 'name email')
      .populate('feedback.comments.commentedBy', 'name email');
    
    if (!proof) {
      return res.status(404).json({
        status: 'error',
        message: 'Proof not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Comment added successfully',
      data: {
        proof
      }
    });
    
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while adding comment'
    });
  }
});

// @route   GET /api/proofs/stats/summary
// @desc    Get proof statistics
// @access  Private
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const stats = await Proof.getProofStats(req.user._id);
    
    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
    
  } catch (error) {
    console.error('Get proof stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error while fetching proof statistics'
    });
  }
});

module.exports = router;