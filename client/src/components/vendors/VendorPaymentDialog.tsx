import { useState } from "react";
import { format } from "date-fns";
import { CreditCard, Calendar, Receipt } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface VendorPaymentDialogProps {
  vendor: {
    id: string;
    name: string;
    pending_amount: number;
  };
  onPaymentMade?: () => void;
}

export function VendorPaymentDialog({ vendor, onPaymentMade }: VendorPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: "",
    reference_number: "",
    notes: ""
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implement API call to record payment
      console.log('📋 API not yet implemented');

      const amount = parseFloat(paymentData.amount);
      if (amount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      if (amount > vendor.pending_amount) {
        throw new Error('Payment amount cannot exceed pending amount');
      }

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      // Reset form
      setPaymentData({
        amount: "",
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: "",
        reference_number: "",
        notes: ""
      });
      
      setOpen(false);
      onPaymentMade?.();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CreditCard className="w-4 h-4" />
          Pay
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Record Payment for {vendor.name}
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">Pending Amount</div>
          <div className="text-2xl font-bold text-warning">
            ₹{vendor.pending_amount.toLocaleString()}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Payment Amount *</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              max={vendor.pending_amount}
              step="0.01"
              value={paymentData.amount}
              onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="Enter amount"
              required
            />
            <div className="text-xs text-muted-foreground mt-1">
              Maximum: ₹{vendor.pending_amount.toLocaleString()}
            </div>
          </div>

          <div>
            <Label htmlFor="payment_date">Payment Date *</Label>
            <Input
              id="payment_date"
              type="date"
              value={paymentData.payment_date}
              onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              value={paymentData.payment_method}
              onValueChange={(value) => setPaymentData(prev => ({ ...prev, payment_method: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input
              id="reference_number"
              value={paymentData.reference_number}
              onChange={(e) => setPaymentData(prev => ({ ...prev, reference_number: e.target.value }))}
              placeholder="Transaction ID, Cheque number, etc."
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={paymentData.notes}
              onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional payment notes (optional)"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}