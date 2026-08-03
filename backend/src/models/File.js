const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
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
    enum: ['document', 'image', 'design', 'proof', 'final', 'reference', 'invoice', 'contract', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    trim: true
  },
  // Related entities
  relatedEntity: {
    type: {
      type: String,
      enum: ['customer', 'job', 'invoice', 'payment', 'inventory', 'vendor', 'staff', 'task', 'delivery', 'emergency_order', 'walk_in_job', 'proof', 'time_entry', 'event', 'discount_rule', 'customer_pricing', 'hsn_code', 'account_transaction', 'cheque', 'cost', 'user', 'system']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    },
    name: String
  },
  // Access control
  isPublic: {
    type: Boolean,
    default: false
  },
  accessLevel: {
    type: String,
    enum: ['private', 'internal', 'public'],
    default: 'private'
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // File metadata
  metadata: {
    width: Number, // for images
    height: Number, // for images
    duration: Number, // for videos/audio
    pages: Number, // for PDFs
    resolution: String, // for images
    colorSpace: String, // for images
    compression: String, // for images
    bitrate: Number, // for videos/audio
    sampleRate: Number, // for audio
    channels: Number // for audio
  },
  // Usage tracking
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloaded: {
    type: Date
  },
  lastAccessed: {
    type: Date
  },
  // File status
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'error', 'deleted'],
    default: 'ready'
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'completed'
  },
  errorMessage: {
    type: String,
    trim: true
  },
  // Upload information
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedByName: {
    type: String,
    required: true,
    trim: true
  },
  uploadSource: {
    type: String,
    enum: ['web', 'mobile', 'api', 'import', 'system'],
    default: 'web'
  },
  // Version control
  version: {
    type: Number,
    default: 1
  },
  parentFile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  },
  // Tags for organization
  tags: [String],
  // Expiration
  expiresAt: {
    type: Date
  },
  // Storage information
  storageProvider: {
    type: String,
    enum: ['local', 'aws_s3', 'google_cloud', 'azure'],
    default: 'local'
  },
  storagePath: {
    type: String,
    trim: true
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
fileSchema.index({ userId: 1, createdAt: -1 });
fileSchema.index({ category: 1 });
fileSchema.index({ 'relatedEntity.type': 1, 'relatedEntity.id': 1 });
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ tags: 1 });
fileSchema.index({ status: 1 });
fileSchema.index({ accessLevel: 1 });
fileSchema.index({ expiresAt: 1 });

// Virtual for file extension
fileSchema.virtual('fileExtension').get(function() {
  return this.fileName.split('.').pop().toLowerCase();
});

// Virtual for formatted file size
fileSchema.virtual('formattedFileSize').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for file type category
fileSchema.virtual('fileTypeCategory').get(function() {
  const mimeType = this.mimeType.toLowerCase();
  
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return 'archive';
  
  return 'other';
});

// Virtual for is expired
fileSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Static method to get files by entity
fileSchema.statics.getFilesByEntity = async function(entityType, entityId, userId) {
  return this.find({
    'relatedEntity.type': entityType,
    'relatedEntity.id': entityId,
    userId,
    status: { $ne: 'deleted' }
  })
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });
};

// Static method to get files by category
fileSchema.statics.getFilesByCategory = async function(category, userId) {
  return this.find({
    category,
    userId,
    status: { $ne: 'deleted' }
  })
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });
};

// Static method to get file statistics
fileSchema.statics.getFileStats = async function(userId) {
  const [
    totalFiles,
    totalSize,
    filesByCategory,
    filesByType,
    recentFiles,
    storageUsage
  ] = await Promise.all([
    this.countDocuments({ userId, status: { $ne: 'deleted' } }),
    this.aggregate([
      { $match: { userId: userId, status: { $ne: 'deleted' } } },
      { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
    ]),
    this.aggregate([
      { $match: { userId: userId, status: { $ne: 'deleted' } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    this.aggregate([
      { $match: { userId: userId, status: { $ne: 'deleted' } } },
      { $group: { _id: '$fileType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    this.find({ userId, status: { $ne: 'deleted' } })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10),
    this.aggregate([
      { $match: { userId: userId, status: { $ne: 'deleted' } } },
      { $group: { _id: '$storageProvider', totalSize: { $sum: '$fileSize' }, count: { $sum: 1 } } }
    ])
  ]);

  return {
    totalFiles,
    totalSize: totalSize[0]?.totalSize || 0,
    filesByCategory,
    filesByType,
    recentFiles,
    storageUsage
  };
};

// Method to increment download count
fileSchema.methods.incrementDownloadCount = async function() {
  this.downloadCount += 1;
  this.lastDownloaded = new Date();
  this.lastAccessed = new Date();
  await this.save();
};

// Method to update access time
fileSchema.methods.updateAccessTime = async function() {
  this.lastAccessed = new Date();
  await this.save();
};

module.exports = mongoose.model('File', fileSchema);
