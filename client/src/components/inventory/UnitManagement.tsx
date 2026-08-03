import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Plus } from "lucide-react";

const UNIT_TYPES = [
  { value: 'quantity', label: 'Quantity' },
  { value: 'length', label: 'Length' },
  { value: 'weight', label: 'Weight' },
  { value: 'volume', label: 'Volume' },
  { value: 'area', label: 'Area' },
  { value: 'custom', label: 'Custom' }
];

export function UnitManagement() {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    abbreviation: "",
    description: "",
    type: "custom"
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getUnits();
      setUnits(response.units || []);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast({
        title: "Error",
        description: "Failed to load units",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (unit?: any) => {
    if (unit) {
      setEditingId(unit._id);
      setFormData({
        name: unit.name,
        abbreviation: unit.abbreviation || "",
        description: unit.description || "",
        type: unit.type || "custom"
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        abbreviation: "",
        description: "",
        type: "custom"
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      abbreviation: "",
      description: "",
      type: "custom"
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.abbreviation.trim()) {
      toast({
        title: "Error",
        description: "Unit name and abbreviation are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await apiClient.updateUnit(editingId, formData);
        toast({
          title: "Success",
          description: "Unit updated successfully",
        });
      } else {
        await apiClient.createUnit(formData);
        toast({
          title: "Success",
          description: "Unit created successfully",
        });
      }
      handleCloseDialog();
      fetchUnits();
    } catch (error) {
      console.error('Error saving unit:', error);
      toast({
        title: "Error",
        description: "Failed to save unit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this unit?")) {
      return;
    }

    setLoading(true);
    try {
      await apiClient.deleteUnit(id);
      toast({
        title: "Success",
        description: "Unit deleted successfully",
      });
      fetchUnits();
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast({
        title: "Error",
        description: "Failed to delete unit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Group units by type
  const groupedUnits = UNIT_TYPES.map(type => ({
    ...type,
    units: units.filter(u => u.type === type.value)
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Units</h2>
          <p className="text-sm text-muted-foreground">Manage inventory measurement units</p>
        </div>
        <Button onClick={() => handleOpenDialog()} disabled={loading}>
          <Plus className="mr-2 h-4 w-4" />
          Add Unit
        </Button>
      </div>

      {loading && units.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading units...</p>
        </div>
      ) : units.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No units yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedUnits.map(typeGroup => (
            typeGroup.units.length > 0 && (
              <div key={typeGroup.value}>
                <h3 className="text-lg font-semibold mb-3">{typeGroup.label}</h3>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {typeGroup.units.map((unit) => (
                    <Card key={unit._id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{unit.name}</CardTitle>
                            <CardDescription className="text-sm font-mono">
                              {unit.abbreviation}
                            </CardDescription>
                          </div>
                        </div>
                        {unit.description && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {unit.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="flex-grow" />
                      <div className="flex gap-2 mt-4 border-t pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenDialog(unit)}
                          disabled={loading}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDelete(unit._id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Unit" : "Add New Unit"}
            </DialogTitle>
            <DialogDescription>
              {editingId ? "Update the unit details" : "Create a new measurement unit"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Unit Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Square Feet, Numbers, Bags, Litre"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="abbreviation">Abbreviation *</Label>
              <Input
                id="abbreviation"
                value={formData.abbreviation}
                onChange={(e) => setFormData(prev => ({ ...prev, abbreviation: e.target.value.toUpperCase() }))}
                placeholder="e.g., SQ FT, NOS, BAG, L"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(value) =>
                setFormData(prev => ({ ...prev, type: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Save Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
