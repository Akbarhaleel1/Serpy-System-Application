import { useState, useEffect } from "react";
import { format } from "date-fns";
import { FileText, Eye, Download, Calendar, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface Bill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  status: string;
  notes: string | null;
  bill_image_url: string | null;
  vendor_bill_items?: any[];
}

interface VendorLedgerDialogProps {
  vendor: {
    id: string;
    name: string;
    total_purchases: number;
    pending_amount: number;
  };
}

export function VendorLedgerDialog({ vendor }: VendorLedgerDialogProps) {
  const [open, setOpen] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchVendorBills();
    }
  }, [open, vendor.id]);

  const fetchVendorBills = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to fetch vendor bills
      console.log('📋 API not yet implemented');
      setBills([]);
    } catch (error) {
      console.error('Error fetching vendor bills:', error);
      toast({
        title: "Error",
        description: "Failed to load vendor bills",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'partial': return 'warning';
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partial': return 'Partially Paid';
      case 'overdue': return 'Overdue';
      default: return 'Pending';
    }
  };

  const filteredBills = bills.filter(bill => {
    const matchesSearch = bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (bill.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const generateMonthlyReport = () => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const monthlyBills = bills.filter(bill => bill.bill_date.startsWith(currentMonth));
    const totalDue = monthlyBills.reduce((sum, bill) => sum + (bill.total_amount - bill.paid_amount), 0);
    
    toast({
      title: "Monthly Report",
      description: `${monthlyBills.length} bills with ₹${totalDue.toLocaleString()} pending this month`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="w-4 h-4" />
          Ledger
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Vendor Ledger - {vendor.name}</span>
            <Button onClick={generateMonthlyReport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Monthly Report
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full overflow-hidden">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{vendor.total_purchases.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pending Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">₹{vendor.pending_amount.toLocaleString()}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Bills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bills.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Input
                placeholder="Search bills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
              <FileText className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partially Paid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bills List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">Loading bills...</div>
            ) : filteredBills.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No bills found</h3>
                <p className="text-muted-foreground">No bills match your search criteria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBills.map((bill) => (
                  <Card key={bill.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{bill.bill_number}</h4>
                            <Badge variant={getStatusColor(bill.status)}>
                              {getStatusLabel(bill.status)}
                            </Badge>
                            {bill.bill_image_url && (
                              <Badge variant="outline">
                                <Eye className="w-3 h-3 mr-1" />
                                Image
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Date:</span>
                              <div>{format(new Date(bill.bill_date), 'MMM dd, yyyy')}</div>
                            </div>
                            
                            {bill.due_date && (
                              <div>
                                <span className="text-muted-foreground">Due Date:</span>
                                <div>{format(new Date(bill.due_date), 'MMM dd, yyyy')}</div>
                              </div>
                            )}
                            
                            <div>
                              <span className="text-muted-foreground">Total Amount:</span>
                              <div className="font-semibold">₹{bill.total_amount.toLocaleString()}</div>
                            </div>
                            
                            <div>
                              <span className="text-muted-foreground">Pending:</span>
                              <div className="font-semibold text-warning">
                                ₹{(bill.total_amount - bill.paid_amount).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          {bill.notes && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              <strong>Notes:</strong> {bill.notes}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBill(bill)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {bill.bill_image_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(bill.bill_image_url!, '_blank')}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bill Details Modal */}
        {selectedBill && (
          <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bill Details - {selectedBill.bill_number}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Bill Date:</strong> {format(new Date(selectedBill.bill_date), 'MMM dd, yyyy')}
                  </div>
                  {selectedBill.due_date && (
                    <div>
                      <strong>Due Date:</strong> {format(new Date(selectedBill.due_date), 'MMM dd, yyyy')}
                    </div>
                  )}
                  <div>
                    <strong>Status:</strong> 
                    <Badge variant={getStatusColor(selectedBill.status)} className="ml-2">
                      {getStatusLabel(selectedBill.status)}
                    </Badge>
                  </div>
                  <div>
                    <strong>Total Amount:</strong> ₹{selectedBill.total_amount.toLocaleString()}
                  </div>
                </div>
                
                {selectedBill.vendor_bill_items && selectedBill.vendor_bill_items.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Items:</h4>
                    <div className="space-y-2">
                      {selectedBill.vendor_bill_items.map((item, index) => (
                        <div key={index} className="flex justify-between p-2 bg-muted rounded">
                          <span>{item.item_name} (Qty: {item.quantity})</span>
                          <span>₹{item.total_amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedBill.notes && (
                  <div>
                    <strong>Notes:</strong>
                    <p className="mt-1 text-muted-foreground">{selectedBill.notes}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}