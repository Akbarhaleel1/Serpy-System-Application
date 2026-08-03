import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CreateDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscountCreated: () => void;
}

export function CreateDiscountDialog({ open, onOpenChange, onDiscountCreated }: CreateDiscountDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "percentage" as 'percentage' | 'fixed_amount',
    value: "",
    minimumAmount: "",
    customerType: "all" as 'all' | 'Individual' | 'Business' | 'Corporate' | 'Walk-in',
    validFrom: "",
    validTo: "",
    usageLimit: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.value) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to create discount rule
      console.log('📋 API not yet implemented');
      
      toast({
        title: "Discount Rule Created",
        description: "Discount rule has been created successfully",
      });
      
      onDiscountCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "",
        type: "percentage",
        value: "",
        minimumAmount: "",
        customerType: "all",
        validFrom: "",
        validTo: "",
        usageLimit: "",
        notes: ""
      });
    } catch (error) {
      console.error('Error creating discount rule:', error);
      toast({
        title: "Error",
        description: "Failed to create discount rule",
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
          <DialogTitle>Create Discount Rule</DialogTitle>
          <DialogDescription>
            Create a new discount rule for customers.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter discount rule name"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Discount Type</Label>
              <Select value={formData.type} onValueChange={(value: 'percentage' | 'fixed_amount') => 
                setFormData(prev => ({ ...prev, type: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="value">Discount Value *</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                placeholder={formData.type === 'percentage' ? "0.00" : "0.00"}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="minimumAmount">Minimum Amount</Label>
            <Input
              id="minimumAmount"
              type="number"
              step="0.01"
              value={formData.minimumAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, minimumAmount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="customerType">Customer Type</Label>
            <Select value={formData.customerType} onValueChange={(value: 'all' | 'Individual' | 'Business' | 'Corporate' | 'Walk-in') => 
              setFormData(prev => ({ ...prev, customerType: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="Individual">Individual</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
                <SelectItem value="Corporate">Corporate</SelectItem>
                <SelectItem value="Walk-in">Walk-in</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid From</Label>
              <Input
                id="validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="validTo">Valid To</Label>
              <Input
                id="validTo"
                type="date"
                value={formData.validTo}
                onChange={(e) => setFormData(prev => ({ ...prev, validTo: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="usageLimit">Usage Limit</Label>
            <Input
              id="usageLimit"
              type="number"
              value={formData.usageLimit}
              onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: e.target.value }))}
              placeholder="Leave empty for unlimited"
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
              {loading ? "Creating..." : "Create Discount Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
