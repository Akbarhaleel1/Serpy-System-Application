import { useState, useEffect } from "react";
import { Search, Upload, Download, Eye, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerLoginDialog } from "@/components/portal/CustomerLoginDialog";
import { FileUploadDialog } from "@/components/portal/FileUploadDialog";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

const Portal = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(!isLoggedIn);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoggedIn && customerId) {
      fetchCustomerData();
    }
  }, [isLoggedIn, customerId]);

  const fetchCustomerData = async () => {
    try {
      const [ordersResponse, invoicesResponse, deliveriesResponse] = await Promise.all([
        apiClient.getPortalOrders(customerId),
        apiClient.getPortalInvoices(customerId),
        apiClient.getPortalDeliveries(customerId)
      ]);

      console.log('🏢 Portal data response:', { ordersResponse, invoicesResponse, deliveriesResponse });
      
      setOrders(ordersResponse.data?.orders || []);
      setInvoices(invoicesResponse.data?.invoices || []);
      setDeliveries(deliveriesResponse.data?.deliveries || []);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast({
        title: "Error",
        description: "Failed to load customer data",
        variant: "destructive",
      });
    }
  };

  const handleLogin = async (name: string) => {
    try {
      if (!name.trim()) {
        toast({
          title: "Invalid Name",
          description: "Please enter your name",
          variant: "destructive",
        });
        return;
      }

      // Find customer by name
      const response = await apiClient.getCustomers();
      const customers = response.data?.customers || [];
      const customer = customers.find((c: any) => 
        c.name.toLowerCase().includes(name.toLowerCase())
      );
      
      if (customer) {
        setCustomerName(customer.name);
        setCustomerId(customer._id);
        setIsLoggedIn(true);
        setIsLoginDialogOpen(false);
        toast({
          title: "Welcome!",
          description: `Successfully logged in as ${customer.name}`,
        });
      } else {
        toast({
          title: "Customer Not Found",
          description: "Please check your name and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "Failed to log in. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "in-progress":
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full mx-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Customer Portal</CardTitle>
              <p className="text-muted-foreground">Access your orders and invoices</p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setIsLoginDialogOpen(true)}
                className="w-full"
              >
                Customer Login
              </Button>
            </CardContent>
          </Card>
        </div>
        <CustomerLoginDialog
          open={isLoginDialogOpen}
          onOpenChange={setIsLoginDialogOpen}
          onLogin={handleLogin}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {customerName}</h1>
          <p className="text-muted-foreground">Manage your orders and download files</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsUploadDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Files
          </Button>
          <Button variant="outline" onClick={() => setIsLoggedIn(false)}>
            Logout
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search orders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">My Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {orders
              .filter(order => 
                order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                order.id.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">JOB-{order.id.slice(-3)}</CardTitle>
                        <p className="text-sm text-muted-foreground">{order.title}</p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Order Date:</span>
                        <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Due Date:</span>
                        <p className="font-medium">
                          {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <span className="text-muted-foreground">Estimated Cost:</span>
                      <p className="text-xl font-bold">
                        ₹{(order.actual_cost || order.estimated_cost || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="h-3 w-3" />
                        View Details
                      </Button>
                      {order.status === 'completed' && (
                        <Button variant="outline" size="sm" className="gap-2">
                          <Download className="h-3 w-3" />
                          Download Files
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
          {orders.length === 0 && (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders found</h3>
              <p className="text-muted-foreground">You don't have any orders yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {invoices
              .filter(invoice => 
                (invoice.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (invoice.jobs?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">
                          {invoice.invoice_number || `INV-${invoice.id.slice(-3)}`}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Job: {invoice.jobs?.title || 'N/A'}
                        </p>
                      </div>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="text-xl font-bold">₹{(invoice.total_amount || 0).toLocaleString()}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Issue Date:</span>
                        <p className="font-medium">{new Date(invoice.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Due Date:</span>
                        <p className="font-medium">
                          {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                    </div>

                    {invoice.paid_date && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Paid Date:</span>
                        <p className="font-medium text-success">
                          {new Date(invoice.paid_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="h-3 w-3" />
                        View Invoice
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-3 w-3" />
                        Download PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
          {invoices.length === 0 && (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
              <p className="text-muted-foreground">You don't have any invoices yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <FileUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
      />
    </div>
  );
};

export default Portal;