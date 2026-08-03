import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Wallet, CreditCard, TrendingUp } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { QuickReceivePaymentDialog } from "@/components/accounts/QuickReceivePaymentDialog";
import { NewTransactionDialog } from "@/components/accounts/NewTransactionDialog";
import { AccountsLedger } from "@/components/accounts/AccountsLedger";
import { AccountsReports } from "@/components/accounts/AccountsReports";
import { formatCurrency } from "@/lib/utils";

export default function Accounts() {
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<any>(null);
  const [isNewTransactionDialogOpen, setIsNewTransactionDialogOpen] = useState(false);
  const [isQuickPaymentDialogOpen, setIsQuickPaymentDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAccountsData();
  }, []);

  const fetchAccountsData = async () => {
    try {
      const balancesResponse = await apiClient.getAccountBalances();

      console.log('💰 Accounts data response:', { balancesResponse });

      setBalances((balancesResponse as any)?.data?.currentBalances || (balancesResponse as any)?.currentBalances || {
        cashBalance: 0,
        bankBalance: 0,
        creditCardBalance: 0,
        loanBalance: 0,
        investmentBalance: 0
      });
    } catch (error) {
      console.error('Error fetching accounts data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch accounts data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48">Loading...</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isNewTransactionDialogOpen || isQuickPaymentDialogOpen ? "New Transaction" : "Accounts Management"}
          </h1>
          <p className="text-muted-foreground">
            {isNewTransactionDialogOpen || isQuickPaymentDialogOpen
              ? "Record a new financial transaction" 
              : "Track cash flow, payments, and financial transactions"
            }
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsQuickPaymentDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Quick Payment
          </Button>
          <Button
            className="gap-2"
            onClick={() => setIsNewTransactionDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Total Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {formatCurrency((balances?.cashBalance || 0) + (balances?.bankBalance || 0))}
          </div>
          <p className="text-xs text-muted-foreground">Available balance across all accounts</p>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="ledger" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ledger">Accounts Ledger</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger">
          <AccountsLedger onTransactionUpdate={fetchAccountsData} />
        </TabsContent>

        <TabsContent value="reports">
          <AccountsReports />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <NewTransactionDialog
        open={isNewTransactionDialogOpen}
        onOpenChange={setIsNewTransactionDialogOpen}
        onTransactionCreated={fetchAccountsData}
      />
      <QuickReceivePaymentDialog
        open={isQuickPaymentDialogOpen}
        onOpenChange={setIsQuickPaymentDialogOpen}
        onPaymentRecorded={fetchAccountsData}
      />
    </div>
  );
}