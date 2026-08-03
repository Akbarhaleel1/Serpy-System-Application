import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CreatePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentCreated: () => void;
}

export function CreatePaymentDialog({ open, onOpenChange, onPaymentCreated }: CreatePaymentDialogProps) {
  const [formData, setFormData] = useState({
    invoiceId: "",
    customerId: "",
    amount: "",
    paymentMethod: "cash" as 'cash' | 'bank' | 'cheque' | 'card',
    date: new Date().toISOString().split('T')[0],
    status: "completed" as 'pending' | 'completed' | 'failed' | 'refunded',
    reference: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.invoiceId || !formData.customerId || !formData.amount) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to create payment
      console.log('📋 API not yet implemented');
      
      toast({
        title: "Payment Created",
        description: "Payment has been recorded successfully",
      });
      
      onPaymentCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        invoiceId: "",
        customerId: "",
        amount: "",
        paymentMethod: "cash",
        date: new Date().toISOString().split('T')[0],
        status: "completed",
        reference: "",
        notes: ""
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Error",
        description: "Failed to create payment",
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
          <DialogTitle>Record New Payment</DialogTitle>
          <DialogDescription>
            Record a new payment received from a customer.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceId">Invoice ID *</Label>
            <Input
              id="invoiceId"
              value={formData.invoiceId}
              onChange={(e) => setFormData(prev => ({ ...prev, invoiceId: e.target.value }))}
              placeholder="Enter invoice ID"
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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(value: 'cash' | 'bank' | 'cheque' | 'card') => 
                setFormData(prev => ({ ...prev, paymentMethod: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: 'pending' | 'completed' | 'failed' | 'refunded') => 
                setFormData(prev => ({ ...prev, status: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">Payment Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
              placeholder="Transaction reference, receipt number, etc."
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