import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Filter, Users, Building2, UserCheck, User, Calendar, Edit, Tag, DollarSign, AlertTriangle, CheckCircle, Activity, Download, FileText, Briefcase } from "lucide-react";
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
import { CreateCustomerDialog } from "@/components/customers/CreateCustomerDialog";
import { EditCustomerDialog } from "@/components/customers/EditCustomerDialog";
import { CreateJobDialog } from "@/components/jobs/CreateJobDialog";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, formatCustomersForExport } from "@/utils/exportUtils";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  notes: string | null;
  gstNumber: string | null;
  customerType: string;
  tags: string[];
  status: string;
  createdAt: string;
  totalSpent: number;
  totalRevenue: number;
  totalOrders: number;
  lastOrderDate: string | null;
  lastPaymentDate: string | null;
  lastPaymentAmount: number;
  paymentStatus: string;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  gstVerified: boolean;
  outstandingBalance: number;
  creditLimit: number;
  preferredJobTypes: string[];
}

export default function Customers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterGST, setFilterGST] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateJobDialog, setShowCreateJobDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerForJob, setSelectedCustomerForJob] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    if (!user) return;

    try {
      const response = await apiClient.getCustomer({ status: 'all', limit: 100 });
      console.log('👥 Customers response:', response);
      const customersData = (response as any)?.data?.customers || (response as any)?.customers || [];
      console.log('👥 Processed customers:', customersData);
      console.log('👥 Customers count:', customersData.length);
      // Map customers to ensure consistent ID field (handle both id and _id)
      const mappedCustomers = customersData.map((customer: any) => ({
        ...customer,
        id: customer.id || customer._id
      }));
      setCustomers(mappedCustomers);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error fetching customers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [user]);

  const filteredCustomers = customers.filter((customer) => {
    // Enhanced search with partial matching
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchLower) ||
      (customer.phone && customer.phone.includes(searchTerm)) ||
      (customer.email && customer.email.toLowerCase().includes(searchLower)) ||
      (customer.company && customer.company.toLowerCase().includes(searchLower)) ||
      (customer.gstNumber && customer.gstNumber.toLowerCase().includes(searchLower)) ||
      // Partial phone number matching
      (customer.phone && customer.phone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))) ||
      // Partial name matching (supports "john doe" finding "John M. Doe")
      searchTerm.split(' ').every(term => 
        customer.name.toLowerCase().includes(term.toLowerCase())
      );
    
    const matchesFilter = filterStatus === "all" || customer.status === filterStatus;
    const matchesType = filterType === "all" || customer.customerType === filterType;
    const matchesTag = filterTag === "all" || (customer.tags && customer.tags.includes(filterTag));
    
    // GST status filtering
    const matchesGST = filterGST === "all" || (() => {
      switch (filterGST) {
        case "verified": return customer.gstVerified;
        case "unverified": return customer.gstNumber && !customer.gstVerified;
        case "none": return !customer.gstNumber;
        default: return true;
      }
    })();
    
    return matchesSearch && matchesFilter && matchesType && matchesTag && matchesGST;
  });

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    // EditCustomerDialog manages its own open state
  };

  const handleCreateJob = (customer: Customer) => {
    setSelectedCustomerForJob(customer);
    setShowCreateJobDialog(true);
  };

  const handleJobCreated = () => {
    setShowCreateJobDialog(false);
    setSelectedCustomerForJob(null);
    toast({
      title: "Job Created Successfully",
      description: `Job created for ${selectedCustomerForJob?.name}`,
    });
    // Navigate to jobs section
    navigate('/jobs');
  };

  const getCustomerType = (customer: Customer) => {
    return customer.customerType || "Individual";
  };

  const getTypeConfig = (type: string) => {
    const configs = {
      "Individual": { variant: "secondary" as const, icon: User },
      "Business": { variant: "default" as const, icon: Building2 },
      "Corporate": { variant: "default" as const, icon: Building2 },
      "Walk-in": { variant: "secondary" as const, icon: User },
    };
    return configs[type as keyof typeof configs] || configs["Individual"];
  };

  const getPaymentStatusConfig = (status: string) => {
    const configs = {
      "current": { variant: "success" as const, label: "Current" },
      "due": { variant: "warning" as const, label: "Due" },
      "advance_paid": { variant: "default" as const, label: "Advance Paid" },
      "overdue": { variant: "destructive" as const, label: "Overdue" },
    };
    return configs[status as keyof typeof configs] || configs["current"];
  };

  const stats = {
    total: customers.length,
    business: customers.filter(c => c.customerType === "Business" || c.customerType === "Corporate").length,
    individual: customers.filter(c => c.customerType === "Individual" || c.customerType === "Walk-in").length,
    active: customers.filter(c => c.status === "active").length,
    withGST: customers.filter(c => c.gstNumber).length,
    blacklisted: customers.filter(c => c.isBlacklisted).length,
    highValue: customers.filter(c => (c.totalRevenue || 0) >= 50000).length,
    totalRevenue: customers.reduce((sum, c) => sum + (c.totalRevenue || 0), 0),
    outstanding: customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0),
  };

  // Get all unique tags for filter
  const allTags = Array.from(new Set(customers.flatMap(c => c.tags || [])));

  // Export functions
  const handleExportCSV = () => {
    try {
      const exportData = formatCustomersForExport(filteredCustomers);
      exportToCSV(exportData, `customers_export_${new Date().toISOString().split('T')[0]}`);
      toast({
        title: "Export Successful",
        description: `Exported ${filteredCustomers.length} customers to CSV`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportAll = () => {
    try {
      const exportData = formatCustomersForExport(customers);
      exportToCSV(exportData, `all_customers_export_${new Date().toISOString().split('T')[0]}`);
      toast({
        title: "Export Successful",
        description: `Exported ${customers.length} customers to CSV`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage your clients and track their information
          </p>
        </div>
        {user ? (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportCSV}
              disabled={filteredCustomers.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Filtered ({filteredCustomers.length})
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportAll}
              disabled={customers.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export All ({customers.length})
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Please log in to add customers</div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active customers
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Business Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.business}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.business / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Individual</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.individual}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.individual / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              from all customers
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Value</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highValue}</div>
            <p className="text-xs text-muted-foreground">
              customers ≥ ₹50K revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search and Filters */}
      <div className="flex items-center space-x-4 flex-wrap gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email, company, or GST..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Individual">Individual</SelectItem>
            <SelectItem value="Business">Business</SelectItem>
            <SelectItem value="Corporate">Corporate</SelectItem>
            <SelectItem value="Walk-in">Walk-in</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterGST} onValueChange={setFilterGST}>
          <SelectTrigger className="w-[140px]">
            <CheckCircle className="h-4 w-4 mr-2" />
            <SelectValue placeholder="GST Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All GST</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="none">No GST</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-[140px]">
            <Tag className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer List */}
      <div className="grid gap-4">
        {filteredCustomers.map((customer, index) => {
          const customerType = getCustomerType(customer);
          const typeConfig = getTypeConfig(customerType);
          
          return (
            <Card 
              key={customer.id} 
              className="shadow-card hover:shadow-elevated transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <typeConfig.icon className="h-6 w-6 text-primary" />
                    </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold">{customer.name}</h3>
                          {customer.isBlacklisted && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Blacklisted
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          {customer.phone && <span>{customer.phone}</span>}
                          {customer.phone && customer.email && <span>•</span>}
                          {customer.email && <span>{customer.email}</span>}
                          {customer.company && (
                            <>
                              <span>•</span>
                              <span className="font-medium">{customer.company}</span>
                            </>
                          )}
                          {customer.gstNumber && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-xs flex items-center gap-1">
                                GST: {customer.gstNumber}
                                {customer.gstVerified && <CheckCircle className="h-3 w-3 text-success" />}
                              </span>
                            </>
                          )}
                        </div>
                        
                        {/* Customer Activity Summary */}
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {customer.totalOrders || 0} orders
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ₹{(customer.totalRevenue || 0).toLocaleString()} revenue
                          </div>
                          {customer.lastOrderDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Last order: {new Date(customer.lastOrderDate).toLocaleDateString()}
                            </div>
                          )}
                          {customer.outstandingBalance > 0 && (
                            <div className="flex items-center gap-1 text-warning">
                              <AlertTriangle className="h-3 w-3" />
                              Outstanding: ₹{customer.outstandingBalance.toLocaleString()}
                            </div>
                          )}
                        </div>

                        {customer.address && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {customer.address}
                          </p>
                        )}
                        {customer.tags && customer.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {customer.tags.map((tag) => (
                              <Badge 
                                key={tag} 
                                variant={tag === "Blacklisted" ? "destructive" : "outline"} 
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Internal Notes Preview */}
                        {customer.notes && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                            <span className="font-medium">Internal Notes:</span> {customer.notes.substring(0, 100)}
                            {customer.notes.length > 100 && "..."}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Added</div>
                        <div className="font-semibold">
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </div>
                        {customer.paymentStatus !== 'current' && (
                          <Badge 
                            variant={getPaymentStatusConfig(customer.paymentStatus).variant}
                            className="mt-1"
                          >
                            {getPaymentStatusConfig(customer.paymentStatus).label}
                          </Badge>
                        )}
                      </div>
                      <Badge 
                        variant={customer.status === "active" ? "success" : "secondary"}
                      >
                        {customer.status}
                      </Badge>
                      <Badge variant={typeConfig.variant}>
                        {customerType}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateJob(customer)}
                          className="gap-2"
                        >
                          <Briefcase className="h-3 w-3" />
                          Create Job
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCustomer(customer)}
                          className="gap-2"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {customers.length === 0 ? "No customers yet" : "No customers found"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {customers.length === 0 
                ? "Add your first customer to get started"
                : "Try adjusting your search or filter criteria"
              }
            </p>
            {customers.length === 0 ? (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Customer
              </Button>
            ) : (
              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setFilterStatus("all");
              }}>
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Create and Edit Customer Dialogs */}
      <CreateCustomerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCustomerCreated={fetchCustomers}
      />
      
      <EditCustomerDialog
        customer={selectedCustomer}
        onCustomerUpdated={fetchCustomers}
        onCustomerDeleted={fetchCustomers}
      />

      {/* Create Job Dialog */}
      <CreateJobDialog
        open={showCreateJobDialog}
        onOpenChange={setShowCreateJobDialog}
        onJobCreated={handleJobCreated}
        customers={customers}
        preselectedCustomer={selectedCustomerForJob}
      />
    </div>
  );
}