import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Users, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/apiClient";

// Move permissionsList OUTSIDE the component to prevent recreation on every render
const permissionsList = [
  "Dashboard",
  "Customers",
  "Jobs",
  "Invoicing",
  "Calendar",
  "Inventory",
  "HSN Codes",
  "Vendors",
  "Purchase Bills",
  "Staff & Tasks",
  "Human Resources",
  "Payroll",
  "Delivery",
  "Emergency Orders",
  "Cost & Profit",
  "Payments",
  "Accounts",
  "Reports",
  "Designer Timer",
  "Discounts",
  "Job Proofing",
  "WhatsApp",
  "Walk-In Jobs",
  "Customer Portal",
  "Activity Log",
  "User Management",
  "Settings",
];

export default function CreateLogin() {
  const [formData, setFormData] = useState({
    role: "",
    email: "",
    password: "",
    fullName: "",
  });

  const [permissions, setPermissions] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (formData.role === "admin") {
      // Admin automatically gets all permissions
      setPermissions([...permissionsList]);
    } else if (formData.role === "manager") {
      // Managers should manually select permissions - start with Dashboard only
      if (permissions.length === 0) {
        setPermissions(["Dashboard"]);
      }
    } else if (formData.role === "staff") {
      // Staff should manually select permissions - start with Dashboard only
      if (permissions.length === 0) {
        setPermissions(["Dashboard"]);
      }
    }
  }, [formData.role]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      role: value,
    }));
  };

  const handlePermissionToggle = (permission, e) => {
    // Prevent event from bubbling if triggered from checkbox
    if (e) {
      e.stopPropagation();
    }
    
    setPermissions((prev) => {
      if (prev.includes(permission)) {
        return prev.filter((p) => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const toggleAllPermissions = () => {
    if (permissions.length === permissionsList.length) {
      setPermissions([]);
    } else {
      setPermissions([...permissionsList]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (!formData.role || !formData.email || !formData.password || !formData.fullName) {
      setMessage({ type: "error", text: "Please fill in all required fields." });
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      setIsLoading(false);
      return;
    }

    // Skip permission validation for admin (they auto-get all)
    if (formData.role !== "admin" && permissions.length === 0) {
      setMessage({ type: "error", text: "Please select at least one permission." });
      setIsLoading(false);
      return;
    }

    try {
      // Prepare user data
      const userData = {
        role: formData.role,
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        permissions: permissions,
        isActive: true,
      };

      console.log("📝 Creating user with data:", userData);

      // API Call - Save user to MongoDB database
      const response = await apiClient.createUser(userData);

      console.log("✅ User created successfully:", response);

      // Send welcome email to staff member
      try {
        const emailData = {
          to: formData.email.toLowerCase().trim(),
          subject: "Welcome to SerpY ERP - Your Login Credentials",
          template: "staff-welcome",
          data: {
            fullName: formData.fullName.trim(),
            email: formData.email.toLowerCase().trim(),
            password: formData.password,
            role: formData.role,
            loginUrl: window.location.origin + "/auth",
            companyName: "Synx Automation Private Limited",
            supportEmail: "support@serpy.in"
          }
        };

        console.log("📧 Sending welcome email to:", formData.email);
        const emailResponse = await apiClient.sendEmail(emailData);
        console.log("✅ Welcome email sent successfully:", emailResponse);
      } catch (emailError) {
        console.error("❌ Error sending welcome email:", emailError);
        // Continue with success message even if email fails
      }

      // Show success message
      const permissionText = formData.role === 'admin'
        ? 'full access (all features)'
        : `${permissions.length} permissions`;
      setMessage({
        type: "success",
        text: `✓ Login created successfully for ${formData.email} with ${formData.role} role and ${permissionText}. User saved to database and welcome email sent.`,
      });

      // Reset form after 2 seconds
      setTimeout(() => {
        handleReset();
        setIsLoading(false);
      }, 2000);

    } catch (error) {
      console.error("❌ Error creating user:", error);

      let errorMessage = "Failed to create user. Please try again.";

      if (error.message) {
        errorMessage = error.message;
      }

      // Check for duplicate email error
      if (errorMessage.includes("already exists")) {
        errorMessage = "A user with this email already exists.";
      }

      setMessage({ type: "error", text: errorMessage });
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ role: "", email: "", password: "", fullName: "" });
    setPermissions([]);
    setMessage({ type: "", text: "" });
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-elevated">
          <CardHeader className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl md:text-3xl">Create Login Access</CardTitle>
            <CardDescription className="text-base">
              Assign user credentials and manage permissions
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Credentials Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="font-semibold">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="font-semibold">
                    User Role <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.role} onValueChange={handleRoleChange}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Full Access</SelectItem>
                      <SelectItem value="manager">Manager - Custom Permissions</SelectItem>
                      <SelectItem value="staff">Staff - Custom Permissions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-semibold">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter secure password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="space-y-4 p-6 bg-muted rounded-lg border border-input">
                <div className="flex justify-between items-center gap-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Permissions</h3>
                    {formData.role === "admin" ? (
                      <p className="text-xs text-green-600 font-medium">Admin automatically gets full access to all features</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Select only the features this user should access</p>
                    )}
                    {formData.role && (
                      <div className="flex items-center gap-2 pt-2">
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            formData.role === "admin"
                              ? "bg-green-100 text-green-700"
                              : formData.role === "manager"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary/10 text-secondary"
                          }`}
                        >
                          {formData.role === "admin" ? "Admin - Full Access" : formData.role === "manager" ? "Manager - Custom Permissions" : "Staff - Custom Permissions"}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {permissions.length} / {permissionsList.length} selected
                        </span>
                      </div>
                    )}
                  </div>
                  {formData.role !== "admin" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleAllPermissions}
                      className="whitespace-nowrap"
                    >
                      {permissions.length === permissionsList.length ? "Deselect All" : "Select All"}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {permissionsList.map((permission) => {
                    const isAdminRole = formData.role === "admin";
                    const isDashboard = permission === "Dashboard";
                    const isDisabled = isAdminRole || isDashboard;

                    return (
                      <div
                        key={permission}
                        className={`flex items-center space-x-2 p-3 rounded-lg border transition-all hover:shadow-sm ${
                          isAdminRole
                            ? "border-green-200 bg-green-50 cursor-not-allowed"
                            : isDashboard
                            ? "border-primary/50 bg-primary/5 cursor-not-allowed"
                            : "border-input bg-card hover:bg-accent/5"
                        }`}
                      >
                        <Checkbox
                          id={permission}
                          checked={permissions.includes(permission)}
                          disabled={isDisabled}
                          onCheckedChange={() => {
                            if (!isDisabled) {
                              handlePermissionToggle(permission);
                            }
                          }}
                        />
                        <label
                          htmlFor={permission}
                          className={`text-sm font-medium cursor-pointer flex-1 ${
                            isAdminRole
                              ? "text-green-700 font-semibold"
                              : isDashboard
                              ? "text-primary font-semibold"
                              : ""
                          }`}
                          onClick={(e) => {
                            if (!isDisabled) {
                              e.preventDefault();
                              handlePermissionToggle(permission);
                            }
                          }}
                        >
                          {permission}
                          {isAdminRole && <span className="text-xs text-green-700 ml-1">(Auto)</span>}
                          {isDashboard && !isAdminRole && <span className="text-xs text-primary ml-1">(Required)</span>}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Messages */}
              {message.text && (
                <Alert
                  className={
                    message.type === "success"
                      ? "bg-success/10 border-success/30 text-success"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }
                >
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-primary hover:shadow-glow transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Login"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}