import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ChequeIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChequeIssued: () => void;
}

export function ChequeIssueDialog({ open, onOpenChange, onChequeIssued }: ChequeIssueDialogProps) {
  const [formData, setFormData] = useState({
    chequeNumber: "",
    payeeName: "",
    amount: "",
    issueDate: new Date().toISOString().split('T')[0],
    purpose: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.chequeNumber || !formData.payeeName || !formData.amount) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to issue cheque
      console.log('📋 API not yet implemented');

      toast({
        title: "Cheque Issued",
        description: "Cheque has been issued successfully",
      });
      
      onChequeIssued();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        chequeNumber: "",
        payeeName: "",
        amount: "",
        issueDate: new Date().toISOString().split('T')[0],
        purpose: "",
        notes: ""
      });
    } catch (error) {
      console.error('Error issuing cheque:', error);
      toast({
        title: "Error",
        description: "Failed to issue cheque",
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
          <DialogTitle>Issue Cheque</DialogTitle>
          <DialogDescription>
            Record a new cheque issued to a payee.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chequeNumber">Cheque Number *</Label>
            <Input
              id="chequeNumber"
              value={formData.chequeNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, chequeNumber: e.target.value }))}
              placeholder="Enter cheque number"
              />
            </div>

          <div className="space-y-2">
            <Label htmlFor="payeeName">Payee Name *</Label>
            <Input
              id="payeeName"
              value={formData.payeeName}
              onChange={(e) => setFormData(prev => ({ ...prev, payeeName: e.target.value }))}
              placeholder="Enter payee name"
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
          
          <div className="space-y-2">
            <Label htmlFor="issueDate">Issue Date</Label>
            <Input
              id="issueDate"
              type="date"
              value={formData.issueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
              />
            </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Select value={formData.purpose} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, purpose: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="materials">Materials</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="other">Other</SelectItem>
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
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Issuing..." : "Issue Cheque"}
              </Button>
          </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}