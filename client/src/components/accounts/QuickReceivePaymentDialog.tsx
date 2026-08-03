import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface QuickReceivePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded: () => void;
}

export function QuickReceivePaymentDialog({ open, onOpenChange, onPaymentRecorded }: QuickReceivePaymentDialogProps) {
  const [formData, setFormData] = useState({
    customerName: "",
    amount: "",
    paymentMethod: "cash" as 'cash' | 'bank' | 'cheque',
    invoiceNumber: "",
    description: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.amount) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create income transaction for payment received
      await apiClient.createAccountTransaction({
        transactionType: 'income',
        category: 'sales',
        amount: parseFloat(formData.amount),
        description: formData.description || `Payment received from ${formData.customerName}`,
        paymentMethod: formData.paymentMethod === 'cash' ? 'cash' :
                       formData.paymentMethod === 'bank' ? 'bank_transfer' : 'cheque',
        accountType: formData.paymentMethod === 'cash' ? 'cash' : 'bank',
        accountName: formData.paymentMethod === 'cash' ? 'Cash Account' : 'Bank Account',
        reference: formData.invoiceNumber,
        notes: formData.notes,
        status: 'completed'
      });

      toast({
        title: "Payment Received",
        description: "Payment has been recorded successfully",
      });

      onPaymentRecorded();
      onOpenChange(false);

      // Reset form
      setFormData({
        customerName: "",
        amount: "",
        paymentMethod: "cash",
        invoiceNumber: "",
        description: "",
        notes: ""
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
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
          <DialogTitle>Receive Payment</DialogTitle>
          <DialogDescription>
            Record a payment received from a customer.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              placeholder="Enter customer name"
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
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(value: 'cash' | 'bank' | 'cheque') => 
                setFormData(prev => ({ ...prev, paymentMethod: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
              placeholder="Invoice number (if applicable)"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Payment description"
            />
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
              {loading ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}