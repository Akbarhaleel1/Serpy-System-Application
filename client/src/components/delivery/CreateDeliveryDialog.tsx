import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CreateDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeliveryCreated: () => void;
}

export function CreateDeliveryDialog({ open, onOpenChange, onDeliveryCreated }: CreateDeliveryDialogProps) {
  const [formData, setFormData] = useState({
    jobId: "",
    customerName: "",
    deliveryAddress: "",
    driverName: "",
    driverPhone: "",
    scheduledDate: "",
    priority: "medium" as 'low' | 'medium' | 'high',
    status: "pending" as 'pending' | 'scheduled' | 'in_transit' | 'delivered' | 'failed',
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.jobId || !formData.customerName || !formData.deliveryAddress) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to create delivery
      console.log('📋 API not yet implemented');
      
      toast({
        title: "Delivery Created",
        description: "Delivery has been created successfully",
      });
      
      onDeliveryCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        jobId: "",
        customerName: "",
        deliveryAddress: "",
        driverName: "",
        driverPhone: "",
        scheduledDate: "",
        priority: "medium",
        status: "pending",
        notes: ""
      });
    } catch (error) {
      console.error('Error creating delivery:', error);
      toast({
        title: "Error",
        description: "Failed to create delivery",
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
          <DialogTitle>Create New Delivery</DialogTitle>
          <DialogDescription>
            Create a new delivery for a job.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jobId">Job ID *</Label>
            <Input
              id="jobId"
              value={formData.jobId}
              onChange={(e) => setFormData(prev => ({ ...prev, jobId: e.target.value }))}
              placeholder="Enter job ID"
            />
          </div>
          
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
            <Label htmlFor="deliveryAddress">Delivery Address *</Label>
            <Textarea
              id="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
              placeholder="Enter delivery address"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="driverName">Driver Name</Label>
              <Input
                id="driverName"
                value={formData.driverName}
                onChange={(e) => setFormData(prev => ({ ...prev, driverName: e.target.value }))}
                placeholder="Enter driver name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="driverPhone">Driver Phone</Label>
              <Input
                id="driverPhone"
                value={formData.driverPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, driverPhone: e.target.value }))}
                placeholder="Enter driver phone"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="scheduledDate">Scheduled Date</Label>
            <Input
              id="scheduledDate"
              type="date"
              value={formData.scheduledDate}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') => 
                setFormData(prev => ({ ...prev, priority: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: 'pending' | 'scheduled' | 'in_transit' | 'delivered' | 'failed') => 
                setFormData(prev => ({ ...prev, status: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
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
              {loading ? "Creating..." : "Create Delivery"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}