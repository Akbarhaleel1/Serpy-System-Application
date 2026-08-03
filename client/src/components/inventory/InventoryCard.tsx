import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, AlertTriangle, TrendingUp, TrendingDown, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface InventoryItem {
  _id?: string;
  id?: string;
  name: string;
  category?: string;
  sku?: string;
  quantity: number;
  unitCost?: number;
  unit_cost?: number;
  minStockLevel?: number;
  min_stock_level?: number;
  supplier?: string;
  location?: string;
  status?: string;
  hsnCode?: string;
  gstRate?: number;
  description?: string;
}

interface InventoryCardProps {
  item: InventoryItem;
  onUpdate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function InventoryCard({ item, onUpdate, onEdit, onDelete }: InventoryCardProps) {
  const [quickRestockQty, setQuickRestockQty] = useState(10);
  const { toast } = useToast();

  const getStockStatus = () => {
    const current = item.quantity || 0;
    const minimum = item.minStockLevel || item.min_stock_level || 0;
    
    if (current <= minimum / 2) return "critical";
    if (current <= minimum) return "low";
    return "adequate";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical": return "destructive";
      case "low": return "secondary";
      case "adequate": return "default";
      default: return "outline";
    }
  };

  const quickRestock = async (quantity: number) => {
    try {
      const itemId = item._id || item.id;
      if (!itemId) {
        toast({
          title: "Error",
          description: "Item ID not found",
          variant: "destructive",
        });
        return;
      }

      const newQuantity = (item.quantity || 0) + quantity;
      await apiClient.adjustInventory(itemId, newQuantity, "Quick restock", `Added ${quantity} units`);
      
      toast({
        title: "Restock Complete",
        description: `Added ${quantity} units to ${item.name}`,
      });
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error restocking:', error);
      toast({
        title: "Error",
        description: "Failed to restock item",
        variant: "destructive",
      });
    }
  };

  const stockStatus = getStockStatus();
  const totalValue = (item.quantity || 0) * (item.unitCost || item.unit_cost || 0);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {item.category || "Uncategorized"}
              </Badge>
              {item.sku && (
                <Badge variant="secondary" className="text-xs">
                  SKU: {item.sku}
                </Badge>
              )}
              <Badge variant={getStatusColor(stockStatus) as any} className="text-xs">
                {stockStatus}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stock Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Current Stock</Label>
            <div className="flex items-center gap-2 mt-1">
              <Package className="h-4 w-4" />
              <span className="text-lg font-semibold">{item.quantity || 0}</span>
              <span className="text-sm text-muted-foreground">units</span>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Min. Stock</Label>
            <div className="flex items-center gap-2 mt-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-lg font-semibold">{item.minStockLevel || item.min_stock_level || 0}</span>
              <span className="text-sm text-muted-foreground">units</span>
            </div>
          </div>
        </div>

        {/* Value and Cost */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Total Value</Label>
            <div className="flex items-center gap-2 mt-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-lg font-semibold">₹{totalValue.toLocaleString()}</span>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Unit Cost</Label>
            <div className="flex items-center gap-2 mt-1">
              <TrendingDown className="h-4 w-4 text-blue-600" />
              <span className="text-lg font-semibold">₹{item.unitCost || item.unit_cost || 0}</span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {(item.supplier || item.location || item.hsnCode) && (
          <div className="space-y-2">
            {item.supplier && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Supplier</Label>
                <p className="text-sm">{item.supplier}</p>
              </div>
            )}
            {item.location && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                <p className="text-sm">{item.location}</p>
              </div>
            )}
            {item.hsnCode && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">HSN Code</Label>
                <p className="text-sm">{item.hsnCode} ({item.gstRate || 18}% GST)</p>
              </div>
            )}
          </div>
        )}

        {/* Quick Restock */}
        <div className="border-t pt-4">
          <Label className="text-sm font-medium">Quick Restock</Label>
          <div className="flex items-center gap-2 mt-2">
            <Input
              type="number"
              min="1"
              value={quickRestockQty}
              onChange={(e) => setQuickRestockQty(parseInt(e.target.value) || 1)}
              className="w-20"
            />
            <Button 
              size="sm" 
              onClick={() => quickRestock(quickRestockQty)}
              className="flex-1"
            >
              Add Stock
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
