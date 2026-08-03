import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Filter, Receipt, CreditCard, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'cheque';
  reference?: string;
  notes?: string;
}

interface AccountsLedgerProps {
  onTransactionUpdate: () => void;
}

export function AccountsLedger({ onTransactionUpdate }: AccountsLedgerProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    description: "",
    type: "income" as 'income' | 'expense',
    category: "",
    amount: "",
    paymentMethod: "cash" as 'cash' | 'bank' | 'cheque',
    reference: "",
    notes: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchLedgerEntries();
  }, []);

  const fetchLedgerEntries = async () => {
    try {
      setLoading(true);

      // Fetch transactions from the API
      const response = await apiClient.getAccountLedger();
      console.log('📋 Ledger response:', response);

      // Map the transactions to ledger entries format
      // Note: apiClient already unwraps the response, so we access transactions directly
      const transactions = response.transactions || [];
      console.log('📋 Transactions:', transactions);

      const mappedEntries = transactions.map((t: any) => ({
        id: t._id,
        date: new Date(t.createdAt).toISOString().split('T')[0],
        description: t.description,
        type: t.transactionType as 'income' | 'expense',
        category: t.category,
        amount: t.amount,
        paymentMethod: t.paymentMethod === 'bank_transfer' ? 'bank' :
                       t.paymentMethod === 'card' ? 'bank' :
                       t.paymentMethod === 'upi' ? 'bank' : t.paymentMethod as 'cash' | 'bank' | 'cheque',
        reference: t.reference || t.transactionNumber,
        notes: t.notes
      }));

      console.log('📋 Mapped entries:', mappedEntries);
      setEntries(mappedEntries);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch ledger entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addLedgerEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEntry.description || !newEntry.amount || !newEntry.category) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create transaction via API
      await apiClient.createAccountTransaction({
        transactionType: newEntry.type,
        category: newEntry.category,
        amount: parseFloat(newEntry.amount),
        description: newEntry.description,
        paymentMethod: newEntry.paymentMethod === 'cash' ? 'cash' :
                       newEntry.paymentMethod === 'bank' ? 'bank_transfer' : 'cheque',
        accountType: newEntry.paymentMethod === 'cash' ? 'cash' : 'bank',
        accountName: newEntry.paymentMethod === 'cash' ? 'Cash Account' : 'Bank Account',
        reference: newEntry.reference,
        notes: newEntry.notes,
        status: 'completed'
      });

      toast({
        title: "Entry Added",
        description: "Ledger entry has been added successfully",
      });

      // Refresh the ledger entries
      await fetchLedgerEntries();

      setIsAddDialogOpen(false);
      setNewEntry({
        description: "",
        type: "income",
        category: "",
        amount: "",
        paymentMethod: "cash",
        reference: "",
        notes: ""
      });

      onTransactionUpdate();
    } catch (error) {
      console.error('Error adding ledger entry:', error);
      toast({
        title: "Error",
        description: "Failed to add ledger entry",
        variant: "destructive",
      });
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (entry.reference || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || entry.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalIncome = filteredEntries
    .filter(entry => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpenses = filteredEntries
    .filter(entry => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const netAmount = totalIncome - totalExpenses;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Accounts Ledger</h2>
          <p className="text-muted-foreground">Track all financial transactions. Use "New Transaction" or "Quick Payment" buttons above to add entries.</p>
        </div>
      </div>

      {/* Hidden dialog - keeping code for potential future use */}
      {false && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Ledger Entry</DialogTitle>
              <DialogDescription>
                Record a new financial transaction
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={addLedgerEntry} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter transaction description"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={newEntry.type} onValueChange={(value: 'income' | 'expense') => 
                    setNewEntry(prev => ({ ...prev, type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={newEntry.amount}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newEntry.category}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Sales, Materials, Rent"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={newEntry.paymentMethod} onValueChange={(value: 'cash' | 'bank' | 'cheque') => 
                  setNewEntry(prev => ({ ...prev, paymentMethod: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reference">Reference</Label>
                <Input
                  id="reference"
                  value={newEntry.reference}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Invoice number, receipt, etc."
                />
        </div>
        
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes (optional)"
                  rows={3}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Entry</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}


      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4 text-green-500" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">this period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-red-500" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">this period</p>
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
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
              </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
      </div>

      {/* Entries List */}
      <div className="space-y-2">
        {filteredEntries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    entry.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {entry.type === 'income' ? (
                      <Receipt className="h-5 w-5 text-green-600" />
                    ) : (
                      <CreditCard className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{entry.description}</h3>
                    <p className="text-sm text-muted-foreground">
                      {entry.category} • {entry.paymentMethod} • {entry.date}
                    </p>
                    {entry.reference && (
                      <p className="text-xs text-muted-foreground">Ref: {entry.reference}</p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-lg font-semibold ${
                    entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {entry.type === 'income' ? '+' : '-'}₹{entry.amount.toLocaleString()}
                  </div>
                    </div>
                    </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEntries.length === 0 && !loading && (
        <Card className="text-center p-8">
          <CardContent>
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No entries found</h3>
            <p className="text-muted-foreground">
              {searchTerm || typeFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Use the 'New Transaction' or 'Quick Payment' buttons above to add your first entry"
              }
            </p>
          </CardContent>
    </Card>
      )}
    </div>
  );
}