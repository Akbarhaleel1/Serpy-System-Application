import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { User, FileText, Download, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerTransaction {
  id: string;
  date: string;
  type: 'invoice' | 'payment' | 'credit' | 'debit';
  description: string;
  amount: number;
  balance: number;
  reference_number?: string;
  status?: string;
}

interface CustomerLedgerProps {
  customerId?: string;
  className?: string;
}

export const CustomerLedger: React.FC<CustomerLedgerProps> = ({ customerId, className }) => {
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(customerId || '');
  const [customers, setCustomers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [summary, setSummary] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    currentBalance: 0,
    creditLimit: 0
  });
  const { toast } = useToast();

  // Fetch customers for dropdown
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch transactions when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerLedger();
    }
  }, [selectedCustomer, filterType]);

  const fetchCustomers = async () => {
    console.log('📋 API not yet implemented');
        
        ;

      }
    }

    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchCustomerLedger = async () => {
    if (!selectedCustomer) return;
    
    setLoading(true);
    try {
      const user = await apiClient.getCurrentUser();
      if (!user) throw new Error('Not authenticatedcustomers')
        ()
        
        
        ()
        
        
        
        ()
        
        
        
        ()
        
        
        ;

      if (walletError) throw walletError;

      // Combine and process all transactions
      const allTransactions: CustomerTransaction[] = [];
      let runningBalance = 0;

      // Add invoices
      invoices?.forEach(invoice => {
        runningBalance += invoice.total_amount;
        allTransactions.push({
          id: invoice.id,
          date: invoice.created_at,
          type: 'invoice',
          description: `Invoice ${invoice.invoice_number}`,
          amount: invoice.total_amount,
          balance: runningBalance,
          reference_number: invoice.invoice_number,
          status: invoice.status
        });
      });

      // Add payments
      payments?.forEach(payment => {
        runningBalance -= payment.amount;
        allTransactions.push({
          id: payment.id,
          date: payment.payment_date,
          type: 'payment',
          description: `Payment - ${payment.payment_method}`,
          amount: -payment.amount,
          balance: runningBalance,
          reference_number: payment.reference_number,
          status: payment.status
        });
      });

      // Add wallet transactions
      walletTxns?.forEach(txn => {
        const amount = txn.transaction_type === 'deposit' ? -txn.amount : txn.amount;
        runningBalance += amount;
        allTransactions.push({
          id: txn.id,
          date: txn.created_at,
          type: txn.transaction_type === 'deposit' ? 'credit' : 'debit',
          description: txn.description || `Wallet ${txn.transaction_type}`,
          amount: amount,
          balance: runningBalance,
          reference_number: txn.reference_id
        });
      });

      // Sort by date (most recent first) and recalculate running balance
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Recalculate running balance from oldest to newest
      const sortedForBalance = [...allTransactions].reverse();
      let balance = 0;
      sortedForBalance.forEach(txn => {
        balance += txn.amount;
        txn.balance = balance;
      });

      // Filter transactions based on selected filter
      let filteredTransactions = allTransactions;
      if (filterType !== 'all') {
        filteredTransactions = allTransactions.filter(txn => txn.type === filterType);
      }

      // Apply search filter
      if (searchTerm) {
        filteredTransactions = filteredTransactions.filter(txn =>
          txn.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          txn.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setTransactions(filteredTransactions);

      // Calculate summary
      const totalInvoiced = invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
      const totalPaid = payments?.reduce((sum, pay) => sum + pay.amount, 0) || 0;
      
      setSummary({
        totalInvoiced,
        totalPaid,
        currentBalance: customer.outstanding_balance || 0,
        creditLimit: customer.credit_limit || 0
      });

    }
    }
    }

    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return;

    const headers = ['Date', 'Type', 'Description', 'Amount', 'Balance', 'Reference', 'Status'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(txn => [
        format(new Date(txn.date), 'yyyy-MM-dd'),
        txn.type,
        `"${txn.description}"`,
        txn.amount.toFixed(2),
        txn.balance.toFixed(2),
        txn.reference_number || '',
        txn.status || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-ledger-${customerInfo?.name}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'invoice': return 'bg-blue-100 text-blue-800';
      case 'payment': return 'bg-green-100 text-green-800';
      case 'credit': return 'bg-purple-100 text-purple-800';
      case 'debit': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Customer Selection & Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Ledger
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Select Customer</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.company && `(${customer.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {customerInfo && (
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Customer:</strong> {customerInfo.name}
                  {customerInfo.company && ` (${customerInfo.company})`}
                </div>
                <div className="text-sm">
                  <strong>Contact:</strong> {customerInfo.phone || 'N/A'} | {customerInfo.email || 'N/A'}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedCustomer && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">₹{summary.totalInvoiced.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total Invoiced</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">₹{summary.totalPaid.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className={`text-2xl font-bold ${summary.currentBalance >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                  ₹{Math.abs(summary.currentBalance).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.currentBalance >= 0 ? 'Outstanding' : 'Credit Balance'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">₹{summary.creditLimit.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Credit Limit</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Filter by Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Transactions</SelectItem>
                      <SelectItem value="invoice">Invoices Only</SelectItem>
                      <SelectItem value="payment">Payments Only</SelectItem>
                      <SelectItem value="credit">Credits Only</SelectItem>
                      <SelectItem value="debit">Debits Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search descriptions or references..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={exportToCSV}
                    disabled={transactions.length === 0}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-right p-2">Balance</th>
                      <th className="text-left p-2">Reference</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          {format(new Date(txn.date), 'dd MMM yyyy')}
                        </td>
                        <td className="p-2">
                          <Badge className={getTransactionTypeColor(txn.type)}>
                            {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
                          </Badge>
                        </td>
                        <td className="p-2">{txn.description}</td>
                        <td className={`text-right p-2 font-medium ${txn.amount >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {txn.amount >= 0 ? '+' : ''}₹{Math.abs(txn.amount).toLocaleString()}
                        </td>
                        <td className="text-right p-2 font-medium">₹{txn.balance.toLocaleString()}</td>
                        <td className="p-2 text-sm text-muted-foreground">{txn.reference_number || '-'}</td>
                        <td className="p-2">
                          {txn.status && (
                            <Badge variant={txn.status === 'paid' ? 'success' : 'secondary'}>
                              {txn.status}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {transactions.length === 0 && !loading && selectedCustomer && (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions found for this customer
                  </div>
                )}
                
                {loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading customer ledger...
                  </div>
                )}
                
                {!selectedCustomer && (
                  <div className="text-center py-8 text-muted-foreground">
                    Please select a customer to view their ledger
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};