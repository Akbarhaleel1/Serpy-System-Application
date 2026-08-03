import { useState, useEffect } from "react";
import { Plus, X, Package, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";

interface PurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated?: () => void;
}

interface PurchaseItem {
  id: string;
  inventory_id: string;
  name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export function PurchaseOrderDialog({ open, onOpenChange, onOrderCreated }: PurchaseOrderDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    vendor_id: "",
    expected_delivery: "",
    notes: ""
  });
  
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState("");

  useEffect(() => {
    if (open) {
      fetchInventory();
      fetchVendors();
    }
  }, [open]);

  const fetchInventory = async () => {
    try {
      const response = await apiClient.getInventory();
      console.log('📦 Inventory for PO:', response);
      setInventory(response || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory items",
        variant: "destructive",
      });
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await apiClient.getVendors();
      console.log('🏢 Vendors for PO:', response);
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

  const addItem = () => {
    if (!selectedInventory) return;
    
    const selectedItem = inventory.find(item => item._id === selectedInventory);
    if (!selectedItem) return;

    const newItem: PurchaseItem = {
      id: Date.now().toString(),
      inventory_id: selectedItem._id,
      name: selectedItem.name,
      quantity: 1,
      unit_cost: selectedItem.unitCost || 0,
      total_cost: selectedItem.unitCost || 0
    };

    setItems(prev => [...prev, newItem]);
    setSelectedInventory("");
  };

  const updateItem = (id: string, field: string, value: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        updatedItem.total_cost = updatedItem.quantity * updatedItem.unit_cost;
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total_cost, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vendor_id || items.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a vendor and add at least one item",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const purchaseOrderData = {
        vendorId: formData.vendor_id,
        expectedDelivery: formData.expected_delivery,
        notes: formData.notes,
        terms: 'Net 30',
        items: items.map(item => ({
          inventoryId: item.inventory_id,
          quantity: item.quantity,
          unitCost: item.unit_cost
        }))
      };

      const response = await apiClient.createPurchaseOrder(purchaseOrderData);
      console.log('📋 Purchase Order created:', response);

      toast({
        title: "Purchase Order Created",
        description: `PO ${response.data?.purchaseOrder?.poNumber || response.purchaseOrder?.poNumber || 'Unknown'} created successfully`,
      });
      
      resetForm();
      onOpenChange(false);
      
      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create purchase order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_id: "",
      expected_delivery: "",
      notes: ""
    });
    setItems([]);
    setSelectedInventory("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Create Purchase Order
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vendor Information */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendor_id">Vendor *</Label>
                <Select value={formData.vendor_id} onValueChange={(value) => setFormData(prev => ({ ...prev, vendor_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor._id} value={vendor._id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expected_delivery">Expected Delivery</Label>
                  <Input
                    id="expected_delivery"
                    type="date"
                    value={formData.expected_delivery}
                    onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter any additional notes"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add Items */}
          <Card>
            <CardHeader>
              <CardTitle>Add Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedInventory} onValueChange={setSelectedInventory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select inventory item" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        {item.name} - {item.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addItem} disabled={!selectedInventory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Purchase Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">SKU: {item.inventory_id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Qty:</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Unit Cost:</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) => updateItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Total:</Label>
                        <span className="font-medium">₹{item.total_cost.toLocaleString()}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Amount:</span>
                    <span className="text-xl font-bold">₹{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Purchase Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}