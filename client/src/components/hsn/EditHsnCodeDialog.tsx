import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface HsnCode {
  id: string;
  hsnCode: string;
  description: string;
  gstRate: number;
  type: 'product' | 'service' | 'both';
  category: string;
  subCategory?: string;
  notes?: string;
}

interface EditHsnCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hsnCode: HsnCode | null;
  onHsnCodeUpdated: () => void;
}

export function EditHsnCodeDialog({ open, onOpenChange, hsnCode, onHsnCodeUpdated }: EditHsnCodeDialogProps) {
  const [formData, setFormData] = useState({
    hsnCode: "",
    description: "",
    gstRate: 18,
    type: "product" as 'product' | 'service' | 'both',
    category: "",
    subCategory: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (hsnCode) {
      setFormData({
        hsnCode: hsnCode.hsnCode || "",
        description: hsnCode.description || "",
        gstRate: hsnCode.gstRate || 18,
        type: hsnCode.type || "product",
        category: hsnCode.category || "",
        subCategory: hsnCode.subCategory || "",
        notes: hsnCode.notes || ""
      });
    }
  }, [hsnCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hsnCode?.id) return;
    
    if (!formData.hsnCode || !formData.description || !formData.category) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('📋 Updating HSN code:', formData);
      
      const response = await apiClient.updateHsnCode(hsnCode.id, formData);
      console.log('📋 HSN code updated successfully:', response);
      
      toast({
        title: "HSN Code Updated",
        description: "HSN Code has been updated successfully",
      });
      
      onHsnCodeUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating HSN code:', error);
      toast({
        title: "Error",
        description: "Failed to update HSN code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hsnCode) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit HSN Code</DialogTitle>
          <DialogDescription>
            Update the HSN code details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hsnCode">HSN Code *</Label>
              <Input
                id="hsnCode"
                value={formData.hsnCode}
                onChange={(e) => setFormData(prev => ({ ...prev, hsnCode: e.target.value }))}
                placeholder="e.g., 49011010"
                maxLength={8}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gstRate">GST Rate (%) *</Label>
              <Input
                id="gstRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.gstRate}
                onChange={(e) => setFormData(prev => ({ ...prev, gstRate: parseFloat(e.target.value) || 0 }))}
                placeholder="18"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter detailed description of the HSN code"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(value: 'product' | 'service' | 'both') => 
                setFormData(prev => ({ ...prev, type: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Paper & Stationery"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subCategory">Sub Category</Label>
            <Input
              id="subCategory"
              value={formData.subCategory}
              onChange={(e) => setFormData(prev => ({ ...prev, subCategory: e.target.value }))}
              placeholder="e.g., Printing Paper"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes (optional)"
              rows={2}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update HSN Code"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
