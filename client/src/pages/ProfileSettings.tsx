import { useState, useEffect } from "react";
import { User, Mail, Phone, Building, Camera, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    company_name: "",
    avatar_url: ""
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        phone: user.phone || "",
        company_name: user.company_name || "",
        avatar_url: user.avatar_url || ""
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Implement API call to update profile
      console.log('📋 API not yet implemented');

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated."
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      // TODO: Implement file upload API
      console.log('📋 File upload API not yet implemented');
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated."
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={formData.avatar_url} />
                <AvatarFallback className="text-lg">
                  {formData.full_name ? formData.full_name.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleAvatarUpload(file);
                    };
                    input.click();
                  }}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Change Avatar
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG or GIF. Max size 2MB.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange("full_name", e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange("company_name", e.target.value)}
                    placeholder="Enter your company name"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full gap-2">
                <Save className="h-4 w-4" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input value={user?.id || ""} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={user?.role || "User"} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Member Since</Label>
              <Input 
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ""} 
                disabled 
                className="bg-muted" 
              />
            </div>

            <div className="space-y-2">
              <Label>Last Sign In</Label>
              <Input 
                value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "Never"} 
                disabled 
                className="bg-muted" 
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}