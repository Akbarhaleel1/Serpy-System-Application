import { useState, useEffect } from "react";
import { Plus, Search, FileText, Trash2, Clock, CheckCircle, XCircle, Send, Mail, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreateQuotationDialog } from "@/components/quotations/CreateQuotationDialog";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface Quotation {
  _id: string;
  quotationNumber: string;
  customer_id: { _id: string; name: string; email?: string; phone?: string };
  gst_type: "gst" | "non_gst";
  is_interstate: boolean;
  valid_until: string;
  status: "draft" | "sent" | "approved" | "rejected";
  total_amount: number;
  payment_link?: string;
  createdAt: string;
  notes?: string;
}

const statusConfig = {
  draft: { label: "Draft", variant: "secondary" as const, icon: Clock },
  sent: { label: "Sent", variant: "default" as const, icon: Send },
  approved: { label: "Approved", variant: "default" as const, icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
};

export default function Quotations() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [emailDialog, setEmailDialog] = useState<{ open: boolean; quotation: Quotation | null }>({ open: false, quotation: null });
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const { toast } = useToast();

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getQuotations();
      const data = (response as any)?.quotations || (response as any) || [];
      setQuotations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch quotations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const filtered = quotations.filter((q) => {
    const query = searchQuery.toLowerCase();
    return (
      q.quotationNumber?.toLowerCase().includes(query) ||
      q.customer_id?.name?.toLowerCase().includes(query)
    );
  });

  const openEmailDialog = (q: Quotation) => {
    setEmailRecipient(q.customer_id?.email || "");
    setEmailMessage("");
    setEmailDialog({ open: true, quotation: q });
  };

  const handleSendEmail = async () => {
    if (!emailDialog.quotation) return;
    setSendingEmail(true);
    try {
      await apiClient.sendQuotationEmail(emailDialog.quotation._id, emailRecipient, emailMessage || undefined);
      toast({ title: "Email Sent", description: `Quotation sent to ${emailRecipient}` });
      setEmailDialog({ open: false, quotation: null });
      fetchQuotations();
    } catch {
      toast({ title: "Error", description: "Failed to send email", variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadPDF = async (q: Quotation) => {
    try {
      const blob = await apiClient.downloadQuotationPDF(q._id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quotation_${q.quotationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "PDF Error",
        description: error.message || "Failed to download PDF. Ensure company settings are configured.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deleteQuotation(id);
      toast({ title: "Deleted", description: "Quotation deleted" });
      fetchQuotations();
    } catch {
      toast({ title: "Error", description: "Failed to delete quotation", variant: "destructive" });
    }
  };

  const formatDate = (dateStr: string) =>
    dateStr ? new Date(dateStr).toLocaleDateString("en-IN") : "-";

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount ?? 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground text-sm">Manage and track all customer quotations</p>
        </div>
        <CreateQuotationDialog onQuotationCreated={fetchQuotations}>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Quotation
          </Button>
        </CreateQuotationDialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["draft", "sent", "approved", "rejected"] as const).map((status) => {
          const count = quotations.filter((q) => q.status === status).length;
          const cfg = statusConfig[status];
          const Icon = cfg.icon;
          return (
            <Card key={status}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground capitalize">{cfg.label}</p>
                  <p className="text-xl font-bold">{count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by number or customer..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Quotations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Loading quotations...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <FileText className="w-10 h-10 opacity-40" />
              <p className="text-sm">
                {searchQuery ? "No quotations match your search." : "No quotations yet. Create your first one."}
              </p>
              {!searchQuery && (
                <CreateQuotationDialog onQuotationCreated={fetchQuotations}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Quotation
                  </Button>
                </CreateQuotationDialog>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Quotation #</th>
                    <th className="text-left px-4 py-3 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 font-medium">GST Type</th>
                    <th className="text-left px-4 py-3 font-medium">Valid Until</th>
                    <th className="text-left px-4 py-3 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q) => {
                    const cfg = statusConfig[q.status] ?? statusConfig.draft;
                    const Icon = cfg.icon;
                    return (
                      <tr key={q._id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono">{q.quotationNumber}</td>
                        <td className="px-4 py-3">{q.customer_id?.name ?? "-"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">
                            {q.gst_type === "gst"
                              ? `GST (${q.is_interstate ? "Interstate" : "Intrastate"})`
                              : "Non-GST"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{formatDate(q.valid_until)}</td>
                        <td className="px-4 py-3 font-medium">{formatAmount(q.total_amount)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={cfg.variant} className="gap-1">
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(q.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 h-7 px-2 text-xs"
                              onClick={() => handleDownloadPDF(q)}
                              title="Download PDF"
                            >
                              <Download className="w-3 h-3" />
                              PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 h-7 px-2 text-xs"
                              onClick={() => openEmailDialog(q)}
                              title="Send via email"
                            >
                              <Mail className="w-3 h-3" />
                              Send
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(q._id)}
                              title="Delete quotation"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Send Email Dialog */}
      <Dialog open={emailDialog.open} onOpenChange={(open) => !open && setEmailDialog({ open: false, quotation: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Quotation via Email
            </DialogTitle>
          </DialogHeader>

          {emailDialog.quotation && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <span className="text-muted-foreground">Quotation: </span>
                <span className="font-mono font-medium">{emailDialog.quotation.quotationNumber}</span>
                <span className="text-muted-foreground ml-3">Customer: </span>
                <span className="font-medium">{emailDialog.quotation.customer_id?.name}</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email-recipient">Recipient Email</Label>
                <Input
                  id="email-recipient"
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email-message">Message (optional)</Label>
                <Textarea
                  id="email-message"
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Add a personal note to the email..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialog({ open: false, quotation: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendingEmail || !emailRecipient}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {sendingEmail ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
