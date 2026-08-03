import { useState, useEffect } from "react";
import { Search, Plus, Truck, Package, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateDeliveryDialog } from "@/components/delivery/CreateDeliveryDialog";
import { DeliveryCard } from "@/components/delivery/DeliveryCard";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface Delivery {
  id: string;
  deliveryId: string;
  jobId: string;
  customerName: string;
  address: string;
  status: string;
  driverName?: string;
  driverPhone?: string;
  scheduledDate: string;
  items: number;
  priority: string;
}

const Delivery = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const response = await apiClient.getDeliveries();
      console.log('🚚 Deliveries response:', response);
      
      const formattedDeliveries: Delivery[] = (response.data?.deliveries || []).map((delivery: any, index: number) => ({
        id: delivery._id || delivery.id,
        deliveryId: delivery.trackingNumber || `DEL-${String(index + 1).padStart(3, '0')}`,
        jobId: delivery.jobId?.title || 'N/A',
        customerName: delivery.customerId?.name || 'Unknown Customer',
        address: delivery.deliveryAddress || 'No address',
        status: delivery.status || 'pending',
        driverName: delivery.driver || undefined,
        driverPhone: delivery.driverInfo?.phone || undefined,
        scheduledDate: delivery.deliveryDate ? new Date(delivery.deliveryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        items: delivery.items?.length || 1,
        priority: delivery.priority || 'medium'
      })) || [];

      setDeliveries(formattedDeliveries);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      toast({
        title: "Error",
        description: "Failed to load deliveries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = delivery.deliveryId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (delivery.driverName && delivery.driverName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || delivery.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === "pending" || d.status === "scheduled").length,
    inTransit: deliveries.filter(d => d.status === "in_transit").length,
    delivered: deliveries.filter(d => d.status === "delivered").length
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Management</h1>
          <p className="text-muted-foreground">Track and manage all deliveries</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} variant="gradient" size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Schedule Delivery
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inTransit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search deliveries..."
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
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
            size="sm"
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "in-transit" ? "default" : "outline"}
            onClick={() => setStatusFilter("in-transit")}
            size="sm"
          >
            In Transit
          </Button>
          <Button
            variant={statusFilter === "delivered" ? "default" : "outline"}
            onClick={() => setStatusFilter("delivered")}
            size="sm"
          >
            Delivered
          </Button>
        </div>
      </div>

      {/* Deliveries Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          filteredDeliveries.map((delivery) => (
            <DeliveryCard 
              key={delivery.id} 
              delivery={delivery}
            />
          ))
        )}
      </div>

      {filteredDeliveries.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No deliveries found</h3>
          <p className="text-muted-foreground">No deliveries match your current filters.</p>
        </div>
      )}

      <CreateDeliveryDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
};

export default Delivery;