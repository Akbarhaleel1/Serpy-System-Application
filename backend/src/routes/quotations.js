const express = require('express');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const Quotation = require('../models/Quotation');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');
const PDFService = require('../services/PDFService');
const { protect } = require('../middleware/auth');
// Quotations go out from the sending business's own mailbox
const { getMailer } = require('../services/MailerService');

async function getCompanyInfo(userId) {
  const settings = await Settings.getOrCreateSettings(userId);
  const addressParts = [];
  if (settings.companyAddress) {
    if (settings.companyAddress.street) addressParts.push(settings.companyAddress.street);
    if (settings.companyAddress.city) addressParts.push(settings.companyAddress.city);
    if (settings.companyAddress.state) addressParts.push(settings.companyAddress.state);
    if (settings.companyAddress.zipCode) addressParts.push(settings.companyAddress.zipCode);
  }

  // Multi-line address block for header (SynX style)
  const addr = settings.companyAddress || {};
  const addressLines = [];
  if (addr.street) addressLines.push(addr.street);
  if (addr.city) addressLines.push(addr.city + (addr.zipCode ? ' - ' + addr.zipCode : ''));
  else if (addr.zipCode) addressLines.push(addr.zipCode);
  const stateCountry = [addr.state, addr.country].filter(Boolean).join(', ').toUpperCase();
  if (stateCountry) addressLines.push(stateCountry);

  return {
    name: settings.companyName || '',
    address: addressParts.join(', '),
    addressLines,
    logo: settings.companyLogo || '',
    currency: settings.currency || 'INR',
    phone: settings.companyPhone || '',
    email: settings.companyEmail || '',
    gstNumber: settings.gstNumber || '',
    stateName: settings.companyAddress?.state || '',
    country: settings.companyAddress?.country || '',
    paymentQRCode: settings.paymentQRCode || '',
    bankName: settings.bankName || '',
    accountNumber: settings.accountNumber || '',
    accountName: settings.companyName || '',
    ifscCode: settings.ifscCode || '',
    branchName: settings.branchName || '',
    upiId: settings.upiId || ''
  };
}

const router = express.Router();

const quotationValidation = [
  body('customer_id').notEmpty().withMessage('Customer is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.item_name').notEmpty().withMessage('Item name is required'),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Unit price cannot be negative')
];

