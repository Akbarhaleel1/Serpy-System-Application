const mongoose = require('mongoose');

const customerFileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: [true, 'File name is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original file name is required'],
    trim: true
  },
  fileUrl: {
    type: String,
    required: [true, 'File URL is required'],
    trim: true
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    trim: true
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: 0
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['design', 'proof', 'final', 'reference', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    trim: true
  },
  // Related entities
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  uploadedBy: {
    type: String,
    enum: ['customer', 'staff'],
    default: 'customer'
  },
  uploadedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloaded: {
    type: Date
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
customerFileSchema.index({ customerId: 1, createdAt: -1 });
customerFileSchema.index({ jobId: 1 });
customerFileSchema.index({ userId: 1 });
customerFileSchema.index({ category: 1 });
customerFileSchema.index({ uploadedBy: 1 });

// Virtual for file extension
customerFileSchema.virtual('fileExtension').get(function() {
  return this.fileName.split('.').pop().toLowerCase();
});

// Virtual for formatted file size
customerFileSchema.virtual('formattedFileSize').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Static method to get files by customer
customerFileSchema.statics.getFilesByCustomer = async function(customerId, userId) {
  return this.find({ customerId, userId })
    .populate('jobId', 'title status priority')
    .populate('uploadedByUserId', 'name email')
    .sort({ createdAt: -1 });
};

// Static method to get files by job
customerFileSchema.statics.getFilesByJob = async function(jobId, userId) {
  return this.find({ jobId, userId })
    .populate('customerId', 'name email phone')
    .populate('uploadedByUserId', 'name email')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('CustomerFile', customerFileSchema);
