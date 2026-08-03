import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceCreated: () => void;
}

export function CreateInvoiceDialog({ open, onOpenChange, onInvoiceCreated }: CreateInvoiceDialogProps) {
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    customerId: "",
    jobId: "",
    amount: "",
    taxRate: "18" as '0' | '5' | '12' | '18' | '28',
    dueDate: "",
    status: "pending" as 'pending' | 'paid' | 'overdue' | 'cancelled',
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.invoiceNumber || !formData.customerId || !formData.amount) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.createInvoice(formData);
      console.log('📄 Invoice created:', response);
      
      toast({
        title: "Invoice Created",
        description: "Invoice has been created successfully",
      });
      
      onInvoiceCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        invoiceNumber: "",
        customerId: "",
        jobId: "",
        amount: "",
        taxRate: "18",
        dueDate: "",
        status: "pending",
        notes: ""
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for a customer.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number *</Label>
            <Input
              id="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
              placeholder="Enter invoice number"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customerId">Customer ID *</Label>
            <Input
              id="customerId"
              value={formData.customerId}
              onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
              placeholder="Enter customer ID"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="jobId">Job ID</Label>
            <Input
              id="jobId"
              value={formData.jobId}
              onChange={(e) => setFormData(prev => ({ ...prev, jobId: e.target.value }))}
              placeholder="Enter job ID"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate</Label>
              <Select value={formData.taxRate} onValueChange={(value: '0' | '5' | '12' | '18' | '28') => 
                setFormData(prev => ({ ...prev, taxRate: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">18%</SelectItem>
                  <SelectItem value="28">28%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: 'pending' | 'paid' | 'overdue' | 'cancelled') => 
                setFormData(prev => ({ ...prev, status: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes (optional)"
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}