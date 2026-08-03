import { useState, useEffect } from "react";
import { format, isBefore, addDays, differenceInDays } from "date-fns";
import { 
  DollarSign, 
  AlertTriangle, 
  Clock, 
  User,
  Phone,
  Banknote,
  TrendingUp,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface PaymentDue {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerGstNumber?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerState?: string;
  paymentStatus: string;
  status: string;
  balanceAmount: number;
  paidAmount: number;
  invoiceDate: string;
  createdAt: string;
  updatedAt: string;
}

interface GetInvoicesResponse {
  data?: {
    invoices?: PaymentDue[];
  };
  invoices?: PaymentDue[];
}

interface PaymentDuesWidgetProps {
  onRefresh?: () => void;
}

export function PaymentDuesWidget({ onRefresh }: PaymentDuesWidgetProps) {
  const [dues, setDues] = useState<PaymentDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [totalDue, setTotalDue] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentDues();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchPaymentDues, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchPaymentDues = async () => {
    try {
      const response: GetInvoicesResponse = await apiClient.getInvoices({ paymentStatus: 'pending,partial,overdue' });
      console.log('💰 Payment dues response:', response);
      
      // Handle different response formats
      let duesData: PaymentDue[] = [];
      if (Array.isArray(response)) {
        duesData = response;
      } else if (response && response.data && Array.isArray(response.data.invoices)) {
        duesData = response.data.invoices;
      } else if (response && Array.isArray(response.data)) {
        duesData = response.data;
      } else if (response && Array.isArray(response.invoices)) {
        duesData = response.invoices;
      }
      
      setDues(duesData);
      
      const total = duesData.reduce((sum: number, due: PaymentDue) => sum + (due.balanceAmount ?? due.totalAmount ?? 0), 0);
      setTotalDue(total);
    } catch (error) {
      console.error('Error fetching payment dues:', error);
      toast({
        title: "Error",
        description: "Failed to load payment dues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDueStatus = (dueDate: string) => {
    if (!dueDate) return { urgency: 'no-date', label: 'No due date', color: 'bg-gray-500' };
    
    const due = new Date(dueDate);
    const now = new Date();
    const soon = addDays(now, 3); // Next 3 days

    if (isBefore(due, now)) {
      return { urgency: 'overdue', label: 'Overdue', color: 'bg-red-500' };
    } else if (isBefore(due, soon)) {
      return { urgency: 'due-soon', label: 'Due soon', color: 'bg-yellow-500' };
    } else {
      return { urgency: 'normal', label: 'Upcoming', color: 'bg-green-500' };
    }
  };

  const markAsPaid = async (invoiceId: string) => {
    const due = dues.find(d => d._id === invoiceId);
    setMarkingPaid(invoiceId);
    try {
      await apiClient.updateInvoicePaymentStatus(invoiceId, {
        paymentStatus: 'paid',
        amountPaid: due?.totalAmount || 0
      });

      // Optimistically remove from list immediately
      setDues(prev => {
        const updated = prev.filter(d => d._id !== invoiceId);
        setTotalDue(updated.reduce((sum, d) => sum + (d.totalAmount || 0), 0));
        return updated;
      });

      toast({
        title: "Success",
        description: "Invoice marked as paid",
      });

      onRefresh?.();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
      // Re-fetch to restore correct state on failure
      await fetchPaymentDues();
    } finally {
      setMarkingPaid(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-card bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Payment Dues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-card bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Payment Dues
            <Badge variant="secondary" className="ml-2">
              {dues.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPaymentDues}
            className="h-8 w-8 p-0"
          >
            <Clock className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">Total pending:</p>
          <Badge variant="warning" className="text-xs">
            ₹{totalDue.toLocaleString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {dues.length === 0 ? (
          <div className="text-center py-4">
            <Banknote className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All payments collected!</p>
          </div>
        ) : (
          Array.isArray(dues) && dues.map((due) => {
            const status = getDueStatus(due.dueDate);
            
            return (
              <div key={due._id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${status.color}`}></div>
                      <h4 className="font-medium text-sm">{due.invoiceNumber}</h4>
                      <Badge 
                        variant={status.urgency === 'overdue' ? 'destructive' : 
                               status.urgency === 'due-soon' ? 'warning' : 'default'}
                        className="text-xs"
                      >
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div className="text-lg font-bold text-foreground mb-1">
                      ₹{due.totalAmount.toLocaleString()}
                    </div>
                    
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {due.customerName && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {due.customerName}
                        </div>
                      )}
                      
                      {due.customerPhone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {due.customerPhone}
                        </div>
                      )}
                      
                      {due.dueDate && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due: {format(new Date(due.dueDate), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 ml-2">
                    {status.urgency === 'overdue' && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markAsPaid(due._id)}
                      disabled={markingPaid === due._id}
                      className="h-7 text-xs"
                    >
                      {markingPaid === due._id ? "Saving..." : "Mark Paid"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}