const PDFDocument = require('pdfkit');
const HtmlToPdf = require('./HtmlToPdfService');

class PDFService {
  static async generateInvoicePDFFromHTML(invoice, companyInfo) {
    try {
      console.log('🔄 Starting HTML to PDF conversion for invoice:', invoice.invoiceNumber);

      // Generate HTML template
      const htmlContent = this.generateInvoiceHTML(invoice, companyInfo);

      try {
        const pdfBuffer = await HtmlToPdf.render(htmlContent, { marginMm: 20 });
        console.log('✅ PDF generated from HTML, size:', pdfBuffer.length, 'bytes');
        return pdfBuffer;
      } catch (renderError) {
        // Fallback to PDFKit if the HTML renderer is unavailable
        console.warn('⚠️ HTML render failed, falling back to PDFKit:', renderError.message);
        return await this.generateInvoicePDF(invoice, companyInfo);
      }
    } catch (error) {
      console.error('❌ PDF generation error:', error.message);
      throw new Error('Failed to generate PDF: ' + error.message);
    }
  }

  static async generatePurchaseBillPDFFromHTML(bill, companyInfo) {
    try {
      console.log('🔄 Starting HTML to PDF conversion for purchase bill:', bill.billNumber);

      const htmlContent = this.generatePurchaseBillHTML(bill, companyInfo);

      const pdfBuffer = await HtmlToPdf.render(htmlContent, { marginMm: 20 });
      console.log('✅ Purchase bill PDF generated, size:', pdfBuffer.length, 'bytes');
      return pdfBuffer;
    } catch (error) {
      console.error('❌ Purchase bill PDF generation error:', error.message);
      throw new Error('Failed to generate PDF: ' + error.message);
    }
  }

