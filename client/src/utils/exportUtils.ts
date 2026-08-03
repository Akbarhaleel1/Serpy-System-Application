// Export utilities for CSV and PDF generation
export const exportToCSV = (data: any[], filename: string, headers?: string[]) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Use provided headers or generate from first object keys
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    csvHeaders.join(','), // Header row
    ...data.map(row => 
      csvHeaders.map(header => {
        const value = row[header];
        // Handle special cases and escape commas
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        if (Array.isArray(value)) return `"${value.join('; ')}"`;
        if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Format customer data for export
export const formatCustomersForExport = (customers: any[]) => {
  return customers.map(customer => ({
    'Customer Name': customer.name,
    'Email': customer.email || '',
    'Phone': customer.phone || '',
    'Company': customer.company || '',
    'Customer Type': customer.customer_type,
    'Revenue Segment': customer.revenue_segment || 'Bronze',
    'Total Revenue': customer.total_revenue || 0,
    'Total Orders': customer.total_orders || 0,
    'GST Number': customer.gst_number || '',
    'GST Verified': customer.gst_verified ? 'Yes' : 'No',
    'WhatsApp Consent': customer.whatsapp_consent ? 'Yes' : 'No',
    'Outstanding Balance': customer.outstanding_balance || 0,
    'Payment Status': customer.payment_status,
    'Status': customer.status,
    'Tags': Array.isArray(customer.tags) ? customer.tags.join('; ') : '',
    'Address': customer.address || '',
    'Created Date': new Date(customer.created_at).toLocaleDateString(),
    'Last Order Date': customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString() : '',
    'Last Payment Date': customer.last_payment_date ? new Date(customer.last_payment_date).toLocaleDateString() : '',
    'Notes': customer.notes || ''
  }));
};

// Format invoice data for export
export const formatInvoicesForExport = (invoices: any[]) => {
  return invoices.map(invoice => ({
    'Invoice Number': invoice.invoice_number,
    'Customer Name': invoice.customer_name || invoice.customers?.name || '',
    'Date': new Date(invoice.created_at).toLocaleDateString(),
    'Due Date': invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '',
    'Subtotal': invoice.subtotal || 0,
    'CGST Rate': invoice.cgst_rate || 0,
    'SGST Rate': invoice.sgst_rate || 0,
    'IGST Rate': invoice.igst_rate || 0,
    'CGST Amount': invoice.cgst_amount || 0,
    'SGST Amount': invoice.sgst_amount || 0,
    'IGST Amount': invoice.igst_amount || 0,
    'Tax Amount': invoice.tax_amount || 0,
    'Discount Amount': invoice.discount_amount || 0,
    'Round Off': invoice.round_off_amount || 0,
    'Total Amount': invoice.total_amount,
    'Status': invoice.status,
    'Payment Terms': invoice.payment_terms || '',
    'Is Interstate': invoice.is_interstate ? 'Yes' : 'No',
    'Customer GSTIN': invoice.customer_gstin || '',
    'Paid Date': invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : '',
    'Notes': invoice.notes || ''
  }));
};

// Format inventory data for export
export const formatInventoryForExport = (inventory: any[]) => {
  return inventory.map(item => ({
    'Item Name': item.name,
    'SKU': item.sku || '',
    'Description': item.description || '',
    'Category': item.category || '',
    'Current Quantity': item.quantity || 0,
    'Unit Cost': item.unit_cost || 0,
    'Selling Price': item.selling_price || 0,
    'Min Stock Level': item.min_stock_level || 0,
    'Reorder Point': item.reorder_point || 0,
    'Location': item.location || '',
    'Supplier': item.supplier || '',
    'Stock Status': (item.quantity || 0) <= (item.min_stock_level || 0) ? 'Low Stock' : 'In Stock',
    'Stock Alert Sent': item.stock_alert_sent ? 'Yes' : 'No',
    'Created Date': new Date(item.created_at).toLocaleDateString(),
    'Last Updated': new Date(item.updated_at).toLocaleDateString()
  }));
};

// Format job data for export
export const formatJobsForExport = (jobs: any[]) => {
  return jobs.map(job => ({
    'Job ID': job.id,
    'Title': job.title,
    'Customer': job.customers?.name || job.customer_name || '',
    'Description': job.description || '',
    'Status': job.status,
    'Priority': job.priority,
    'Estimated Cost': job.estimated_cost || 0,
    'Actual Cost': job.actual_cost || 0,
    'Profit Margin': job.profit_percentage ? `${job.profit_percentage.toFixed(2)}%` : '',
    'Created Date': new Date(job.created_at).toLocaleDateString(),
    'Due Date': job.due_date ? new Date(job.due_date).toLocaleDateString() : '',
    'Completed Date': job.completed_at ? new Date(job.completed_at).toLocaleDateString() : ''
  }));
};

// Format vendor data for export
export const formatVendorsForExport = (vendors: any[]) => {
  return vendors.map(vendor => ({
    'Vendor Name': vendor.name,
    'Email': vendor.email || '',
    'Phone': vendor.phone || '',
    'Contact Person': vendor.contact_person || '',
    'Vendor Type': vendor.vendor_type,
    'Total Purchases': vendor.total_purchases || 0,
    'Pending Amount': vendor.pending_amount || 0,
    'Credit Days': vendor.credit_days || 0,
    'Payment Terms': vendor.payment_terms || '',
    'GST Number': vendor.gst_number || '',
    'Address': vendor.address || '',
    'Status': vendor.status,
    'Last Purchase Date': vendor.last_purchase_date ? new Date(vendor.last_purchase_date).toLocaleDateString() : '',
    'Created Date': new Date(vendor.created_at).toLocaleDateString(),
    'Notes': vendor.notes || ''
  }));
};

// Enhanced CSV export with multiple sheets simulation
export const exportMultipleToCSV = (datasets: { name: string; data: any[]; headers?: string[] }[], baseFilename: string) => {
  datasets.forEach(dataset => {
    if (dataset.data && dataset.data.length > 0) {
      exportToCSV(dataset.data, `${baseFilename}_${dataset.name}`, dataset.headers);
    }
  });
};

// Generate QR code data for invoices
export const generateInvoiceQR = (invoice: any) => {
  // GST Invoice QR code format as per Indian standards
  const qrData = {
    seller_gstin: invoice.business_gstin || '',
    buyer_gstin: invoice.customer_gstin || '',
    invoice_number: invoice.invoice_number,
    invoice_date: new Date(invoice.created_at).toISOString().split('T')[0],
    total_amount: invoice.total_amount,
    taxable_amount: invoice.subtotal || 0,
    cgst_amount: invoice.cgst_amount || 0,
    sgst_amount: invoice.sgst_amount || 0,
    igst_amount: invoice.igst_amount || 0
  };
  
  return JSON.stringify(qrData);
};