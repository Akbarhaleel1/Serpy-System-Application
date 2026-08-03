import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import apiClient from "@/lib/apiClient";

interface LineItem {
  description: string;
  hsnCode: string;
  rate: string;
  quantity: string;
  gstRate: string;
}

interface NewPurchaseBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  bill?: any | null;
}

const emptyItem = (): LineItem => ({ description: "", hsnCode: "", rate: "", quantity: "1", gstRate: "18" });

const round2 = (n: number) => Math.round((n || 0) * 100) / 100;

export function NewPurchaseBillDialog({ open, onOpenChange, onSaved, bill }: NewPurchaseBillDialogProps) {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [vendorId, setVendorId] = useState("");
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isInterState, setIsInterState] = useState(false);
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  const isEdit = Boolean(bill?._id);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res: any = await apiClient.getVendors({ limit: 200 });
        setVendors(res?.data?.vendors || res?.vendors || []);
      } catch (e) {
        console.error("Failed to load vendors", e);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (bill) {
      setVendorId(bill.vendorId?._id || bill.vendorId || "");
      setVendorInvoiceNumber(bill.vendorInvoiceNumber || "");
      setBillDate(bill.billDate ? bill.billDate.substring(0, 10) : "");
      setDueDate(bill.dueDate ? bill.dueDate.substring(0, 10) : "");
      setIsInterState(Boolean(bill.isInterState));
      setPaidAmount(bill.paidAmount ? String(bill.paidAmount) : "");
      setNotes(bill.notes || "");
      setItems(
        (bill.items || []).length
          ? bill.items.map((it: any) => ({
              description: it.description || "",
              hsnCode: it.hsnCode || "",
              rate: String(it.rate ?? ""),
              quantity: String(it.quantity ?? ""),
              gstRate: String(it.gstRate ?? "0"),
            }))
          : [emptyItem()]
      );
    } else {
      const today = new Date().toISOString().substring(0, 10);
      setVendorId("");
      setVendorInvoiceNumber("");
      setBillDate(today);
      setDueDate(today);
      setIsInterState(false);
      setPaidAmount("");
      setNotes("");
      setItems([emptyItem()]);
    }
  }, [bill, open]);

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const totals = useMemo(() => {
    let taxable = 0;
    let sgst = 0;
    let cgst = 0;
    let igst = 0;
    items.forEach((it) => {
      const rate = parseFloat(it.gstRate) || 0;
      const itemTaxable = round2((parseFloat(it.rate) || 0) * (parseFloat(it.quantity) || 0));
      taxable += itemTaxable;
      if (isInterState) {
        igst += round2((itemTaxable * rate) / 100);
      } else {
        sgst += round2((itemTaxable * (rate / 2)) / 100);
        cgst += round2((itemTaxable * (rate / 2)) / 100);
      }
    });
    taxable = round2(taxable);
    sgst = round2(sgst);
    cgst = round2(cgst);
    igst = round2(igst);
    const gst = round2(sgst + cgst + igst);
    return { taxable, sgst, cgst, igst, gst, total: round2(taxable + gst) };
  }, [items, isInterState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorId) {
      toast({ title: "Vendor required", description: "Please select a vendor", variant: "destructive" });
      return;
    }
    const validItems = items.filter((it) => it.description.trim() && parseFloat(it.rate) >= 0 && parseFloat(it.quantity) > 0);
    if (validItems.length === 0) {
      toast({ title: "Items required", description: "Add at least one valid line item", variant: "destructive" });
      return;
    }

    const payload = {
      vendorId,
      vendorInvoiceNumber,
      billDate,
      dueDate,
      isInterState,
      paidAmount: parseFloat(paidAmount) || 0,
      notes,
      items: validItems.map((it) => ({
        description: it.description.trim(),
        hsnCode: it.hsnCode.trim(),
        rate: parseFloat(it.rate) || 0,
        quantity: parseFloat(it.quantity) || 0,
        gstRate: parseFloat(it.gstRate) || 0,
      })),
    };

    setLoading(true);
    try {
      if (isEdit) {
        await apiClient.updatePurchaseBill(bill._id, payload);
        toast({ title: "Bill updated", description: "Purchase bill updated successfully" });
      } else {
        await apiClient.createPurchaseBill(payload);
        toast({ title: "Bill created", description: "Purchase bill recorded successfully" });
      }
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving purchase bill", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save purchase bill",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Purchase Bill" : "New Purchase Bill"}</DialogTitle>
          <DialogDescription>Record a bill received from a vendor</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorInvoiceNumber">Vendor Invoice Number</Label>
              <Input
                id="vendorInvoiceNumber"
                value={vendorInvoiceNumber}
                onChange={(e) => setVendorInvoiceNumber(e.target.value)}
                placeholder="e.g., #2024250125"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billDate">Bill Date *</Label>
              <Input id="billDate" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Inter-state (IGST)</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch checked={isInterState} onCheckedChange={setIsInterState} />
                <span className="text-sm text-muted-foreground">
                  {isInterState ? "IGST" : "SGST + CGST"}
                </span>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items *</Label>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addItem}>
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((it, index) => {
                const lineTaxable = round2((parseFloat(it.rate) || 0) * (parseFloat(it.quantity) || 0));
                const lineGst = round2((lineTaxable * (parseFloat(it.gstRate) || 0)) / 100);
                return (
                  <div key={index} className="rounded-md border p-3 space-y-2">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-5">
                        <Input
                          placeholder="Description *"
                          value={it.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-3">
                        <Input
                          placeholder="HSN/SAC"
                          value={it.hsnCode}
                          onChange={(e) => updateItem(index, "hsnCode", e.target.value)}
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Rate"
                          value={it.rate}
                          onChange={(e) => updateItem(index, "rate", e.target.value)}
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-2 flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Qty"
                          value={it.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        />
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-destructive"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6 sm:col-span-3 flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">GST %</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={it.gstRate}
                          onChange={(e) => updateItem(index, "gstRate", e.target.value)}
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-9 text-right text-xs text-muted-foreground">
                        Taxable {formatCurrency(lineTaxable)} · GST {formatCurrency(lineGst)} · Total{" "}
                        <span className="font-medium text-foreground">{formatCurrency(lineTaxable + lineGst)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-md border p-3 bg-muted/30 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxable</span>
              <span>{formatCurrency(totals.taxable)}</span>
            </div>
            {isInterState ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IGST</span>
                <span>{formatCurrency(totals.igst)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST</span>
                  <span>{formatCurrency(totals.sgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST</span>
                  <span>{formatCurrency(totals.cgst)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-semibold border-t pt-1 mt-1">
              <span>Total Amount</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paidAmount">Amount Paid</Label>
              <Input
                id="paidAmount"
                type="number"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
                rows={1}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update Bill" : "Create Bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
