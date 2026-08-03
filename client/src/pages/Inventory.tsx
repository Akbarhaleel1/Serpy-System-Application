import { useState, useEffect } from "react";
import { Plus, Search, Package, AlertTriangle, TrendingDown, TrendingUp, ShoppingCart, Calculator, BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryCard } from "@/components/inventory/InventoryCard";
import { CreateItemDialog } from "@/components/inventory/CreateItemDialog";
import { StockMovementDialog } from "@/components/inventory/StockMovementDialog";
import { PurchaseOrderDialog } from "@/components/inventory/PurchaseOrderDialog";
import { UnitConverterDialog } from "@/components/inventory/UnitConverterDialog";
import { InventoryAnalytics } from "@/components/inventory/InventoryAnalytics";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

export default function Inventory() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await apiClient.getInventory();
      console.log('📦 Inventory response:', response);
      setInventory(response || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
      try {
        await apiClient.deleteInventoryItem(id);
        toast({
          title: "Item Deleted",
          description: `"${name}" has been removed from inventory`,
        });
        fetchInventory();
      } catch (error) {
        console.error("Error deleting item:", error);
        toast({
          title: "Error",
          description: "Failed to delete inventory item",
          variant: "destructive",
        });
      }
    }
  };
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showConverterDialog, setShowConverterDialog] = useState(false);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate inventory statistics
  const totalValue = inventory.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitCost || item.unit_cost || 0)), 0);
  const lowStockItems = inventory.filter(item => (item.quantity || 0) <= (item.minStockLevel || item.min_stock_level || 0)).length;
  const criticalItems = inventory.filter(item => (item.quantity || 0) <= ((item.minStockLevel || item.min_stock_level || 0) * 0.5)).length;

  const exportInventoryAudit = async () => {
    try {
      const csvContent = "data:text/csv;charset=utf-8," + 
        "Name,Category,SKU,Quantity,Unit Cost,Min Stock,Supplier,Location\n" +
        inventory.map(item => 
          `"${item.name}","${item.category || ''}","${item.sku || ''}",${item.quantity || 0},${item.unitCost || item.unit_cost || 0},${item.minStockLevel || item.min_stock_level || 0},"${item.supplier || ''}","${item.location || ''}"`
        ).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `inventory_audit_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: "Inventory audit has been exported to CSV",
      });
    } catch (error) {
      console.error('Error exporting inventory:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export inventory audit",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">Track materials with auto-deduction, purchase orders, and analytics</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowConverterDialog(true)} variant="outline" className="gap-2">
            <Calculator className="h-4 w-4" />
            Unit Converter
          </Button>
          <Button onClick={() => setShowPurchaseDialog(true)} variant="outline" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Purchase Order
          </Button>
          <Button onClick={() => setShowStockDialog(true)} variant="outline" className="gap-2">
            <Package className="h-4 w-4" />
            Stock Movement
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} variant="gradient" size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
            <p className="text-xs text-muted-foreground">items in inventory</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">total stock value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">items need reorder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Critical Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalItems}</div>
            <p className="text-xs text-muted-foreground">immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Materials">Materials</SelectItem>
            <SelectItem value="Paper">Paper</SelectItem>
            <SelectItem value="Consumables">Consumables</SelectItem>
            <SelectItem value="Equipment">Equipment</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="adequate">Adequate</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />
            Inventory Items
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics & Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {/* Inventory List */}
          <div className="grid gap-4">
            {filteredInventory.map((item) => (
              <InventoryCard 
                key={item._id || item.id} 
                item={item} 
                onUpdate={fetchInventory} 
                onDelete={() => handleDeleteItem(item._id || item.id, item.name)}
              />
            ))}
          </div>

          {filteredInventory.length === 0 && (
            <Card className="text-center p-8">
              <CardContent>
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No inventory items found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || categoryFilter !== "all" 
                    ? "Try adjusting your search or filter criteria"
                    : "Start by adding your first inventory item"
                  }
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <InventoryAnalytics />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateItemDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        onItemCreated={fetchInventory}
      />
      <StockMovementDialog 
        open={showStockDialog} 
        onOpenChange={setShowStockDialog}
      />
      <PurchaseOrderDialog 
        open={showPurchaseDialog} 
        onOpenChange={setShowPurchaseDialog}
        onOrderCreated={fetchInventory}
      />
      <UnitConverterDialog 
        open={showConverterDialog} 
        onOpenChange={setShowConverterDialog}
      />
    </div>
  );
}