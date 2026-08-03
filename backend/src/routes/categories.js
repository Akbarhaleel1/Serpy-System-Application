const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');

// Middleware to authenticate all routes
router.use(protect);

// GET all categories for the current user
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ userId: req.user.id, isActive: true })
      .sort({ name: 1 });

    res.json({
      success: true,
      categories,
      total: categories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

// GET single category by ID
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
});

// POST create new category
router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Check if category with same name already exists
    const existingCategory = await Category.findOne({
      userId: req.user.id,
      name: { $regex: `^${name}$`, $options: 'i' }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const category = new Category({
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#3B82F6',
      icon: icon || 'Package',
      userId: req.user.id
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
});

// PUT update category
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color, icon, isActive } = req.body;

    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if new name already exists (exclude current category)
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        userId: req.user.id,
        name: { $regex: `^${name}$`, $options: 'i' },
        _id: { $ne: req.params.id }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description?.trim() || '';
    if (color) category.color = color;
    if (icon) category.icon = icon;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
});

// DELETE category
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
});

// PATCH soft delete (deactivate) category
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id
      },
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deactivated successfully',
      category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deactivating category',
      error: error.message
    });
  }
});

module.exports = router;