// GET /api/quotations
router.get('/', protect, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;

    const filter = req.user.dataScope
      ? { dataScope: req.user.dataScope }
      : { userId: req.user._id };

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { quotationNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const quotations = await Quotation.find(filter)
      .populate('customer_id', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Quotation.countDocuments(filter);

    res.json({
      status: 'success',
      data: { quotations, total, page: Number(page), limit: Number(limit) }
    });
  } catch (err) {
    console.error('GET /quotations error:', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// GET /api/quotations/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const filter = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const quotation = await Quotation.findOne(filter).populate('customer_id', 'name email phone');
    if (!quotation) return res.status(404).json({ status: 'error', message: 'Quotation not found' });

    res.json({ status: 'success', data: { quotation } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// POST /api/quotations
router.post('/', protect, quotationValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: 'error', message: errors.array()[0].msg });
  }

  try {
    const { customer_id, gst_type, is_interstate, valid_until, items, payment_link, terms_conditions, notes } = req.body;

    // Verify customer belongs to this user/scope
    const customerFilter = req.user.dataScope
      ? { _id: customer_id, dataScope: req.user.dataScope }
      : { _id: customer_id, userId: req.user._id };
    const customer = await Customer.findOne(customerFilter);
    if (!customer) return res.status(404).json({ status: 'error', message: 'Customer not found' });

    // Calculate item totals
    const processedItems = items.map(item => {
      const subtotal = item.quantity * item.unit_price;
      const taxAmount = gst_type === 'gst' ? (subtotal * (item.tax_rate || 0)) / 100 : 0;
      return {
        item_name: item.item_name,
        description: item.description || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate || 0,
        tax_amount: taxAmount,
        total_amount: subtotal + taxAmount
      };
    });

    const subtotal = processedItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const taxTotal = processedItems.reduce((sum, i) => sum + i.tax_amount, 0);
    const totalAmount = subtotal + taxTotal;

    const quotationNumber = await Quotation.generateQuotationNumber(req.user._id, req.user.dataScope);

    const quotation = await Quotation.create({
      quotationNumber,
      customer_id,
      gst_type: gst_type || 'non_gst',
      is_interstate: is_interstate || false,
      valid_until: valid_until || null,
      items: processedItems,
      subtotal,
      tax_amount: taxTotal,
      total_amount: totalAmount,
      payment_link: payment_link || null,
      terms_conditions,
      notes,
      status: 'draft',
      userId: req.user._id,
      dataScope: req.user.dataScope || null
    });

    await quotation.populate('customer_id', 'name email phone');

    res.status(201).json({ status: 'success', data: { quotation } });
  } catch (err) {
    console.error('POST /quotations error:', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// PATCH /api/quotations/:id/status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft', 'sent', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status' });
    }

    const filter = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const quotation = await Quotation.findOneAndUpdate(filter, { status }, { new: true })
      .populate('customer_id', 'name email phone');

    if (!quotation) return res.status(404).json({ status: 'error', message: 'Quotation not found' });

    res.json({ status: 'success', data: { quotation } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// POST /api/quotations/:id/send-email
router.post('/:id/send-email', protect, async (req, res) => {
  try {
    const { recipientEmail, message } = req.body;

    const filter = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const quotation = await Quotation.findOne(filter).populate('customer_id', 'name email phone address gstNumber');
    if (!quotation) return res.status(404).json({ status: 'error', message: 'Quotation not found' });

    const toEmail = recipientEmail || quotation.customer_id?.email;
    if (!toEmail) return res.status(400).json({ status: 'error', message: 'Recipient email is required' });

    // Generate the exact same PDF as the download endpoint, to attach to the email
    const companyInfo = await getCompanyInfo(req.user._id);
    let pdfBuffer = null;
    try {
      pdfBuffer = await PDFService.generateQuotationPDFFromHTML(quotation, companyInfo);
    } catch (pdfErr) {
      console.warn('⚠️ Quotation PDF generation for email failed:', pdfErr.message);
    }

    const companyName = companyInfo.name || 'SerpY ERP';
    const validUntil = quotation.valid_until
      ? new Date(quotation.valid_until).toLocaleDateString('en-IN') : 'N/A';

    const gstColHeader = quotation.gst_type === 'gst'
      ? '<th style="padding:8px;background:#f5f5f5;text-align:center;">Tax Rate</th>' : '';

    const itemsRows = quotation.items.map(item => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.item_name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.description || '-'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">&#8377;${item.unit_price.toFixed(2)}</td>
        ${quotation.gst_type === 'gst' ? `<td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.tax_rate}%</td>` : ''}
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">&#8377;${item.total_amount.toFixed(2)}</td>
      </tr>`).join('');

    const paymentSection = quotation.payment_link ? `
      <div style="margin:20px 0;padding:16px;background:#f0f7ff;border-radius:8px;border-left:4px solid #3399cc;">
        <h3 style="margin:0 0 8px 0;color:#333;">Payment Link</h3>
        <a href="${quotation.payment_link}" style="color:#3399cc;word-break:break-all;">${quotation.payment_link}</a>
      </div>` : '';

    const customMessage = message
      ? `<p style="margin:16px 0;padding:12px;background:#fafafa;border-left:3px solid #ddd;">${message}</p>` : '';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Quotation ${quotation.quotationNumber}</title></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;">
<div style="max-width:700px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;text-align:center;color:white;">
    <h1 style="margin:0;">${companyName}</h1>
    <p style="margin:8px 0 0 0;opacity:.9;">Quotation</p>
  </div>
  <div style="padding:30px;background:#f9f9f9;">
    <table style="width:100%;margin-bottom:20px;"><tr>
      <td><p style="margin:0;color:#666;font-size:13px;">QUOTATION FOR</p>
          <h2 style="margin:4px 0;font-size:18px;">${quotation.customer_id?.name || 'Customer'}</h2></td>
      <td style="text-align:right;"><p style="margin:0;color:#666;font-size:13px;">QUOTATION NUMBER</p>
          <h2 style="margin:4px 0;font-size:18px;font-family:monospace;">${quotation.quotationNumber}</h2>
          <p style="margin:4px 0;color:#666;font-size:13px;">Valid Until: ${validUntil}</p></td>
    </tr></table>
    ${customMessage}
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;">
      <thead><tr>
        <th style="padding:10px 8px;background:#f5f5f5;text-align:left;">Item</th>
        <th style="padding:10px 8px;background:#f5f5f5;text-align:left;">Description</th>
        <th style="padding:10px 8px;background:#f5f5f5;text-align:center;">Qty</th>
        <th style="padding:10px 8px;background:#f5f5f5;text-align:right;">Unit Price</th>
        ${gstColHeader}
        <th style="padding:10px 8px;background:#f5f5f5;text-align:right;">Total</th>
      </tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>
    <div style="margin-top:16px;text-align:right;">
      <p style="margin:4px 0;">Subtotal: <strong>&#8377;${quotation.subtotal.toFixed(2)}</strong></p>
      ${quotation.gst_type === 'gst' ? `<p style="margin:4px 0;">Tax: <strong>&#8377;${quotation.tax_amount.toFixed(2)}</strong></p>` : ''}
      <p style="margin:8px 0;font-size:18px;">Total: <strong style="color:#667eea;">&#8377;${quotation.total_amount.toFixed(2)}</strong></p>
    </div>
    ${paymentSection}
    ${quotation.terms_conditions ? `<div style="margin-top:20px;"><h4 style="margin:0 0 8px 0;">Terms &amp; Conditions</h4><p style="margin:0;color:#555;font-size:13px;">${quotation.terms_conditions}</p></div>` : ''}
    ${quotation.notes ? `<div style="margin-top:16px;"><h4 style="margin:0 0 8px 0;">Notes</h4><p style="margin:0;color:#555;font-size:13px;">${quotation.notes}</p></div>` : ''}
  </div>
  <div style="text-align:center;padding:20px;color:#666;font-size:12px;background:#f0f0f0;">
    <p style="margin:0;">&copy; 2026 ${companyName}. All rights reserved.</p>
  </div>
</div>
</body></html>`;

    const { transporter, from } = await getMailer(req.user);
    await transporter.sendMail({
      from,
      to: toEmail,
      subject: `Quotation ${quotation.quotationNumber} from ${companyName}`,
      html,
      attachments: pdfBuffer
        ? [{ filename: `Quotation_${quotation.quotationNumber}.pdf`, content: pdfBuffer }]
        : []
    });

    await Quotation.findOneAndUpdate(filter, { status: 'sent' });

    res.json({ status: 'success', message: 'Quotation email sent successfully' });
  } catch (err) {
    console.error('POST /quotations/:id/send-email error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to send quotation email' });
  }
});

// GET /api/quotations/:id/pdf
router.get('/:id/pdf', protect, async (req, res) => {
  try {
    const filter = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const quotation = await Quotation.findOne(filter)
      .populate('customer_id', 'name email phone address gstNumber');
    if (!quotation) return res.status(404).json({ status: 'error', message: 'Quotation not found' });

    const companyInfo = await getCompanyInfo(req.user._id);
    if (!companyInfo.name || companyInfo.name === 'My Company') {
      return res.status(400).json({
        status: 'error',
        message: 'Company details not configured. Please update Settings before generating PDFs.',
        code: 'COMPANY_NOT_CONFIGURED'
      });
    }

    const pdfBuffer = await PDFService.generateQuotationPDFFromHTML(quotation, companyInfo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Quotation_${quotation.quotationNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('GET /quotations/:id/pdf error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to generate PDF: ' + err.message });
  }
});

// DELETE /api/quotations/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const filter = req.user.dataScope
      ? { _id: req.params.id, dataScope: req.user.dataScope }
      : { _id: req.params.id, userId: req.user._id };

    const quotation = await Quotation.findOneAndDelete(filter);
    if (!quotation) return res.status(404).json({ status: 'error', message: 'Quotation not found' });

    res.json({ status: 'success', message: 'Quotation deleted' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;
