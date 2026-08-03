import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CreateEmergencyOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: () => void;
}

export function CreateEmergencyOrderDialog({ open, onOpenChange, onOrderCreated }: CreateEmergencyOrderDialogProps) {
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    orderDetails: "",
    estimatedAmount: "",
    priority: "high" as 'low' | 'medium' | 'high' | 'urgent',
    status: "pending" as 'pending' | 'in_progress' | 'completed' | 'cancelled',
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerPhone || !formData.orderDetails) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to create emergency order
      console.log('📋 API not yet implemented');
      
      toast({
        title: "Emergency Order Created",
        description: "Emergency order has been created successfully",
      });
      
      onOrderCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        customerName: "",
        customerPhone: "",
        orderDetails: "",
        estimatedAmount: "",
        priority: "high",
        status: "pending",
        notes: ""
      });
    } catch (error) {
      console.error('Error creating emergency order:', error);
      toast({
        title: "Error",
        description: "Failed to create emergency order",
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
          <DialogTitle>Create Emergency Order</DialogTitle>
          <DialogDescription>
            Create a new emergency order for urgent printing needs.
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
          
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Customer Phone *</Label>
            <Input
              id="customerPhone"
              value={formData.customerPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
              placeholder="Enter customer phone number"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="orderDetails">Order Details *</Label>
            <Textarea
              id="orderDetails"
              value={formData.orderDetails}
              onChange={(e) => setFormData(prev => ({ ...prev, orderDetails: e.target.value }))}
              placeholder="Describe the emergency order requirements"
              rows={4}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="estimatedAmount">Estimated Amount</Label>
            <Input
              id="estimatedAmount"
              type="number"
              step="0.01"
              value={formData.estimatedAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, estimatedAmount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                setFormData(prev => ({ ...prev, priority: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: 'pending' | 'in_progress' | 'completed' | 'cancelled') => 
                setFormData(prev => ({ ...prev, status: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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
              {loading ? "Creating..." : "Create Emergency Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
