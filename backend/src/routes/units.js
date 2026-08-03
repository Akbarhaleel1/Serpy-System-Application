const express = require('express');
const router = express.Router();
const Unit = require('../models/Unit');
const { protect } = require('../middleware/auth');

// Middleware to authenticate all routes
router.use(protect);

// GET all units for the current user
router.get('/', async (req, res) => {
  try {
    const units = await Unit.find({ userId: req.user.id, isActive: true })
      .sort({ name: 1 });

    res.json({
      success: true,
      units,
      total: units.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching units',
      error: error.message
    });
  }
});

// GET units by type
router.get('/type/:type', async (req, res) => {
  try {
    const units = await Unit.find({
      userId: req.user.id,
      type: req.params.type,
      isActive: true
    }).sort({ name: 1 });

    res.json({
      success: true,
      units,
      total: units.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching units by type',
      error: error.message
    });
  }
});

// GET single unit by ID
router.get('/:id', async (req, res) => {
  try {
    const unit = await Unit.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    res.json({
      success: true,
      unit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching unit',
      error: error.message
    });
  }
});

// POST create new unit
router.post('/', async (req, res) => {
  try {
    const { name, abbreviation, description, type } = req.body;

    if (!name || !abbreviation) {
      return res.status(400).json({
        success: false,
        message: 'Unit name and abbreviation are required'
      });
    }

    // Check if unit with same name already exists
    const existingUnit = await Unit.findOne({
      userId: req.user.id,
      name: { $regex: `^${name}$`, $options: 'i' }
    });

    if (existingUnit) {
      return res.status(400).json({
        success: false,
        message: 'Unit with this name already exists'
      });
    }

    // Check if abbreviation already exists
    const existingAbbr = await Unit.findOne({
      userId: req.user.id,
      abbreviation: abbreviation.toUpperCase()
    });

    if (existingAbbr) {
      return res.status(400).json({
        success: false,
        message: 'Unit with this abbreviation already exists'
      });
    }

    const unit = new Unit({
      name: name.trim(),
      abbreviation: abbreviation.trim().toUpperCase(),
      description: description?.trim() || '',
      type: type || 'custom',
      userId: req.user.id
    });

    await unit.save();

    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      unit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating unit',
      error: error.message
    });
  }
});

// PUT update unit
router.put('/:id', async (req, res) => {
  try {
    const { name, abbreviation, description, type, isActive } = req.body;

    const unit = await Unit.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    // Check if new name already exists
    if (name && name !== unit.name) {
      const existingUnit = await Unit.findOne({
        userId: req.user.id,
        name: { $regex: `^${name}$`, $options: 'i' },
        _id: { $ne: req.params.id }
      });

      if (existingUnit) {
        return res.status(400).json({
          success: false,
          message: 'Unit with this name already exists'
        });
      }
    }

    // Check if new abbreviation already exists
    if (abbreviation && abbreviation.toUpperCase() !== unit.abbreviation) {
      const existingAbbr = await Unit.findOne({
        userId: req.user.id,
        abbreviation: abbreviation.toUpperCase(),
        _id: { $ne: req.params.id }
      });

      if (existingAbbr) {
        return res.status(400).json({
          success: false,
          message: 'Unit with this abbreviation already exists'
        });
      }
    }

    if (name) unit.name = name.trim();
    if (abbreviation) unit.abbreviation = abbreviation.trim().toUpperCase();
    if (description !== undefined) unit.description = description?.trim() || '';
    if (type) unit.type = type;
    if (isActive !== undefined) unit.isActive = isActive;

    await unit.save();

    res.json({
      success: true,
      message: 'Unit updated successfully',
      unit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating unit',
      error: error.message
    });
  }
});

// DELETE unit
router.delete('/:id', async (req, res) => {
  try {
    const unit = await Unit.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    res.json({
      success: true,
      message: 'Unit deleted successfully',
      unit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting unit',
      error: error.message
    });
  }
});

// PATCH soft delete (deactivate) unit
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const unit = await Unit.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id
      },
      { isActive: false },
      { new: true }
    );

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    res.json({
      success: true,
      message: 'Unit deactivated successfully',
      unit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deactivating unit',
      error: error.message
    });
  }
});

module.exports = router;
