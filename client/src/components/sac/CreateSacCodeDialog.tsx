import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface CreateSacCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSacCodeCreated: () => void;
}

export function CreateSacCodeDialog({ open, onOpenChange, onSacCodeCreated }: CreateSacCodeDialogProps) {
  const [formData, setFormData] = useState({
    sacCode: "",
    description: "",
    gstRate: 18,
    category: "",
    subCategory: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.sacCode) {
      newErrors.sacCode = "SAC Code is required";
    } else if (!/^\d{6}$/.test(formData.sacCode)) {
      newErrors.sacCode = "SAC Code must be exactly 6 digits";
    }

    if (!formData.description) {
      newErrors.description = "Description is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (formData.gstRate < 0 || formData.gstRate > 100) {
      newErrors.gstRate = "GST Rate must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      console.log('📋 Creating SAC code:', formData);

      const response = await apiClient.createSacCode(formData);
      console.log('📋 SAC code created successfully:', response);

      toast({
        title: "SAC Code Created",
        description: "SAC Code has been created successfully",
      });

      onSacCodeCreated();
      onOpenChange(false);

      // Reset form
      setFormData({
        sacCode: "",
        description: "",
        gstRate: 18,
        category: "",
        subCategory: "",
        notes: ""
      });
    } catch (error: any) {
      console.error('Error creating SAC code:', error);
      const errorMessage = error?.message || "Failed to create SAC code";
      const errorDetails = error?.errors?.join(", ") || errorMessage;

      toast({
        title: "Error",
        description: errorDetails,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New SAC Code</DialogTitle>
          <DialogDescription>
            Add a new SAC code for design charges and GST compliance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sacCode">SAC Code *</Label>
              <Input
                id="sacCode"
                value={formData.sacCode}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, sacCode: e.target.value }));
                  if (errors.sacCode) {
                    setErrors(prev => ({ ...prev, sacCode: "" }));
                  }
                }}
                placeholder="e.g., 999249"
                maxLength={6}
                className={errors.sacCode ? "border-destructive" : ""}
              />
              {errors.sacCode ? (
                <p className="text-xs text-destructive font-medium">{errors.sacCode}</p>
              ) : (
                <p className="text-xs text-muted-foreground">6-digit SAC code (e.g., 999249)</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstRate">GST Rate % *</Label>
              <Input
                id="gstRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.gstRate}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, gstRate: parseFloat(e.target.value) || 0 }));
                  if (errors.gstRate) {
                    setErrors(prev => ({ ...prev, gstRate: "" }));
                  }
                }}
                className={errors.gstRate ? "border-destructive" : ""}
              />
              {errors.gstRate && (
                <p className="text-xs text-destructive font-medium">{errors.gstRate}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
                if (errors.description) {
                  setErrors(prev => ({ ...prev, description: "" }));
                }
              }}
              placeholder="e.g., Design Services"
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && (
              <p className="text-xs text-destructive font-medium">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, category: e.target.value }));
                  if (errors.category) {
                    setErrors(prev => ({ ...prev, category: "" }));
                  }
                }}
                placeholder="e.g., Services"
                className={errors.category ? "border-destructive" : ""}
              />
              {errors.category && (
                <p className="text-xs text-destructive font-medium">{errors.category}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subCategory">Sub Category</Label>
              <Input
                id="subCategory"
                value={formData.subCategory}
                onChange={(e) => setFormData(prev => ({ ...prev, subCategory: e.target.value }))}
                placeholder="e.g., Design"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any notes about this SAC code..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create SAC Code"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
