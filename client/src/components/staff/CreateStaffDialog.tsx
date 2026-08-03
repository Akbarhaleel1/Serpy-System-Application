import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface CreateStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStaffCreated: () => void;
}

export function CreateStaffDialog({ open, onOpenChange, onStaffCreated }: CreateStaffDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "Designer" as 'Designer' | 'Operator' | 'Manager' | 'Accountant' | 'Sales' | 'Other',
    department: "Design" as 'Design' | 'Production' | 'Sales' | 'Admin' | 'Management',
    employeeId: "",
    joiningDate: "",
    salary: "",
    address: {
      street: "",
      city: "",
      state: "",
      pincode: ""
    },
    status: "active" as 'active' | 'inactive'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone || !formData.joiningDate) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields (Name, Email, Phone, Joining Date)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.createStaff(formData);
      console.log('👥 Staff created:', response);
      
      toast({
        title: "Staff Created",
        description: "Staff member has been created successfully",
      });
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        position: "Designer",
        department: "Design",
        employeeId: "",
        joiningDate: "",
        salary: "",
        address: {
          street: "",
          city: "",
          state: "",
          pincode: ""
        },
        status: "active"
      });
      
      onStaffCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating staff:', error);
      toast({
        title: "Error",
        description: "Failed to create staff member",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
          <DialogDescription>
            Add a new staff member to your organization.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 px-1">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter full name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter phone number"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="joiningDate">Joining Date *</Label>
            <Input
              id="joiningDate"
              type="date"
              value={formData.joiningDate}
              onChange={(e) => setFormData(prev => ({ ...prev, joiningDate: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee ID</Label>
            <Input
              id="employeeId"
              value={formData.employeeId}
              onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
              placeholder="Enter employee ID"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="salary">Salary</Label>
            <Input
              id="salary"
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
              placeholder="Enter salary"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select
                value={formData.position}
                onValueChange={(value) => setFormData(prev => ({ ...prev, position: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Designer">Designer</SelectItem>
                  <SelectItem value="Operator">Operator</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Accountant">Accountant</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData(prev => ({ ...prev, department: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => 
              setFormData(prev => ({ ...prev, status: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            <Label className="text-sm font-medium">Address (Optional)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="street">Street</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, street: e.target.value }
                  }))}
                  placeholder="Enter street address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, city: e.target.value }
                  }))}
                  placeholder="Enter city"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.address.state}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, state: e.target.value }
                  }))}
                  placeholder="Enter state"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.address.pincode}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    address: { ...prev.address, pincode: e.target.value }
                  }))}
                  placeholder="Enter pincode"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Creating..." : "Create Staff Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}