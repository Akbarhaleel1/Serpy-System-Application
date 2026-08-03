import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CreateTimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTimeEntryCreated: () => void;
}

export function CreateTimeEntryDialog({ open, onOpenChange, onTimeEntryCreated }: CreateTimeEntryDialogProps) {
  const [formData, setFormData] = useState({
    jobId: "",
    taskId: "",
    startTime: "",
    endTime: "",
    duration: "",
    description: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.jobId || !formData.startTime || !formData.endTime) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to create time entry
      console.log('📋 API not yet implemented');
      
      toast({
        title: "Time Entry Created",
        description: "Time entry has been created successfully",
      });
      
      onTimeEntryCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        jobId: "",
        taskId: "",
        startTime: "",
        endTime: "",
        duration: "",
        description: "",
        notes: ""
      });
    } catch (error) {
      console.error('Error creating time entry:', error);
      toast({
        title: "Error",
        description: "Failed to create time entry",
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
          <DialogTitle>Create Time Entry</DialogTitle>
          <DialogDescription>
            Record time spent on a job or task.
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
            <Label htmlFor="taskId">Task ID</Label>
            <Input
              id="taskId"
              value={formData.taskId}
              onChange={(e) => setFormData(prev => ({ ...prev, taskId: e.target.value }))}
              placeholder="Enter task ID (optional)"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (hours)</Label>
            <Input
              id="duration"
              type="number"
              step="0.25"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter work description"
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
              {loading ? "Creating..." : "Create Time Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
