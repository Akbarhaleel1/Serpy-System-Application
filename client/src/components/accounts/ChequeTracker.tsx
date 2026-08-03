import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Search, Filter, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Cheque {
  id: string;
  chequeNumber: string;
  amount: number;
  payeeName: string;
  issueDate: string;
  depositDate?: string;
  status: 'issued' | 'deposited' | 'cleared' | 'bounced';
  purpose?: string;
  remarks?: string;
}

export function ChequeTracker() {
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchCheques();
  }, []);

  const fetchCheques = async () => {
    try {
      // TODO: Implement API call to fetch cheques
    console.log('📋 API not yet implemented');
      
      // Placeholder data for now
      setCheques([]);
    } catch (error) {
      console.error('Error fetching cheques:', error);
      toast({
        title: "Error",
        description: "Failed to fetch cheques",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateChequeStatus = async (chequeId: string, newStatus: string) => {
    try {
      // TODO: Implement API call to update cheque status
      console.log('📋 API not yet implemented');
      
      setCheques(prev => prev.map(cheque => 
        cheque.id === chequeId ? { ...cheque, status: newStatus as any } : cheque
      ));

      toast({
        title: "Status Updated",
        description: "Cheque status updated successfully",
      });
    } catch (error) {
      console.error('Error updating cheque status:', error);
      toast({
        title: "Error",
        description: "Failed to update cheque status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'issued': return 'secondary';
      case 'deposited': return 'default';
      case 'cleared': return 'success';
      case 'bounced': return 'destructive';
      default: return 'outline';
    }
  };

  const filteredCheques = cheques.filter(cheque => {
    const matchesSearch = cheque.chequeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cheque.payeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || cheque.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredCheques.reduce((sum, cheque) => sum + cheque.amount, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cheque Tracker</h2>
          <p className="text-muted-foreground">Track and manage issued cheques</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Total Cheques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cheques.length}</div>
            <p className="text-xs text-muted-foreground">issued cheques</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">total value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cheques.filter(c => c.status === 'issued').length}
            </div>
            <p className="text-xs text-muted-foreground">awaiting deposit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Cleared
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cheques.filter(c => c.status === 'cleared').length}
            </div>
            <p className="text-xs text-muted-foreground">successfully cleared</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cheques..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="deposited">Deposited</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
            </SelectContent>
          </Select>
      </div>

      {/* Cheques List */}
      <div className="grid gap-4">
        {filteredCheques.map((cheque) => (
          <Card key={cheque.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Cheque #{cheque.chequeNumber}</h3>
                    <p className="text-sm text-muted-foreground">{cheque.payeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      Issued: {new Date(cheque.issueDate).toLocaleDateString()}
                    </p>
                  </div>
                    </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-lg font-semibold">₹{cheque.amount.toLocaleString()}</div>
                    <Badge variant={getStatusColor(cheque.status) as any}>
                      {cheque.status}
                    </Badge>
      </div>

                  <Select
                    value={cheque.status}
                    onValueChange={(newStatus) => updateChequeStatus(cheque.id, newStatus)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="deposited">Deposited</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                </SelectContent>
              </Select>
            </div>
              </div>
            </CardContent>
          </Card>
        ))}
              </div>

      {filteredCheques.length === 0 && !loading && (
        <Card className="text-center p-8">
          <CardContent>
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No cheques found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria"
                : "No cheques have been issued yet"
              }
            </p>
          </CardContent>
        </Card>
      )}
          </div>
  );
}