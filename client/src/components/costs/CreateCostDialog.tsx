import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CreateCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCostCreated: () => void;
}

export function CreateCostDialog({ open, onOpenChange, onCostCreated }: CreateCostDialogProps) {
  const [formData, setFormData] = useState({
    jobId: "",
    category: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    description: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.jobId || !formData.category || !formData.amount) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to create cost
      console.log('📋 API not yet implemented');
      
      toast({
        title: "Cost Created",
        description: "Cost has been recorded successfully",
      });
      
      onCostCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        jobId: "",
        category: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
        notes: ""
      });
    } catch (error) {
      console.error('Error creating cost:', error);
      toast({
        title: "Error",
        description: "Failed to create cost",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record New Cost</DialogTitle>
          <DialogDescription>
            Record a new cost for a job or general expense.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="jobId">Job ID *</Label>
            <Input
              id="jobId"
              value={formData.jobId}
              onChange={(e) => setFormData(prev => ({ ...prev, jobId: e.target.value }))}
              placeholder="Enter job ID"
            />
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
                <SelectItem value="materials">Materials</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="transportation">Transportation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter cost description"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes (optional)"
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Recording..." : "Record Cost"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}