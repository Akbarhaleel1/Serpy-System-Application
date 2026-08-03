import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Receipt, FileText } from "lucide-react";

interface JobInvoiceDialogProps {
  children: React.ReactNode;
  job: any;
  onInvoiceGenerated?: () => void;
}

export function JobInvoiceDialog({ children, job, onInvoiceGenerated }: JobInvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [billingType, setBillingType] = useState<"b2b" | "b2c">("b2c");
  const [customers, setCustomers] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    customer_id: job.customerId || "",
    customer_gstin: "",
    is_interstate: false,
    payment_terms: "Immediate",
    notes: "",
    po_reference: "",
    terms_conditions: ""
  });

  // Calculate invoice totals from job items and design charge
  const calculateInvoiceTotals = () => {
    let itemsSubtotal = 0;
    let itemsTax = 0;
    let itemsTotal = 0;

    // Sum all invoice items
    if (job.items && Array.isArray(job.items) && job.items.length > 0) {
      job.items.forEach((item: any) => {
        // Calculate subtotal based on itemType (Square Feet vs Numbers)
        const itemSubtotal = item.itemType === 'Square Feet'
          ? (item.totalSquareFeet || 0) * item.unitPrice
          : (item.quantity || 0) * item.unitPrice;

        itemsSubtotal += itemSubtotal;

        // Calculate tax from subtotal, not from itemTotal (which already includes tax)
        const itemTax = itemSubtotal * (item.gstRate / 100);
        itemsTax += itemTax;

        // Total = subtotal + tax
        itemsTotal += itemSubtotal + itemTax;
      });
    }

    // Add design charge if exists
    let designChargeSubtotal = 0;
    let designChargeTax = 0;
    let designChargeTotal = 0;

    if (job.designCharge) {
      designChargeSubtotal = job.designCharge.amount || 0;
      designChargeTax = job.designCharge.totalAmount - job.designCharge.amount || 0;
      designChargeTotal = job.designCharge.totalAmount || 0;
    }

    return {
      itemsSubtotal,
      itemsTax,
      itemsTotal,
      designChargeSubtotal,
      designChargeTax,
      designChargeTotal,
      grandSubtotal: itemsSubtotal + designChargeSubtotal,
      grandTax: itemsTax + designChargeTax,
      grandTotal: itemsTotal + designChargeTotal
    };
  };

  // Fetch customers when dialog opens
  const fetchCustomers = async () => {
    try {
      const response = await apiClient.getCustomers();
      console.log('👥 Customers fetched:', response);
      // Ensure we always have an array
      const customersData = Array.isArray(response) ? response : (response?.customers || []);
      console.log('👥 Processed customers:', customersData);
      setCustomers(customersData);
      
      // Set default customer if job has one
      if (job.customerId) {
        setFormData(prev => ({ ...prev, customer_id: job.customerId }));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]); // Set empty array on error
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    }
  };

  const generateInvoiceNumber = async () => {
    try {
      const response = await apiClient.getInvoiceStats();
      console.log('📄 Invoice number generated:', response);
      return response.invoiceNumber || "INV-001";
    } catch (error) {
      console.error('Error generating invoice number:', error);
      return "INV-001";
    }
  };

  const calculateTaxAmounts = (subtotal: number, taxRate: number, isInterstate: boolean) => {
    const totalTax = (subtotal * taxRate) / 100;
    
    if (isInterstate) {
      return {
        cgst_rate: 0,
        sgst_rate: 0,
        igst_rate: taxRate,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: totalTax,
        total_tax: totalTax
      };
    } else {
      const cgst_sgst_rate = taxRate / 2;
      const cgst_sgst_amount = totalTax / 2;
      return {
        cgst_rate: cgst_sgst_rate,
        sgst_rate: cgst_sgst_rate,
        igst_rate: 0,
        cgst_amount: cgst_sgst_amount,
        sgst_amount: cgst_sgst_amount,
        igst_amount: 0,
        total_tax: totalTax
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const totals = calculateInvoiceTotals();

      // Build invoice data from job items - preserve all necessary fields for backend
      const items = (job.items || []).map((item: any) => ({
        itemName: item.itemName,
        itemType: item.itemType || 'Numbers',  // Pass itemType to backend
        quantity: item.quantity || 0,  // Send actual quantity field
        totalSquareFeet: item.totalSquareFeet || 0,  // Send actual totalSquareFeet field
        length: item.length || 0,  // Send length for square feet items
        width: item.width || 0,    // Send width for square feet items
        unitPrice: item.unitPrice,
        hsnCode: item.hsnCode,
        gstRate: item.gstRate,
        itemTotal: item.itemTotal || 0
      }));

      const invoiceData = {
        jobId: job._id,
        customerId: formData.customer_id,
        billingType: billingType,
        items: items,
        designCharge: job.designCharge || null,
        subtotal: totals.grandSubtotal,
        taxAmount: totals.grandTax,
        totalAmount: totals.grandTotal,
        paymentTerms: formData.payment_terms,
        notes: formData.notes,
        po_reference: formData.po_reference,
        terms_conditions: formData.terms_conditions,
        isInterstate: formData.is_interstate,
        customerGSTIN: formData.customer_gstin
      };

      console.log('📄 Creating invoice with data:', invoiceData);

      const response = await apiClient.createInvoice(invoiceData);
      console.log('📄 Invoice created:', response);

      // Get the invoice ID from the response
      const invoiceId = response?.invoice?._id || response?._id || response?.id;

      if (!invoiceId) {
        throw new Error('Invoice ID not received from server');
      }

      console.log('📄 Invoice ID:', invoiceId);

      toast({
        title: "Success",
        description: "Invoice generated successfully. Starting PDF download...",
      });

      // Wait a moment for the invoice to be fully saved, then download PDF
      setTimeout(async () => {
        try {
          console.log('📥 Starting automatic PDF download for invoice:', invoiceId);
          await apiClient.downloadInvoicePDF(invoiceId);

          toast({
            title: "Download Complete",
            description: "Invoice PDF has been downloaded",
          });
        } catch (downloadError) {
          console.error('Error downloading PDF:', downloadError);
          toast({
            title: "PDF Download Failed",
            description: "Invoice was created but PDF download failed. You can download it manually from the invoices page.",
            variant: "destructive",
          });
        } finally {
          setOpen(false);
          onInvoiceGenerated?.();
        }
      }, 500);
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      if (error.stockCheck?.length > 0) {
        const lines = (error.details as string[]) || error.stockCheck.map((s: any) =>
          `"${s.itemName}": Available ${s.availableQuantity}, Required ${s.requiredQuantity} (${s.unit})`
        );
        toast({
          title: "Insufficient Stock",
          description: lines.join('\n'),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to generate invoice",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={fetchCustomers}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Generate Invoice - {job.title}
          </DialogTitle>
          <DialogDescription>
            Create a professional invoice for this job
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Billing Type */}
          <div className="space-y-3">
            <Label>Billing Type</Label>
            <RadioGroup value={billingType} onValueChange={(value: "b2b" | "b2c") => setBillingType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="b2c" id="b2c" />
                <Label htmlFor="b2c">B2C (Business to Consumer)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="b2b" id="b2b" />
                <Label htmlFor="b2b">B2B (Business to Business)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <Select value={formData.customer_id} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, customer_id: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(customers) && customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* B2B Specific Fields */}
          {billingType === "b2b" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstin">Customer GSTIN</Label>
                <Input
                  id="gstin"
                  value={formData.customer_gstin}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_gstin: e.target.value }))}
                  placeholder="Enter GSTIN"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interstate">Transaction Type</Label>
                <Select value={formData.is_interstate ? "interstate" : "intrastate"} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, is_interstate: value === "interstate" }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intrastate">Intrastate</SelectItem>
                    <SelectItem value="interstate">Interstate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Additional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Select value={formData.payment_terms} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, payment_terms: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Immediate">Immediate</SelectItem>
                  <SelectItem value="15 Days">15 Days</SelectItem>
                  <SelectItem value="30 Days">30 Days</SelectItem>
                  <SelectItem value="45 Days">45 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="po_reference">PO Reference</Label>
              <Input
                id="po_reference"
                value={formData.po_reference}
                onChange={(e) => setFormData(prev => ({ ...prev, po_reference: e.target.value }))}
                placeholder="Purchase Order Reference"
              />
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes for the invoice"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms_conditions">Terms & Conditions</Label>
            <Textarea
              id="terms_conditions"
              value={formData.terms_conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
              placeholder="Terms and conditions"
              rows={3}
            />
          </div>

          {/* Invoice Items Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items Section */}
              {job.items && job.items.length > 0 ? (
                <div className="space-y-3">
                  <div className="font-semibold text-sm mb-2">Invoice Items:</div>
                  <div className="space-y-2">
                    {job.items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm p-2 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{item.itemName}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.itemType === 'Square Feet'
                              ? `${item.totalSquareFeet} sq ft × ₹${item.unitPrice}/sq ft`
                              : `Qty: ${item.quantity} × ₹${item.unitPrice}`
                            } @ {item.gstRate}% GST (HSN: {item.hsnCode})
                          </div>
                        </div>
                        <div className="text-right font-medium">₹{item.itemTotal?.toFixed(2) || 0}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No items added to this job</div>
              )}

              {/* Design Charge Section */}
              {job.designCharge && (
                <div className="space-y-2 mt-4 pt-4 border-t">
                  <div className="font-semibold text-sm">Design Charge:</div>
                  <div className="flex justify-between text-sm p-2 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">Design Charge</div>
                      <div className="text-xs text-muted-foreground">
                        ₹{job.designCharge.amount?.toFixed(2) || 0} @ {job.designCharge.gstRate}% GST (HSN: {job.designCharge.hsnCode})
                      </div>
                    </div>
                    <div className="text-right font-medium">₹{job.designCharge.totalAmount?.toFixed(2) || 0}</div>
                  </div>
                </div>
              )}

              {/* Totals */}
              {(() => {
                const totals = calculateInvoiceTotals();
                return (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>₹{totals.grandSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>₹{totals.grandTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base pt-2 border-t">
                      <span>Total:</span>
                      <span className="text-green-600">₹{totals.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}