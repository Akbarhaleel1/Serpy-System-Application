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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { DollarSign, CreditCard } from "lucide-react";

interface JobPaymentDialogProps {
  children: React.ReactNode;
  job: any;
  onPaymentReceived?: () => void;
}

export function JobPaymentDialog({ children, job, onPaymentReceived }: JobPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    invoice_id: "",
    amount: "",
    payment_method: "",
    reference_number: "",
    payment_date: new Date().toISOString().split('T')[0],
    notes: "",
    account_type: "cash" // cash or bank
  });

  // Fetch job invoices when dialog opens
  const fetchJobInvoices = async () => {
    try {
      // TODO: Implement API call to fetch job invoices
      console.log('📋 API not yet implemented');
      setInvoices([]);
      
      // Pre-select first unpaid invoice if available
      const unpaidInvoice = invoices.find(inv => inv.status !== 'paid');
      if (unpaidInvoice) {
        setFormData(prev => ({
          ...prev,
          invoice_id: unpaidInvoice.id,
          amount: unpaidInvoice.total_amount.toString()
        }));
      }
    } catch (error) {
      console.error('Error fetching job invoices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch job invoices",
        variant: "destructive",
      });
    }
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    const selectedInvoice = invoices.find(inv => inv.id === invoiceId);
    if (selectedInvoice) {
      setFormData(prev => ({
        ...prev,
        invoice_id: invoiceId,
        amount: selectedInvoice.total_amount.toString()
      }));
    }
  };

  const handleReceivePayment = async () => {
    if (!user || !job) return;

    setLoading(true);
    try {
      // TODO: Implement API call to receive payment
      console.log('📋 API not yet implemented');
      
      toast({
        title: "Success",
        description: "Payment received successfully",
      });
      
      setOpen(false);
      onPaymentReceived?.();
    } catch (error) {
      console.error('Error receiving payment:', error);
      toast({
        title: "Error",
        description: "Failed to receive payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={fetchJobInvoices}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Receive Payment - {job.title}
          </DialogTitle>
          <DialogDescription>
            Record a payment received for this job
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Selection */}
          <div className="space-y-2">
            <Label htmlFor="invoice">Select Invoice</Label>
            <Select value={formData.invoice_id} onValueChange={handleInvoiceSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select invoice to pay" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - ₹{invoice.total_amount} ({invoice.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
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
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select value={formData.payment_method} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, payment_method: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="Transaction reference"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_type">Account Type</Label>
            <Select value={formData.account_type} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, account_type: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash Account</SelectItem>
                <SelectItem value="bank">Bank Account</SelectItem>
              </SelectContent>
            </Select>
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

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReceivePayment} disabled={loading}>
              {loading ? "Processing..." : "Receive Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}