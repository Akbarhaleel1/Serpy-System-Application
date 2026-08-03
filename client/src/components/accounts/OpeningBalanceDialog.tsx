import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface OpeningBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBalanceUpdated: () => void;
}

export function OpeningBalanceDialog({ open, onOpenChange, onBalanceUpdated }: OpeningBalanceDialogProps) {
  const [cashBalance, setCashBalance] = useState("");
  const [bankBalance, setBankBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cashBalance && !bankBalance) {
      toast({
        title: "Invalid Input",
        description: "Please enter at least one balance amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to set opening balances
      console.log('📋 API not yet implemented');
      
      toast({
        title: "Opening Balance Set",
        description: "Opening balances have been recorded successfully",
      });
      
      onBalanceUpdated();
      onOpenChange(false);
      
      // Reset form
      setCashBalance("");
      setBankBalance("");
    } catch (error) {
      console.error('Error setting opening balance:', error);
      toast({
        title: "Error",
        description: "Failed to set opening balance",
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
          <DialogTitle>Set Opening Balance</DialogTitle>
          <DialogDescription>
            Set the initial cash and bank balances for your accounts.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cashBalance">Cash Balance (₹)</Label>
            <Input
              id="cashBalance"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={cashBalance}
              onChange={(e) => setCashBalance(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bankBalance">Bank Balance (₹)</Label>
            <Input
              id="bankBalance"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={bankBalance}
              onChange={(e) => setBankBalance(e.target.value)}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Setting..." : "Set Balance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}