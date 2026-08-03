import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, FileText, Send, Link } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface QuotationItem {
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

interface CreateQuotationDialogProps {
  children: React.ReactNode;
  onQuotationCreated?: () => void;
}

export const CreateQuotationDialog = ({ children, onQuotationCreated }: CreateQuotationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    customer_id: "",
    valid_until: "",
    gst_type: "non_gst" as "gst" | "non_gst",
    is_interstate: false,
    payment_link: "",
    terms_conditions: "",
    notes: "",
  });
  const [items, setItems] = useState<QuotationItem[]>([
    { item_name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 18 }
  ]);

  const { toast } = useToast();

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.getCustomer();
      const customersData =
        (response as any)?.data?.customers || (response as any)?.customers || [];
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      });
    }
  };

  const addItem = () => {
    setItems([...items, { item_name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 18 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = formData.gst_type === "gst" ? 
      items.reduce((sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate) / 100, 0) : 0;
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.createQuotation({
        ...formData,
        items,
      });

      toast({
        title: "Success",
        description: "Quotation created successfully",
      });

      setOpen(false);
      setFormData({
        customer_id: "",
        valid_until: "",
        gst_type: "non_gst",
        is_interstate: false,
        payment_link: "",
        terms_conditions: "",
        notes: "",
      });
      setItems([{ item_name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 18 }]);
      onQuotationCreated?.();
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast({
        title: "Error",
        description: "Failed to create quotation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={fetchCustomers}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create Quotation
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <Select value={formData.customer_id} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, customer_id: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer._id} value={customer._id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* GST Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gst_type">GST Type</Label>
              <Select value={formData.gst_type} onValueChange={(value: "gst" | "non_gst") => 
                setFormData(prev => ({ ...prev, gst_type: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_gst">Non-GST</SelectItem>
                  <SelectItem value="gst">GST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {formData.gst_type === "gst" && (
              <div className="space-y-2">
                <Label htmlFor="interstate">Transaction Type</Label>
                <Select value={formData.is_interstate ? "interstate" : "intrastate"} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, is_interstate: value === "interstate" }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intrastate">Intrastate</SelectItem>
                    <SelectItem value="interstate">Interstate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Valid Until */}
          <div className="space-y-2">
            <Label htmlFor="valid_until">Valid Until</Label>
            <Input
              id="valid_until"
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
            />
          </div>

          {/* Payment Link */}
          <div className="space-y-2">
            <Label htmlFor="payment_link" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              Payment Link
            </Label>
            <Input
              id="payment_link"
              type="url"
              value={formData.payment_link}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_link: e.target.value }))}
              placeholder="https://razorpay.com/... (optional)"
            />
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" onClick={addItem} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-6 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Item Name</Label>
                      <Input
                        value={item.item_name}
                        onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                        placeholder="Item name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="1"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    
                    {formData.gst_type === "gst" && (
                      <div className="space-y-2">
                        <Label>Tax Rate (%)</Label>
                        <Input
                          type="number"
                          value={item.tax_rate}
                          onChange={(e) => updateItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                          placeholder="18"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label>Total</Label>
                      <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center">
                        ₹{(item.quantity * item.unit_price + (formData.gst_type === "gst" ? (item.quantity * item.unit_price * item.tax_rate) / 100 : 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="mt-2 gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Totals */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {formData.gst_type === "gst" && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>₹{taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Notes */}
          <div className="space-y-2">
            <Label htmlFor="terms_conditions">Terms & Conditions</Label>
            <Textarea
              id="terms_conditions"
              value={formData.terms_conditions}
              onChange={(e) => setFormData(prev => ({ ...prev, terms_conditions: e.target.value }))}
              placeholder="Terms and conditions"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Quotation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};