import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search, Filter, Download,
  TrendingUp, TrendingDown, Receipt,
  CreditCard, Wallet, Building2,
  FileText, ArrowUpRight, ArrowDownRight, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";
import { format } from "date-fns";

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  source: 'invoice' | 'vendor' | 'account' | 'payment';
  reference?: string;
  partyName?: string;
  status?: string;
}

// Consolidated, read-only ledger view that aggregates transactions from
// account transactions, invoices (income) and vendor payments (expense).
export function GeneralLedgerView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAllTransactions();
  }, []);

  const fetchAllTransactions = async () => {
    try {
      setLoading(true);

      const [accountsRes, invoicesRes, vendorsRes]: any = await Promise.all([
        apiClient.getAccountLedger().catch(() => ({ transactions: [] })),
        apiClient.getInvoices({ limit: 100 }).catch(() => ({ invoices: [] })),
        apiClient.getVendors().catch(() => ({ vendors: [] }))
      ]);

      const allTransactions: Transaction[] = [];

      if (accountsRes?.transactions) {
        accountsRes.transactions.forEach((t: any) => {
          allTransactions.push({
            id: `acc-${t._id}`,
            date: new Date(t.createdAt).toISOString(),
            description: t.description,
            type: t.transactionType as 'income' | 'expense',
            category: t.category || 'Uncategorized',
            amount: t.amount,
            source: 'account',
            reference: t.transactionNumber || t.reference,
            status: t.status
          });
        });
      }

      if (invoicesRes?.invoices) {
        invoicesRes.invoices.forEach((inv: any) => {
          allTransactions.push({
            id: `inv-${inv._id}`,
            date: new Date(inv.invoiceDate).toISOString(),
            description: `Invoice ${inv.invoiceNumber}`,
            type: 'income',
            category: 'Sales',
            amount: inv.totalAmount,
            source: 'invoice',
            reference: inv.invoiceNumber,
            partyName: inv.customerName,
            status: inv.status
          });
        });
      }

      if (vendorsRes?.vendors) {
        vendorsRes.vendors.forEach((vendor: any) => {
          if (vendor.paymentHistory) {
            vendor.paymentHistory.forEach((payment: any) => {
              allTransactions.push({
                id: `vnd-${vendor._id}-${payment._id}`,
                date: new Date(payment.date).toISOString(),
                description: `Payment to ${vendor.name}`,
                type: 'expense',
                category: 'Vendor Payment',
                amount: payment.amount,
                source: 'vendor',
                reference: payment.invoiceNumber,
                partyName: vendor.name,
                status: payment.status
              });
            });
          }
        });
      }

      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching ledger data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch ledger data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch =
      txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (txn.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (txn.partyName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "all" || txn.type === typeFilter;
    const matchesSource = sourceFilter === "all" || txn.source === sourceFilter;
    const matchesCategory = categoryFilter === "all" || txn.category === categoryFilter;

    const txnDate = new Date(txn.date);
    const matchesDateFrom = !dateFrom || txnDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || txnDate <= new Date(dateTo);

    return matchesSearch && matchesType && matchesSource && matchesCategory && matchesDateFrom && matchesDateTo;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netAmount = totalIncome - totalExpenses;

  const categories = Array.from(new Set(transactions.map(t => t.category))).sort();

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'invoice': return 'bg-blue-100 text-blue-700';
      case 'vendor': return 'bg-purple-100 text-purple-700';
      case 'account': return 'bg-green-100 text-green-700';
      case 'payment': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Type', 'Category', 'Source', 'Reference', 'Party', 'Amount'];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.date), 'yyyy-MM-dd'),
      t.description,
      t.type,
      t.category,
      t.source,
      t.reference || '',
      t.partyName || '',
      t.amount
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `general-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();

    toast({ title: "Export Successful", description: "Ledger data exported to CSV" });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-muted rounded" />
        <div className="h-64 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Consolidated view across invoices, vendor payments and account transactions
        </p>
        <div className="flex gap-2">
          <Button onClick={fetchAllTransactions} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.filter(t => t.type === 'income').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {filteredTransactions.filter(t => t.type === 'expense').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-500" />
              Net Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{netAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">profit/loss</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4 text-purple-500" />
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTransactions.length}</div>
            <p className="text-xs text-muted-foreground">in selected period</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="vendor">Vendors</SelectItem>
                  <SelectItem value="account">Accounts</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("all");
                  setSourceFilter("all");
                  setCategoryFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredTransactions.map((txn) => (
              <Card key={txn.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txn.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {txn.type === 'income' ? (
                          <ArrowUpRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-red-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{txn.description}</h3>
                          <Badge className={`${getSourceBadgeColor(txn.source)} text-xs`}>
                            {txn.source}
                          </Badge>
                          {txn.status && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {txn.status}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{txn.category}</span>
                          <span>•</span>
                          <span>{format(new Date(txn.date), 'MMM dd, yyyy')}</span>
                          {txn.reference && (<><span>•</span><span>Ref: {txn.reference}</span></>)}
                          {txn.partyName && (<><span>•</span><span>{txn.partyName}</span></>)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className={`text-lg font-bold ${txn.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredTransactions.length === 0 && (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || typeFilter !== "all" || sourceFilter !== "all"
                    ? "Try adjusting your filters"
                    : "No transactions available"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
