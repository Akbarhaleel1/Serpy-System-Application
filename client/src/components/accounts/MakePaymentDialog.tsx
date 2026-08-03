import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface MakePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded: () => void;
}

export function MakePaymentDialog({ open, onOpenChange, onPaymentRecorded }: MakePaymentDialogProps) {
  const [formData, setFormData] = useState({
    payeeName: "",
    amount: "",
    paymentMethod: "cash" as 'cash' | 'bank' | 'cheque',
    category: "",
    description: "",
    reference: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.payeeName || !formData.amount) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to record payment
      console.log('📋 API not yet implemented');

      toast({
        title: "Payment Recorded",
        description: "Payment has been recorded successfully",
      });
      
      onPaymentRecorded();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        payeeName: "",
        amount: "",
        paymentMethod: "cash",
        category: "",
        description: "",
        reference: "",
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
          <DialogTitle>Make Payment</DialogTitle>
          <DialogDescription>
            Record a payment made to a vendor, supplier, or other party.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payeeName">Payee Name *</Label>
            <Input
              id="payeeName"
              value={formData.payeeName}
              onChange={(e) => setFormData(prev => ({ ...prev, payeeName: e.target.value }))}
              placeholder="Enter payee name"
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
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, category: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="materials">Materials</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
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
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              value={formData.reference}
              onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
              placeholder="Invoice number, receipt, etc."
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