require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const path = require('path');


const app = express();

// Security Middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'https://serpy.synxautomate.com',
    'https://serpy-silk.vercel.app',
    'http://localhost:8081',
    'http://localhost:8080',
    'https://app.serpy.in',
    'app://-' // SerpY desktop app (Electron, served via electron-serve)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve static files from public/temp directory for temporary PDFs
app.use('/temp', express.static(path.join(__dirname, '../public/temp')));

// Serve static files from client build directory
app.use('/assets', express.static(path.join(__dirname, '../../client/dist/assets')));

// Serve the frontend app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  
  // Serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/temp')) {
      return res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`
      });
    }
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Database connection
let mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/print_arts_flow';
// Force IPv4 connection by replacing localhost with 127.0.0.1
mongoUri = mongoUri.replace('localhost', '127.0.0.1');
mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/walk-in-jobs', require('./routes/walkInJobs'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/units', require('./routes/units'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/purchase-bills', require('./routes/purchaseBills'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/hsn-codes', require('./routes/hsnCodes'));
app.use('/api/sac-codes', require('./routes/sacCodes'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/costs', require('./routes/costs'));
app.use('/api/proofs', require('./routes/proofs'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/embedded-signup', require('./routes/embeddedSignup'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/files', require('./routes/files'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/emergency-orders', require('./routes/emergencyOrders'));
app.use('/api/deliveries', require('./routes/deliveries'));
app.use('/api/time-entries', require('./routes/timeEntries'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/discounts', require('./routes/discounts'));
app.use('/api/portal', require('./routes/portal'));
app.use('/api/activity-log', require('./routes/activityLog'));
app.use('/api/users', require('./routes/users'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/email', require('./routes/email'));
app.use('/api/razorpay', require('./routes/razorpay'));
// HR & Payroll
app.use('/api/hr/employees', require('./routes/employees'));
app.use('/api/hr/attendance', require('./routes/attendance'));
app.use('/api/hr/leaves', require('./routes/leaves'));
app.use('/api/hr/payroll', require('./routes/payroll'));
app.use('/api/payment-reminders', require('./routes/paymentReminders'));

// Auto-check for overdue invoices and send reminders (runs every hour)
const PaymentReminder = require('./models/PaymentReminder');
const Invoice = require('./models/Invoice');
const Customer = require('./models/Customer');
const Settings = require('./models/Settings');
const User = require('./models/User');

async function autoCheckPaymentReminders() {
  try {
    console.log('⏰ Running automatic payment reminder check...');
    
    // Find all users with autoSend enabled
    const allSettings = await Settings.find({ 'paymentReminders.autoSend': true, 'paymentReminders.enabled': true });
    
    for (const settings of allSettings) {
      try {
        const userId = settings.userId;
        const user = await User.findById(userId);
        if (!user || !user.isActive) continue;
        
        const dataScope = user.dataScope;
        const config = settings.paymentReminders;
        const now = new Date();

        const invoiceQuery = dataScope ? { dataScope } : { userId };
        const invoices = await Invoice.find({
          ...invoiceQuery,
          paymentStatus: { $in: ['pending', 'partial', 'overdue'] },
          dueDate: { $lt: now },
          status: { $nin: ['cancelled', 'refunded'] },
          balanceAmount: { $gt: 0 }
        });

        let sentCount = 0;
        for (const invoice of invoices) {
          try {
            const customer = await Customer.findById(invoice.customerId);
            if (!customer?.phone || customer.whatsappConsent === false) continue;

            const daysOverdue = Math.ceil((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
            if (daysOverdue < (config.daysAfterDue || 1)) continue;

            const reminderCount = await PaymentReminder.getReminderCountForInvoice(invoice._id, userId);
            if (reminderCount >= (config.maxReminders || 5)) continue;

            const lastDate = await PaymentReminder.getLastReminderDate(invoice._id, userId);
            if (lastDate) {
              const daysSince = Math.ceil((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
              if (daysSince < (config.reminderInterval || 3)) continue;
            }

            // Build and send
            let msg = config.messageTemplate || 'Hi {{customerName}}, payment reminder for invoice {{invoiceNumber}}. Balance: ₹{{balanceAmount}}.';
            msg = msg.replace(/\{\{customerName\}\}/g, invoice.customerName)
                     .replace(/\{\{invoiceNumber\}\}/g, invoice.invoiceNumber)
                     .replace(/\{\{totalAmount\}\}/g, invoice.totalAmount.toLocaleString('en-IN'))
                     .replace(/\{\{balanceAmount\}\}/g, invoice.balanceAmount.toLocaleString('en-IN'))
                     .replace(/\{\{dueDate\}\}/g, new Date(invoice.dueDate).toLocaleDateString('en-IN'))
                     .replace(/\{\{businessName\}\}/g, settings.companyName || 'Our Company');

            const msgId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            console.log(`📱 Auto-reminder to ${customer.phone}: ${msg.substring(0, 60)}...`);

            await PaymentReminder.create({
              invoiceId: invoice._id,
              customerId: customer._id,
              customerName: invoice.customerName,
              customerPhone: customer.phone,
              invoiceNumber: invoice.invoiceNumber,
              totalAmount: invoice.totalAmount,
              balanceAmount: invoice.balanceAmount,
              dueDate: invoice.dueDate,
              daysOverdue,
              reminderType: invoice.paymentStatus === 'partial' ? 'partial' : 'overdue',
              messageContent: msg,
              status: 'sent',
              sentAt: new Date(),
              reminderCount: reminderCount + 1,
              whatsappMessageId: msgId,
              userId,
              dataScope
            });

            if (invoice.paymentStatus !== 'overdue') {
              invoice.paymentStatus = 'overdue';
              await invoice.save();
            }
            sentCount++;
          } catch (err) {
            console.error(`Auto-reminder error for invoice ${invoice.invoiceNumber}:`, err.message);
          }
        }
        if (sentCount > 0) {
          console.log(`✅ Auto-sent ${sentCount} payment reminders for user ${user.email}`);
        }
      } catch (err) {
        console.error('Auto-reminder user error:', err.message);
      }
    }
  } catch (error) {
    console.error('❌ Auto payment reminder check failed:', error.message);
  }
}

// Run auto-check every hour (3600000ms)
setInterval(autoCheckPaymentReminders, 3600000);
// Also run once after a short delay on startup
setTimeout(autoCheckPaymentReminders, 30000);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'SerpY ERP API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      status: 'error',
      message: 'Duplicate field value'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `API Route ${req.originalUrl} not found`
  });
});

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
