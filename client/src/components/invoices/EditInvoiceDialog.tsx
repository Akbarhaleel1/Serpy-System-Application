import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calculator } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface InvoiceItem {
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  hsnCode: string;
  gstRate: number;
  gstAmount: number;
  itemTotal: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    gstNumber?: string;
  };
  jobId?: {
    _id: string;
    title: string;
  };
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  totalGstAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  paymentStatus: string;
  isInterState: boolean;
  notes: string;
  termsAndConditions: string;
}

interface EditInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onInvoiceUpdated: () => void;
}

export function EditInvoiceDialog({ open, onOpenChange, invoice, onInvoiceUpdated }: EditInvoiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [hsnCodes, setHsnCodes] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customerId: "",
    jobId: "",
    invoiceDate: "",
    dueDate: "",
    items: [] as InvoiceItem[],
    discountAmount: 0,
    isInterState: false,
    notes: "",
    termsAndConditions: ""
  });
  const { toast } = useToast();

  const toDateInput = (val: any) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (invoice && open) {
      setFormData({
        customerId: invoice.customerId?._id || (invoice.customerId as any) || "",
        jobId: invoice.jobId?._id || "",
        invoiceDate: toDateInput(invoice.invoiceDate),
        dueDate: toDateInput(invoice.dueDate),
        items: invoice.items.map(item => {
          const base = (item as any).itemType === 'Square Feet'
            ? ((item as any).totalSquareFeet || 0) * item.unitPrice
            : item.quantity * item.unitPrice;
          const gstAmount = base * (item.gstRate / 100);
          return { ...item, totalAmount: base, gstAmount, itemTotal: base + gstAmount };
        }),
        discountAmount: invoice.discountAmount || 0,
        isInterState: invoice.isInterState || false,
        notes: invoice.notes || "",
        termsAndConditions: invoice.termsAndConditions || ""
      });
    }
  }, [invoice, open]);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchJobs();
      fetchHsnCodes();
    }
  }, [open]);

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.getCustomer();
      const data = Array.isArray(response) ? response : (response?.customers || []);
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await apiClient.getJobs();
      const data = Array.isArray(response) ? response : (response?.jobs || []);
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchHsnCodes = async () => {
    try {
      const response = await apiClient.getHsnCodes();
      const data = Array.isArray(response) ? response : (response?.hsnCodes || []);
      setHsnCodes(data);
    } catch (error) {
      console.error('Error fetching HSN codes:', error);
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        itemName: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        totalAmount: 0,
        hsnCode: "",
        gstRate: 18,
        gstAmount: 0,
        itemTotal: 0
      }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate totals
      if (field === 'quantity' || field === 'unitPrice' || field === 'gstRate') {
        const quantity = field === 'quantity' ? value : newItems[index].quantity;
        const unitPrice = field === 'unitPrice' ? value : newItems[index].unitPrice;
        const gstRate = field === 'gstRate' ? value : newItems[index].gstRate;
        
        const totalAmount = quantity * unitPrice;
        const gstAmount = totalAmount * (gstRate / 100);
        const itemTotal = totalAmount + gstAmount;
        
        newItems[index] = {
          ...newItems[index],
          quantity,
          unitPrice,
          gstRate,
          totalAmount,
          gstAmount,
          itemTotal
        };
      }
      
      return { ...prev, items: newItems };
    });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.totalAmount, 0);
    const taxableAmount = subtotal - formData.discountAmount;
    const totalGstAmount = formData.items.reduce((sum, item) => sum + item.gstAmount, 0);
    const totalAmount = taxableAmount + totalGstAmount;
    
    return { subtotal, taxableAmount, totalGstAmount, totalAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    
    setLoading(true);
    
    try {
      const totals = calculateTotals();
      
      await apiClient.updateInvoice(invoice.id, {
        ...formData,
        jobId: formData.jobId === 'no-job' ? null : formData.jobId,
        ...totals
      });
      
      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
      
      onInvoiceUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Invoice - {invoice?.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Update invoice details and items
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer and Job Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer</Label>
              <Select
                value={formData.customerId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer._id} value={customer._id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="jobId">Job (Optional)</Label>
              <Select
                value={formData.jobId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, jobId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-job">No job</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job._id} value={job._id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Invoice Items</Label>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            {formData.items.map((item, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Item {index + 1}</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Item Name</Label>
                      <Input
                        value={item.itemName}
                        onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                        placeholder="Enter item name"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Enter description"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>HSN Code</Label>
                      <Select
                        value={item.hsnCode}
                        onValueChange={(value) => updateItem(index, 'hsnCode', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select HSN" />
                        </SelectTrigger>
                        <SelectContent>
                          {hsnCodes.map((hsn) => (
                            <SelectItem key={hsn._id} value={hsn.hsnCode}>
                              {hsn.hsnCode} - {hsn.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>GST Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.gstRate}
                        onChange={(e) => updateItem(index, 'gstRate', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-2 bg-muted rounded">
                      <div className="font-medium">Total Amount</div>
                      <div>₹{item.totalAmount.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <div className="font-medium">GST Amount</div>
                      <div>₹{item.gstAmount.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <div className="font-medium">Item Total</div>
                      <div>₹{item.itemTotal.toFixed(2)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <Label htmlFor="discountAmount">Discount Amount</Label>
            <Input
              id="discountAmount"
              type="number"
              min="0"
              step="0.01"
              value={formData.discountAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          {/* Inter-state */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isInterState"
              checked={formData.isInterState}
              onChange={(e) => setFormData(prev => ({ ...prev, isInterState: e.target.checked }))}
            />
            <Label htmlFor="isInterState">Inter-state transaction</Label>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Enter any additional notes"
            />
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-2">
            <Label htmlFor="termsAndConditions">Terms and Conditions</Label>
            <Textarea
              id="termsAndConditions"
              value={formData.termsAndConditions}
              onChange={(e) => setFormData(prev => ({ ...prev, termsAndConditions: e.target.value }))}
              placeholder="Enter terms and conditions"
            />
          </div>

          {/* Totals Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Invoice Totals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-₹{formData.discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <span>₹{totals.taxableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total GST:</span>
                <span>₹{totals.totalGstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total Amount:</span>
                <span>₹{totals.totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
