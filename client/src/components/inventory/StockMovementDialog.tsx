import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockMovementDialog({ open, onOpenChange }: StockMovementDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    item: "",
    type: "",
    quantity: "",
    reference: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Stock Movement Recorded",
      description: `Stock ${formData.type} has been recorded successfully`,
    });
    onOpenChange(false);
    setFormData({
      item: "",
      type: "",
      quantity: "",
      reference: "",
      notes: ""
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Stock Movement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Select Item</Label>
            <Select value={formData.item} onValueChange={(value) => handleChange('item', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose inventory item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vinyl-rolls">Vinyl Rolls</SelectItem>
                <SelectItem value="a4-paper">A4 Paper (80gsm)</SelectItem>
                <SelectItem value="ink-cartridge">Ink Cartridge - Black</SelectItem>
                <SelectItem value="lamination-film">Lamination Film</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Movement Type</Label>
              <Select value={formData.type} onValueChange={(value) => handleChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock In</SelectItem>
                  <SelectItem value="out">Stock Out</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input 
                type="number"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                placeholder="Enter quantity"
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <Label>Reference</Label>
            <Input 
              value={formData.reference}
              onChange={(e) => handleChange('reference', e.target.value)}
              placeholder="Job ID, Purchase order, etc."
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea 
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Record Movement</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}