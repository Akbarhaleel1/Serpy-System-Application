import { useState, useEffect } from "react";
import { Search, Plus, CreditCard, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatePaymentDialog } from "@/components/payments/CreatePaymentDialog";
import { PaymentCard } from "@/components/payments/PaymentCard";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

export default function Payments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await apiClient.getPayments();
      console.log('💳 Payments response:', response);
      setPayments(response.data?.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive",
      });
    }
  };

  const filteredPayments = payments.filter(payment => {
    const customerName = payment.customers?.name || '';
    const invoiceNumber = payment.invoices?.invoice_number || '';
    const matchesSearch = (payment.reference_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: payments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
    completed: payments.filter(p => p.status === "completed").reduce((sum, payment) => sum + (payment.amount || 0), 0),
    pending: payments.filter(p => p.status === "pending").reduce((sum, payment) => sum + (payment.amount || 0), 0),
    failed: payments.filter(p => p.status === "failed").reduce((sum, payment) => sum + (payment.amount || 0), 0)
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Management</h1>
          <p className="text-muted-foreground">Track and manage customer payments</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} variant="gradient" size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{stats.completed.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">₹{stats.pending.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{stats.failed.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            onClick={() => setStatusFilter("completed")}
            size="sm"
          >
            Completed
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
            size="sm"
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "failed" ? "default" : "outline"}
            onClick={() => setStatusFilter("failed")}
            size="sm"
          >
            Failed
          </Button>
        </div>
      </div>

      {/* Payments Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPayments.map((payment) => (
          <PaymentCard 
            key={payment.id} 
            payment={{
              ...payment,
              paymentId: payment.reference_number || payment.id,
              invoiceId: payment.invoices?.invoice_number || 'N/A',
              customerName: payment.customers?.name || 'Unknown Customer',
              date: payment.payment_date || payment.created_at,
              method: payment.payment_method,
              reference: payment.reference_number
            }} 
          />
        ))}
      </div>

      {filteredPayments.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No payments found</h3>
          <p className="text-muted-foreground">No payments match your current filters.</p>
        </div>
      )}

      <CreatePaymentDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}