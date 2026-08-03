import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Building, Bell, Globe, Database, RefreshCw, Upload, X, QrCode, Landmark, CreditCard } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>({});
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await apiClient.getSettings();
      console.log('⚙️ Raw Settings response:', JSON.stringify(response, null, 2));

      // The apiClient.request method returns data.data || data
      // So if backend returns { status: 'success', data: { settings: {...} } }
      // We get { settings: {...} }
      const fetchedSettings = response?.settings || response || {};
      console.log('📋 Extracted settings:', JSON.stringify(fetchedSettings, null, 2));

      setSettings(fetchedSettings);

      // Create new settings object to ensure state update
      const newCompanySettings = {
        companyName: fetchedSettings.companyName || '',
        companyPhone: fetchedSettings.companyPhone || '',
        companyEmail: fetchedSettings.companyEmail || '',
        companyLogo: fetchedSettings.companyLogo || '',
        companyAddress: {
          street: fetchedSettings.companyAddress?.street || '',
          city: fetchedSettings.companyAddress?.city || '',
          state: fetchedSettings.companyAddress?.state || '',
          zipCode: fetchedSettings.companyAddress?.zipCode || '',
          country: fetchedSettings.companyAddress?.country || '',
        },
        gstNumber: fetchedSettings.gstNumber || '',
        panNumber: fetchedSettings.panNumber || '',
        paymentQRCode: fetchedSettings.paymentQRCode || '',
        // Bank details
        bankName: fetchedSettings.bankName || '',
        accountNumber: fetchedSettings.accountNumber || '',
        ifscCode: fetchedSettings.ifscCode || '',
        branchName: fetchedSettings.branchName || '',
        upiId: fetchedSettings.upiId || ''
      };

      console.log('💾 Setting company settings:', JSON.stringify(newCompanySettings, null, 2));
      setCompanySettings(newCompanySettings);
      setQrCodePreview(fetchedSettings.paymentQRCode || '');
      setLogoPreview(fetchedSettings.companyLogo || '');
    } catch (error) {
      console.error('❌ Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQRCodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Error",
          description: "File size should be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setQrCodeFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrCodePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeQRCode = () => {
    setQrCodeFile(null);
    setQrCodePreview('');
    setCompanySettings({ ...companySettings, paymentQRCode: '' });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: "Error",
          description: "Logo size should be less than 2MB",
          variant: "destructive",
        });
        return;
      }
      if (!/\.(png|jpe?g)$/i.test(file.name)) {
        toast({
          title: "Error",
          description: "Logo must be a PNG or JPG image",
          variant: "destructive",
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setCompanySettings({ ...companySettings, companyLogo: '' });
  };

  const saveCompanySettings = async () => {
    try {
      setSaving(true);
      console.log('💾 Saving company settings...');

      let paymentQRCode = companySettings.paymentQRCode;

      // If a new QR code file was selected, use the base64 data
      if (qrCodeFile && qrCodePreview) {
        paymentQRCode = qrCodePreview;
      }

      let companyLogo = companySettings.companyLogo;
      // If a new logo file was selected, use the base64 data
      if (logoFile && logoPreview) {
        companyLogo = logoPreview;
      } else if (logoPreview) {
        companyLogo = logoPreview;
      }

      const dataToSave = {
        ...companySettings,
        paymentQRCode,
        companyLogo
      };

      console.log('📤 Data to save:', { ...dataToSave, paymentQRCode: paymentQRCode ? 'base64...' : 'none' });

      const response = await apiClient.updateCompanySettings(dataToSave);
      console.log('✅ Save response:', response);

      // Reset the file input state after successful save
      setQrCodeFile(null);
      setLogoFile(null);

      toast({
        title: "Success",
        description: "Company settings saved successfully",
      });

      // Reload settings to get the saved data
      console.log('🔄 Reloading settings...');
      await fetchSettings();
      console.log('✅ Settings reloaded');
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48">Loading settings...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your printing business preferences</p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="company">
            <Building className="h-4 w-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Company Settings Tab */}
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Update your company details and payment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={companySettings.companyName}
                    onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                    placeholder="Your Printing Company"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Phone Number</Label>
                  <Input
                    id="companyPhone"
                    value={companySettings.companyPhone}
                    onChange={(e) => setCompanySettings({ ...companySettings, companyPhone: e.target.value })}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companySettings.companyEmail}
                    onChange={(e) => setCompanySettings({ ...companySettings, companyEmail: e.target.value })}
                    placeholder="info@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={companySettings.gstNumber}
                    onChange={(e) => setCompanySettings({ ...companySettings, gstNumber: e.target.value })}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Number</Label>
                <Input
                  id="panNumber"
                  value={companySettings.panNumber}
                  onChange={(e) => setCompanySettings({ ...companySettings, panNumber: e.target.value })}
                  placeholder="AAAAA0000A"
                  className="max-w-xs"
                />
              </div>

              <Separator />

              {/* Company Address Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-base font-semibold">Company Address</Label>
                    <p className="text-sm text-muted-foreground">
                      This address appears on your invoices and quotations
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addrStreet">Street / Building</Label>
                  <Input
                    id="addrStreet"
                    value={companySettings.companyAddress?.street || ''}
                    onChange={(e) => setCompanySettings({ ...companySettings, companyAddress: { ...companySettings.companyAddress, street: e.target.value } })}
                    placeholder="e.g., 77 Spaces, Lotus Tower"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addrCity">City</Label>
                    <Input
                      id="addrCity"
                      value={companySettings.companyAddress?.city || ''}
                      onChange={(e) => setCompanySettings({ ...companySettings, companyAddress: { ...companySettings.companyAddress, city: e.target.value } })}
                      placeholder="e.g., Thiruvananthapuram"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addrZip">PIN / ZIP Code</Label>
                    <Input
                      id="addrZip"
                      value={companySettings.companyAddress?.zipCode || ''}
                      onChange={(e) => setCompanySettings({ ...companySettings, companyAddress: { ...companySettings.companyAddress, zipCode: e.target.value } })}
                      placeholder="e.g., 695011"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addrState">State</Label>
                    <Input
                      id="addrState"
                      value={companySettings.companyAddress?.state || ''}
                      onChange={(e) => setCompanySettings({ ...companySettings, companyAddress: { ...companySettings.companyAddress, state: e.target.value } })}
                      placeholder="e.g., Kerala"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addrCountry">Country</Label>
                    <Input
                      id="addrCountry"
                      value={companySettings.companyAddress?.country || ''}
                      onChange={(e) => setCompanySettings({ ...companySettings, companyAddress: { ...companySettings.companyAddress, country: e.target.value } })}
                      placeholder="e.g., India"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Company Logo Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-base font-semibold">Company Logo</Label>
                    <p className="text-sm text-muted-foreground">
                      Appears at the top of your invoices and quotations (PNG or JPG)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  {logoPreview && (
                    <div className="relative">
                      <div className="border-2 border-dashed rounded-lg p-4 bg-muted/50">
                        <img
                          src={logoPreview}
                          alt="Company Logo"
                          className="h-24 w-auto max-w-[200px] object-contain"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={removeLogo}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="border-2 border-dashed rounded-lg p-6 hover:border-primary/50 transition-colors">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <div className="text-center">
                          <p className="text-sm font-medium">
                            {logoPreview ? 'Change Logo' : 'Upload Logo'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG up to 2MB
                          </p>
                        </div>
                        <Input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => document.getElementById('logo-upload')?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Browse Files
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />
              
              {/* Bank Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-base font-semibold">Bank Account Details</Label>
                    <p className="text-sm text-muted-foreground">
                      These details will appear on your invoices for payment
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={companySettings.bankName}
                      onChange={(e) => setCompanySettings({ ...companySettings, bankName: e.target.value })}
                      placeholder="e.g., State Bank of India"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={companySettings.accountNumber}
                      onChange={(e) => setCompanySettings({ ...companySettings, accountNumber: e.target.value })}
                      placeholder="Enter account number"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">IFSC Code</Label>
                    <Input
                      id="ifscCode"
                      value={companySettings.ifscCode}
                      onChange={(e) => setCompanySettings({ ...companySettings, ifscCode: e.target.value })}
                      placeholder="SBIN0001234"
                      className="uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branchName">Branch Name</Label>
                    <Input
                      id="branchName"
                      value={companySettings.branchName}
                      onChange={(e) => setCompanySettings({ ...companySettings, branchName: e.target.value })}
                      placeholder="e.g., Main Branch"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="upiId">UPI ID (Optional)</Label>
                  </div>
                  <Input
                    id="upiId"
                    value={companySettings.upiId}
                    onChange={(e) => setCompanySettings({ ...companySettings, upiId: e.target.value })}
                    placeholder="e.g., yourname@upi"
                    className="max-w-sm"
                  />
                </div>
              </div>

              <Separator />

              {/* QR Code Upload Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  <div>
                    <Label className="text-base font-semibold">Payment QR Code</Label>
                    <p className="text-sm text-muted-foreground">
                      Upload a QR code for customers to make payments (UPI, etc.)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  {/* QR Code Preview */}
                  {qrCodePreview && (
                    <div className="relative">
                      <div className="border-2 border-dashed rounded-lg p-4 bg-muted/50">
                        <img
                          src={qrCodePreview}
                          alt="Payment QR Code"
                          className="w-40 h-40 object-contain"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={removeQRCode}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex-1 space-y-2">
                    <div className="border-2 border-dashed rounded-lg p-6 hover:border-primary/50 transition-colors">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <div className="text-center">
                          <p className="text-sm font-medium">
                            {qrCodePreview ? 'Change QR Code' : 'Upload QR Code'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG up to 5MB
                          </p>
                        </div>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleQRCodeUpload}
                          className="hidden"
                          id="qr-upload"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => document.getElementById('qr-upload')?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Browse Files
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This QR code will appear on invoices sent via WhatsApp and email
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveCompanySettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Company Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch id="emailNotifications" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="orderAlerts">Order Status Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when order status changes</p>
                </div>
                <Switch id="orderAlerts" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;