import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, Download, MoreHorizontal, Pencil, Trash2, CheckCircle2, Receipt, Wallet, FileText } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { NewPurchaseBillDialog } from "@/components/purchase-bills/NewPurchaseBillDialog";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  partial: "secondary",
  pending: "outline",
};

export default function PurchaseBills() {
  const { toast } = useToast();
  const [bills, setBills] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalBills: 0, totalAmount: 0, paidAmount: 0, outstandingAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [billsRes, statsRes]: any = await Promise.all([
        apiClient.getPurchaseBills(search ? { search } : undefined),
        apiClient.getPurchaseBillStats(),
      ]);
      // apiClient.request() already unwraps the `data` envelope, so bills/stats
      // live at the top level. Fall back to the nested shape just in case.
      setBills(billsRes?.bills || billsRes?.data?.bills || []);
      setStats(
        statsRes?.stats || statsRes?.data?.stats || { totalBills: 0, totalAmount: 0, paidAmount: 0, outstandingAmount: 0 }
      );
    } catch (error) {
      console.error("Error fetching purchase bills:", error);
      toast({ title: "Error", description: "Failed to fetch purchase bills", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNew = () => {
    setEditingBill(null);
    setDialogOpen(true);
  };

  const handleEdit = (bill: any) => {
    setEditingBill(bill);
    setDialogOpen(true);
  };

  const handleDownload = async (bill: any) => {
    try {
      toast({ title: "Generating PDF", description: `Preparing ${bill.billNumber}...` });
      await apiClient.downloadPurchaseBillPDF(bill._id);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error?.message || "Failed to download bill PDF",
        variant: "destructive",
      });
    }
  };

  const handleMarkPaid = async (bill: any) => {
    try {
      await apiClient.updatePurchaseBill(bill._id, { paidAmount: bill.totalAmount });
      toast({ title: "Marked as paid", description: `${bill.billNumber} is fully paid` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update bill", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiClient.deletePurchaseBill(deleteId);
      toast({ title: "Deleted", description: "Purchase bill deleted" });
      setDeleteId(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to delete bill", variant: "destructive" });
    }
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Bills</h1>
          <p className="text-muted-foreground">Record and track bills received from vendors</p>
        </div>
        <Button className="gap-2" onClick={handleNew}>
          <Plus className="h-4 w-4" />
          New Purchase Bill
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" /> Total Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBills || 0}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalAmount || 0)} billed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">Total paid to vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(stats.outstandingAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">Balance payable</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>All Bills</CardTitle>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchData();
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="Search bill #, vendor, invoice #"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Vendor Inv #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No purchase bills yet. Click "New Purchase Bill" to record one.
                  </TableCell>
                </TableRow>
              ) : (
                bills.map((bill) => (
                  <TableRow key={bill._id}>
                    <TableCell className="font-medium">{bill.billNumber}</TableCell>
                    <TableCell>{bill.vendorName}</TableCell>
                    <TableCell>{bill.vendorInvoiceNumber || "-"}</TableCell>
                    <TableCell>{formatDate(bill.billDate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(bill.totalAmount || 0)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[bill.paymentStatus] || "outline"} className="capitalize">
                        {bill.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(bill)}>
                            <Download className="h-4 w-4 mr-2" /> Download PDF
                          </DropdownMenuItem>
                          {bill.paymentStatus !== "paid" && (
                            <DropdownMenuItem onClick={() => handleMarkPaid(bill)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Paid
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleEdit(bill)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(bill._id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewPurchaseBillDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchData}
        bill={editingBill}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete purchase bill?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The bill will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
