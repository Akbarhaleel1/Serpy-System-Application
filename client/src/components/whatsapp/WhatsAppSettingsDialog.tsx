import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Settings, Send, History } from "lucide-react";

interface WhatsAppSettingsDialogProps {
  children: React.ReactNode;
}

export function WhatsAppSettingsDialog({ children }: WhatsAppSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    is_enabled: false,
    auto_send_job_updates: true,
    auto_send_payment_confirmations: true,
    auto_send_invoices: true,
    api_endpoint: "",
    api_key: "",
    phone_number_id: "",
    business_account_id: "",
    webhook_verify_token: ""
  });
  const [testMessage, setTestMessage] = useState({
    phone: "",
    message: "Hello! This is a test message from your printing service."
  });
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch WhatsApp settings when dialog opens
  const fetchSettings = async () => {
    try {
      // TODO: Implement API call to fetch WhatsApp settings
      console.log('📋 API not yet implemented');
      setSettings({
        is_enabled: false,
        auto_send_job_updates: true,
        auto_send_payment_confirmations: true,
        auto_send_invoices: true,
        api_endpoint: "",
        api_key: "",
        phone_number_id: "",
        business_account_id: "",
        webhook_verify_token: ""
      });
    } catch (error) {
      console.error('Error fetching WhatsApp settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch WhatsApp settings",
        variant: "destructive",
      });
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to save WhatsApp settings
      console.log('📋 API not yet implemented');
      
      toast({
        title: "Success",
        description: "WhatsApp settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving WhatsApp settings:', error);
      toast({
        title: "Error",
        description: "Failed to save WhatsApp settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!user || !testMessage.phone || !testMessage.message) {
      toast({
        title: "Error",
        description: "Please enter phone number and message",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Implement API call to send test message
      console.log('📋 API not yet implemented');
      
      toast({
        title: "Success",
        description: "Test message sent successfully",
      });
    } catch (error) {
      console.error('Error sending test message:', error);
      toast({
        title: "Error",
        description: "Failed to send test message",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={fetchSettings}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            WhatsApp Integration Settings
          </DialogTitle>
          <DialogDescription>
            Configure WhatsApp Business API integration for automated messaging
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enable/Disable */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                WhatsApp Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Enable WhatsApp Integration</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn on WhatsApp messaging for your business
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={settings.is_enabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, is_enabled: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Auto-send Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Automated Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Job Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Send automatic updates when job status changes
                  </p>
                </div>
                <Switch
                  checked={settings.auto_send_job_updates}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, auto_send_job_updates: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Payment Confirmations</Label>
                  <p className="text-sm text-muted-foreground">
                    Send payment confirmation messages
                  </p>
                </div>
                <Switch
                  checked={settings.auto_send_payment_confirmations}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, auto_send_payment_confirmations: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Invoice Delivery</Label>
                  <p className="text-sm text-muted-foreground">
                    Send invoices via WhatsApp
                  </p>
                </div>
                <Switch
                  checked={settings.auto_send_invoices}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, auto_send_invoices: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* API Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api_endpoint">API Endpoint</Label>
                <Input
                  id="api_endpoint"
                  value={settings.api_endpoint}
                  onChange={(e) => setSettings(prev => ({ ...prev, api_endpoint: e.target.value }))}
                  placeholder="https://graph.facebook.com/v18.0/"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={settings.api_key}
                  onChange={(e) => setSettings(prev => ({ ...prev, api_key: e.target.value }))}
                  placeholder="Your WhatsApp Business API key"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone_number_id">Phone Number ID</Label>
                <Input
                  id="phone_number_id"
                  value={settings.phone_number_id}
                  onChange={(e) => setSettings(prev => ({ ...prev, phone_number_id: e.target.value }))}
                  placeholder="Phone number ID from Meta Business"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="business_account_id">Business Account ID</Label>
                <Input
                  id="business_account_id"
                  value={settings.business_account_id}
                  onChange={(e) => setSettings(prev => ({ ...prev, business_account_id: e.target.value }))}
                  placeholder="Business account ID"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="webhook_verify_token">Webhook Verify Token</Label>
                <Input
                  id="webhook_verify_token"
                  value={settings.webhook_verify_token}
                  onChange={(e) => setSettings(prev => ({ ...prev, webhook_verify_token: e.target.value }))}
                  placeholder="Webhook verification token"
                />
              </div>
            </CardContent>
          </Card>

          {/* Test Message */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Test Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test_phone">Phone Number</Label>
                <Input
                  id="test_phone"
                  value={testMessage.phone}
                  onChange={(e) => setTestMessage(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+919876543210"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="test_message">Message</Label>
                <Textarea
                  id="test_message"
                  value={testMessage.message}
                  onChange={(e) => setTestMessage(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <Button onClick={handleSendTestMessage} className="gap-2">
                <Send className="w-4 h-4" />
                Send Test Message
              </Button>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}