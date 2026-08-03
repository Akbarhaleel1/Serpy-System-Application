import { useState, useEffect } from "react";
import { Plus, Search, Upload, Eye, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProofCard } from "@/components/proofing/ProofCard";
import { UploadProofDialog } from "@/components/proofing/UploadProofDialog";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

export default function Proofing() {
  const [proofs, setProofs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchProofs();
  }, []);

  const fetchProofs = async () => {
    try {
      const response = await apiClient.getProofs();
      console.log('📄 Proofs response:', response);
      setProofs(response.data?.proofs || []);
    } catch (error) {
      console.error('Error fetching proofs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch proofs",
        variant: "destructive",
      });
    }
  };
  const [statusFilter, setStatusFilter] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const filteredProofs = proofs.filter(proof => {
    const jobTitle = proof.jobs?.title || '';
    const customerName = proof.customers?.name || '';
    const matchesSearch = jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (proof.file_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || proof.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingProofs = proofs.filter(proof => proof.status === "pending").length;
  const approvedProofs = proofs.filter(proof => proof.status === "approved").length;
  const changesRequested = proofs.filter(proof => proof.status === "changes_requested").length;

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Proofing & Approval</h1>
          <p className="text-muted-foreground">Upload previews and track client approvals</p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Proof
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Proofs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proofs.length}</div>
            <p className="text-xs text-muted-foreground">this month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingProofs}</div>
            <p className="text-xs text-muted-foreground">awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{approvedProofs}</div>
            <p className="text-xs text-muted-foreground">ready for production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Changes Requested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{changesRequested}</div>
            <p className="text-xs text-muted-foreground">need revision</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search proofs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Proof List */}
      <div className="grid gap-4">
        {filteredProofs.map((proof) => (
          <ProofCard key={proof.id} proof={proof} />
        ))}
      </div>

      <UploadProofDialog open={showUploadDialog} onOpenChange={setShowUploadDialog} />
    </div>
  );
}