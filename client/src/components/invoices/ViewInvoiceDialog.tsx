import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Mail,
  MessageSquare,
  Edit,
  FileText,
  Calendar,
  User,
  Building,
  Phone,
  MapPin,
  Hash,
  DollarSign,
  Package,
  Percent,
  Settings,
  AlertTriangle
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { EditInvoiceDialog } from "./EditInvoiceDialog";
import { useNavigate } from "react-router-dom";

interface InvoiceItem {
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  hsnCode: string;
  gstRate: number;
  gstAmount: number;
  itemTotal: number;
}

interface Invoice {
  _id?: string;
  id: string;
  invoiceNumber: string;
  customerId: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    gstNumber?: string;
  };
  jobId?: {
    _id: string;
    title: string;
  };
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  totalGstAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  isInterState: boolean;
  noGst: boolean;
  notes?: string;
  termsAndConditions?: string;
  createdAt: string;
  updatedAt: string;
}

interface ViewInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onInvoiceUpdated: () => void;
}

export function ViewInvoiceDialog({ open, onOpenChange, invoice, onInvoiceUpdated }: ViewInvoiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [showCompanySettingsDialog, setShowCompanySettingsDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!invoice) return null;

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const invoiceId = invoice._id || invoice.id;
      await apiClient.downloadInvoicePDF(invoiceId);
      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully",
      });
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      // Check if error is about company settings not configured
      if (error.message?.includes('Company details not configured')) {
        setShowCompanySettingsDialog(true);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to download invoice PDF",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const invoiceId = invoice._id || invoice.id;
      await apiClient.sendInvoiceEmail(invoiceId, email, message);
      toast({
        title: "Success",
        description: "Invoice sent via email successfully",
      });
      setShowEmailDialog(false);
      setEmail("");
      setMessage("");
    } catch (error: any) {
      console.error('Error sending email:', error);
      // Check if error is about company settings not configured
      if (error.message?.includes('Company details not configured')) {
        setShowCompanySettingsDialog(true);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to send invoice via email",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!phone) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const invoiceId = invoice._id || invoice.id;
      await apiClient.sendInvoiceWhatsApp(invoiceId, phone, message);
      toast({
        title: "Success",
        description: "Invoice sent via WhatsApp successfully",
      });
      setShowWhatsAppDialog(false);
      setPhone("");
      setMessage("");
    } catch (error: any) {
      console.error('Error sending WhatsApp:', error);
      // Check if error is about company settings not configured
      if (error.message?.includes('Company details not configured')) {
        setShowCompanySettingsDialog(true);
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to send invoice via WhatsApp",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setShowEditDialog(true);
    onOpenChange(false);
  };

  const handleEditDialogClose = (open: boolean) => {
    setShowEditDialog(open);
    if (!open) {
      onOpenChange(true);
      onInvoiceUpdated();
    }
  };

  const getPaymentStatusConfig = (status: string) => {
    const configs = {
      "pending": { variant: "secondary" as const, label: "Pending" },
      "partial": { variant: "default" as const, label: "Partial" },
      "paid": { variant: "success" as const, label: "Paid" },
      "overdue": { variant: "destructive" as const, label: "Overdue" },
    };
    return configs[status as keyof typeof configs] || configs["pending"];
  };

  const paymentStatusConfig = getPaymentStatusConfig(invoice.paymentStatus);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  {invoice.invoiceNumber}
                </DialogTitle>
                <DialogDescription>
                  Invoice details and information
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {invoice.noGst && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    No GST
                  </Badge>
                )}
                <Badge variant={paymentStatusConfig.variant}>
                  {paymentStatusConfig.label}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{invoice.customerId.name}</span>
                  </div>
                  {invoice.customerId.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>{invoice.customerId.email}</span>
                    </div>
                  )}
                  {invoice.customerId.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{invoice.customerId.phone}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {invoice.customerId.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <span>{invoice.customerId.address}</span>
                    </div>
                  )}
                  {invoice.customerId.gstNumber && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Hash className="h-4 w-4" />
                      <span>GST: {invoice.customerId.gstNumber}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Invoice Date:</span>
                    <span className="font-semibold">{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Due Date:</span>
                    <span className="font-semibold">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                  </div>
                  {invoice.jobId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Job:</span>
                      <span className="font-semibold">{invoice.jobId.title}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Inter-State:</span>
                    <Badge variant={invoice.isInterState ? "default" : "secondary"}>
                      {invoice.isInterState ? "Yes (IGST)" : "No (CGST+SGST)"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-semibold">{new Date(invoice.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Items ({invoice.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoice.items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{item.itemName}</h4>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        <span className="font-semibold">₹{item.itemTotal.toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        <div>Qty: {item.quantity}</div>
                        <div>Unit Price: ₹{item.unitPrice.toLocaleString()}</div>
                        <div>HSN: {item.hsnCode}</div>
                        <div>GST: {item.gstRate}% (₹{item.gstAmount.toLocaleString()})</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>₹{invoice.subtotal.toLocaleString()}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="text-red-600">-₹{invoice.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxable Amount:</span>
                  <span>₹{invoice.taxableAmount.toLocaleString()}</span>
                </div>
                {!invoice.noGst && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total GST ({invoice.isInterState ? 'IGST' : 'CGST+SGST'}):
                    </span>
                    <span>₹{invoice.totalGstAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total Amount:</span>
                  <span className="text-lg">₹{invoice.totalAmount.toLocaleString()}</span>
                </div>
                {invoice.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount Paid:</span>
                      <span className="text-green-600">₹{invoice.amountPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Balance Due:</span>
                      <span className="text-orange-600">₹{invoice.balanceDue.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Notes and Terms */}
            {(invoice.notes || invoice.termsAndConditions) && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {invoice.notes && (
                    <div>
                      <h4 className="font-semibold mb-2">Notes:</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                    </div>
                  )}
                  {invoice.termsAndConditions && (
                    <div>
                      <h4 className="font-semibold mb-2">Terms and Conditions:</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.termsAndConditions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex flex-1 gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={loading}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEmail(invoice.customerId.email || "");
                  setShowEmailDialog(true);
                }}
                disabled={loading}
                className="gap-2"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setPhone(invoice.customerId.phone || "");
                  setShowWhatsAppDialog(true);
                }}
                disabled={loading}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={handleEdit}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Invoice
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invoice via Email</DialogTitle>
            <DialogDescription>
              Send this invoice to the customer via email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailMessage">Message (Optional)</Label>
              <Textarea
                id="emailMessage"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={loading}>
              {loading ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invoice via WhatsApp</DialogTitle>
            <DialogDescription>
              Send this invoice to the customer via WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappMessage">Message (Optional)</Label>
              <Textarea
                id="whatsappMessage"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWhatsAppDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendWhatsApp} disabled={loading}>
              {loading ? "Sending..." : "Send WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Settings Required Dialog */}
      <Dialog open={showCompanySettingsDialog} onOpenChange={setShowCompanySettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Company Settings Required
            </DialogTitle>
            <DialogDescription>
              You need to configure your company details before you can generate invoices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                Please go to <strong>Settings &gt; Company</strong> and add your company information including:
              </p>
              <ul className="text-sm text-amber-700 mt-2 ml-4 list-disc">
                <li>Company Name</li>
                <li>Company Address</li>
                <li>Phone Number</li>
                <li>Email</li>
                <li>GST Number (if applicable)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompanySettingsDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowCompanySettingsDialog(false);
                navigate('/settings');
              }}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Go to Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <EditInvoiceDialog
        open={showEditDialog}
        onOpenChange={handleEditDialogClose}
        invoice={invoice}
        onInvoiceUpdated={onInvoiceUpdated}
      />
    </>
  );
}
