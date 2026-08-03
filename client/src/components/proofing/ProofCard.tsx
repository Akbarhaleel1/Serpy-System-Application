import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, MessageSquare, Download, CheckCircle, XCircle, Clock } from "lucide-react";

interface ProofCardProps {
  proof: {
    id: string;
    jobId: string;
    customerName: string;
    title: string;
    version: string;
    uploadedBy: string;
    uploadDate: string;
    status: string;
    description: string;
    imageUrl: string;
    clientFeedback: string;
    approvalDate: string | null;
  };
}

export function ProofCard({ proof }: ProofCardProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "approved": return "success";
      case "pending": return "warning";
      case "changes": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-3 w-3" />;
      case "pending": return <Clock className="h-3 w-3" />;
      case "changes": return <XCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
              <img src={proof.imageUrl} alt="Proof" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div>
              <h3 className="font-semibold">{proof.title} ({proof.version})</h3>
              <p className="text-sm text-muted-foreground">{proof.jobId} • {proof.customerName}</p>
              <p className="text-xs text-muted-foreground">Uploaded by {proof.uploadedBy}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={getStatusVariant(proof.status)} className="gap-1">
              {getStatusIcon(proof.status)}
              {proof.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{proof.description}</p>

        {proof.clientFeedback && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-1">Client Feedback:</p>
            <p className="text-sm text-muted-foreground">{proof.clientFeedback}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Uploaded: {new Date(proof.uploadDate).toLocaleDateString()}
            {proof.approvalDate && (
              <span> • Approved: {new Date(proof.approvalDate).toLocaleDateString()}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Send for Approval
            </Button>
            {proof.status === "pending" && (
              <>
                <Button size="sm" variant="outline" className="gap-2 text-success border-success">
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" className="gap-2 text-destructive border-destructive">
                  <XCircle className="h-4 w-4" />
                  Request Changes
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}