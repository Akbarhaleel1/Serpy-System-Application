import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProofUploaded: () => void;
}

export function UploadProofDialog({ open, onOpenChange, onProofUploaded }: UploadProofDialogProps) {
  const [formData, setFormData] = useState({
    jobId: "",
    customerId: "",
    file: null as File | null,
    description: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.jobId || !formData.customerId || !formData.file) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields and select a file",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to upload proof
      console.log('📋 API not yet implemented');
      
      toast({
        title: "Proof Uploaded",
        description: "Design proof has been uploaded successfully",
      });
      
      onProofUploaded();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        jobId: "",
        customerId: "",
        file: null,
        description: ""
      });
    } catch (error) {
      console.error('Error uploading proof:', error);
      toast({
        title: "Error",
        description: "Failed to upload proof",
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
          <DialogTitle>Upload Design Proof</DialogTitle>
          <DialogDescription>
            Upload a design proof for customer review and approval.
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
            <Label htmlFor="customerId">Customer ID *</Label>
            <Input
              id="customerId"
              value={formData.customerId}
              onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
              placeholder="Enter customer ID"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="file">Design File *</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif"
                onChange={handleFileChange}
                className="hidden"
              />
              <Label htmlFor="file" className="cursor-pointer">
                <div className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  <span>{formData.file ? formData.file.name : "Choose file"}</span>
                </div>
              </Label>
            </div>
            {formData.file && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the design"
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Uploading..." : "Upload Proof"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}