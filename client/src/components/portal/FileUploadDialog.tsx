import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileUploadDialog({ open, onOpenChange }: FileUploadDialogProps) {
  const { toast } = useToast();
  const [jobId, setJobId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jobId) {
      toast({
        title: "Error",
        description: "Please enter a job ID.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      
      await apiClient.uploadFile(selectedFile, {
        entityType: 'job',
        entityId: jobId,
        entityName: `Job ${jobId}`,
        category: 'reference',
        description: `File uploaded for job ${jobId}`
      });

      toast({
        title: "Success",
        description: "File uploaded successfully.",
      });
      
      setJobId("");
      setSelectedFile(null);
      onOpenChange(false);
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload files for your print job.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="jobId">Job ID *</Label>
            <Input
              id="jobId"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="JOB-001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="files">Select Files</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="mt-4">
                <input
                  type="file"
                  id="files"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.psd,.ai,.eps"
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => document.getElementById('files')?.click()}
                >
                  Choose Files
                </Button>
                <p className="mt-2 text-sm text-muted-foreground">
                  or drag and drop files here
                </p>
                {selectedFile && (
                  <p className="mt-2 text-sm text-green-600">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Files"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}