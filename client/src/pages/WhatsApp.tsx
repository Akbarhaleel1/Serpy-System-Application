import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send, Settings, Trash2, Plus, RefreshCw, CheckCircle2, XCircle, Clock, Save, Loader2, ShieldCheck, FileText, HelpCircle, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

// Facebook SDK global type declaration
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
    facebookCode?: string;
  }
}

interface MetaTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: any[];
}

export default function WhatsApp() {
  const [activeTab, setActiveTab] = useState("templates");
  
  // Settings State
  const [config, setConfig] = useState({
    enabled: false,
    wabaId: "",
    phoneNumberId: "",
    accessToken: "",
    setupMethod: "manual",
    connectionStatus: "disconnected"
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Embedded Signup state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [whatsappData, setWhatsappData] = useState<{ phone_number_id: string; waba_id: string } | null>(null);
  const [showManualSetup, setShowManualSetup] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "UTILITY",
    language: "en_US",
    bodyText: ""
  });

  // Send Message State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [sendingMessage, setSendingMessage] = useState(false);

  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      const response: any = await apiClient.getWhatsAppSettings();
      if (response?.settings) {
        setConfig({
          enabled: response.settings.enabled || false,
          wabaId: response.settings.wabaId || "",
          phoneNumberId: response.settings.phoneNumberId || "",
          accessToken: response.settings.accessToken || "",
          setupMethod: response.settings.setupMethod || "manual",
          connectionStatus: response.settings.connectionStatus || "disconnected"
        });
        if (response.settings.wabaId && response.settings.accessToken) {
          fetchTemplates();
        }
      }
    } catch (error) {
      console.error("Failed to load WhatsApp settings", error);
    }
  };

  const processWhatsAppSetup = async (code: string, data: { phone_number_id: string; waba_id: string }) => {
    try {
      const result: any = await apiClient.exchangeWhatsAppToken(
        code,
        data.waba_id,
        data.phone_number_id
      );
      if (result && result.status === 'success') {
        setCurrentStep(4);
        toast({ title: "Connected!", description: "WhatsApp Business Account connected successfully." });
        loadSettings();
      } else {
        throw new Error(result?.message || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Setup failed:', error);
      setSignupError(error.message || 'Verification failed. Please try again.');
      setCurrentStep(0);
      setIsProcessing(false);
    }
  };

  const handleSignupFinish = useCallback((data: { phone_number_id: string; waba_id: string }) => {
    setWhatsappData(data);
    setCurrentStep(3); // Verifying phone number
    const facebookCode = (window as any).facebookCode;
    if (facebookCode) {
      processWhatsAppSetup(facebookCode, data);
    } else {
      // Wait for Facebook code (it may arrive after WA data)
      let retryCount = 0;
      const waitForCode = () => {
        const code = (window as any).facebookCode;
        if (code) {
          processWhatsAppSetup(code, data);
        } else if (retryCount < 30) {
          retryCount++;
          setTimeout(waitForCode, 1000);
        } else {
          setSignupError("Timeout waiting for Facebook authentication code.");
          setCurrentStep(0);
          setIsProcessing(false);
        }
      };
      setTimeout(waitForCode, 1000);
    }
  }, []);

  const setupMessageListener = useCallback(() => {
    const handleMessage = (event: MessageEvent) => {
      // IMPORTANT: Only accept messages from Facebook domains
      if (event.origin !== "https://www.facebook.com" &&
          event.origin !== "https://web.facebook.com") {
        return;
      }
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'FINISH') {
            handleSignupFinish(data.data);
          } else if (data.event === 'CANCEL') {
            toast({ title: "Cancelled", description: "Signup flow was cancelled." });
            setCurrentStep(0);
            setIsProcessing(false);
          } else if (data.event === 'ERROR') {
            setSignupError("An error occurred during Embedded Signup flow.");
            setCurrentStep(0);
            setIsProcessing(false);
          }
        }
      } catch (error) {
        // Non-JSON messages from Facebook, ignore
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleSignupFinish]);

  const initializeFacebookSDK = useCallback(() => {
    if (typeof window === 'undefined') return;
    // Don't reload if already loaded
    if (window.FB) {
      setupMessageListener();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: import.meta.env.VITE_FACEBOOK_APP_ID || '1076724650669349',
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v23.0'
        });
        setupMessageListener();
      };
    };
    document.head.appendChild(script);
  }, [setupMessageListener]);

  useEffect(() => {
    loadSettings();
    initializeFacebookSDK();
  }, [initializeFacebookSDK]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await apiClient.setupWhatsApp({
        ...config,
        setupMethod: 'manual'
      });
      toast({ title: "Success", description: "WhatsApp Business API settings saved." });
      if (config.wabaId && config.accessToken) {
        fetchTemplates();
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save settings.", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const launchWhatsAppSignup = async () => {
    if (!(window as any).FB) {
      toast({ title: "SDK Loading", description: "Facebook SDK not loaded yet. Please wait.", variant: "destructive" });
      return;
    }
    setSignupError(null);
    setIsProcessing(true);
    setCurrentStep(1); // Authenticating
    (window as any).facebookCode = undefined;
    setWhatsappData(null);

    (window as any).FB.login(
      (response: any) => {
        if (response.authResponse && response.authResponse.code) {
          const facebookCode = response.authResponse.code;
          (window as any).facebookCode = facebookCode;
          setCurrentStep(2); // Select Business Account
          if (whatsappData) {
            processWhatsAppSetup(facebookCode, whatsappData);
          }
        } else {
          setSignupError("Facebook authentication failed or was cancelled.");
          setCurrentStep(0);
          setIsProcessing(false);
        }
      },
      {
        config_id: import.meta.env.VITE_WHATSAPP_CONFIG_ID || '1021653400474138',
        response_type: 'code',
        override_default_response_type: true,
        extras: { version: 'v3' }
      }
    );
  };

  const handleResetSettings = async () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp integration? This will remove all connection tokens and configuration details.")) {
      return;
    }
    setSavingSettings(true);
    try {
      await apiClient.resetEmbeddedSignupConfiguration();
      toast({ title: "Disconnected", description: "WhatsApp configuration has been reset." });
      setConfig({
        enabled: false,
        wabaId: "",
        phoneNumberId: "",
        accessToken: "",
        setupMethod: "manual",
        connectionStatus: "disconnected"
      });
      setTemplates([]);
      setCurrentStep(0);
      setIsProcessing(false);
      setShowManualSetup(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to disconnect.", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response: any = await apiClient.getMetaTemplates();
      if (response?.templates) {
        setTemplates(response.templates);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to fetch templates from Meta.", variant: "destructive" });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.bodyText) {
      toast({ title: "Validation Error", description: "Name and Body Text are required.", variant: "destructive" });
      return;
    }

    setCreatingTemplate(true);
    try {
      // Build components array for Meta API
      const bodyComponent: any = {
        type: "BODY",
        text: newTemplate.bodyText
      };

      // Extract variables like {{1}}, {{2}} to provide required examples for Meta
      const varMatches = newTemplate.bodyText.match(/\{\{\d+\}\}/g);
      if (varMatches && varMatches.length > 0) {
        // Meta requires an array of sample strings matching the number of unique variables
        const uniqueVars = new Set(varMatches);
        const sampleValues = Array.from(uniqueVars).map((_, i) => `SampleText${i + 1}`);
        bodyComponent.example = {
          body_text: [sampleValues]
        };
      }

      const components = [bodyComponent];

      await apiClient.createMetaTemplate({
        name: newTemplate.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        language: newTemplate.language,
        category: newTemplate.category,
        components
      });
      
      toast({ title: "Success", description: "Template submitted to Meta for approval." });
      setCreateDialogOpen(false);
      setNewTemplate({ name: "", category: "UTILITY", language: "en_US", bodyText: "" });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create template.", variant: "destructive" });
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the template "${name}" from Meta?`)) return;
    try {
      await apiClient.deleteMetaTemplate(name);
      toast({ title: "Success", description: "Template deleted successfully." });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete template.", variant: "destructive" });
    }
  };

  const handleSendMessage = async () => {
    if (!phoneNumber || !selectedTemplate) {
      toast({ title: "Error", description: "Phone number and template selection are required.", variant: "destructive" });
      return;
    }
    
    setSendingMessage(true);
    try {
      // Simulated API call since standard messaging is mocked for now
      await apiClient.post('/whatsapp/send', {
        phoneNumber,
        templateId: selectedTemplate,
        variables: templateVars
      });
      toast({ title: "Message Sent", description: `Simulated message sent to ${phoneNumber}.` });
      setPhoneNumber("");
      setTemplateVars({});
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send message.", variant: "destructive" });
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED": return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/>Approved</Badge>;
      case "PENDING": return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="w-3 h-3 mr-1"/>Pending</Badge>;
      case "REJECTED": return <Badge className="bg-red-500 hover:bg-red-600"><XCircle className="w-3 h-3 mr-1"/>Rejected</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-green-500" />
            WhatsApp Integration
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your Meta WhatsApp Business API connection and templates.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
          <TabsTrigger value="templates" className="gap-2"><FileText className="w-4 h-4" /> Meta Templates</TabsTrigger>
          <TabsTrigger value="send" className="gap-2"><Send className="w-4 h-4" /> Send Test Message</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4" /> API Settings</TabsTrigger>
        </TabsList>

        {/* --- TEMPLATES TAB --- */}
        <TabsContent value="templates" className="space-y-4">
          {!config.wabaId ? (
            <Card className="border-dashed bg-muted/50">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Not Connected</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  Please configure your Meta API credentials in the Settings tab to sync and manage templates.
                </p>
                <Button onClick={() => setActiveTab("settings")}>Go to Settings</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>WhatsApp Templates</CardTitle>
                  <CardDescription>Templates synchronized from your Meta Business account.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={loadingTemplates}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingTemplates ? "animate-spin" : ""}`} /> Sync
                  </Button>
                  <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" /> Create Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {templates.length === 0 && !loadingTemplates ? (
                  <div className="text-center p-8 text-muted-foreground">No templates found on Meta.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>{t.category}</TableCell>
                          <TableCell>{t.language}</TableCell>
                          <TableCell>{getStatusBadge(t.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteTemplate(t.name)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* --- SEND MESSAGE TAB --- */}
        <TabsContent value="send" className="space-y-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Send Template Message</CardTitle>
              <CardDescription>Test sending an approved template to a customer's phone number.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient Phone Number (with country code)</Label>
                <Input placeholder="e.g., +919876543210" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Select Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an approved template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.filter(t => t.status === 'APPROVED').map(t => (
                      <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                    ))}
                    {templates.filter(t => t.status === 'APPROVED').length === 0 && (
                      <SelectItem value="none" disabled>No approved templates found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Optional: Render variable inputs dynamically based on selected template if we parsed them. For now, we simulate standard sending. */}
              
              <Button className="w-full bg-green-600 hover:bg-green-700 mt-4" onClick={handleSendMessage} disabled={sendingMessage}>
                {sendingMessage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Send Message
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- SETTINGS TAB --- */}
        <TabsContent value="settings" className="space-y-4">
          {config.wabaId ? (
            <Card className="max-w-2xl border-green-200 bg-green-50/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2 text-green-700">
                      <ShieldCheck className="h-6 w-6 text-green-500" />
                      WhatsApp Connected
                    </CardTitle>
                    <CardDescription className="text-green-600/80">
                      Your business profile has been connected to the WhatsApp Business API.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200 capitalize">
                    {config.setupMethod === 'embedded_signup' ? 'Embedded Setup' : 'Manual Setup'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Enable Integration</Label>
                    <p className="text-sm text-muted-foreground">Toggle WhatsApp functions across the ERP modules.</p>
                  </div>
                  <Switch 
                    checked={config.enabled} 
                    onCheckedChange={async (c) => {
                      try {
                        const updatedConfig = { ...config, enabled: c };
                        setConfig(updatedConfig);
                        await apiClient.setupWhatsApp({
                          enabled: c,
                          wabaId: config.wabaId,
                          phoneNumberId: config.phoneNumberId,
                          accessToken: config.accessToken
                        });
                        toast({ title: "Updated", description: c ? "WhatsApp integration enabled." : "WhatsApp integration disabled." });
                      } catch (error: any) {
                        toast({ title: "Error", description: error.message || "Failed to update toggle.", variant: "destructive" });
                      }
                    }} 
                  />
                </div>

                <div className="space-y-4 bg-muted/30 p-4 rounded-lg border border-dashed text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-semibold text-muted-foreground">WABA ID:</span>
                    <span className="col-span-2 font-mono">{config.wabaId}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-semibold text-muted-foreground">Phone Number ID:</span>
                    <span className="col-span-2 font-mono">{config.phoneNumberId}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="font-semibold text-muted-foreground">Connection Status:</span>
                    <span className="col-span-2 font-semibold text-green-600 capitalize">{config.connectionStatus || 'Connected'}</span>
                  </div>
                </div>

                <Button 
                  variant="destructive" 
                  onClick={handleResetSettings} 
                  disabled={savingSettings} 
                  className="w-full flex items-center justify-center gap-2"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Disconnect WhatsApp Business
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="max-w-2xl border border-muted-foreground/15 shadow-md">
              <CardHeader className="bg-gradient-to-tr from-blue-50/20 to-green-50/20">
                <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                  <Sparkles className="w-6 h-6 text-green-500 animate-pulse" />
                  Connect WhatsApp Business
                </CardTitle>
                <CardDescription>
                  Configure your Meta credentials to send instant invoices, job proof alerts, and reminders to your customers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {!showManualSetup ? (
                  <div className="space-y-6">
                    <div className="rounded-xl border bg-muted/40 p-5 space-y-4">
                      <h4 className="font-semibold text-sm text-foreground">Embedded Signup Flow:</h4>
                      <ol className="space-y-3 text-xs text-muted-foreground list-decimal pl-4">
                        <li>Click "Connect WhatsApp Business" to open the Meta secure signup popup.</li>
                        <li>Log in to your Facebook Account and select your Business Profile.</li>
                        <li>Select or create your WhatsApp Business Account and verify your phone number.</li>
                        <li>The system automatically links and authenticates your credentials.</li>
                      </ol>
                    </div>

                    {signupError && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{signupError}</span>
                      </div>
                    )}

                    {isProcessing ? (
                      <div className="space-y-4 p-4 border rounded-lg bg-blue-50/30 flex flex-col items-center justify-center text-center">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <div className="space-y-1">
                          <h5 className="font-semibold text-sm text-blue-700">Setup in Progress</h5>
                          <p className="text-xs text-muted-foreground">
                            {currentStep === 1 && 'Authenticating with Facebook...'}
                            {currentStep === 2 && 'Select your Business Profile in the popup...'}
                            {currentStep === 3 && 'Verifying your phone number and credentials...'}
                            {currentStep === 4 && 'Connection successfully established!'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <Button 
                        onClick={launchWhatsAppSignup} 
                        className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center gap-2 py-6 text-base font-semibold transition-all hover:scale-[1.01] shadow-lg"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Connect WhatsApp Business
                      </Button>
                    )}

                    <div className="text-center">
                      <button 
                        onClick={() => setShowManualSetup(true)}
                        className="text-xs text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1 font-medium transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Or connect manually using API keys (Advanced)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-semibold text-sm">Manual API Settings</h4>
                      <button 
                        onClick={() => setShowManualSetup(false)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Back to Embedded Signup
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Enable Integration</Label>
                        <p className="text-sm text-muted-foreground">Turn on WhatsApp features across the ERP.</p>
                      </div>
                      <Switch checked={config.enabled} onCheckedChange={c => setConfig(p => ({ ...p, enabled: c }))} />
                    </div>

                    <div className="space-y-2">
                      <Label>WhatsApp Business Account ID (WABA ID)</Label>
                      <Input value={config.wabaId} onChange={e => setConfig(p => ({ ...p, wabaId: e.target.value }))} placeholder="e.g., 123456789012345" />
                      <p className="text-xs text-muted-foreground">Found in Meta App Dashboard &gt; WhatsApp &gt; API Setup</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Phone Number ID</Label>
                      <Input value={config.phoneNumberId} onChange={e => setConfig(p => ({ ...p, phoneNumberId: e.target.value }))} placeholder="e.g., 109876543210987" />
                    </div>

                    <div className="space-y-2">
                      <Label>System User Access Token</Label>
                      <Input type="password" value={config.accessToken} onChange={e => setConfig(p => ({ ...p, accessToken: e.target.value }))} placeholder="EAAI..." />
                      <p className="text-xs text-muted-foreground">Ensure you generate a permanent token via Business Settings &gt; System Users.</p>
                    </div>

                    <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full">
                      {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Configuration
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* CREATE TEMPLATE DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Meta Template</DialogTitle>
            <DialogDescription>Submit a new message template to Meta for approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input placeholder="e.g., payment_reminder_v1" value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Lowercase alphanumeric and underscores only.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newTemplate.category} onValueChange={v => setNewTemplate(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTILITY">Utility (Updates, Reminders)</SelectItem>
                    <SelectItem value="MARKETING">Marketing (Offers, Promos)</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication (OTPs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={newTemplate.language} onValueChange={v => setNewTemplate(p => ({ ...p, language: v }))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_US">English (US)</SelectItem>
                    <SelectItem value="en_GB">English (UK)</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="ml">Malayalam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Message Body</Label>
              <Textarea 
                rows={5} 
                placeholder="Hi {{1}}, your invoice {{2}} is due..."
                value={newTemplate.bodyText}
                onChange={e => setNewTemplate(p => ({ ...p, bodyText: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Use {'{{1}}, {{2}}'} for variables.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate} disabled={creatingTemplate} className="bg-green-600 hover:bg-green-700">
              {creatingTemplate && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}