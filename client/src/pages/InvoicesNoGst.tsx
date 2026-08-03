import { useState, useEffect } from "react";
import { Plus, Search, FileText, Download, Eye, Trash2, DollarSign, Calendar, User, Building, Filter, MoreHorizontal, Send, Copy, Archive, CheckCircle, Clock, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdvancedCreateInvoiceDialog } from "@/components/invoices/AdvancedCreateInvoiceDialog";
import { ViewInvoiceDialog } from "@/components/invoices/ViewInvoiceDialog";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
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
  items: Array<{
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    hsnCode: string;
    gstRate: number;
    gstAmount: number;
    itemTotal: number;
  }>;
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
  createdAt: string;
  updatedAt: string;
}

const safeParseAmount = (value: string): number | null => {
  try {
    if (value === '' || value === undefined) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  } catch (e) {
    return null;
  }
};

export default function InvoicesNoGst() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [gstViewFilter, setGstViewFilter] = useState("no-gst"); // "no-gst", "with-gst", "both"
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showPaymentStatusDialog, setShowPaymentStatusDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [paymentStatusData, setPaymentStatusData] = useState({
    paymentStatus: '',
    amountPaid: ''
  });
  const [paymentStatusLoading, setPaymentStatusLoading] = useState(false);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    avgInvoiceValue: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, [gstViewFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      // Build query params based on GST view filter
      const params: any = {};

      if (gstViewFilter === "no-gst") {
        params.noGst = true;
      } else if (gstViewFilter === "with-gst") {
        params.noGst = false;
      }
      // If "both", don't add noGst parameter to fetch all invoices

      const response = await apiClient.getInvoices(params);
      console.log('📄 Invoices response:', response);
      const sortedInvoices = (response.invoices || []).sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setInvoices(sortedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.getInvoiceStats();
      console.log('📊 Invoice stats:', response);
      setStats(response.stats || {
        totalInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        avgInvoiceValue: 0
      });
    } catch (error) {
      console.error('Error fetching invoice stats:', error);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.jobId?.title || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPaymentStatus = paymentStatusFilter === "all" || invoice.paymentStatus === paymentStatusFilter;

    return matchesSearch && matchesPaymentStatus;
  });

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewDialog(true);
  };

  const handlePaymentStatusClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentStatusData({
      paymentStatus: invoice.paymentStatus || 'pending',
      amountPaid: invoice.amountPaid > 0 ? invoice.amountPaid.toString() : ''
    });
    setShowPaymentStatusDialog(true);
  };

  const handleUpdatePaymentStatus = async () => {
    if (!selectedInvoice || !paymentStatusData.paymentStatus) return;

    // Validate amount paid
    if (paymentStatusData.amountPaid !== '') {
      const amountPaid = safeParseAmount(paymentStatusData.amountPaid as string);
      const totalAmount = selectedInvoice.totalAmount || 0;

      if (amountPaid === null) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid amount number",
          variant: "destructive",
        });
        return;
      }

      if (amountPaid < 0) {
        toast({
          title: "Invalid Amount",
          description: "Amount paid cannot be negative",
          variant: "destructive",
        });
        return;
      }

      if (amountPaid > totalAmount) {
        const excessAmount = amountPaid - totalAmount;
        toast({
          title: "Amount Exceeds Invoice Total",
          description: `You entered ₹${amountPaid.toLocaleString()}, but the invoice total is only ₹${totalAmount.toLocaleString()}. You exceeded by ₹${excessAmount.toLocaleString()}. Please enter an amount less than or equal to ₹${totalAmount.toLocaleString()}`,
          variant: "destructive",
        });
        return;
      }
    }

    setPaymentStatusLoading(true);
    try {
      const invoiceId = selectedInvoice._id || selectedInvoice.id;
      const updateData: any = {
        paymentStatus: paymentStatusData.paymentStatus
      };

      // Only include amountPaid if it's provided
      if (paymentStatusData.amountPaid !== '') {
        const parsedAmount = safeParseAmount(paymentStatusData.amountPaid as string);
        if (parsedAmount !== null) {
          updateData.amountPaid = parsedAmount;
        }
      }

      await apiClient.updateInvoicePaymentStatus(invoiceId, updateData);

      toast({
        title: "Success",
        description: `Payment status updated to ${paymentStatusData.paymentStatus}`,
      });

      // Close dialog and refresh invoices
      setShowPaymentStatusDialog(false);
      fetchInvoices();
      fetchStats();
    } catch (error) {
      console.error('Error updating payment status:', error);
      const errorMessage = (error as any).message || 'Failed to update payment status';

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPaymentStatusLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setInvoiceToDelete(id);
    setShowDeleteConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) {
      toast({
        title: "Error",
        description: "Invoice ID not found",
        variant: "destructive",
      });
      return;
    }

    setDeleteLoading(true);
    try {
      await apiClient.deleteInvoice(invoiceToDelete);
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
      setShowDeleteConfirmDialog(false);
      setInvoiceToDelete(null);
      fetchInvoices();
      fetchStats();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const getHeaderTitle = () => {
    if (gstViewFilter === "no-gst") return "Invoice Management (View No GST)";
    if (gstViewFilter === "with-gst") return "Invoice Management (View With GST)";
    return "Invoice Management (View Both)";
  };

  const getHeaderDescription = () => {
    if (gstViewFilter === "no-gst") return "Viewing invoices without GST details";
    if (gstViewFilter === "with-gst") return "Viewing invoices with GST details";
    return "Viewing all invoices (both with and without GST)";
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{getHeaderTitle()}</h1>
        <p className="text-muted-foreground mt-2">{getHeaderDescription()}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{(stats.paidAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{(stats.pendingAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Invoice Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(stats.avgInvoiceValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 min-w-0">
              <Label htmlFor="search" className="mb-2 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by invoice number, customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <Label htmlFor="gst-view" className="mb-2 block">GST View</Label>
              <Select value={gstViewFilter} onValueChange={setGstViewFilter}>
                <SelectTrigger id="gst-view">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-gst">View No GST</SelectItem>
                  <SelectItem value="with-gst">View With GST</SelectItem>
                  <SelectItem value="both">View Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Label htmlFor="payment-status" className="mb-2 block">Payment Status</Label>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger id="payment-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>{getHeaderTitle()}</CardTitle>
          <CardDescription>{getHeaderDescription()} - {filteredInvoices.length} invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading invoices...</p>
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No invoices found</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Invoice #</th>
                    <th className="text-left py-3 px-4 font-medium">Customer</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-right py-3 px-4 font-medium">Amount</th>
                    <th className="text-center py-3 px-4 font-medium">Status</th>
                    <th className="text-center py-3 px-4 font-medium">Payment</th>
                    <th className="text-center py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-medium">{invoice.invoiceNumber}</td>
                      <td className="py-3 px-4">{invoice.customerId.name}</td>
                      <td className="py-3 px-4">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                      <td className="text-right py-3 px-4 font-medium">₹{invoice.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td className="text-center py-3 px-4">
                        <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'draft' ? 'secondary' : 'destructive'}>
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge variant={invoice.paymentStatus === 'paid' ? 'default' : 'outline'}>
                          {invoice.paymentStatus}
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice)}
                            title="View invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePaymentStatusClick(invoice)}
                            title="Update payment status"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(invoice.id || invoice._id)}
                            title="Delete invoice"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDeleteConfirmDialog(false);
                setInvoiceToDelete(null);
              }}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              variant="destructive"
              className="gap-2"
            >
              {deleteLoading ? "Deleting..." : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Invoice
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Status Dialog */}
      <Dialog open={showPaymentStatusDialog} onOpenChange={setShowPaymentStatusDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
            <DialogDescription>
              Update the payment status and amount paid for this invoice
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="font-semibold">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-semibold">₹{(selectedInvoice.totalAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Paid:</span>
                  <span className="font-semibold text-green-600">₹{(selectedInvoice.amountPaid || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance Due:</span>
                  <span className="font-semibold text-orange-600">₹{(selectedInvoice.balanceDue || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-6">
                {/* Payment Status Selection */}
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select
                    value={paymentStatusData.paymentStatus}
                    onValueChange={(value) =>
                      setPaymentStatusData(prev => ({ ...prev, paymentStatus: value }))
                    }
                  >
                    <SelectTrigger id="paymentStatus">
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Pending
                        </div>
                      </SelectItem>
                      <SelectItem value="partial">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Partial
                        </div>
                      </SelectItem>
                      <SelectItem value="paid">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Paid
                        </div>
                      </SelectItem>
                      <SelectItem value="overdue">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Overdue
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Total Amount Paid */}
                <div className="space-y-2">
                  <Label htmlFor="amountPaid">Total Amount Paid (₹)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Enter the total amount paid so far (including previous payments)
                  </p>
                  {(() => {
                    const parsedAmount = safeParseAmount(paymentStatusData.amountPaid as string);
                    const totalAmount = selectedInvoice?.totalAmount || 0;
                    const isExceeding = parsedAmount !== null && parsedAmount > totalAmount;

                    return (
                      <>
                        {selectedInvoice && paymentStatusData.amountPaid !== '' && isExceeding && (
                          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-red-700">Amount Exceeds Invoice Total</p>
                              <p className="text-xs text-red-600">
                                Maximum allowed: ₹{totalAmount.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}
                        <Input
                          id="amountPaid"
                          type="number"
                          value={paymentStatusData.amountPaid}
                          onChange={(e) =>
                            setPaymentStatusData(prev => ({
                              ...prev,
                              amountPaid: e.target.value
                            }))
                          }
                          placeholder="0.00"
                          min="0"
                          max={totalAmount}
                          step="0.01"
                          className={isExceeding ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        />
                        {selectedInvoice && paymentStatusData.amountPaid !== '' && parsedAmount !== null && (
                          <div className="mt-3 space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Invoice Total: ₹{totalAmount.toLocaleString()}
                            </p>
                            {isExceeding ? (
                              <p className="text-sm font-semibold text-red-600">
                                ⚠️ Exceeds by: ₹{(parsedAmount - totalAmount).toLocaleString()}
                              </p>
                            ) : (
                              <p className="text-sm font-semibold text-green-600">
                                ✓ Remaining: ₹{Math.max(0, totalAmount - parsedAmount).toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentStatusDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdatePaymentStatus}
                  disabled={paymentStatusLoading || !paymentStatusData.paymentStatus}
                  className="gap-2"
                >
                  {paymentStatusLoading ? "Updating..." : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Update Status
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <ViewInvoiceDialog
        open={showViewDialog}
        onOpenChange={(open) => {
          setShowViewDialog(open);
          if (!open) {
            setSelectedInvoice(null);
          }
        }}
        invoice={selectedInvoice}
      />
    </div>
  );
}
