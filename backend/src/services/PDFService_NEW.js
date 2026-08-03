const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

class PDFService {
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
      doc.text(customer.address, col1, yPos, { width: 150 });
      doc.text(customer.address || 'Same as billing', col3, yPos, { width: 150 });
      yPos += 12;
    }

    if (customer.email) {
      doc.text(customer.email, col1, yPos, { width: 150 });
      yPos += 10;
    }

    if (customer.phone) {
      doc.text(customer.phone, col1, yPos, { width: 150 });
      yPos += 10;
    }

    if (customer.gstNumber) {
      doc.text(`GST: ${customer.gstNumber}`, col1, yPos, { width: 150 });
      yPos += 10;
    }

    yPos += 10;

    // ======================== ITEMS TABLE ========================
    // Table Header
    doc.rect(margin, yPos, contentWidth, 24)
       .fillAndStroke('#f0f0f0', colors.lightGray);

    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor(colors.primary);

    const headerY = yPos + 7;
    doc.text('#', margin + 5, headerY);
    doc.text('DESCRIPTION', margin + 25, headerY);
    doc.text('HSN', margin + 230, headerY);
    doc.text('QTY', margin + 280, headerY, { width: 40, align: 'right' });
    doc.text('RATE', margin + 330, headerY, { width: 50, align: 'right' });
    doc.text('TAX%', margin + 390, headerY, { width: 40, align: 'right' });
    doc.text('AMOUNT', margin + 450, headerY, { width: 70, align: 'right' });

    yPos += 28;

    // Table Rows
    let rowNum = 1;
    let subtotal = 0;
    let totalTax = 0;

    doc.fontSize(8)
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
        const amount = qty * rate;
        const taxRate = item.gstRate || 0;
        const taxAmount = amount * (taxRate / 100);
        const itemTotal = item.itemTotal || (amount + taxAmount);

        subtotal += amount;
        totalTax += taxAmount;

        // Row line
        doc.moveTo(margin, yPos)
           .lineTo(pageWidth - margin, yPos)
           .strokeColor(colors.lightGray)
           .lineWidth(0.5)
           .stroke();

        yPos += 4;

        doc.text(rowNum.toString(), margin + 5, yPos);
        doc.text(item.itemName.substring(0, 40), margin + 25, yPos, { width: 200 });
        doc.text(item.hsnCode || 'N/A', margin + 230, yPos);
        doc.text(qty.toFixed(2), margin + 280, yPos, { width: 40, align: 'right' });
        doc.text(rate.toFixed(2), margin + 330, yPos, { width: 50, align: 'right' });
        doc.text(taxRate.toFixed(0), margin + 390, yPos, { width: 40, align: 'right' });
        doc.text(itemTotal.toFixed(2), margin + 450, yPos, { width: 70, align: 'right' });

        yPos += 16;
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

        yPos += 4;

        const designAmount = invoice.designCharge.amount || 0;
        const designTax = invoice.designCharge.totalAmount - designAmount;
        const designTotal = invoice.designCharge.totalAmount || designAmount;

        subtotal += designAmount;
        totalTax += designTax;

        doc.text(rowNum.toString(), margin + 5, yPos);
        doc.text('Design Charge', margin + 25, yPos, { width: 200 });
        doc.text('', margin + 230, yPos);
        doc.text('1', margin + 280, yPos, { width: 40, align: 'right' });
        doc.text(designAmount.toFixed(2), margin + 330, yPos, { width: 50, align: 'right' });
        doc.text((invoice.designCharge.gstRate || 18).toFixed(0), margin + 390, yPos, { width: 40, align: 'right' });
        doc.text(designTotal.toFixed(2), margin + 450, yPos, { width: 70, align: 'right' });

        yPos += 16;
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
    const summaryX = margin + 350;

    doc.fontSize(8)
       .font('Helvetica')
       .fillColor(colors.text);

    doc.text('Subtotal:', summaryX, yPos, { width: 100 });
    doc.text(`₹${(invoice.subtotal || subtotal).toFixed(2)}`, summaryX + 100, yPos, { width: 80, align: 'right' });
    yPos += 14;

    const cgst = (invoice.totalGstAmount || totalTax) / 2;
    doc.text('CGST (50%):', summaryX, yPos, { width: 100 });
    doc.text(`₹${cgst.toFixed(2)}`, summaryX + 100, yPos, { width: 80, align: 'right' });
    yPos += 14;

    const sgst = (invoice.totalGstAmount || totalTax) / 2;
    doc.text('SGST (50%):', summaryX, yPos, { width: 100 });
    doc.text(`₹${sgst.toFixed(2)}`, summaryX + 100, yPos, { width: 80, align: 'right' });
    yPos += 14;

    doc.moveTo(summaryX, yPos)
       .lineTo(pageWidth - margin, yPos)
       .strokeColor(colors.primary)
       .lineWidth(1)
       .stroke();

    yPos += 10;

    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(colors.primary);

    doc.text('TOTAL:', summaryX, yPos, { width: 100 });
    doc.text(`₹${(invoice.totalAmount || 0).toFixed(2)}`, summaryX + 100, yPos, { width: 80, align: 'right' });
    yPos += 14;

    doc.moveTo(summaryX, yPos)
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

  static async sendInvoiceEmail(invoiceBuffer, recipientEmail, invoiceName) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: `Invoice: ${invoiceName}`,
        html: '<p>Please find the attached invoice.</p>',
        attachments: [
          {
            filename: `${invoiceName}.pdf`,
            content: invoiceBuffer
          }
        ]
      });

      console.log('✅ Email sent successfully');
    } catch (error) {
      console.error('❌ Email sending error:', error.message);
      throw error;
    }
  }
}

module.exports = PDFService;
