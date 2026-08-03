import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface EditStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStaffUpdated: () => void;
  staff: any; // Staff member to edit
}

export function EditStaffDialog({ open, onOpenChange, onStaffUpdated, staff }: EditStaffDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "staff" as 'admin' | 'manager' | 'designer' | 'operator' | 'accountant' | 'staff',
    department: "General" as 'Design' | 'Production' | 'Sales' | 'Admin' | 'Management' | 'General',
    joiningDate: "",
    status: "active" as 'active' | 'inactive'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Pre-fill form when staff data changes
  useEffect(() => {
    console.log('👤 EditStaffDialog - staff data received:', staff);
    if (staff) {
      setFormData({
        name: staff.name || staff.fullName || "",
        email: staff.email || "",
        position: staff.role || "staff",
        department: staff.department || "General",
        joiningDate: staff.joiningDate || staff.createdAt ? new Date(staff.createdAt).toISOString().split('T')[0] : "",
        status: staff.status || (staff.isActive ? "active" : "inactive")
      });
      console.log('👤 EditStaffDialog - form data set:', {
        name: staff.name || staff.fullName,
        email: staff.email,
        position: staff.role,
        department: staff.department,
        joiningDate: staff.joiningDate || (staff.createdAt ? new Date(staff.createdAt).toISOString().split('T')[0] : ''),
        status: staff.status || (staff.isActive ? "active" : "inactive")
      });
    }
  }, [staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields (Name, Email)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Map form data to backend expected fields
      const updateData = {
        fullName: formData.name,
        email: formData.email,
        role: formData.position,
        isActive: formData.status === 'active'
      };

      console.log('👤 Updating staff with data:', updateData);
      
      // Update existing staff
      const response = await apiClient.updateStaff(staff.id || staff._id, updateData);
      console.log('👥 Staff updated:', response);
      
      toast({
        title: "Staff Updated",
        description: "Staff member has been updated successfully",
      });
      
      onStaffUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating staff:', error);
      toast({
        title: "Error",
        description: "Failed to update staff member",
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
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogDescription>
            Edit staff member information.
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
            <Label htmlFor="joiningDate">Joining Date *</Label>
            <Input
              id="joiningDate"
              type="date"
              value={formData.joiningDate}
              onChange={(e) => setFormData(prev => ({ ...prev, joiningDate: e.target.value }))}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position/Role</Label>
              <Select
                value={formData.position}
                onValueChange={(value) => setFormData(prev => ({ ...prev, position: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
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
                  <SelectItem value="General">General</SelectItem>
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
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Updating..." : "Update Staff Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
