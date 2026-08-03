import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Send,
  SendHorizonal,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Users,
  FileText,
  RefreshCw,
  Settings,
  MessageSquare,
  Calendar,
  Phone,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface OverdueInvoice {
  _id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  whatsappConsent: boolean;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string;
  daysOverdue: number;
  paymentStatus: string;
  reminderCount: number;
  lastReminderDate: string | null;
  canSendReminder: boolean;
  maxRemindersReached: boolean;
}

interface Reminder {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  balanceAmount: number;
  daysOverdue: number;
  reminderType: string;
  messageContent: string;
  status: string;
  sentAt: string;
  reminderCount: number;
  createdAt: string;
}

interface ReminderSettings {
  enabled: boolean;
  daysAfterDue: number;
  reminderInterval: number;
  maxReminders: number;
  messageTemplate: string;
  metaTemplateName?: string;
  templateVariableMapping?: Record<string, string>;
  autoSend: boolean;
}

interface Stats {
  overdueInvoices: number;
  totalOutstanding: number;
  customersNeedingReminder: number;
  sentToday: number;
  totalSent: number;
}

export default function PaymentReminders() {
  const [activeTab, setActiveTab] = useState("overdue");
  const [stats, setStats] = useState<Stats>({
    overdueInvoices: 0,
    totalOutstanding: 0,
    customersNeedingReminder: 0,
    sentToday: 0,
    totalSent: 0,
  });
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: false,
    daysAfterDue: 1,
    reminderInterval: 3,
    maxReminders: 5,
    messageTemplate: "",
    metaTemplateName: "",
    templateVariableMapping: {},
    autoSend: false,
  });

  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);
  const [metaIntegrationEnabled, setMetaIntegrationEnabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      const response: any = await apiClient.getPaymentReminderStats();
      if (response?.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const fetchOverdueInvoices = useCallback(async () => {
    try {
      const response: any = await apiClient.getOverdueInvoices();
      if (response?.invoices) {
        setOverdueInvoices(response.invoices);
      }
    } catch (error) {
      console.error("Error fetching overdue invoices:", error);
      toast({
        title: "Error",
        description: "Failed to fetch overdue invoices",
        variant: "destructive",
      });
    }
  }, [toast]);

  const fetchReminders = useCallback(async (page = 1) => {
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      const response: any = await apiClient.getPaymentReminders(params);
      if (response?.reminders) {
        setReminders(response.reminders);
        setHistoryTotal(response.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Error fetching reminders:", error);
    }
  }, [statusFilter]);

  const fetchSettings = useCallback(async () => {
    try {
      const response: any = await apiClient.getPaymentReminderSettings();
      if (response?.settings) {
        setSettings({
          ...response.settings,
          templateVariableMapping: response.settings.templateVariableMapping || {}
        });
      }

      // Check Meta integration
      const waResponse: any = await apiClient.getWhatsAppSettings();
      if (waResponse?.settings?.enabled) {
        setMetaIntegrationEnabled(true);
        if (waResponse.settings.wabaId && waResponse.settings.accessToken) {
          try {
            const tmplResponse: any = await apiClient.getMetaTemplates();
            if (tmplResponse?.templates) {
              setMetaTemplates(tmplResponse.templates);
            }
          } catch (err) {
            console.error("Error fetching Meta templates:", err);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchOverdueInvoices(), fetchReminders(), fetchSettings()]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchOverdueInvoices, fetchReminders, fetchSettings]);

  useEffect(() => {
    fetchReminders(historyPage);
  }, [historyPage, statusFilter, fetchReminders]);

  const handleSendReminder = async (invoiceId: string) => {
    setSendingId(invoiceId);
    try {
      const response: any = await apiClient.sendPaymentReminder(invoiceId);
      toast({
        title: "Reminder Sent",
        description: response?.message || "Payment reminder sent successfully via WhatsApp",
      });
      // Refresh data
      await Promise.all([fetchStats(), fetchOverdueInvoices(), fetchReminders(historyPage)]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send payment reminder",
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
    }
  };

  const handleBulkSend = async () => {
    setBulkConfirmOpen(false);
    setSendingBulk(true);
    try {
      const response: any = await apiClient.sendBulkPaymentReminders();
      const results = response?.results;
      toast({
        title: "Bulk Reminders Processed",
        description: `${results?.sent || 0} sent, ${results?.failed || 0} failed, ${results?.skipped || 0} skipped`,
      });
      // Refresh data
      await Promise.all([fetchStats(), fetchOverdueInvoices(), fetchReminders(historyPage)]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send bulk reminders",
        variant: "destructive",
      });
    } finally {
      setSendingBulk(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await apiClient.updatePaymentReminderSettings(settings);
      toast({
        title: "Settings Saved",
        description: "Payment reminder settings updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePreviewMessage = () => {
    const template = settings.messageTemplate || "Hi {{customerName}}, your invoice {{invoiceNumber}} has a balance of ₹{{balanceAmount}}.";
    const preview = template
      .replace(/\{\{customerName\}\}/g, "John Doe")
      .replace(/\{\{invoiceNumber\}\}/g, "INV-202607-0001")
      .replace(/\{\{totalAmount\}\}/g, "25,000")
      .replace(/\{\{balanceAmount\}\}/g, "12,500")
      .replace(/\{\{dueDate\}\}/g, "15 Jul 2026")
      .replace(/\{\{daysOverdue\}\}/g, "9")
      .replace(/\{\{businessName\}\}/g, "Your Company");
    setPreviewMessage(preview);
    setPreviewDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date: string) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case "delivered":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Delivered</Badge>;
      case "failed":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "overdue":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
      case "partial":
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getReminderTypeBadge = (type: string) => {
    switch (type) {
      case "overdue":
        return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
      case "partial":
        return <Badge className="bg-orange-500 text-white text-xs">Partial</Badge>;
      case "manual":
        return <Badge variant="secondary" className="text-xs">Manual</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{type}</Badge>;
    }
  };

  // Filter overdue invoices by search
  const filteredInvoices = overdueInvoices.filter((inv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.customerName.toLowerCase().includes(q) ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.customerPhone && inv.customerPhone.includes(q))
    );
  });

  const eligibleCount = overdueInvoices.filter((i) => i.canSendReminder).length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading payment reminders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8 text-orange-500" />
            Payment Reminders
          </h1>
          <p className="text-muted-foreground mt-1">
            Auto-detect overdue invoices and send WhatsApp reminders to customers
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={async () => {
              setLoading(true);
              await Promise.all([fetchStats(), fetchOverdueInvoices(), fetchReminders(historyPage)]);
              setLoading(false);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            className="gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => setBulkConfirmOpen(true)}
            disabled={sendingBulk || eligibleCount === 0}
          >
            {sendingBulk ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizonal className="h-4 w-4" />
            )}
            Send All Reminders ({eligibleCount})
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overdue Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.overdueInvoices}</div>
            <p className="text-xs text-muted-foreground mt-1">invoices past due date</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-orange-500" />
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{formatCurrency(stats.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground mt-1">pending collection</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Customers to Remind
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.customersNeedingReminder}</div>
            <p className="text-xs text-muted-foreground mt-1">unique customers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" />
              Reminders Sent Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.sentToday}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.totalSent} total all time</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="overdue" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Overdue Invoices
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            Reminder History
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ===== OVERDUE INVOICES TAB ===== */}
        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Overdue & Unpaid Invoices
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {overdueInvoices.length} invoices found · {eligibleCount} eligible for reminder
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search customer or invoice..."
                      className="pl-9 w-[250px]"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
                  <p className="text-muted-foreground">
                    No overdue invoices found. All payments are up to date.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-center">Overdue</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Reminders</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice._id} className={invoice.daysOverdue > 30 ? "bg-red-50/50 dark:bg-red-950/10" : ""}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{invoice.customerName}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {invoice.customerPhone || "No phone"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{invoice.invoiceNumber}</span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(invoice.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            {formatCurrency(invoice.balanceAmount)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatDate(invoice.dueDate)}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={invoice.daysOverdue > 30 ? "destructive" : invoice.daysOverdue > 7 ? "default" : "secondary"}
                              className="font-mono"
                            >
                              {invoice.daysOverdue}d
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getPaymentStatusBadge(invoice.paymentStatus)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm font-medium">{invoice.reminderCount}</span>
                              {invoice.lastReminderDate && (
                                <span className="text-xs text-muted-foreground">
                                  Last: {formatDate(invoice.lastReminderDate)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={invoice.canSendReminder ? "default" : "outline"}
                              className="gap-1"
                              disabled={!invoice.canSendReminder || sendingId === invoice._id || !invoice.customerPhone}
                              onClick={() => handleSendReminder(invoice._id)}
                            >
                              {sendingId === invoice._id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              {invoice.maxRemindersReached
                                ? "Max Reached"
                                : !invoice.customerPhone
                                ? "No Phone"
                                : invoice.canSendReminder
                                ? "Send"
                                : "Wait"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== REMINDER HISTORY TAB ===== */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Reminder History
                  </CardTitle>
                  <CardDescription>
                    {historyTotal} reminders sent in total
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setHistoryPage(1); }}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reminders.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Reminders Yet</h3>
                  <p className="text-muted-foreground">
                    Reminders will appear here once you start sending them.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead className="text-center">Overdue</TableHead>
                          <TableHead className="text-center">#</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reminders.map((reminder) => (
                          <TableRow key={reminder._id}>
                            <TableCell>
                              <span className="text-sm">{formatDateTime(reminder.sentAt || reminder.createdAt)}</span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{reminder.customerName}</p>
                                <p className="text-xs text-muted-foreground">{reminder.customerPhone}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">{reminder.invoiceNumber}</span>
                            </TableCell>
                            <TableCell>{getReminderTypeBadge(reminder.reminderType)}</TableCell>
                            <TableCell className="text-right font-medium text-red-600">
                              {formatCurrency(reminder.balanceAmount)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-mono">{reminder.daysOverdue}d</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-medium">#{reminder.reminderCount}</span>
                            </TableCell>
                            <TableCell>{getStatusBadge(reminder.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {historyTotal > 20 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {(historyPage - 1) * 20 + 1}–{Math.min(historyPage * 20, historyTotal)} of {historyTotal}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={historyPage === 1}
                          onClick={() => setHistoryPage((p) => p - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={historyPage * 20 >= historyTotal}
                          onClick={() => setHistoryPage((p) => p + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== SETTINGS TAB ===== */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Reminder Configuration
                </CardTitle>
                <CardDescription>
                  Configure when and how reminders are sent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow sending payment reminders via WhatsApp
                    </p>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-Send</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically send reminders every hour
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoSend}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, autoSend: checked }))
                    }
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Days After Due Date</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Send first reminder X days after the invoice due date
                  </p>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={settings.daysAfterDue}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, daysAfterDue: parseInt(e.target.value) || 0 }))
                    }
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reminder Interval (Days)</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Wait X days between each follow-up reminder
                  </p>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.reminderInterval}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, reminderInterval: parseInt(e.target.value) || 1 }))
                    }
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Maximum Reminders Per Invoice</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Stop sending after X reminders for the same invoice
                  </p>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={settings.maxReminders}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, maxReminders: parseInt(e.target.value) || 1 }))
                    }
                    disabled={!settings.enabled}
                  />
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                >
                  {savingSettings ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Save Settings
                </Button>
              </CardContent>
            </Card>

            {/* Message Template */}
            {/* Message Template */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Message Template
                </CardTitle>
                <CardDescription>
                  Customize the WhatsApp message sent to customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {metaIntegrationEnabled ? (
                  <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                    <div className="space-y-2">
                      <Label>Select Meta Template</Label>
                      <Select 
                        disabled={!settings.enabled}
                        value={settings.metaTemplateName || "none"}
                        onValueChange={(val) => {
                          setSettings(prev => ({ 
                            ...prev, 
                            metaTemplateName: val === "none" ? "" : val,
                            templateVariableMapping: {} 
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an approved template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Use Free Text (No Meta Template) --</SelectItem>
                          {metaTemplates.filter(t => t.status === 'APPROVED').map(t => (
                            <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Only APPROVED templates from your Meta account are shown. 
                        Go to the WhatsApp tab to manage templates.
                      </p>
                    </div>

                    {settings.metaTemplateName && (
                      <div className="space-y-3 mt-4 border-t pt-4">
                        <Label>Variable Mapping</Label>
                        <p className="text-xs text-muted-foreground">Map your ERP data to the variables (e.g. {'{{1}}'}, {'{{2}}'}) in this Meta template.</p>
                        
                        {[1, 2, 3, 4, 5].map(num => (
                          <div key={num} className="flex items-center gap-4">
                            <span className="text-sm font-mono bg-muted px-2 py-1 rounded w-16 text-center">{`{{${num}}}`}</span>
                            <Select 
                              disabled={!settings.enabled}
                              value={settings.templateVariableMapping?.[num.toString()] || "none"}
                              onValueChange={(val) => {
                                setSettings(prev => ({
                                  ...prev,
                                  templateVariableMapping: {
                                    ...(prev.templateVariableMapping || {}),
                                    [num.toString()]: val === "none" ? "" : val
                                  }
                                }));
                              }}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder={`Select data for {{${num}}}`} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">-- Not Used --</SelectItem>
                                <SelectItem value="customerName">Customer Name</SelectItem>
                                <SelectItem value="invoiceNumber">Invoice Number</SelectItem>
                                <SelectItem value="totalAmount">Total Amount</SelectItem>
                                <SelectItem value="balanceAmount">Balance Amount</SelectItem>
                                <SelectItem value="dueDate">Due Date</SelectItem>
                                <SelectItem value="daysOverdue">Days Overdue</SelectItem>
                                <SelectItem value="businessName">Business Name</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-yellow-50/50 border border-yellow-200 text-yellow-800 p-3 rounded text-sm mb-4">
                    Meta WhatsApp integration is disabled. You are using Free Text simulation mode.
                  </div>
                )}

                {!settings.metaTemplateName && (
                  <>
                    <div className="space-y-2">
                      <Label>Free Text Message Template</Label>
                      <Textarea
                        value={settings.messageTemplate}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, messageTemplate: e.target.value }))
                        }
                        rows={6}
                        placeholder="Enter your reminder message template..."
                        disabled={!settings.enabled}
                      />
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                      <p className="text-sm font-medium">Available Variables:</p>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { var: "{{customerName}}", desc: "Customer name" },
                          { var: "{{invoiceNumber}}", desc: "Invoice number" },
                          { var: "{{totalAmount}}", desc: "Invoice total" },
                          { var: "{{balanceAmount}}", desc: "Balance due" },
                          { var: "{{dueDate}}", desc: "Due date" },
                          { var: "{{daysOverdue}}", desc: "Days overdue" },
                          { var: "{{businessName}}", desc: "Your company name" },
                        ].map((v) => (
                          <div key={v.var} className="flex items-center gap-2">
                            <code className="text-xs bg-background px-1.5 py-0.5 rounded border font-mono">
                              {v.var}
                            </code>
                            <span className="text-xs text-muted-foreground">{v.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  {!settings.metaTemplateName && (
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={handlePreviewMessage}
                      disabled={!settings.enabled}
                    >
                      <Send className="h-4 w-4" />
                      Preview
                    </Button>
                  )}
                  <Button
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                  >
                    {savingSettings ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Template Config
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bulk Send Confirmation Dialog */}
      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <SendHorizonal className="h-5 w-5 text-green-600" />
              Send Bulk Reminders?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will send WhatsApp payment reminders to all eligible customers with overdue invoices.
              <br /><br />
              <strong>{eligibleCount} invoices</strong> are currently eligible for reminders.
              Customers without phone numbers or who have reached the maximum reminder count will be skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkSend} className="bg-green-600 hover:bg-green-700">
              Send All Reminders
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Message Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Message Preview
            </DialogTitle>
            <DialogDescription>
              This is how the WhatsApp message will look to the customer
            </DialogDescription>
          </DialogHeader>
          <div className="bg-[#e5ded8] rounded-lg p-4">
            <div className="bg-[#dcf8c6] rounded-lg p-3 max-w-[90%] ml-auto shadow-sm">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{previewMessage}</p>
              <div className="text-right mt-1">
                <span className="text-[10px] text-gray-500">
                  {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} ✓✓
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
