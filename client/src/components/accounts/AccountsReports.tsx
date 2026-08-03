import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, TrendingUp, TrendingDown, DollarSign, CreditCard, Users, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import apiClient from "@/lib/apiClient";

interface AccountReport {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  cashFlow: number;
  bankBalance: number;
  cashBalance: number;
}

interface User {
  _id: string;
  fullName: string;
  email: string;
  role: string;
}

interface Transaction {
  _id: string;
  transactionNumber: string;
  description: string;
  transactionType: string;
  amount: number;
  category: string;
  paymentMethod: string;
  createdAt: string;
  status: string;
}

export function AccountsReports() {
  const [reportData, setReportData] = useState<AccountReport | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [users, setUsers] = useState<User[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    generateReport();
  }, [selectedPeriod, selectedUserId]);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.getUsers();
      console.log('👥 Users response:', response);

      const usersList = response?.users || response || [];
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users list",
        variant: "destructive",
      });
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      // Fetch recent transactions
      const params: any = {
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      // Add userId filter if not "all"
      if (selectedUserId && selectedUserId !== 'all') {
        params.userId = selectedUserId;
      }

      // Fetch recent transactions + the period-aware financial summary in parallel
      const [transactionsResponse, reportResponse]: any = await Promise.all([
        apiClient.getAccountTransactions(params),
        apiClient.getAccountReportSummary(selectedPeriod),
      ]);
      console.log('📋 Transactions response:', transactionsResponse);
      console.log('📊 Report summary:', reportResponse);

      const transactions = transactionsResponse?.transactions || [];
      setRecentTransactions(transactions);

      const report = reportResponse?.report || reportResponse || {};
      setReportData({
        period: selectedPeriod,
        totalIncome: report.totalIncome || 0,
        totalExpenses: report.totalExpenses || 0,
        netProfit: report.netProfit || 0,
        cashFlow: report.cashFlow || 0,
        bankBalance: report.bankBalance || 0,
        cashBalance: report.cashBalance || 0,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate accounts report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      setLoading(true);

      // Build params object - only period, not userId (invoices don't have userId)
      const params: any = {
        period: selectedPeriod,
        format: 'excel'
      };

      // Download the Excel report
      await apiClient.downloadAccountReport(params);

      toast({
        title: "Export Complete",
        description: `Transactions report (Excel) for ${selectedPeriod} has been downloaded successfully`,
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export transactions report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...new Array(4)].map((_, i) => (
              <div key={`skeleton-${i}`} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Accounts Reports</h2>
          <p className="text-muted-foreground">Financial reports and analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-48">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user._id} value={user._id}>
                  {user.fullName} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          <Button onClick={exportReport} variant="outline" className="gap-2" disabled={loading}>
            <Download className="h-4 w-4" />
            {loading ? 'Exporting...' : 'Export to Excel'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{reportData?.totalIncome.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">this {selectedPeriod}</p>
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
            <div className="text-2xl font-bold">₹{reportData?.totalExpenses.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">this {selectedPeriod}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{reportData?.netProfit.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">profit margin</p>
          </CardContent>
      </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-500" />
              Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{reportData?.cashFlow.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">operating cash flow</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Balances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Balance</span>
              <span className="text-xl font-bold">
                ₹{((reportData?.cashBalance || 0) + (reportData?.bankBalance || 0)).toLocaleString()}
              </span>
            </div>
          </CardContent>
            </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Income</span>
              <span className="text-lg font-bold text-green-600">
                ₹{reportData?.totalIncome.toLocaleString() || 0}
              </span>
                </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Expenses</span>
              <span className="text-lg font-bold text-red-600">
                ₹{reportData?.totalExpenses.toLocaleString() || 0}
              </span>
              </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Net Profit</span>
                <span className="text-xl font-bold text-blue-600">
                  ₹{reportData?.netProfit.toLocaleString() || 0}
                </span>
              </div>
                </div>
          </CardContent>
            </Card>
          </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No transactions found for the selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Transaction Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Transaction #</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction._id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-blue-600">
                          {transaction.transactionNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">{transaction.description}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{transaction.category}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={transaction.transactionType === 'income' ? 'default' : 'destructive'}
                          className={transaction.transactionType === 'income' ? 'bg-green-500 hover:bg-green-600' : ''}
                        >
                          {transaction.transactionType === 'income' ? 'Income' : 'Expense'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-sm font-semibold ${
                          transaction.transactionType === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.transactionType === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}