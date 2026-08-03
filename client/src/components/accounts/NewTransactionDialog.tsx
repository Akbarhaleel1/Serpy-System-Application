import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface NewTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionCreated: () => void;
}

export function NewTransactionDialog({ open, onOpenChange, onTransactionCreated }: NewTransactionDialogProps) {
  const [formData, setFormData] = useState({
    transactionType: "income" as 'income' | 'expense' | 'transfer',
    category: "",
    amount: "",
    description: "",
    paymentMethod: "cash" as 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'upi',
    accountType: "cash" as 'cash' | 'bank' | 'credit_card' | 'loan' | 'investment',
    accountName: "",
    reference: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category || !formData.amount || !formData.description || !formData.accountName) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await apiClient.createAccountTransaction({
        transactionType: formData.transactionType,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description,
        paymentMethod: formData.paymentMethod,
        accountType: formData.accountType,
        accountName: formData.accountName,
        reference: formData.reference,
        notes: formData.notes,
        status: 'completed'
      });

      toast({
        title: "Transaction Created",
        description: "Transaction has been recorded successfully",
      });

      onTransactionCreated();
      onOpenChange(false);

      // Reset form
      setFormData({
        transactionType: "income",
        category: "",
        amount: "",
        description: "",
        paymentMethod: "cash",
        accountType: "cash",
        accountName: "",
        reference: "",
        notes: ""
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to create transaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
          <DialogDescription>
            Record a new financial transaction (income or expense)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transactionType">Transaction Type *</Label>
              <Select value={formData.transactionType} onValueChange={(value: 'income' | 'expense' | 'transfer') =>
                setFormData(prev => ({ ...prev, transactionType: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter transaction description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) =>
              setFormData(prev => ({ ...prev, category: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {formData.transactionType === 'income' ? (
                  <>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="service">Service Income</SelectItem>
                    <SelectItem value="printing">Printing Jobs</SelectItem>
                    <SelectItem value="other_income">Other Income</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="materials">Materials</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="salaries">Salaries</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="other_expense">Other Expense</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select value={formData.paymentMethod} onValueChange={(value: any) =>
                setFormData(prev => ({ ...prev, paymentMethod: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
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

          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name *</Label>
            <Input
              id="accountName"
              value={formData.accountName}
              onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
              placeholder="e.g., Main Cash Account, HDFC Bank"
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
              {loading ? 'Creating...' : 'Create Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
