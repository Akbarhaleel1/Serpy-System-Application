import { useState, useEffect } from "react";
import { Plus, Search, Building, Phone, Mail, MapPin, Calendar, DollarSign, TrendingUp, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateVendorDialog } from "@/components/vendors/CreateVendorDialog";
import { VendorCard } from "@/components/vendors/VendorCard";
import { VendorAnalytics } from "@/components/vendors/VendorAnalytics";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

export default function Vendors() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await apiClient.getVendors();
      console.log('🏢 Vendors response:', response);
      console.log('🏢 Vendors data:', response.data);
      console.log('🏢 Vendors array:', response.data?.vendors);
      setVendors(response.vendors || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch vendors",
        variant: "destructive",
      });
    }
  };

  const filteredVendors = vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.vendorType || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalVendors = vendors.length;
  const activeVendors = vendors.filter(vendor => vendor.status === "active").length;
  const totalPendingAmount = vendors.reduce((sum, vendor) => sum + (vendor.pendingAmount || 0), 0);

  // Debug logging
  console.log('🏢 Current vendors state:', vendors);
  console.log('🏢 Filtered vendors:', filteredVendors);
  console.log('🏢 Total vendors:', totalVendors);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendor Management</h1>
          <p className="text-muted-foreground">Manage suppliers and service providers</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} variant="gradient" size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <Tabs defaultValue="vendors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="vendors" className="gap-2">
            <Building className="h-4 w-4" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Total Vendors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalVendors}</div>
                <p className="text-xs text-muted-foreground">registered</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pending Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalPendingAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">across all vendors</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-success" />
                  Active Vendors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">{activeVendors}</div>
                <p className="text-xs text-muted-foreground">currently active</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Vendors Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredVendors.map((vendor) => (
              <VendorCard key={vendor._id} vendor={vendor} onVendorUpdated={fetchVendors} />
            ))}
          </div>

          {filteredVendors.length === 0 && (
            <div className="text-center py-12">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No vendors found</h3>
              <p className="text-muted-foreground">No vendors match your search criteria.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <VendorAnalytics />
        </TabsContent>
      </Tabs>

      <CreateVendorDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onVendorCreated={fetchVendors}
      />
    </div>
  );
}