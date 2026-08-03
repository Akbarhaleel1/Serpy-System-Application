const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // General Settings
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    default: 'My Company',
    trim: true
  },
  companyLogo: {
    type: String,
    trim: true
  },
  companyAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  companyPhone: {
    type: String,
    trim: true
  },
  companyEmail: {
    type: String,
    trim: true
  },
  companyWebsite: {
    type: String,
    trim: true
  },
  gstNumber: {
    type: String,
    trim: true
  },
  panNumber: {
    type: String,
    trim: true
  },
  paymentQRCode: {
    type: String,
    trim: true
  },
  
  // Bank Details
  bankName: {
    type: String,
    trim: true
  },
  accountNumber: {
    type: String,
    trim: true
  },
  ifscCode: {
    type: String,
    trim: true
  },
  branchName: {
    type: String,
    trim: true
  },
  upiId: {
    type: String,
    trim: true
  },

  // Business Settings
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  dateFormat: {
    type: String,
    default: 'DD/MM/YYYY',
    enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']
  },
  timeFormat: {
    type: String,
    default: '12',
    enum: ['12', '24']
  },

  // Invoice Settings
  invoicePrefix: {
    type: String,
    default: 'INV',
    trim: true
  },
  invoiceNumberFormat: {
    type: String,
    default: 'INV-{YYYY}-{MM}-{####}',
    trim: true
  },
  invoiceFooter: {
    type: String,
    trim: true
  },
  invoiceTerms: {
    type: String,
    trim: true
  },
  defaultPaymentTerms: {
    type: Number,
    default: 30 // days
  },

  // Job Settings
  jobPrefix: {
    type: String,
    default: 'JOB',
    trim: true
  },
  jobNumberFormat: {
    type: String,
    default: 'JOB-{YYYY}-{MM}-{####}',
    trim: true
  },
  defaultJobPriority: {
    type: String,
    default: 'medium',
    enum: ['low', 'medium', 'high', 'urgent']
  },

  // Notification Settings
  emailNotifications: {
    newJob: { type: Boolean, default: true },
    jobCompleted: { type: Boolean, default: true },
    paymentReceived: { type: Boolean, default: true },
    invoiceOverdue: { type: Boolean, default: true },
    lowStock: { type: Boolean, default: true },
    systemAlerts: { type: Boolean, default: true }
  },
  smsNotifications: {
    newJob: { type: Boolean, default: false },
    jobCompleted: { type: Boolean, default: false },
    paymentReceived: { type: Boolean, default: false },
    invoiceOverdue: { type: Boolean, default: false }
  },

  // Security Settings
  sessionTimeout: {
    type: Number,
    default: 8 // hours
  },
  passwordPolicy: {
    minLength: { type: Number, default: 6 },
    requireUppercase: { type: Boolean, default: false },
    requireLowercase: { type: Boolean, default: false },
    requireNumbers: { type: Boolean, default: false },
    requireSpecialChars: { type: Boolean, default: false }
  },
  twoFactorAuth: {
    enabled: { type: Boolean, default: false },
    requiredForAdmins: { type: Boolean, default: false }
  },

  // Backup Settings
  autoBackup: {
    enabled: { type: Boolean, default: true },
    frequency: { type: String, default: 'daily', enum: ['daily', 'weekly', 'monthly'] },
    retentionDays: { type: Number, default: 30 }
  },

  // Integration Settings
  whatsappIntegration: {
    enabled: { type: Boolean, default: false },
    wabaId: { type: String, trim: true },
    phoneNumberId: { type: String, trim: true },
    accessToken: { type: String, trim: true },
    setupMethod: {
      type: String,
      enum: ['manual', 'embedded_signup'],
      default: 'manual'
    },
    connectionStatus: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'pending_verification'],
      default: 'disconnected'
    },
    embeddedSignupData: {
      tokenExchangedAt: Date,
      phoneRegisteredAt: Date,
      webhookSubscribedAt: Date
    },
    webhookConfig: {
      subscribedFields: [{ type: String }],
      callbackUrl: String,
      verifyToken: String
    }
  },
  paymentReminders: {
    enabled: { type: Boolean, default: false },
    daysAfterDue: { type: Number, default: 1, min: 0 },
    reminderInterval: { type: Number, default: 3, min: 1 },
    maxReminders: { type: Number, default: 5, min: 1, max: 20 },
    messageTemplate: {
      type: String,
      default: 'Hi {{customerName}}, this is a friendly reminder that your invoice {{invoiceNumber}} of ₹{{totalAmount}} has a pending balance of ₹{{balanceAmount}}. The payment was due on {{dueDate}}. Please make the payment at your earliest convenience. - {{businessName}}',
      trim: true
    },
    metaTemplateName: { type: String, trim: true },
    templateVariableMapping: { type: Map, of: String },
    autoSend: { type: Boolean, default: false }
  },
  emailIntegration: {
    enabled: { type: Boolean, default: false },
    smtpHost: { type: String, trim: true },
    smtpPort: { type: Number },
    smtpUser: { type: String, trim: true },
    smtpPassword: { type: String, trim: true },
    smtpSecure: { type: Boolean, default: true }
  },

  // Custom Fields
  customFields: {
    customers: [{
      name: { type: String, required: true },
      type: { type: String, enum: ['text', 'number', 'date', 'boolean', 'select'], required: true },
      required: { type: Boolean, default: false },
      options: [String] // for select type
    }],
    jobs: [{
      name: { type: String, required: true },
      type: { type: String, enum: ['text', 'number', 'date', 'boolean', 'select'], required: true },
      required: { type: Boolean, default: false },
      options: [String] // for select type
    }]
  },

  // Theme Settings
  theme: {
    primaryColor: { type: String, default: '#3b82f6' },
    secondaryColor: { type: String, default: '#64748b' },
    darkMode: { type: Boolean, default: false }
  },

  // Revenue Analytics Settings
  monthlyRevenueTarget: {
    type: Number,
    default: 100000, // Default target: ₹1,00,000
    min: 0
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient querying
// Note: userId already has unique: true which creates an index, so no need for duplicate index
// settingsSchema.index({ userId: 1 });

// Static method to get or create settings
settingsSchema.statics.getOrCreateSettings = async function (userId) {
  let settings = await this.findOne({ userId });

  if (!settings) {
    settings = await this.create({
      userId,
      companyName: 'My Company'
    });
  }

  return settings;
};

// Static method to update settings
settingsSchema.statics.updateSettings = async function (userId, updateData) {
  return this.findOneAndUpdate(
    { userId },
    updateData,
    { new: true, upsert: true, runValidators: true }
  );
};

// Method to get formatted company address
settingsSchema.methods.getFormattedAddress = function () {
  const address = this.companyAddress;
  if (!address) return '';

  const parts = [
    address.street,
    address.city,
    address.state,
    address.zipCode,
    address.country
  ].filter(part => part && part.trim());

  return parts.join(', ');
};

// Method to get invoice number format
settingsSchema.methods.getInvoiceNumberFormat = function () {
  return this.invoiceNumberFormat || 'INV-{YYYY}-{MM}-{####}';
};

// Method to get job number format
settingsSchema.methods.getJobNumberFormat = function () {
  return this.jobNumberFormat || 'JOB-{YYYY}-{MM}-{####}';
};

module.exports = mongoose.model('Settings', settingsSchema);
