import { useState } from "react";
import { format } from "date-fns";
import { Upload, Calendar, Receipt, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface VendorBillDialogProps {
  vendor: {
    id: string;
    name: string;
  };
  onBillCreated?: () => void;
}

interface BillItem {
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
}

export function VendorBillDialog({ vendor, onBillCreated }: VendorBillDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [billData, setBillData] = useState({
    bill_number: "",
    bill_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: "",
    notes: "",
    bill_image_url: ""
  });
  const [items, setItems] = useState<BillItem[]>([
    { item_name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 18, tax_amount: 0, total_amount: 0 }
  ]);
  const { toast } = useToast();

  const addItem = () => {
    setItems([...items, { 
      item_name: "", 
      description: "", 
      quantity: 1, 
      unit_price: 0, 
      tax_rate: 18, 
      tax_amount: 0, 
      total_amount: 0 
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof BillItem, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calculate totals for this item
    const item = updatedItems[index];
    const subtotal = item.quantity * item.unit_price;
    const taxAmount = (subtotal * item.tax_rate) / 100;
    const total = subtotal + taxAmount;
    
    updatedItems[index].tax_amount = taxAmount;
    updatedItems[index].total_amount = total;
    
    setItems(updatedItems);
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.total_amount, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('📋 API not yet implemented');;
    e.preventDefault();
    setLoading(true);

    try {
      const user = await apiClient.getCurrentUser();
      if (!user) throw new Error('User not authenticatedvendor_billsvendor_bill_items')
        .insert(billItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Vendor bill created successfully",
      });

      // Reset form
      setBillData({
        bill_number: "",
        bill_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: "",
        notes: "",
        bill_image_url: ""
      });
      setItems([{ 
        item_name: "", 
        description: "", 
        quantity: 1, 
        unit_price: 0, 
        tax_rate: 18, 
        tax_amount: 0, 
        total_amount: 0 
      }]);
      
      setOpen(false);
      onBillCreated?.();
    } catch (error) {
      console.error('Error creating vendor bill:', error);
      toast({
        title: "Error",
        description: "Failed to create vendor bill",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Receipt className="w-4 h-4" />
          Add Bill
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Bill for {vendor.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bill Details */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bill_number">Bill Number *</Label>
                  <Input
                    id="bill_number"
                    value={billData.bill_number}
                    onChange={(e) => setBillData(prev => ({ ...prev, bill_number: e.target.value }))}
                    placeholder="INV-001"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="bill_date">Bill Date *</Label>
                  <Input
                    id="bill_date"
                    type="date"
                    value={billData.bill_date}
                    onChange={(e) => setBillData(prev => ({ ...prev, bill_date: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={billData.due_date}
                    onChange={(e) => setBillData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <Label htmlFor="bill_image">Bill Image URL (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="bill_image"
                    value={billData.bill_image_url}
                    onChange={(e) => setBillData(prev => ({ ...prev, bill_image_url: e.target.value }))}
                    placeholder="https://example.com/bill-image.jpg"
                  />
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bill Items */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Bill Items</h3>
                <Button type="button" onClick={addItem} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
              
              <div className="space-y-4">
                {items.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                      <div className="md:col-span-2">
                        <Label>Item Name *</Label>
                        <Input
                          value={item.item_name}
                          onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                          placeholder="Item name"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label>Unit Price *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label>Tax %</Label>
                        <Select
                          value={item.tax_rate.toString()}
                          onValueChange={(value) => updateItem(index, 'tax_rate', parseFloat(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="5">5%</SelectItem>
                            <SelectItem value="12">12%</SelectItem>
                            <SelectItem value="18">18%</SelectItem>
                            <SelectItem value="28">28%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-center">
                          <Label>Total</Label>
                          <div className="font-bold text-lg">
                            ₹{item.total_amount.toFixed(2)}
                          </div>
                        </div>
                        
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Item description (optional)"
                      />
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-end mt-4 p-4 bg-muted rounded-lg">
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    Total: ₹{getTotalAmount().toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Including all taxes
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={billData.notes}
              onChange={(e) => setBillData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes (optional)"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Bill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}