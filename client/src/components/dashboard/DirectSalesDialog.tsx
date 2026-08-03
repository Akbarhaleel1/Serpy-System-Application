import apiClient from "@/lib/apiClient";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, CreditCard, Receipt } from 'lucide-react';

interface DirectSaleItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export const DirectSalesDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    paymentMethod: 'cash' as const,
    notes: ''
  });
  
  const [items, setItems] = useState<DirectSaleItem[]>([
    { name: '', quantity: 1, price: 0, total: 0 }
  ]);

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, price: 0, total: 0 }]);
  };

  const updateItem = (index: number, field: keyof DirectSaleItem, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'price') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].price;
    }
    
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = subtotal * 0.18; // 18% GST
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await apiClient.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { subtotal, taxAmount, total } = calculateTotals();
      
      // Generate sale number
      const saleNumber = `DS-${Date.now()}accounts_ledger')
        .insert({
          user_id: user.id,
          description: `Direct Sale: ${saleNumber}`,
          amount: total,
          transaction_type: 'income',
          account_type: formData.paymentMethod === 'cash' ? 'cash' : 'bank',
          payment_method: formData.paymentMethod
        });

      toast({
        title: "Sale Completed",
        description: `Direct sale ${saleNumber} has been recorded successfully.`
      });

      // Reset form
      setFormData({ customerName: '', customerPhone: '', paymentMethod: 'cash', notes: '' });
      setItems([{ name: '', quantity: 1, price: 0, total: 0 }]);
      setIsOpen(false);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          Quick Sale
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Direct Sale (No Job Required)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name (Optional)</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Walk-in Customer"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone (Optional)</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="+91 9999999999"
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label>Item Name</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        placeholder="Item description"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Total</Label>
                      <Input
                        value={`₹${item.total.toFixed(2)}`}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button type="button" variant="outline" onClick={addItem} className="w-full">
                  + Add Item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Totals */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={formData.paymentMethod} onValueChange={(value: any) => 
                    setFormData(prev => ({ ...prev, paymentMethod: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional notes..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sale Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (18%):</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <CreditCard className="h-4 w-4" />
              {loading ? 'Processing...' : 'Complete Sale'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};