import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: () => void;
}

export function CreateCustomerDialog({ open, onOpenChange, onCustomerCreated }: CreateCustomerDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    customerType: "Individual" as 'Individual' | 'Business' | 'Corporate' | 'Walk-in',
    gstNumber: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: "Invalid Input",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('📋 Creating customer:', formData);

      const response = await apiClient.createCustomer(formData);
      console.log('📋 Customer created successfully:', response);

      toast({
        title: "Customer Created",
        description: "Customer has been created successfully",
      });

      onCustomerCreated();
      onOpenChange(false);

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        address: "",
        customerType: "Individual",
        gstNumber: "",
        notes: ""
      });
    } catch (error) {
      console.error('Error creating customer:', error);

      const errorMessage =
        (error as any)?.message ||
        (typeof error === 'string' ? error : null) ||
        "Failed to create customer";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Add a new customer to your database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter customer name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company / Business Name</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              placeholder="Enter company name (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter customer address"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerType">Customer Type</Label>
            <Select value={formData.customerType} onValueChange={(value: 'Individual' | 'Business' | 'Corporate' | 'Walk-in') =>
              setFormData(prev => ({ ...prev, customerType: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Individual">Individual</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
                <SelectItem value="Corporate">Corporate</SelectItem>
                <SelectItem value="Walk-in">Walk-in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gstNumber">GST Number</Label>
            <Input
              id="gstNumber"
              value={formData.gstNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, gstNumber: e.target.value }))}
              placeholder="Enter GST number (if applicable)"
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
              {loading ? "Creating..." : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}