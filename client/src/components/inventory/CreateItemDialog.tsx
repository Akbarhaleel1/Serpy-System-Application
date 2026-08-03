import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Info, Calculator } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { UnitConverterDialog } from "./UnitConverterDialog";

interface CreateItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemCreated: () => void;
}

// Business categories (not data types!)
const BUSINESS_CATEGORIES = [
  "Paper & Printing Materials",
  "Ink & Toner",
  "Binding & Finishing Materials",
  "Office Supplies",
  "Packaging Materials",
  "Machinery Parts",
  "Tools & Equipment",
  "Chemicals & Adhesives",
  "Other"
];

// Standard units of measurement
const UNITS_OF_MEASUREMENT = [
  { value: "pieces", label: "Pieces (pcs)" },
  { value: "boxes", label: "Boxes" },
  { value: "reams", label: "Reams" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "grams", label: "Grams (g)" },
  { value: "liters", label: "Liters (L)" },
  { value: "meters", label: "Meters (m)" },
  { value: "sqft", label: "Square Feet (sq ft)" },
  { value: "sqm", label: "Square Meters (sq m)" },
  { value: "rolls", label: "Rolls" },
  { value: "sheets", label: "Sheets" }
];

// Standard GST rates in India
const GST_RATES = [
  { value: "0", label: "0% (Exempt)" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" }
];

export function CreateItemDialog({ open, onOpenChange, onItemCreated }: CreateItemDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    quantity: "",
    unit: "",
    unitCost: "",
    minStockLevel: "",
    vendor: "",
    hsnCode: "",
    gstRate: "18",
    isFreeItem: false,
    notes: ""
  });

  const [loading, setLoading] = useState(false);
  const [hsnCodes, setHsnCodes] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState("");
  const [showUnitConverter, setShowUnitConverter] = useState(false);
  const { toast } = useToast();

  // Calculate status automatically
  const calculateStatus = () => {
    const qty = parseFloat(formData.quantity) || 0;
    const minStock = parseFloat(formData.minStockLevel) || 0;

    if (qty <= 0) return "Out of Stock";
    if (qty <= minStock) return "Low Stock";
    return "Adequate";
  };

  const status = calculateStatus();

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchHsnCodes();
      fetchSuppliers();
    }
  }, [open]);

  const fetchHsnCodes = async () => {
    try {
      const response = await apiClient.getHsnCodes();
      setHsnCodes(response.hsnCodes || []);
    } catch (error) {
      console.error('Error fetching HSN codes:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await apiClient.getVendors();
      const vendorNames = response.vendors?.map((v: any) => v.name) || [];
      setSuppliers(vendorNames);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    }
  };

  const validateForm = () => {
    // Required fields
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Item name is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.category) {
      toast({
        title: "Validation Error",
        description: "Category is required",
        variant: "destructive",
      });
      return false;
    }

    // Quantity + Unit integrity
    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty < 0) {
      toast({
        title: "Validation Error",
        description: "Quantity must be a positive number",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.unit) {
      toast({
        title: "Validation Error",
        description: "Unit of measurement is required",
        variant: "destructive",
      });
      return false;
    }

    // Unit cost validation
    const cost = parseFloat(formData.unitCost);
    if (isNaN(cost) || cost < 0) {
      toast({
        title: "Validation Error",
        description: "Unit cost must be a valid number",
        variant: "destructive",
      });
      return false;
    }

    if (cost === 0 && !formData.isFreeItem) {
      toast({
        title: "Validation Error",
        description: "Unit cost cannot be 0.00. Enable 'Free/Sample Item' if this is intentional.",
        variant: "destructive",
      });
      return false;
    }

    // GST & HSN validation
    const gstRate = parseFloat(formData.gstRate);
    if (gstRate > 0 && !formData.hsnCode) {
      toast({
        title: "HSN Code Recommended",
        description: "HSN Code is recommended for taxable items. Continue anyway?",
        variant: "default",
      });
      // Allow to continue but warn
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const inventoryData = {
        name: formData.name.trim(),
        sku: formData.sku.trim() || undefined,
        category: formData.category,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        unitCost: parseFloat(formData.unitCost),
        minStockLevel: parseFloat(formData.minStockLevel) || 0,
        vendor: formData.vendor || undefined,
        hsnCode: formData.hsnCode || undefined,
        gstRate: parseFloat(formData.gstRate),
        status: 'active', // Backend status (active/inactive)
        stockStatus: status.toLowerCase().replace(' ', '_'), // Calculated stock status
        description: formData.notes.trim() || undefined,
        isFreeItem: formData.isFreeItem
      };

      await apiClient.createInventoryItem(inventoryData);

      toast({
        title: "Item Created",
        description: `${formData.name} has been added to inventory`,
      });

      onItemCreated();
      onOpenChange(false);

      // Reset form
      setFormData({
        name: "",
        sku: "",
        category: "",
        quantity: "",
        unit: "",
        unitCost: "",
        minStockLevel: "",
        vendor: "",
        hsnCode: "",
        gstRate: "18",
        isFreeItem: false,
        notes: ""
      });
    } catch (error: any) {
      console.error('Error creating item:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create inventory item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>
            Fill in the details below. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., A4 Premium Paper"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU (Optional)</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="Auto-generated if empty"
                />
                <p className="text-xs text-slate-500">Unique identifier</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, category: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Quantity & Pricing */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Quantity & Pricing</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="unit">Unit *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-primary"
                    onClick={() => setShowUnitConverter(true)}
                  >
                    <Calculator className="h-3 w-3 mr-1" />
                    Convert
                  </Button>
                </div>
                <Select value={formData.unit} onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, unit: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS_OF_MEASUREMENT.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unitCost">Unit Cost *</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitCost}
                  onChange={(e) => setFormData(prev => ({ ...prev, unitCost: e.target.value }))}
                  placeholder="0.00"
                  disabled={formData.isFreeItem}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStockLevel">Min Stock Level</Label>
                <Input
                  id="minStockLevel"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minStockLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, minStockLevel: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFreeItem"
                checked={formData.isFreeItem}
                onCheckedChange={(checked) => {
                  setFormData(prev => ({
                    ...prev,
                    isFreeItem: checked as boolean,
                    unitCost: checked ? "0" : prev.unitCost
                  }));
                }}
              />
              <Label htmlFor="isFreeItem" className="text-sm font-normal cursor-pointer">
                Free / Sample Item (allows zero cost)
              </Label>
            </div>

            {/* Auto-calculated Status */}
            <div className="flex items-center justify-between p-3 bg-white rounded border border-slate-200">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600">Stock Status (Auto-calculated):</span>
              </div>
              <Badge variant={status === "Adequate" ? "default" : status === "Low Stock" ? "secondary" : "destructive"}>
                {status}
              </Badge>
            </div>
          </div>

          {/* Vendor */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Vendor</h3>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              {suppliers.length === 0 ? (
                <div className="flex items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                  <span className="text-sm text-slate-500">No vendor available</span>
                </div>
              ) : (
                <Select value={formData.vendor} onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, vendor: value }));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(sup => (
                      <SelectItem key={sup} value={sup}>{sup}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Tax & Compliance */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Tax & Compliance</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstRate">GST Rate *</Label>
                <Select value={formData.gstRate} onValueChange={(value) =>
                  setFormData(prev => ({ ...prev, gstRate: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GST_RATES.map(rate => (
                      <SelectItem key={rate.value} value={rate.value}>{rate.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hsnCode">HSN Code {parseFloat(formData.gstRate) > 0 && "(Recommended)"}</Label>
                <Select value={formData.hsnCode || "none"} onValueChange={(value) => {
                  const hsnCodeValue = value === "none" ? "" : value;
                  setFormData(prev => ({ ...prev, hsnCode: hsnCodeValue }));
                  const selectedHsn = hsnCodes.find(hsn => hsn.hsnCode === value);
                  if (selectedHsn) {
                    setFormData(prev => ({ ...prev, gstRate: selectedHsn.gstRate.toString() }));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select HSN" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No HSN Code</SelectItem>
                    {hsnCodes.map((hsn) => (
                      <SelectItem key={hsn._id || hsn.id} value={hsn.hsnCode}>
                        {hsn.hsnCode} - {hsn.description} ({hsn.gstRate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional information about this item"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? "Creating..." : "Create Item"}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
