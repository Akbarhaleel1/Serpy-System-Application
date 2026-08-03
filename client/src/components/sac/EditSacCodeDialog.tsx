import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface SacCode {
  _id?: string;
  id?: string;
  sacCode: string;
  description: string;
  gstRate: number;
  category: string;
  subCategory?: string;
  notes?: string;
}

interface EditSacCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sacCode: SacCode | null;
  onSacCodeUpdated: () => void;
}

export function EditSacCodeDialog({ open, onOpenChange, sacCode, onSacCodeUpdated }: EditSacCodeDialogProps) {
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

  useEffect(() => {
    if (sacCode) {
      setFormData({
        sacCode: sacCode.sacCode || "",
        description: sacCode.description || "",
        gstRate: sacCode.gstRate || 18,
        category: sacCode.category || "",
        subCategory: sacCode.subCategory || "",
        notes: sacCode.notes || ""
      });
      setErrors({});
    }
  }, [sacCode]);

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

    if (!sacCode?.id && !sacCode?._id) return;

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const id = sacCode.id || sacCode._id || '';
      console.log('📋 Updating SAC code:', formData);

      const response = await apiClient.updateSacCode(id, formData);
      console.log('📋 SAC code updated successfully:', response);

      toast({
        title: "SAC Code Updated",
        description: "SAC Code has been updated successfully",
      });

      onSacCodeUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating SAC code:', error);
      const errorMessage = error?.message || "Failed to update SAC code";
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

  if (!sacCode) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit SAC Code</DialogTitle>
          <DialogDescription>
            Update the SAC code details.
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
              {errors.sacCode && (
                <p className="text-xs text-destructive font-medium">{errors.sacCode}</p>
              )}
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
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, gstRate: parseFloat(e.target.value) || 0 }));
                  if (errors.gstRate) {
                    setErrors(prev => ({ ...prev, gstRate: "" }));
                  }
                }}
                placeholder="18"
                className={errors.gstRate ? "border-destructive" : ""}
              />
              {errors.gstRate && (
                <p className="text-xs text-destructive font-medium">{errors.gstRate}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
                if (errors.description) {
                  setErrors(prev => ({ ...prev, description: "" }));
                }
              }}
              placeholder="Enter detailed description of the SAC code"
              rows={3}
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
              placeholder="Additional notes (optional)"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update SAC Code"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
