import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Mail, Lock, Key, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface StaffCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  onStaffUpdated: () => void;
}

export function StaffCredentialsDialog({ open, onOpenChange, staff, onStaffUpdated }: StaffCredentialsDialogProps) {
  const [emailData, setEmailData] = useState({
    newEmail: "",
    confirmEmail: ""
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("email");
  const { toast } = useToast();

  // Reset form when dialog opens/closes
  useState(() => {
    if (!open) {
      setEmailData({ newEmail: "", confirmEmail: "" });
      setPasswordData({ newPassword: "", confirmPassword: "" });
      setActiveTab("email");
    }
  }, [open]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailData.newEmail || !emailData.confirmEmail) {
      toast({
        title: "Validation Error",
        description: "Please fill in all email fields",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(emailData.newEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (emailData.newEmail !== emailData.confirmEmail) {
      toast({
        title: "Email Mismatch",
        description: "Email addresses do not match",
        variant: "destructive",
      });
      return;
    }

    if (emailData.newEmail === staff.email) {
      toast({
        title: "No Change",
        description: "New email is the same as current email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await apiClient.changeStaffEmail(staff.id, emailData.newEmail);
      
      toast({
        title: "Email Updated",
        description: `Email changed to ${emailData.newEmail} successfully`,
      });
      
      onStaffUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error changing staff email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to change staff email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await apiClient.changeStaffPassword(staff.id, passwordData.newPassword);
      
      toast({
        title: "Password Updated",
        description: "Staff password has been changed successfully",
      });
      
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      console.error('Error changing staff password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to change staff password",
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
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Manage Staff Credentials
          </DialogTitle>
          <DialogDescription>
            Change email address or reset password for {staff.name}
          </DialogDescription>
        </DialogHeader>

        {/* Staff Info */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">{staff.name}</span>
              <Badge variant={staff.status === "active" ? "success" : "secondary"} className="text-xs">
                {staff.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span>{staff.email}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Role: {staff.role}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Change Email
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Reset Password
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Changing the email address will update the staff member's login email.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleEmailChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">New Email Address *</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={emailData.newEmail}
                  onChange={(e) => setEmailData(prev => ({ ...prev, newEmail: e.target.value }))}
                  placeholder="Enter new email address"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmEmail">Confirm New Email *</Label>
                <Input
                  id="confirmEmail"
                  type="email"
                  value={emailData.confirmEmail}
                  onChange={(e) => setEmailData(prev => ({ ...prev, confirmEmail: e.target.value }))}
                  placeholder="Confirm new email address"
                  required
                />
              </div>

              {emailData.newEmail && emailData.confirmEmail && (
                <div className="flex items-center gap-2 text-sm">
                  {emailData.newEmail === emailData.confirmEmail ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Email addresses match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-600">Email addresses do not match</span>
                    </>
                  )}
                </div>
              )}

              <Button type="submit" disabled={loading || !emailData.newEmail || !emailData.confirmEmail || emailData.newEmail !== emailData.confirmEmail} className="w-full">
                {loading ? "Updating Email..." : "Update Email Address"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="password" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Reset the staff member's password. They will need to use the new password for their next login.
              </AlertDescription>
            </Alert>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password (min. 6 characters)"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>

              {passwordData.newPassword && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Password strength:</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          passwordData.newPassword.length >= 8 
                            ? 'bg-green-500 w-full' 
                            : passwordData.newPassword.length >= 6 
                            ? 'bg-yellow-500 w-2/3' 
                            : 'bg-red-500 w-1/3'
                        }`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {passwordData.newPassword.length >= 8 ? 'Strong' : 
                       passwordData.newPassword.length >= 6 ? 'Fair' : 'Weak'}
                    </span>
                  </div>
                </div>
              )}

              {passwordData.newPassword && passwordData.confirmPassword && (
                <div className="flex items-center gap-2 text-sm">
                  {passwordData.newPassword === passwordData.confirmPassword ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}

              <Button type="submit" disabled={loading || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword || passwordData.newPassword.length < 6} className="w-full">
                {loading ? "Updating Password..." : "Reset Password"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
