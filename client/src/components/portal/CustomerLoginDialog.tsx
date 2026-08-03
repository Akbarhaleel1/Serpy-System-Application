import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface CustomerLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: (customerName: string) => void;
}

export function CustomerLoginDialog({ open, onOpenChange, onLogin }: CustomerLoginDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    customerCode: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.customerCode) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Simulate login - in real app, you'd validate against backend
    const customerName = formData.email.split('@')[0]; // Use part of email as name
    
    toast({
      title: "Login Successful",
      description: `Welcome back, ${customerName}!`,
    });
    
    onLogin(customerName);
    
    // Reset form
    setFormData({
      email: "",
      password: "",
      customerCode: ""
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Customer Login</DialogTitle>
          <DialogDescription>
            Enter your credentials to access your account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="customer@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerCode">Customer Code *</Label>
            <Input
              id="customerCode"
              value={formData.customerCode}
              onChange={(e) => handleInputChange("customerCode", e.target.value)}
              placeholder="CUST001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              placeholder="Your password"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Login
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}