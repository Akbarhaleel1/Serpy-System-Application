import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface UpdateStatusDialogProps {
  jobId: string;
  currentStatus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated?: () => void;
}

const statusOptions = [
  { value: "design_in_progress", label: "Work In Progress" },
  { value: "completed", label: "Completed" },
  // { value: "delivered", label: "Delivered" }
];

export function UpdateStatusDialog({
  jobId,
  currentStatus,
  open,
  onOpenChange,
  onStatusUpdated
}: UpdateStatusDialogProps) {
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  console.log('🔄 UpdateStatusDialog props:', { jobId, currentStatus, open });

  // Update newStatus when currentStatus changes
  React.useEffect(() => {
    console.log('🔄 UpdateStatusDialog - currentStatus changed to:', currentStatus);
    setNewStatus(currentStatus);
  }, [currentStatus]);

  const handleSubmit = async () => {
    if (!newStatus) {
      toast({
        title: "Missing Information",
        description: "Please select a status",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await apiClient.updateJobStatus(jobId, newStatus, notes);
      console.log('💼 Job status updated:', response);

      toast({
        title: "Status Updated",
        description: `Job status has been updated to ${newStatus}`,
      });
      
      onOpenChange(false);
      onStatusUpdated?.();
    } catch (error) {
      console.error('Error updating job status:', error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Job Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="status">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this status change..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !newStatus}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