  static generatePurchaseBillHTML(bill, companyInfo) {
    const fmt = (d) => d
      ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'N/A';
    const billDate = fmt(bill.billDate);
    const dueDate = fmt(bill.dueDate);

    const companyPhone = this.formatPhone(companyInfo.phone);
    const isInterState = bill.isInterState;
    const amountInWords = this.numberToWords(Math.floor(bill.totalAmount || 0));
    const isFullyPaid = (bill.paidAmount || 0) >= (bill.totalAmount || 0) && (bill.totalAmount || 0) > 0;
    const balanceDue = Math.max(0, (bill.totalAmount || 0) - (bill.paidAmount || 0));
    const num = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // GST column header(s)
    const gstHead = isInterState
      ? `<th style="padding:9px 6px;text-align:right;font-size:9pt;width:13%;font-weight:700;">IGST</th>`
      : `<th style="padding:9px 6px;text-align:right;font-size:9pt;width:12%;font-weight:700;">SGST</th>
         <th style="padding:9px 6px;text-align:right;font-size:9pt;width:12%;font-weight:700;">CGST</th>`;

    const itemsRows = (bill.items || []).map((item, index) => {
      const ratePct = item.gstRate || 0;
      const gstCells = isInterState
        ? `<td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${num(item.igstAmount)} <span style="color:#888;font-size:8pt;">(${ratePct}%)</span></td>`
        : `<td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${num(item.sgstAmount)} <span style="color:#888;font-size:8pt;">(${(ratePct / 2)}%)</span></td>
           <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${num(item.cgstAmount)} <span style="color:#888;font-size:8pt;">(${(ratePct / 2)}%)</span></td>`;
      return `
      <tr>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center;color:#666;font-size:9pt;">${index + 1}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:9.5pt;">
          <div style="font-weight:600;">${item.description || ''}</div>
          ${item.hsnCode ? `<div style="color:#888;font-size:8pt;margin-top:1px;">HSN/SAC: ${item.hsnCode}</div>` : ''}
        </td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${num(item.rate)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${item.quantity || 0}</td>
        ${gstCells}
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${num(item.total)}</td>
      </tr>`;
    }).join('');

    const gstTotals = isInterState
      ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9.5pt;color:#555;"><span>IGST Amount</span><span>INR ${num(bill.totalIgstAmount)}</span></div>`
      : `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9.5pt;color:#555;"><span>SGST Amount</span><span>INR ${num(bill.totalSgstAmount)}</span></div>
         <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9.5pt;color:#555;"><span>CGST Amount</span><span>INR ${num(bill.totalCgstAmount)}</span></div>`;

    const paidRows = (bill.paidAmount || 0) > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9.5pt;color:#16a34a;">
        <span>Amount Paid</span><span>INR ${num(bill.paidAmount)}</span>
      </div>
      ${balanceDue > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:10.5pt;font-weight:700;border-top:1px solid #ccc;margin-top:4px;color:#dc2626;">
        <span>Balance Due</span><span>INR ${num(balanceDue)}</span>
      </div>` : ''}` : '';

    const addressLines = (companyInfo.address || '').split(',').map(s => s.trim()).filter(Boolean).join('<br>');
    const vendorAddressLines = (bill.vendorAddress || '').split(',').map(s => s.trim()).filter(Boolean).join('<br>');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Bill ${bill.billNumber}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color:#333; background:white; font-size:10pt; line-height:1.5; }
    .page { max-width:210mm; margin:0 auto; padding:14mm 18mm; }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
    <tr>
      <td style="vertical-align:top;">
        <div style="font-size:26pt;font-weight:900;color:#8b2fc9;letter-spacing:-1px;line-height:1;">${companyInfo.name || 'Company'}</div>
        <div style="margin-top:8px;">
          <div style="font-weight:700;font-size:10.5pt;">${(companyInfo.name || '').toUpperCase()}</div>
          ${companyInfo.address ? `<div style="font-size:9pt;color:#555;margin-top:3px;">${addressLines}</div>` : ''}
          ${companyInfo.email ? `<div style="font-size:9pt;color:#555;margin-top:2px;">Email: ${companyInfo.email}</div>` : ''}
          ${companyInfo.phone ? `<div style="font-size:9pt;color:#555;margin-top:2px;">Mobile: ${companyPhone}</div>` : ''}
          ${companyInfo.gstNumber ? `<div style="font-size:9pt;color:#555;margin-top:2px;">GSTIN: ${companyInfo.gstNumber}</div>` : ''}
        </div>
      </td>
      <td style="vertical-align:top;text-align:right;">
        <div style="font-size:24pt;font-weight:900;color:#222;letter-spacing:1px;line-height:1;">PURCHASE BILL</div>
        <div style="font-size:9.5pt;color:#555;margin-top:8px;line-height:2.2;">
          <div>Bill Number: <strong style="color:#222;">${bill.billNumber}</strong></div>
          ${bill.vendorInvoiceNumber ? `<div>Invoice Number: <strong style="color:#222;">${bill.vendorInvoiceNumber}</strong></div>` : ''}
          <div>Date: <strong style="color:#222;">${billDate}</strong></div>
          <div>Due Date: <strong style="color:#222;">${dueDate}</strong></div>
        </div>
        ${isFullyPaid ? `<div style="display:inline-block;border:2px solid #16a34a;color:#16a34a;font-weight:700;padding:3px 12px;font-size:9pt;margin-top:8px;letter-spacing:0.5px;">FULLY PAID</div>` : ''}
      </td>
    </tr>
  </table>

  <hr style="border:none;border-top:1px solid #ccc;margin:10px 0 14px 0;">

  <!-- VENDOR -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr>
      <td style="vertical-align:top;">
        <div style="font-weight:700;font-size:10pt;margin-bottom:5px;">Vendor</div>
        <div style="font-weight:600;font-size:10pt;">${bill.vendorName || 'N/A'}</div>
        ${bill.vendorGstNumber ? `<div style="font-size:9pt;color:#555;margin-top:2px;">${bill.vendorGstNumber}</div>` : ''}
        ${vendorAddressLines ? `<div style="font-size:9pt;color:#555;margin-top:2px;">${vendorAddressLines}</div>` : ''}
        ${bill.vendorState ? `<div style="font-size:9pt;color:#555;margin-top:2px;">${bill.vendorState}</div>` : ''}
      </td>
    </tr>
  </table>

  <!-- ITEMS TABLE -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:6px;">
    <thead>
      <tr style="background:#f5f5f5;border-top:1px solid #ddd;border-bottom:1px solid #ddd;">
        <th style="padding:9px 6px;text-align:center;font-size:9pt;width:6%;font-weight:700;">Sno.</th>
        <th style="padding:9px 6px;text-align:left;font-size:9pt;font-weight:700;">Description</th>
        <th style="padding:9px 6px;text-align:right;font-size:9pt;width:13%;font-weight:700;">Rate</th>
        <th style="padding:9px 6px;text-align:right;font-size:9pt;width:7%;font-weight:700;">Qty</th>
        ${gstHead}
        <th style="padding:9px 6px;text-align:right;font-size:9pt;width:14%;font-weight:700;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <!-- TOTALS -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
    <tr>
      <td style="vertical-align:top;"></td>
      <td style="vertical-align:top;text-align:right;white-space:nowrap;min-width:240px;">
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9.5pt;color:#555;"><span>Taxable</span><span>INR ${num(bill.taxableAmount)}</span></div>
        ${gstTotals}
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11pt;font-weight:700;border-top:1px solid #ccc;margin-top:4px;"><span>Total Amount</span><span>INR ${num(bill.totalAmount)}</span></div>
        ${paidRows}
      </td>
    </tr>
  </table>

  <!-- AMOUNT IN WORDS -->
  <div style="border-top:1px solid #ddd;border-bottom:1px solid #ddd;padding:8px 0;font-size:9.5pt;margin:12px 0;">
    <strong>Total in Words:</strong> Indian Rupees ${amountInWords} Only
  </div>

  <!-- FOOTER -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;padding-top:14px;border-top:1px solid #ccc;">
    <tr>
      <td style="vertical-align:top;padding-right:30px;">
        ${bill.notes ? `<div style="font-weight:700;font-size:10pt;margin-bottom:6px;">Notes</div>
          <div style="font-size:9pt;color:#555;line-height:1.8;">${bill.notes}</div>` : ''}
      </td>
      <td style="vertical-align:top;text-align:right;min-width:210px;">
        <div style="font-weight:700;font-size:10pt;">For ${companyInfo.name || 'Company'}</div>
        <div style="height:55px;"></div>
        <div style="font-size:9.5pt;color:#555;">Authorised Signatory</div>
      </td>
    </tr>
  </table>

</div>
</body>
</html>`;
  }

  static formatPhone(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Check if already has country code (starts with +)
    const hasPlus = phone.trim().startsWith('+');
    
    // Detect country code
    if (digits.startsWith('91') || (hasPlus && digits.startsWith('91')) || digits.length === 10) {
      // Indian number
      const last10 = digits.slice(-10);
      return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
    } else if (digits.startsWith('1') || (hasPlus && digits.startsWith('1'))) {
      // US/Canada: +1 (XXX) XXX-XXXX
      const last10 = digits.slice(-10);
      return `+1 (${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
    } else if (digits.startsWith('44') || (hasPlus && digits.startsWith('44'))) {
      // UK: +44 XXXX XXXXXX
      const withoutCode = digits.slice(-10);
      return `+44 ${withoutCode.slice(0, 4)} ${withoutCode.slice(4)}`;
    } else if (digits.startsWith('971') || (hasPlus && digits.startsWith('971'))) {
      // UAE: +971 XX XXX XXXX
      const withoutCode = digits.slice(-9);
      return `+971 ${withoutCode.slice(0, 2)} ${withoutCode.slice(2, 5)} ${withoutCode.slice(5)}`;
    } else if (digits.length > 10) {
      // Generic international format with country code
      const countryCode = digits.slice(0, -10);
      const number = digits.slice(-10);
      return `+${countryCode} ${number.slice(0, 5)} ${number.slice(5)}`;
    } else if (digits.length === 10) {
      // Assume Indian if 10 digits without country code
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    
    // Return as-is if doesn't match patterns
    return phone;
  }

  static generateInvoiceHTML(invoice, companyInfo) {
    const invoiceDate = invoice.invoiceDate
      ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'N/A';
    const dueDate = invoice.dueDate
      ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'N/A';

    const companyPhone = this.formatPhone(companyInfo.phone);
    const customerPhone = invoice.customerId?.phone ? this.formatPhone(invoice.customerId.phone) : '';

    const isInterState = invoice.isInterState;
    const gstRate = invoice.totalGstAmount > 0 && invoice.taxableAmount > 0
      ? (invoice.totalGstAmount / invoice.taxableAmount * 100).toFixed(0)
      : 0;

    const amountInWords = this.numberToWords(Math.floor(invoice.totalAmount || 0));
    const isFullyPaid = (invoice.amountPaid || 0) >= (invoice.totalAmount || 0) && (invoice.amountPaid || 0) > 0;
    const balanceDue = Math.max(0, (invoice.totalAmount || 0) - (invoice.amountPaid || 0));

    const itemsRows = invoice.items.map((item, index) => {
      const hsnLabel = item.hsnCode ? `SAC: ${item.hsnCode}` : '';
      const dimensions = (item.itemType === 'Square Feet' && item.length && item.width)
        ? `${item.length} × ${item.width} sq.ft` : '';
      const subDesc = [dimensions].filter(Boolean).join(' ');
      return `
      <tr>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center;color:#666;font-size:9pt;">${index + 1}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:9.5pt;">
          <div style="font-weight:600;">${item.itemName}</div>
          ${subDesc ? `<div style="font-style:italic;color:#888;font-size:8.5pt;margin-top:2px;">${subDesc}</div>` : ''}
          ${hsnLabel ? `<div style="color:#888;font-size:8pt;margin-top:1px;">${hsnLabel}</div>` : ''}
        </td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${(item.unitPrice || 0).toFixed(2)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${(item.quantity || 0)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}</td>
      </tr>`;
    }).join('');

    const designChargeRow = invoice.designCharge?.amount > 0 ? `
      <tr>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center;color:#666;font-size:9pt;">${invoice.items.length + 1}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:9.5pt;font-weight:600;">Design Charge</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${(invoice.designCharge.amount || 0).toFixed(2)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">1</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${(invoice.designCharge.amount || 0).toFixed(2)}</td>
      </tr>` : '';

    const gstBreakdown = !invoice.noGst && Number(gstRate) > 0
      ? (isInterState
          ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9.5pt;color:#555;"><span>IGST @ ${gstRate}%</span><span>₹ ${(invoice.totalGstAmount || 0).toFixed(2)}</span></div>`
          : `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9.5pt;color:#555;"><span>CGST @ ${(gstRate / 2).toFixed(0)}%</span><span>₹ ${((invoice.totalGstAmount || 0) / 2).toFixed(2)}</span></div>
             <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9.5pt;color:#555;"><span>SGST @ ${(gstRate / 2).toFixed(0)}%</span><span>₹ ${((invoice.totalGstAmount || 0) / 2).toFixed(2)}</span></div>`)
      : '';

    const paidRows = (invoice.amountPaid || 0) > 0 ? `
      <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9.5pt;color:#16a34a;">
        <span>Amount Paid</span><span>₹ ${(invoice.amountPaid).toFixed(2)}</span>
      </div>
      ${balanceDue > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:10.5pt;font-weight:700;border-top:1px solid #ccc;margin-top:4px;color:#dc2626;">
        <span>Balance Due</span><span>₹ ${balanceDue.toFixed(2)}</span>
      </div>` : ''}` : '';

    const addressLines = (companyInfo.address || '').split(',').map(s => s.trim()).filter(Boolean).join('<br>');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color:#333; background:white; font-size:10pt; line-height:1.5; }
    .page { max-width:210mm; margin:0 auto; padding:14mm 18mm; }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
    <tr>
      <td style="vertical-align:top;">
        <div style="font-size:26pt;font-weight:900;color:#8b2fc9;letter-spacing:-1px;line-height:1;">${companyInfo.name || 'Company'}</div>
        <div style="margin-top:8px;">
          <div style="font-weight:700;font-size:10.5pt;">${(companyInfo.name || '').toUpperCase()}</div>
          ${companyInfo.address ? `<div style="font-size:9pt;color:#555;margin-top:3px;">${addressLines}</div>` : ''}
          ${companyInfo.email ? `<div style="font-size:9pt;color:#555;margin-top:2px;">Email: ${companyInfo.email}</div>` : ''}
          ${companyInfo.phone ? `<div style="font-size:9pt;color:#555;margin-top:2px;">Mobile: ${companyPhone}</div>` : ''}
          ${companyInfo.gstNumber ? `<div style="font-size:9pt;color:#555;margin-top:2px;">GSTIN: ${companyInfo.gstNumber}</div>` : ''}
          ${companyInfo.panNumber ? `<div style="font-size:9pt;color:#555;margin-top:2px;">PAN: ${companyInfo.panNumber}</div>` : ''}
        </div>
      </td>
      <td style="vertical-align:top;text-align:right;">
        <div style="font-size:28pt;font-weight:900;color:#222;letter-spacing:2px;line-height:1;">INVOICE</div>
        <div style="font-size:9.5pt;color:#555;margin-top:8px;line-height:2.2;">
          <div>Number: <strong style="color:#222;">${invoice.invoiceNumber}</strong></div>
          <div>Date: <strong style="color:#222;">${invoiceDate}</strong></div>
          <div>Due Date: <strong style="color:#222;">${dueDate}</strong></div>
        </div>
        ${isFullyPaid ? `<div style="display:inline-block;border:2px solid #16a34a;color:#16a34a;font-weight:700;padding:3px 12px;font-size:9pt;margin-top:8px;letter-spacing:0.5px;">FULLY PAID</div>` : ''}
      </td>
    </tr>
  </table>

  <hr style="border:none;border-top:1px solid #ccc;margin:10px 0 14px 0;">

  <!-- CUSTOMER / BILLING / SHIPPING -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr>
      <td style="width:33%;vertical-align:top;padding-right:12px;">
        <div style="font-weight:700;font-size:10pt;margin-bottom:5px;">Customer</div>
        <div style="font-weight:600;font-size:9.5pt;">${invoice.customerId?.name || 'N/A'}</div>
        ${customerPhone ? `<div style="font-size:9pt;color:#555;">Mobile: ${customerPhone}</div>` : ''}
        ${invoice.customerId?.email ? `<div style="font-size:9pt;color:#555;">${invoice.customerId.email}</div>` : ''}
        ${invoice.customerId?.gstNumber ? `<div style="font-size:9pt;color:#555;">GSTIN: ${invoice.customerId.gstNumber}</div>` : ''}
      </td>
      <td style="width:33%;vertical-align:top;padding:0 12px;border-left:1px solid #e5e5e5;">
        <div style="font-weight:700;font-size:10pt;margin-bottom:5px;">Billing Address</div>
        <div style="font-weight:600;font-size:9.5pt;">${invoice.customerId?.name || ''}</div>
        ${invoice.customerId?.address ? `<div style="font-size:9pt;color:#555;">${invoice.customerId.address}</div>` : ''}
      </td>
      <td style="width:33%;vertical-align:top;padding-left:12px;border-left:1px solid #e5e5e5;">
        <div style="font-weight:700;font-size:10pt;margin-bottom:5px;">Shipping Address</div>
        <div style="font-weight:600;font-size:9.5pt;">${invoice.customerId?.name || ''}</div>
        ${invoice.customerId?.address ? `<div style="font-size:9pt;color:#555;">${invoice.customerId.address}</div>` : ''}
        ${invoice.jobId ? `<div style="font-size:9pt;color:#888;margin-top:4px;">Job Ref: ${invoice.jobId.title || ''}</div>` : ''}
      </td>
    </tr>
  </table>

  <!-- ITEMS TABLE -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:6px;">
    <thead>
      <tr style="background:#f5f5f5;border-top:1px solid #ddd;border-bottom:1px solid #ddd;">
        <th style="padding:9px 6px;text-align:center;font-size:9pt;width:6%;font-weight:700;">Sno.</th>
        <th style="padding:9px 6px;text-align:left;font-size:9pt;font-weight:700;">Description</th>
        <th style="padding:9px 6px;text-align:right;font-size:9pt;width:13%;font-weight:700;">Rate</th>
        <th style="padding:9px 6px;text-align:right;font-size:9pt;width:8%;font-weight:700;">Qty</th>
        <th style="padding:9px 6px;text-align:right;font-size:9pt;width:14%;font-weight:700;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
      ${designChargeRow}
    </tbody>
  </table>

  <!-- BANK DETAILS + TOTALS -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
    <tr>
      <td style="vertical-align:top;padding-right:20px;">
        ${companyInfo.bankName ? `<div style="font-size:9.5pt;margin:3px 0;"><span style="color:#555;display:inline-block;min-width:128px;">Bank Name:</span> <strong>${companyInfo.bankName}</strong></div>` : ''}
        ${companyInfo.accountName ? `<div style="font-size:9.5pt;margin:3px 0;"><span style="color:#555;display:inline-block;min-width:128px;">Account Name:</span> ${companyInfo.accountName}</div>` : ''}
        ${companyInfo.accountNumber ? `<div style="font-size:9.5pt;margin:3px 0;"><span style="color:#555;display:inline-block;min-width:128px;">Account Number:</span> ${companyInfo.accountNumber}</div>` : ''}
        ${companyInfo.ifscCode ? `<div style="font-size:9.5pt;margin:3px 0;"><span style="color:#555;display:inline-block;min-width:128px;">IFSC Code:</span> ${companyInfo.ifscCode}</div>` : ''}
        ${companyInfo.upiId ? `<div style="font-size:9.5pt;margin:3px 0;"><span style="color:#555;display:inline-block;min-width:128px;">UPI ID:</span> ${companyInfo.upiId}</div>` : ''}
      </td>
      <td style="vertical-align:top;text-align:right;white-space:nowrap;min-width:210px;">
        ${(invoice.discountAmount || 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9.5pt;color:#555;"><span>Discount</span><span style="color:#dc2626;">-₹ ${(invoice.discountAmount).toFixed(2)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9.5pt;color:#555;"><span>Taxable</span><span>₹ ${(invoice.taxableAmount || invoice.subtotal || 0).toFixed(2)}</span></div>
        ${gstBreakdown}
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11pt;font-weight:700;border-top:1px solid #ccc;margin-top:4px;"><span>Total</span><span>₹ ${(invoice.totalAmount || 0).toFixed(2)}</span></div>
        ${paidRows}
      </td>
    </tr>
  </table>

  <!-- AMOUNT IN WORDS -->
  <div style="border-top:1px solid #ddd;border-bottom:1px solid #ddd;padding:8px 0;font-size:9.5pt;margin:12px 0;">
    <strong>Total in Words:</strong> Indian Rupees ${amountInWords} Only
  </div>

  <!-- FOOTER -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;padding-top:14px;border-top:1px solid #ccc;">
    <tr>
      <td style="vertical-align:top;padding-right:30px;">
        <div style="font-weight:700;font-size:10pt;margin-bottom:6px;">Terms &amp; Conditions</div>
        <div style="font-size:9pt;color:#555;line-height:1.8;">
          ${invoice.termsAndConditions ||
            '1. Payment is due as per agreed terms.<br>2. All disputes subject to local jurisdiction.<br>3. This is a computer generated document.'}
        </div>
      </td>
      <td style="vertical-align:top;text-align:right;min-width:210px;">
        <div style="font-weight:700;font-size:10pt;">For ${companyInfo.name || 'Company'}</div>
        ${companyInfo.paymentQRCode ? `<img src="${companyInfo.paymentQRCode}" style="width:80px;height:80px;margin:8px 0;" alt="QR">` : '<div style="height:55px;"></div>'}
        <div style="font-size:9.5pt;color:#555;">Authorised Signatory</div>
      </td>
    </tr>
  </table>

</div>
</body>
</html>`;
  }

  static generateQuotationHTML(quotation, companyInfo) {
    const quotationDate = new Date(quotation.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const validUntil = quotation.valid_until
      ? new Date(quotation.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'N/A';

    const companyPhone = this.formatPhone(companyInfo.phone);
    const customerPhone = quotation.customer_id?.phone ? this.formatPhone(quotation.customer_id.phone) : '';
    const amountInWords = this.numberToWords(Math.floor(quotation.total_amount || 0));

    const itemsRows = quotation.items.map((item, index) => {
      return `
      <tr>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center;color:#666;font-size:9pt;">${index + 1}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:9.5pt;">
          <div style="font-weight:600;">${item.item_name}</div>
          ${item.description ? `<div style="font-style:italic;color:#888;font-size:8.5pt;margin-top:2px;">${item.description}</div>` : ''}
        </td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${(item.unit_price || 0).toFixed(2)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${item.quantity}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:right;font-size:9.5pt;">${((item.unit_price || 0) * item.quantity).toFixed(2)}</td>
      </tr>`;
    }).join('');

    const gstRow = quotation.gst_type === 'gst' && (quotation.tax_amount || 0) > 0
      ? `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9.5pt;color:#555;"><span>GST</span><span>₹ ${(quotation.tax_amount || 0).toFixed(2)}</span></div>`
      : '';

    const addressLines = (companyInfo.address || '').split(',').map(s => s.trim()).filter(Boolean).join('<br>');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quotation ${quotation.quotationNumber}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color:#333; background:white; font-size:10pt; line-height:1.5; }
    .page { max-width:210mm; margin:0 auto; padding:14mm 18mm; }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
    <tr>
      <td style="vertical-align:top;">
        <div style="font-size:26pt;font-weight:900;color:#8b2fc9;letter-spacing:-1px;line-height:1;">${companyInfo.name || 'Company'}</div>
        <div style="margin-top:8px;">
          <div style="font-weight:700;font-size:10.5pt;">${(companyInfo.name || '').toUpperCase()}</div>
          ${companyInfo.address ? `<div style="font-size:9pt;color:#555;margin-top:3px;">${addressLines}</div>` : ''}
          ${companyInfo.email ? `<div style="font-size:9pt;color:#555;margin-top:2px;">Email: ${companyInfo.email}</div>` : ''}
          ${companyInfo.phone ? `<div style="font-size:9pt;color:#555;margin-top:2px;">Mobile: ${companyPhone}</div>` : ''}
          ${companyInfo.gstNumber ? `<div style="font-size:9pt;color:#555;margin-top:2px;">GSTIN: ${companyInfo.gstNumber}</div>` : ''}
        </div>
      </td>
      <td style="vertical-align:top;text-align:right;">
        <div style="font-size:28pt;font-weight:900;color:#222;letter-spacing:2px;line-height:1;">QUOTATION</div>
        <div style="font-size:9.5pt;color:#555;margin-top:8px;line-height:2.2;">
          <div>Number: <strong style="color:#222;">${quotation.quotationNumber}</strong></div>
          <div>Date: <strong style="color:#222;">${quotationDate}</strong></div>
          <div>Valid Until: <strong style="color:#222;">${validUntil}</strong></div>
        </div>
      </td>
    </tr>
  </table>

  <hr style="border:none;border-top:1px solid #ccc;margin:10px 0 14px 0;">

  <!-- CUSTOMER / BILLING / CONTACT -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr>
      <td style="width:33%;vertical-align:top;padding-right:12px;">
        <div style="font-weight:700;font-size:10pt;margin-bottom:5px;">Customer</div>
        <div style="font-weight:600;font-size:9.5pt;">${quotation.customer_id?.name || 'N/A'}</div>
        ${customerPhone ? `<div style="font-size:9pt;color:#555;">Mobile: ${customerPhone}</div>` : ''}
        ${quotation.customer_id?.email ? `<div style="font-size:9pt;color:#555;">${quotation.customer_id.email}</div>` : ''}
        ${quotation.customer_id?.gstNumber ? `<div style="font-size:9pt;color:#555;">GSTIN: ${quotation.customer_id.gstNumber}</div>` : ''}
      </td>
      <td style="width:33%;vertical-align:top;padding:0 12px;border-left:1px solid #e5e5e5;">
        <div style="font-weight:700;font-size:10pt;margin-bottom:5px;">Billing Address</div>
        <div style="font-weight:600;font-size:9.5pt;">${quotation.customer_id?.name || ''}</div>
        ${quotation.customer_id?.address ? `<div style="font-size:9pt;color:#555;">${quotation.customer_id.address}</div>` : ''}
      </td>
      <td style="width:33%;vertical-align:top;padding-left:12px;border-left:1px solid #e5e5e5;">
        <div style="font-weight:700;font-size:10pt;margin-bottom:5px;">GST Type</div>
        <div style="font-size:9.5pt;font-weight:600;">${quotation.gst_type === 'gst' ? 'GST Invoice' : 'Non-GST'}</div>
        ${quotation.is_interstate ? `<div style="font-size:9pt;color:#555;">Inter-State Supply</div>` : ''}
        ${quotation.notes ? `<div style="font-size:9pt;color:#888;margin-top:6px;">${quotation.notes}</div>` : ''}
      </td>
    </tr>
  </table>

  <!-- ITEMS TABLE -->
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:6px;">
    <thead>
      <tr style="background:#f5f5f5;border-top:1px solid #ddd;border-bottom:1px solid #ddd;">
        <th style="padding:9px 6px;text-align:center;font-size:9pt;width:6%;font-weight:700;">Sno.</th>
        <th style="padding:9px 6px;text-align:left;font-size:9pt;font-weight:700;">Description</th>
        <th style="padding:9px 6px;text-align:right;font-size:9pt;width:13%;font-weight:700;">Rate</th>
        <th style="padding:9px 6px;text-align:right;font-size:9pt;width:8%;font-weight:700;">Qty</th>
        <th style="padding:9px 6px;text-align:right;font-size:9pt;width:14%;font-weight:700;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <!-- TOTALS -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
    <tr>
      <td style="vertical-align:top;">
        ${quotation.payment_link ? `<div style="font-size:9pt;color:#555;"><strong>Payment Link:</strong> <a href="${quotation.payment_link}" style="color:#8b2fc9;">${quotation.payment_link}</a></div>` : ''}
      </td>
      <td style="vertical-align:top;text-align:right;white-space:nowrap;min-width:210px;">
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:9.5pt;color:#555;"><span>Taxable</span><span>₹ ${(quotation.subtotal || 0).toFixed(2)}</span></div>
        ${gstRow}
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:11pt;font-weight:700;border-top:1px solid #ccc;margin-top:4px;"><span>Total</span><span>₹ ${(quotation.total_amount || 0).toFixed(2)}</span></div>
      </td>
    </tr>
  </table>

  <!-- AMOUNT IN WORDS -->
  <div style="border-top:1px solid #ddd;border-bottom:1px solid #ddd;padding:8px 0;font-size:9.5pt;margin:12px 0;">
    <strong>Total in Words:</strong> Indian Rupees ${amountInWords} Only
  </div>

  <!-- FOOTER -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;padding-top:14px;border-top:1px solid #ccc;">
    <tr>
      <td style="vertical-align:top;padding-right:30px;">
        <div style="font-weight:700;font-size:10pt;margin-bottom:6px;">Terms &amp; Conditions</div>
        <div style="font-size:9pt;color:#555;line-height:1.8;">
          ${quotation.terms_conditions ||
            '1. This quotation is valid for the period mentioned above.<br>2. Prices are subject to change without prior notice after validity.<br>3. All disputes subject to local jurisdiction.'}
        </div>
      </td>
      <td style="vertical-align:top;text-align:right;min-width:210px;">
        <div style="font-weight:700;font-size:10pt;">For ${companyInfo.name || 'Company'}</div>
        <div style="height:55px;"></div>
        <div style="font-size:9.5pt;color:#555;">Authorised Signatory</div>
      </td>
    </tr>
  </table>

</div>
</body>
</html>`;
  }

  static async generateQuotationPDFFromHTML(quotation, companyInfo) {
    const htmlContent = this.generateQuotationHTML(quotation, companyInfo);
    try {
      return await HtmlToPdf.render(htmlContent, { marginMm: 10 });
    } catch (err) {
      console.warn('⚠️ HTML render failed for quotation, falling back to PDFKit:', err.message);
      return await this.generateQuotationPDF(quotation, companyInfo);
    }
  }

  static async generateQuotationPDF(quotation, companyInfo) {
    try {
      console.log('🔄 Starting PDFKit generation for quotation:', quotation.quotationNumber);

      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));

      this.createSimpleQuotation(doc, quotation, companyInfo);

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          console.log('✅ Quotation PDF generated, size:', pdfBuffer.length, 'bytes');
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
        doc.end();
      });
    } catch (error) {
      console.error('❌ Quotation PDF generation error:', error.message);
      throw new Error('Failed to generate quotation PDF: ' + error.message);
    }
  }

  static createSimpleQuotation(doc, quotation, companyInfo) {
    return this.renderSynxQuotation(doc, quotation, companyInfo);
  }

  static createSimpleQuotationLegacy(doc, quotation, companyInfo) {
    const margin = 40;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    const colors = { primary: '#000000', secondary: '#333333', text: '#2d3748', lightGray: '#e2e8f0', accent: '#8b2fc9' };

    // ======================== HEADER ========================
    doc.fontSize(20).font('Helvetica-Bold').fillColor(colors.accent)
       .text(companyInfo.name || 'COMPANY NAME', margin, yPos, { width: contentWidth - 150 });

    doc.fontSize(22).font('Helvetica-Bold').fillColor(colors.primary)
       .text('QUOTATION', margin, yPos, { width: contentWidth, align: 'right' });
    yPos += 30;

    doc.fontSize(8).font('Helvetica').fillColor(colors.secondary);
    if (companyInfo.address) { doc.text(companyInfo.address, margin, yPos, { width: contentWidth - 200 }); yPos += 14; }
    doc.text(`Phone: ${companyInfo.phone || 'N/A'} | Email: ${companyInfo.email || 'N/A'}`, margin, yPos, { width: contentWidth - 200 });
    yPos += 12;
    if (companyInfo.gstNumber) {
      doc.text(`GST: ${companyInfo.gstNumber}${companyInfo.stateName ? ' | State: ' + companyInfo.stateName : ''}`, margin, yPos, { width: contentWidth - 200 });
      yPos += 14;
    }

    // Quotation number + dates on the right
    doc.fontSize(9).font('Helvetica-Bold').fillColor(colors.secondary)
       .text(`Quotation #${quotation.quotationNumber}`, margin, yPos - 26, { width: contentWidth, align: 'right' });
    doc.fontSize(8).font('Helvetica').fillColor(colors.text)
       .text(`Date: ${new Date(quotation.createdAt || Date.now()).toLocaleDateString('en-IN')}`, margin, yPos - 13, { width: contentWidth, align: 'right' });
    if (quotation.valid_until) {
      doc.text(`Valid Until: ${new Date(quotation.valid_until).toLocaleDateString('en-IN')}`, margin, yPos, { width: contentWidth, align: 'right' });
    }

    yPos += 8;
    doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).strokeColor(colors.lightGray).lineWidth(1).stroke();
    yPos += 18;

    // ======================== CUSTOMER / GST INFO ========================
    const customer = quotation.customer_id || {};
    doc.fontSize(9).font('Helvetica-Bold').fillColor(colors.primary).text('QUOTE TO', margin, yPos);
    const gstTypeLabel = quotation.gst_type === 'gst'
      ? `GST (${quotation.is_interstate ? 'Interstate / IGST' : 'Intrastate / CGST+SGST'})`
      : 'Non-GST';
    doc.text('GST TYPE', margin + 300, yPos);
    yPos += 14;

    doc.fontSize(9).font('Helvetica-Bold').fillColor(colors.text).text(customer.name || 'N/A', margin, yPos, { width: 260 });
    doc.fontSize(9).font('Helvetica').fillColor(colors.text).text(gstTypeLabel, margin + 300, yPos, { width: 175 });
    yPos += 14;

    doc.fontSize(8).font('Helvetica').fillColor(colors.secondary);
    if (customer.address) { doc.text(customer.address, margin, yPos, { width: 260 }); yPos += doc.heightOfString(customer.address, { width: 260 }) + 2; }
    if (customer.email) { doc.text(customer.email, margin, yPos, { width: 260 }); yPos += 12; }
    if (customer.phone) { doc.text(customer.phone, margin, yPos, { width: 260 }); yPos += 12; }
    if (customer.gstNumber) { doc.text(`GST: ${customer.gstNumber}`, margin, yPos, { width: 260 }); yPos += 12; }
    yPos += 12;

    // ======================== ITEMS TABLE ========================
    const cols = {
      slNo: margin, slNoW: 22,
      item: margin + 22, itemW: 200,
      qty: margin + 222, qtyW: 50,
      rate: margin + 272, rateW: 70,
      tax: margin + 342, taxW: 55,
      total: margin + 397, totalW: contentWidth - 397
    };

    doc.rect(margin, yPos, contentWidth, 22).fillAndStroke('#f5f5f5', colors.lightGray);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(colors.primary);
    const hY = yPos + 7;
    doc.text('#', cols.slNo + 4, hY, { width: cols.slNoW });
    doc.text('Description', cols.item, hY, { width: cols.itemW });
    doc.text('Qty', cols.qty, hY, { width: cols.qtyW, align: 'right' });
    doc.text('Rate', cols.rate, hY, { width: cols.rateW, align: 'right' });
    doc.text('GST', cols.tax, hY, { width: cols.taxW, align: 'right' });
    doc.text('Total', cols.total, hY, { width: cols.totalW, align: 'right' });
    yPos += 26;

    let rowNum = 1;
    if (Array.isArray(quotation.items)) {
      quotation.items.forEach((item) => {
        if (yPos > pageHeight - 160) { doc.addPage(); yPos = margin; }
        const qty = item.quantity || 0;
        const rate = item.unit_price || 0;
        const taxAmount = item.tax_amount || 0;
        const lineTotal = item.total_amount != null ? item.total_amount : (qty * rate + taxAmount);

        const nameH = doc.heightOfString(item.item_name || '', { width: cols.itemW });
        const rowY = yPos;
        doc.fontSize(8).font('Helvetica').fillColor(colors.text);
        doc.text(String(rowNum), cols.slNo + 4, rowY, { width: cols.slNoW });
        doc.text(item.item_name || '', cols.item, rowY, { width: cols.itemW });
        if (item.description) {
          doc.fontSize(7).fillColor(colors.secondary).text(item.description, cols.item, rowY + nameH, { width: cols.itemW });
          doc.fontSize(8).fillColor(colors.text);
        }
        doc.text(qty.toFixed(2), cols.qty, rowY, { width: cols.qtyW, align: 'right' });
        doc.text('₹' + rate.toFixed(2), cols.rate, rowY, { width: cols.rateW, align: 'right' });
        doc.text('₹' + taxAmount.toFixed(2), cols.tax, rowY, { width: cols.taxW, align: 'right' });
        doc.text('₹' + lineTotal.toFixed(2), cols.total, rowY, { width: cols.totalW, align: 'right' });

        const descH = item.description ? doc.heightOfString(item.description, { width: cols.itemW }) : 0;
        yPos += Math.max(nameH + descH, 14) + 6;
        doc.moveTo(margin, yPos - 3).lineTo(pageWidth - margin, yPos - 3).strokeColor(colors.lightGray).lineWidth(0.5).stroke();
        rowNum++;
      });
    }

    yPos += 6;

    // ======================== TOTALS ========================
    const sumLabelX = margin + 300;
    const sumValueX = margin + 410;
    doc.fontSize(8).font('Helvetica').fillColor(colors.text);
    doc.text('Taxable:', sumLabelX, yPos, { width: 100 });
    doc.text(`₹ ${(quotation.subtotal || 0).toFixed(2)}`, sumValueX, yPos, { width: contentWidth - 410, align: 'right' });
    yPos += 14;

    if (quotation.gst_type === 'gst') {
      doc.text('GST Amount:', sumLabelX, yPos, { width: 100 });
      doc.text(`₹ ${(quotation.tax_amount || 0).toFixed(2)}`, sumValueX, yPos, { width: contentWidth - 410, align: 'right' });
      yPos += 14;
    }

    doc.moveTo(sumLabelX, yPos).lineTo(pageWidth - margin, yPos).strokeColor(colors.primary).lineWidth(1).stroke();
    yPos += 8;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(colors.primary);
    doc.text('Total:', sumLabelX, yPos, { width: 100 });
    doc.text(`₹ ${(quotation.total_amount || 0).toFixed(2)}`, sumValueX, yPos, { width: contentWidth - 410, align: 'right' });
    yPos += 24;

    // ======================== AMOUNT IN WORDS ========================
    const amountInWords = this.numberToWords(Math.floor(quotation.total_amount || 0));
    doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).strokeColor(colors.lightGray).lineWidth(0.5).stroke();
    yPos += 8;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(colors.primary).text('Total in Words: ', margin, yPos, { continued: true })
       .font('Helvetica').fillColor(colors.text).text(`Indian Rupees ${amountInWords} Only`);
    yPos += 16;
    doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).strokeColor(colors.lightGray).lineWidth(0.5).stroke();
    yPos += 16;

    // Payment link
    if (quotation.payment_link) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(colors.primary).text('Payment Link: ', margin, yPos, { continued: true })
         .font('Helvetica').fillColor(colors.accent).text(quotation.payment_link, { link: quotation.payment_link, underline: true });
      yPos += 18;
    }

    // ======================== FOOTER ========================
    if (yPos > pageHeight - 120) { doc.addPage(); yPos = margin; }
    const footerY = yPos + 10;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(colors.primary).text('Terms & Conditions', margin, footerY);
    doc.fontSize(7.5).font('Helvetica').fillColor(colors.secondary)
       .text(quotation.terms_conditions ||
         '1. This quotation is valid for the period mentioned above.\n2. Prices are subject to change without prior notice after validity.\n3. All disputes subject to local jurisdiction.',
         margin, footerY + 14, { width: 280 });

    doc.fontSize(9).font('Helvetica-Bold').fillColor(colors.primary)
       .text(`For ${companyInfo.name || 'Company'}`, margin + 300, footerY, { width: contentWidth - 300, align: 'right' });
    doc.fontSize(8).font('Helvetica').fillColor(colors.secondary)
       .text('Authorised Signatory', margin + 300, footerY + 60, { width: contentWidth - 300, align: 'right' });
  }

