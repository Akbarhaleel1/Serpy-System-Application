import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Key, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface InlinePasswordResetProps {
  staffId: string;
  staffName: string;
  onPasswordReset: () => void;
}

export function InlinePasswordReset({ staffId, staffName, onPasswordReset }: InlinePasswordResetProps) {
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await apiClient.changeStaffPassword(staffId, newPassword);
      
      toast({
        title: "Password Reset",
        description: `Password has been reset for ${staffName}`,
      });
      
      setNewPassword("");
      setConfirmPassword("");
      setShowResetForm(false);
      onPasswordReset();
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showResetForm) {
    return (
      <div className="mt-4 p-4 border rounded-lg bg-muted/50">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <h4 className="font-semibold text-sm">Reset Password for {staffName}</h4>
          </div>
          
          <form onSubmit={handlePasswordReset} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>

            {newPassword && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Password strength:</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        newPassword.length >= 8 
                          ? 'bg-green-500 w-full' 
                          : newPassword.length >= 6 
                          ? 'bg-yellow-500 w-2/3' 
                          : 'bg-red-500 w-1/3'
                      }`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {newPassword.length >= 8 ? 'Strong' : 
                     newPassword.length >= 6 ? 'Fair' : 'Weak'}
                  </span>
                </div>
              </div>
            )}

            {newPassword && confirmPassword && (
              <div className="flex items-center gap-2 text-sm">
                {newPassword === confirmPassword ? (
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

            <div className="flex items-center gap-2 pt-2">
              <Button 
                type="submit" 
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6} 
                size="sm"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setShowResetForm(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setShowResetForm(true)}
        className="gap-2"
      >
        <Key className="h-4 w-4" />
        Reset Password
      </Button>
    </div>
  );
}