  static async generateInvoicePDF(invoice, companyInfo) {
    try {
      console.log('🔄 Starting PDF generation for invoice:', invoice.invoiceNumber);

      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));

      this.createSimpleInvoice(doc, invoice, companyInfo);

      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          console.log('✅ PDF generated, size:', pdfBuffer.length, 'bytes');
          resolve(pdfBuffer);
        });

        doc.on('error', (error) => {
          console.error('❌ PDF generation error:', error.message);
          reject(error);
        });

        doc.end();
      });
    } catch (error) {
      console.error('❌ PDF generation error:', error.message);
      throw new Error('Failed to generate PDF: ' + error.message);
    }
  }

  static createSimpleInvoice(doc, invoice, companyInfo) {
    return this.renderSynxInvoice(doc, invoice, companyInfo);
  }

  static createSimpleInvoiceLegacy(doc, invoice, companyInfo) {
    const margin = 40;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - (margin * 2);

    let yPos = margin;

    // Colors
    const colors = {
      primary: '#000000',
      secondary: '#333333',
      text: '#2d3748',
      lightGray: '#e2e8f0'
    };

    // ======================== HEADER ========================
    // Company Name
    doc.fontSize(20)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text(companyInfo.name || 'COMPANY NAME', margin, yPos, { width: contentWidth });
    yPos += 28;

    // Company Info
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(colors.secondary);

    if (companyInfo.address) {
      doc.text(companyInfo.address, margin, yPos, { width: contentWidth - 150 });
      yPos += 14;
    }

    doc.text(`Phone: ${companyInfo.phone || 'N/A'} | Email: ${companyInfo.email || 'N/A'}`, margin, yPos, { width: contentWidth - 150 });
    yPos += 12;

    doc.text(`GST: ${companyInfo.gstNumber} | State: ${companyInfo.stateName}`, margin, yPos, { width: contentWidth - 150 });
    yPos += 18;

    // Invoice Number on the right
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(colors.secondary)
       .text(`Invoice #${invoice.invoiceNumber}`, margin, yPos - 44, { width: contentWidth, align: 'right' });

    // Separator
    doc.moveTo(margin, yPos)
       .lineTo(pageWidth - margin, yPos)
       .strokeColor(colors.lightGray)
       .lineWidth(1)
       .stroke();

    yPos += 20;

    // ======================== INVOICE DETAILS ========================
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(colors.primary);

    const col1 = margin;
    const col2 = margin + 120;
    const col3 = margin + 240;
    const col4 = margin + contentWidth - 100;

    doc.text('INVOICE DATE', col1, yPos);
    doc.text('DUE DATE', col2, yPos);
    doc.text('JOB REFERENCE', col3, yPos);

    yPos += 14;

    doc.fontSize(9)
       .font('Helvetica')
       .fillColor(colors.text);

    doc.text(new Date(invoice.invoiceDate).toLocaleDateString('en-IN'), col1, yPos);
    doc.text(new Date(invoice.dueDate).toLocaleDateString('en-IN'), col2, yPos);
    doc.text((invoice.jobId?.title || 'N/A').substring(0, 30), col3, yPos, { width: 100 });

    yPos += 24;

    // ======================== BILL TO & SHIP TO ========================
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(colors.primary)
       .text('BILL TO', col1, yPos);

    doc.text('SHIP TO', col3, yPos);

    yPos += 14;

    const customer = invoice.customerId;
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(colors.text)
       .text(customer.name || 'N/A', col1, yPos, { width: 150 });

    doc.text(customer.name || 'N/A', col3, yPos, { width: 150 });

    yPos += 14;

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(colors.secondary);

    if (customer.address) {
      doc.text(customer.address, col1, yPos, { width: 180 });
      const addressHeight = doc.heightOfString(customer.address, { width: 180 });
      doc.text(customer.address || 'Same as billing', col3, yPos, { width: 180 });
      yPos += Math.max(addressHeight, 12) + 4;
    }

    if (customer.email) {
      doc.text(customer.email, col1, yPos, { width: 180 });
      yPos += 12;
    }

    if (customer.phone) {
      doc.text(customer.phone, col1, yPos, { width: 180 });
      yPos += 12;
    }

    if (customer.gstNumber) {
      doc.text(`GST: ${customer.gstNumber}`, col1, yPos, { width: 180 });
      yPos += 12;
    }

    yPos += 10;

    // ======================== ITEMS TABLE ========================
    // Define table column positions for A4 page (595pt width)
    // Margin: 40pt on each side = 515pt content width
    // Column distribution: 20 + 250 + 50 + 40 + 50 + 35 + 70 = 515pt
    const tableColPositions = {
      slNo: margin,                    // 40
      slNoWidth: 18,
      item: margin + 18,               // 58
      itemWidth: 85,
      length: margin + 103,            // 143
      lengthWidth: 35,
      width: margin + 138,             // 178
      widthWidth: 35,
      qty: margin + 173,               // 213
      qtyWidth: 38,
      rate: margin + 211,              // 251
      rateWidth: 52,
      amount: margin + 263,            // 303
      amountWidth: 52,
      hsn: margin + 315,               // 355
      hsnWidth: 38,
      tax: margin + 353,               // 393
      taxWidth: 30,
      gst: margin + 383,               // 423
      gstWidth: 50,
      total: margin + 433              // 473
    };

    // Table Header
    doc.rect(margin, yPos, contentWidth, 26)
       .fillAndStroke('#f0f0f0', colors.lightGray);

    doc.fontSize(6.5)
       .font('Helvetica-Bold')
       .fillColor(colors.primary);

    const headerY = yPos + 8;
    doc.text('#', tableColPositions.slNo, headerY, { width: tableColPositions.slNoWidth });
    doc.text('Item', tableColPositions.item, headerY, { width: tableColPositions.itemWidth });
    doc.text('Length', tableColPositions.length, headerY, { width: tableColPositions.lengthWidth, align: 'center' });
    doc.text('Width', tableColPositions.width, headerY, { width: tableColPositions.widthWidth, align: 'center' });
    doc.text('Qty', tableColPositions.qty, headerY, { width: tableColPositions.qtyWidth, align: 'right' });
    doc.text('Rate', tableColPositions.rate, headerY, { width: tableColPositions.rateWidth, align: 'right' });
    doc.text('Amount', tableColPositions.amount, headerY, { width: tableColPositions.amountWidth, align: 'right' });
    doc.text('HSN', tableColPositions.hsn, headerY, { width: tableColPositions.hsnWidth, align: 'center' });
    doc.text('GST%', tableColPositions.tax, headerY, { width: tableColPositions.taxWidth, align: 'right' });
    doc.text('GST', tableColPositions.gst, headerY, { width: tableColPositions.gstWidth, align: 'right' });
    doc.text('Total', tableColPositions.total, headerY, { width: 60, align: 'right' });

    yPos += 30;

    // Table Rows
    let rowNum = 1;
    let subtotal = 0;
    let totalTax = 0;

    doc.fontSize(7.5)
       .font('Helvetica')
       .fillColor(colors.text);

    if (invoice.items && Array.isArray(invoice.items)) {
      invoice.items.forEach((item) => {
        if (yPos > pageHeight - 150) {
          doc.addPage();
          yPos = margin;
        }

        const qty = item.quantity || item.totalSquareFeet || 0;
        const rate = item.unitPrice || 0;
        const itemAmount = qty * rate;
        const taxRate = item.gstRate || 0;
        const gstAmount = item.gstAmount || (itemAmount * (taxRate / 100));
        const itemTotal = item.itemTotal || (itemAmount + gstAmount);

        subtotal += itemAmount;
        totalTax += gstAmount;

        // Row line
        doc.moveTo(margin, yPos)
           .lineTo(pageWidth - margin, yPos)
           .strokeColor(colors.lightGray)
           .lineWidth(0.5)
           .stroke();

        yPos += 5;
        const rowY = yPos;

        // Get item name (without dimensions - we have separate columns)
        const itemName = item.itemName;
        const lengthDisplay = (item.itemType === 'Square Feet' && item.length) ? item.length.toFixed(0) : '-';
        const widthDisplay = (item.itemType === 'Square Feet' && item.width) ? item.width.toFixed(0) : '-';

        doc.fontSize(7)
           .font('Helvetica')
           .fillColor(colors.text);

        doc.text(rowNum.toString(), tableColPositions.slNo, rowY, { width: tableColPositions.slNoWidth });
        doc.text(itemName.substring(0, 30), tableColPositions.item, rowY, { width: tableColPositions.itemWidth });
        doc.text(lengthDisplay, tableColPositions.length, rowY, { width: tableColPositions.lengthWidth, align: 'center' });
        doc.text(widthDisplay, tableColPositions.width, rowY, { width: tableColPositions.widthWidth, align: 'center' });
        doc.text(qty.toFixed(2), tableColPositions.qty, rowY, { width: tableColPositions.qtyWidth, align: 'right' });
        doc.text('₹' + rate.toFixed(2), tableColPositions.rate, rowY, { width: tableColPositions.rateWidth, align: 'right' });
        doc.text('₹' + itemAmount.toFixed(2), tableColPositions.amount, rowY, { width: tableColPositions.amountWidth, align: 'right' });
        doc.text(item.hsnCode || 'N/A', tableColPositions.hsn, rowY, { width: tableColPositions.hsnWidth, align: 'center' });
        doc.text(taxRate.toFixed(0) + '%', tableColPositions.tax, rowY, { width: tableColPositions.taxWidth, align: 'right' });
        doc.text('₹' + gstAmount.toFixed(2), tableColPositions.gst, rowY, { width: tableColPositions.gstWidth, align: 'right' });
        doc.text('₹' + itemTotal.toFixed(2), tableColPositions.total, rowY, { width: 60, align: 'right' });

        yPos += 18;
        rowNum++;
      });

      // Design Charge Row
      if (invoice.designCharge && invoice.designCharge.amount > 0) {
        if (yPos > pageHeight - 150) {
          doc.addPage();
          yPos = margin;
        }

        doc.moveTo(margin, yPos)
           .lineTo(pageWidth - margin, yPos)
           .strokeColor(colors.lightGray)
           .lineWidth(0.5)
           .stroke();

        yPos += 5;
        const designRowY = yPos;

        const designAmount = invoice.designCharge.amount || 0;
        const designGstRate = invoice.designCharge.gstRate || 18;
        const designTax = designAmount * (designGstRate / 100);
        const designTotal = designAmount + designTax;

        subtotal += designAmount;
        totalTax += designTax;

        doc.fontSize(7)
           .font('Helvetica')
           .fillColor(colors.text);

        doc.text(rowNum.toString(), tableColPositions.slNo, designRowY, { width: tableColPositions.slNoWidth });
        doc.text('Design Charge', tableColPositions.item, designRowY, { width: tableColPositions.itemWidth });
        doc.text('-', tableColPositions.length, designRowY, { width: tableColPositions.lengthWidth, align: 'center' });
        doc.text('-', tableColPositions.width, designRowY, { width: tableColPositions.widthWidth, align: 'center' });
        doc.text('1', tableColPositions.qty, designRowY, { width: tableColPositions.qtyWidth, align: 'right' });
        doc.text('₹' + designAmount.toFixed(2), tableColPositions.rate, designRowY, { width: tableColPositions.rateWidth, align: 'right' });
        doc.text('₹' + designAmount.toFixed(2), tableColPositions.amount, designRowY, { width: tableColPositions.amountWidth, align: 'right' });
        doc.text('', tableColPositions.hsn, designRowY, { width: tableColPositions.hsnWidth, align: 'center' });
        doc.text(designGstRate.toFixed(0) + '%', tableColPositions.tax, designRowY, { width: tableColPositions.taxWidth, align: 'right' });
        doc.text('₹' + designTax.toFixed(2), tableColPositions.gst, designRowY, { width: tableColPositions.gstWidth, align: 'right' });
        doc.text('₹' + designTotal.toFixed(2), tableColPositions.total, designRowY, { width: 60, align: 'right' });

        yPos += 18;
        rowNum++;
      }
    }

    // Table Bottom
    doc.moveTo(margin, yPos)
       .lineTo(pageWidth - margin, yPos)
       .strokeColor(colors.primary)
       .lineWidth(1.5)
       .stroke();

    yPos += 20;

    // ======================== SUMMARY ========================
    // Summary section with proper spacing
    const summaryLabelX = margin + 310;
    const summaryValueX = margin + 430;

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(colors.text);

    // Subtotal
    doc.text('Subtotal:', summaryLabelX, yPos, { width: 110 });
    doc.text(`₹ ${(invoice.subtotal || subtotal).toFixed(2)}`, summaryValueX, yPos, { width: 85, align: 'right' });
    yPos += 14;

    // Discount
    if ((invoice.discountAmount || 0) > 0) {
      doc.text('Discount:', summaryLabelX, yPos, { width: 110 });
      doc.text(`₹ ${(invoice.discountAmount || 0).toFixed(2)}`, summaryValueX, yPos, { width: 85, align: 'right' });
      yPos += 14;
    }

    // Taxable Amount
    const taxableAmount = (invoice.subtotal || subtotal) - (invoice.discountAmount || 0);
    doc.text('Taxable Amount:', summaryLabelX, yPos, { width: 110 });
    doc.text(`₹ ${taxableAmount.toFixed(2)}`, summaryValueX, yPos, { width: 85, align: 'right' });
    yPos += 14;

    // Total GST
    const totalGstAmount = invoice.totalGstAmount || totalTax;
    doc.text('Total GST Amount:', summaryLabelX, yPos, { width: 110 });
    doc.text(`₹ ${totalGstAmount.toFixed(2)}`, summaryValueX, yPos, { width: 85, align: 'right' });
    yPos += 14;

    doc.moveTo(summaryLabelX, yPos)
       .lineTo(pageWidth - margin, yPos)
       .strokeColor(colors.primary)
       .lineWidth(1)
       .stroke();

    yPos += 12;

    // Total Amount
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor(colors.primary);

    doc.text('Total Amount:', summaryLabelX, yPos, { width: 110 });
    doc.text(`₹ ${(invoice.totalAmount || 0).toFixed(2)}`, summaryValueX, yPos, { width: 85, align: 'right' });
    yPos += 14;

    // Amount Paid
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(colors.text);

    doc.text('Amount Paid:', summaryLabelX, yPos, { width: 110 });
    doc.text(`₹ ${(invoice.amountPaid || 0).toFixed(2)}`, summaryValueX, yPos, { width: 85, align: 'right' });
    yPos += 14;

    // Balance Due
    const balanceDue = (invoice.totalAmount || 0) - (invoice.amountPaid || 0);
    doc.text('Balance Due:', summaryLabelX, yPos, { width: 110 });
    doc.text(`₹ ${balanceDue.toFixed(2)}`, summaryValueX, yPos, { width: 85, align: 'right' });
    yPos += 14;

    doc.moveTo(summaryLabelX, yPos)
       .lineTo(pageWidth - margin, yPos)
       .strokeColor(colors.primary)
       .lineWidth(2)
       .stroke();

    yPos += 20;

    // ======================== AMOUNT IN WORDS ========================
    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor(colors.primary);

    const amountInWords = this.numberToWords(Math.floor(invoice.totalAmount || 0));
    doc.text('Amount in Words:', margin, yPos);
    yPos += 12;

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(colors.text);

    doc.text(amountInWords.toUpperCase() + ' RUPEES ONLY', margin, yPos, { width: contentWidth - 100 });
    yPos += 30;

    // ======================== BANK DETAILS ========================
    if (yPos < pageHeight - 100) {
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor(colors.primary)
         .text('BANK DETAILS', margin, yPos);

      yPos += 14;

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor(colors.text);

      doc.text(`Bank: ${companyInfo.bankName || 'N/A'}`, margin, yPos);
      yPos += 10;

      doc.text(`Account: ${companyInfo.accountNumber || 'N/A'}`, margin, yPos);
      yPos += 10;

      doc.text(`IFSC: ${companyInfo.ifscCode || 'N/A'}`, margin, yPos);
    }
  }

  // ==================== SynX-style PDF helpers ====================

  static decodeLogo(logo) {
    try {
      if (!logo || typeof logo !== 'string') return null;
      // PDFKit supports PNG and JPEG only
      const m = logo.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
      if (m) return Buffer.from(m[2], 'base64');
      return null;
    } catch (e) {
      return null;
    }
  }

  static fmtNum(n) {
    const v = Number(n) || 0;
    return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  static fmtQty(n) {
    const v = Number(n) || 0;
    return Number.isInteger(v) ? String(v) : v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  static splitAddress(str) {
    if (!str || typeof str !== 'string') return [];
    const parts = str.includes('\n') ? str.split('\n') : str.split(',');
    return parts.map(p => p.trim()).filter(Boolean);
  }

  static currencyWords(currency) {
    const map = {
      INR: 'Indian Rupees',
      USD: 'United States Dollar',
      EUR: 'Euro',
      GBP: 'British Pound'
    };
    return map[currency] || 'Indian Rupees';
  }

  static renderSynxInvoice(doc, invoice, companyInfo) {
    const customer = invoice.customerId || {};
    const currency = companyInfo.currency || 'INR';

    const custName = invoice.customerName || customer.name || 'N/A';
    const custLines = [];
    const pos = invoice.customerState || customer.state;
    if (pos) custLines.push('POS: ' + String(pos).toUpperCase());
    const custGst = invoice.customerGstNumber || customer.gstNumber;
    if (custGst) custLines.push('GSTIN: ' + custGst);

    const billing = this.splitAddress(invoice.customerAddress || customer.address);
    if (invoice.customerState && !billing.some(l => l.toLowerCase().includes(String(invoice.customerState).toLowerCase()))) {
      billing.push(invoice.customerState);
    }

    const items = [];
    (invoice.items || []).forEach(item => {
      const qty = item.quantity || item.totalSquareFeet || 0;
      const rate = item.unitPrice || 0;
      const amount = qty * rate;
      const gst = item.gstAmount || (amount * ((item.gstRate || 0) / 100));
      const total = item.itemTotal || (amount + gst);
      const sub = item.description || '';
      const code = item.hsnCode ? 'HSN: ' + item.hsnCode : '';
      items.push({ description: item.itemName || '', sub, code, rate, qty, total });
    });
    if (invoice.designCharge && invoice.designCharge.amount > 0) {
      const amt = invoice.designCharge.amount;
      const gst = amt * ((invoice.designCharge.gstRate || 18) / 100);
      items.push({ description: 'Design Charge', sub: '', code: '', rate: amt, qty: 1, total: amt + gst });
    }

    const bankLines = [];
    if (companyInfo.bankName) bankLines.push('Bank Name: ' + companyInfo.bankName);
    if (companyInfo.accountName) bankLines.push('Account Name: ' + companyInfo.accountName);
    if (companyInfo.accountNumber) bankLines.push('Account Number: ' + companyInfo.accountNumber);
    if (companyInfo.ifscCode) bankLines.push('IFSC Code: ' + companyInfo.ifscCode);
    if (companyInfo.branchName) bankLines.push('Branch: ' + companyInfo.branchName);

    const taxable = invoice.taxableAmount != null ? invoice.taxableAmount : (invoice.subtotal || 0);
    const gstTotal = invoice.totalGstAmount || 0;
    const total = invoice.totalAmount || 0;
    const paid = invoice.amountPaid != null ? invoice.amountPaid : (invoice.paidAmount || 0);

    const summary = [{ label: 'Taxable', value: currency + ' ' + this.fmtNum(taxable) }];
    if (gstTotal > 0) summary.push({ label: 'GST', value: currency + ' ' + this.fmtNum(gstTotal) });
    summary.push({ label: 'Total', value: currency + ' ' + this.fmtNum(total), bold: true });
    if (paid > 0 && paid < total) {
      summary.push({ label: 'Paid', value: currency + ' ' + this.fmtNum(paid) });
      summary.push({ label: 'Balance', value: currency + ' ' + this.fmtNum(total - paid) });
    }

    const fullyPaid = total > 0 && paid >= total;

    this.renderSynxDocument(doc, {
      type: 'INVOICE',
      number: invoice.invoiceNumber || '',
      meta: [
        { label: 'Date', value: new Date(invoice.invoiceDate || Date.now()).toLocaleDateString('en-GB') },
        ...(invoice.dueDate ? [{ label: 'Due Date', value: new Date(invoice.dueDate).toLocaleDateString('en-GB') }] : [])
      ],
      badge: fullyPaid ? { text: 'FULLY PAID', color: '#2e7d32' } : null,
      company: companyInfo,
      customer: { name: custName, lines: custLines },
      billingLines: billing,
      shippingLines: billing,
      items,
      bankLines,
      summary,
      amountWords: this.currencyWords(currency) + ' ' + this.numberToWords(Math.floor(total)) + ' Only',
      terms: invoice.termsAndConditions || 'Payment must be completed as per the agreed terms.',
      footerNote: null,
      qrCode: companyInfo.paymentQRCode || '',
      paymentLink: invoice.paymentLink || '',
      upiId: companyInfo.upiId || ''
    });
  }

  static renderSynxQuotation(doc, quotation, companyInfo) {
    const customer = quotation.customer_id || {};
    const currency = companyInfo.currency || 'INR';

    const custLines = [];
    custLines.push(quotation.gst_type === 'gst'
      ? 'GST: ' + (quotation.is_interstate ? 'Interstate (IGST)' : 'Intrastate (CGST+SGST)')
      : 'Non-GST');
    if (customer.gstNumber) custLines.push('GSTIN: ' + customer.gstNumber);

    const billing = this.splitAddress(customer.address);

    const items = (quotation.items || []).map(item => ({
      description: item.item_name || '',
      sub: item.description || '',
      code: '',
      rate: item.unit_price || 0,
      qty: item.quantity || 0,
      total: item.total_amount != null ? item.total_amount : ((item.quantity || 0) * (item.unit_price || 0))
    }));

    const bankLines = [];
    if (companyInfo.bankName) bankLines.push('Bank Name: ' + companyInfo.bankName);
    if (companyInfo.accountName) bankLines.push('Account Name: ' + companyInfo.accountName);
    if (companyInfo.accountNumber) bankLines.push('Account Number: ' + companyInfo.accountNumber);
    if (companyInfo.ifscCode) bankLines.push('IFSC Code: ' + companyInfo.ifscCode);
    if (companyInfo.branchName) bankLines.push('Branch: ' + companyInfo.branchName);

    const total = quotation.total_amount || 0;
    const summary = [{ label: 'Taxable', value: currency + ' ' + this.fmtNum(quotation.subtotal || 0) }];
    if (quotation.gst_type === 'gst') summary.push({ label: 'GST', value: currency + ' ' + this.fmtNum(quotation.tax_amount || 0) });
    summary.push({ label: 'Total', value: currency + ' ' + this.fmtNum(total), bold: true });

    this.renderSynxDocument(doc, {
      type: 'QUOTATION',
      number: quotation.quotationNumber || '',
      meta: [
        { label: 'Date', value: new Date(quotation.createdAt || Date.now()).toLocaleDateString('en-GB') },
        ...(quotation.valid_until ? [{ label: 'Valid Until', value: new Date(quotation.valid_until).toLocaleDateString('en-GB') }] : [])
      ],
      badge: null,
      company: companyInfo,
      customer: { name: customer.name || 'N/A', lines: custLines },
      billingLines: billing,
      shippingLines: billing,
      items,
      bankLines,
      summary,
      amountWords: this.currencyWords(currency) + ' ' + this.numberToWords(Math.floor(total)) + ' Only',
      terms: quotation.terms_conditions ||
        '1. This quotation is valid for the period mentioned above.\n2. Prices are subject to change without prior notice after validity.\n3. All disputes subject to local jurisdiction.',
      footerNote: null,
      qrCode: companyInfo.paymentQRCode || '',
      paymentLink: quotation.payment_link || '',
      upiId: companyInfo.upiId || ''
    });
  }

  static renderSynxDocument(doc, d) {
    const margin = 40;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const right = pageWidth - margin;
    const contentWidth = right - margin;
    const C = { ink: '#1a1a2e', text: '#2d3748', muted: '#555555', line: '#cccccc', light: '#f5f5f5' };
    let y = margin;

    // ---------- LOGO ----------
    const logoBuf = this.decodeLogo(d.company.logo);
    if (logoBuf) {
      try { doc.image(logoBuf, margin, y, { fit: [130, 46] }); y += 54; } catch (e) { /* ignore bad logo */ }
    }

    const headerTop = y;

    // ---------- LEFT: company block ----------
    doc.fontSize(13).font('Helvetica-Bold').fillColor(C.ink)
       .text((d.company.name || 'COMPANY').toUpperCase(), margin, y, { width: 300 });
    let ly = doc.y + 2;
    doc.fontSize(8).font('Helvetica').fillColor(C.text);
    (d.company.addressLines || []).forEach(line => { doc.text(line, margin, ly, { width: 290 }); ly = doc.y; });
    if (d.company.email) { doc.text('Email: ' + d.company.email, margin, ly, { width: 290 }); ly = doc.y; }
    if (d.company.phone) { doc.text('Mobile: ' + d.company.phone, margin, ly, { width: 290 }); ly = doc.y; }
    if (d.company.gstNumber) { doc.text('GSTIN: ' + d.company.gstNumber, margin, ly, { width: 290 }); ly = doc.y; }

    // ---------- RIGHT: doc type + meta ----------
    doc.fontSize(18).font('Helvetica-Bold').fillColor(C.ink)
       .text(d.type, margin, headerTop, { width: contentWidth, align: 'right' });
    let ry = headerTop + 24;
    doc.fontSize(8.5).font('Helvetica').fillColor(C.text);
    doc.text('Number: ' + d.number, margin, ry, { width: contentWidth, align: 'right' }); ry += 13;
    (d.meta || []).forEach(m => { doc.text(m.label + ': ' + m.value, margin, ry, { width: contentWidth, align: 'right' }); ry += 13; });

    if (d.badge) {
      const bw = 110, bh = 22, bx = right - bw, by = ry + 2;
      doc.roundedRect(bx, by, bw, bh, 3).lineWidth(1).strokeColor(d.badge.color).stroke();
      doc.fontSize(9).font('Helvetica-Bold').fillColor(d.badge.color)
         .text(d.badge.text, bx, by + 7, { width: bw, align: 'center' });
      ry = by + bh;
    }

    y = Math.max(ly, ry) + 12;

    // separator
    doc.moveTo(margin, y).lineTo(right, y).strokeColor(C.line).lineWidth(1).stroke();
    y += 12;

    // ---------- CUSTOMER / BILLING / SHIPPING ----------
    const third = contentWidth / 3;
    const colX = [margin, margin + third, margin + 2 * third];
    const colW = third - 10;
    doc.fontSize(9.5).font('Helvetica-Bold').fillColor(C.ink);
    doc.text('Customer', colX[0], y);
    doc.text('Billing Address', colX[1], y);
    doc.text('Shipping Address', colX[2], y);
    const blockTop = y + 14;

    // Customer column
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.text).text(d.customer.name || 'N/A', colX[0], blockTop, { width: colW });
    let cy = doc.y;
    doc.font('Helvetica').fillColor(C.muted);
    (d.customer.lines || []).forEach(l => { doc.text(l, colX[0], cy, { width: colW }); cy = doc.y; });

    // Billing column
    doc.fontSize(8).font('Helvetica').fillColor(C.muted);
    let byc = blockTop;
    (d.billingLines && d.billingLines.length ? d.billingLines : ['N/A']).forEach(l => { doc.text(l, colX[1], byc, { width: colW }); byc = doc.y; });

    // Shipping column
    let bys = blockTop;
    (d.shippingLines && d.shippingLines.length ? d.shippingLines : ['N/A']).forEach(l => { doc.text(l, colX[2], bys, { width: colW }); bys = doc.y; });

    y = Math.max(cy, byc, bys) + 12;

    // ---------- ITEMS TABLE ----------
    const cols = { sno: margin, desc: margin + 32, rate: margin + 300, qty: margin + 372, total: margin + 432 };
    const colsW = { sno: 28, desc: 262, rate: 64, qty: 54, total: right - cols.total };

    doc.rect(margin, y, contentWidth, 20).fill(C.light);
    doc.fillColor(C.ink).fontSize(8.5).font('Helvetica-Bold');
    doc.text('Sno.', cols.sno + 3, y + 6, { width: colsW.sno });
    doc.text('Description', cols.desc, y + 6, { width: colsW.desc });
    doc.text('Rate', cols.rate, y + 6, { width: colsW.rate, align: 'right' });
    doc.text('Qty', cols.qty, y + 6, { width: colsW.qty, align: 'right' });
    doc.text('Total', cols.total, y + 6, { width: colsW.total, align: 'right' });
    y += 24;

    d.items.forEach((it, idx) => {
      if (y > pageHeight - 180) { doc.addPage(); y = margin; }
      const startY = y;
      doc.font('Helvetica').fillColor(C.text).fontSize(8.5);
      doc.text(String(idx + 1), cols.sno + 3, startY, { width: colsW.sno });
      doc.text(it.description || '', cols.desc, startY, { width: colsW.desc });
      const descH = doc.heightOfString(it.description || ' ', { width: colsW.desc });
      doc.text(this.fmtNum(it.rate), cols.rate, startY, { width: colsW.rate, align: 'right' });
      doc.text(this.fmtQty(it.qty), cols.qty, startY, { width: colsW.qty, align: 'right' });
      doc.text(this.fmtNum(it.total), cols.total, startY, { width: colsW.total, align: 'right' });

      let subY = startY + descH;
      if (it.sub) { doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(C.muted).text(it.sub, cols.desc, subY, { width: colsW.desc }); subY = doc.y; }
      if (it.code) { doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(C.muted).text(it.code, cols.desc, subY, { width: colsW.desc }); subY = doc.y; }
      y = Math.max(subY, startY + 14) + 6;
      doc.moveTo(margin, y - 3).lineTo(right, y - 3).strokeColor('#eeeeee').lineWidth(0.5).stroke();
    });

    doc.moveTo(margin, y).lineTo(right, y).strokeColor(C.line).lineWidth(0.7).stroke();
    y += 8;

    // ---------- BANK (left) + SUMMARY (right) ----------
    const sumLabelX = margin + 300, sumValueX = margin + 372;
    let bankY = y, sumY = y;
    if (d.bankLines && d.bankLines.length) {
      doc.fontSize(8).font('Helvetica').fillColor(C.text);
      d.bankLines.forEach(l => { doc.text(l, margin, bankY, { width: 290 }); bankY += 13; });
    }
    d.summary.forEach(s => {
      doc.fontSize(s.bold ? 10 : 8.5).font(s.bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(s.bold ? C.ink : C.text);
      doc.text(s.label, sumLabelX, sumY, { width: 70 });
      doc.text(s.value, sumValueX, sumY, { width: right - sumValueX, align: 'right' });
      sumY += s.bold ? 16 : 14;
    });
    y = Math.max(bankY, sumY) + 6;

    // ---------- AMOUNT IN WORDS ----------
    doc.moveTo(margin, y).lineTo(right, y).strokeColor(C.line).lineWidth(0.7).stroke();
    y += 7;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(C.ink)
       .text('Total in Words: ' + d.amountWords, margin, y, { width: contentWidth, align: 'right' });
    y = doc.y + 6;
    doc.moveTo(margin, y).lineTo(right, y).strokeColor(C.line).lineWidth(0.7).stroke();
    y += 16;

    // ---------- FOOTER ----------
    const hasPayment = d.qrCode || d.paymentLink || d.upiId;
    if (y > pageHeight - 160) { doc.addPage(); y = margin; }
    const footY = y;

    // Left: Terms & Conditions
    doc.fontSize(9).font('Helvetica-Bold').fillColor(C.ink).text('Terms & Conditions', margin, footY, { width: 200 });
    let ty = footY + 14;
    if (d.footerNote) {
      doc.fontSize(8).font('Helvetica').fillColor(C.muted).text(d.footerNote, margin, ty, { width: 200 });
      ty = doc.y + 4;
    }
    doc.fontSize(8).font('Helvetica').fillColor(C.muted).text(d.terms, margin, ty, { width: 200 });

    // Middle: Payment (QR code + UPI + link)
    if (hasPayment) {
      const payX = margin + 215;
      const payW = 150;
      let payY = footY;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(C.ink).text('Payment', payX, payY, { width: payW });
      payY += 14;

      const qrBuf = this.decodeLogo(d.qrCode);
      if (qrBuf) {
        try {
          doc.image(qrBuf, payX, payY, { fit: [72, 72] });
          doc.fontSize(7).font('Helvetica').fillColor(C.muted).text('Scan to Pay', payX, payY + 74, { width: 72, align: 'center' });
          payY += 88;
        } catch (e) { /* ignore bad QR */ }
      }
      if (d.upiId) {
        doc.fontSize(8).font('Helvetica').fillColor(C.text).text('UPI: ' + d.upiId, payX, payY, { width: payW });
        payY = doc.y + 2;
      }
      if (d.paymentLink) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor(C.ink).text('Payment Link:', payX, payY, { width: payW });
        payY = doc.y;
        doc.fontSize(7.5).font('Helvetica').fillColor('#8b2fc9')
           .text(d.paymentLink, payX, payY, { width: payW, link: d.paymentLink, underline: true });
      }
    }

    // Right: signatory
    const sigX = margin + 375;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(C.ink)
       .text('For ' + (d.company.name || 'Company'), sigX, footY, { width: right - sigX, align: 'right' });
    doc.fontSize(8).font('Helvetica').fillColor(C.muted)
       .text('Authorised Signatory', sigX, footY + 60, { width: right - sigX, align: 'right' });
  }

  static numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Lakh', 'Crore'];

    if (num === 0) return 'Zero';

    let words = '';
    let scaleIndex = 0;

    while (num > 0 && scaleIndex < scales.length) {
      const chunk = num % (scaleIndex === 0 ? 1000 : 100);
      if (chunk > 0) {
        words = this.convertChunk(chunk, ones, teens, tens) + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + (words ? ' ' + words : '');
      }
      num = Math.floor(num / (scaleIndex === 0 ? 1000 : 100));
      scaleIndex++;
    }

    return words;
  }

  static convertChunk(num, ones, teens, tens) {
    let words = '';

    if (num >= 100) {
      words += ones[Math.floor(num / 100)] + ' Hundred';
      num %= 100;
      if (num > 0) words += ' ';
    }

    if (num >= 20) {
      words += tens[Math.floor(num / 10)];
      if (num % 10 > 0) words += ' ' + ones[num % 10];
    } else if (num >= 10) {
      words += teens[num - 10];
    } else if (num > 0) {
      words += ones[num];
    }

    return words;
  }

  // `sender` is the authenticated user (req.user) whose business is invoicing.
  // Their own SMTP settings decide which mailbox this goes out from, so the
  // customer receives the invoice from the business they actually deal with.
  static async sendInvoiceEmail(invoiceBuffer, recipientEmail, invoiceName, customMessage = null, sender = null) {
    try {
      const { getMailer } = require('./MailerService');
      const { transporter, from } = await getMailer(sender);

      // Use custom message if provided, otherwise use default
      const emailBody = customMessage
        ? customMessage.replace(/\n/g, '<br>')
        : '<p>Please find the attached invoice.</p>';

      await transporter.sendMail({
        from,
        to: recipientEmail,
        subject: `Invoice: ${invoiceName}`,
        html: emailBody,
        attachments: [
          {
            filename: `${invoiceName}.pdf`,
            content: invoiceBuffer
          }
        ]
      });

      console.log('✅ Email sent successfully to:', recipientEmail);
    } catch (error) {
      console.error('❌ Email sending error:', error.message);
      throw error;
    }
  }
}

module.exports = PDFService;
