import { useState, useEffect } from "react";
import { Wallet, FileDown, CheckCircle2, RefreshCw, IndianRupee, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const inr = (n: number) =>
  "₹" + (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Payroll() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payslips, setPayslips] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  useEffect(() => { fetchData(); }, [month, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [list, sum]: any = await Promise.all([
        apiClient.getPayroll({ month, year }),
        apiClient.getPayrollSummary(month, year),
      ]);
      setPayslips(list.payslips || []);
      setSummary(sum || {});
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load payroll", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generate = async () => {
    if (!confirm(`Generate payroll for ${MONTHS[month - 1]} ${year}? This uses each active employee's salary structure and recorded attendance.`)) return;
    setGenerating(true);
    try {
      const res: any = await apiClient.generatePayroll(month, year);
      toast({ title: "Payroll generated", description: res?.message || "Done" });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to generate payroll", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const markPaid = async (p: any) => {
    try {
      await apiClient.markPayslipPaid(p._id || p.id);
      toast({ title: "Marked paid", description: `${p.employeeName} payslip marked as paid` });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed", variant: "destructive" });
    }
  };

  const downloadPayslip = async (p: any) => {
    try {
      const blob = await apiClient.downloadPayslipPDF(p._id || p.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Payslip_${p.employeeCode || "EMP"}_${p.month}_${p.year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to download payslip", variant: "destructive" });
    }
  };

  const statusBadge: any = { draft: "outline", generated: "secondary", paid: "default" };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">Generate and manage monthly payslips</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={generate} disabled={generating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating…" : "Generate Payroll"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Users className="h-5 w-5" />} label="Payslips" value={summary.count ?? 0} />
        <Stat icon={<IndianRupee className="h-5 w-5" />} label="Total Net Payout" value={inr(summary.totalNet ?? 0)} />
        <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Paid" value={`${summary.paidCount ?? 0} (${inr(summary.paidAmount ?? 0)})`} />
        <Stat icon={<Wallet className="h-5 w-5" />} label="Pending" value={summary.pendingCount ?? 0} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-center">Paid / Working</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : payslips.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No payslips for {MONTHS[month - 1]} {year}. Click "Generate Payroll" to create them.
                </TableCell></TableRow>
              ) : payslips.map((p) => (
                <TableRow key={p._id || p.id}>
                  <TableCell>
                    <div className="font-medium">{p.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{p.employeeCode} · {p.designation || "-"}</div>
                  </TableCell>
                  <TableCell className="text-center">{p.paidDays} / {p.workingDays}</TableCell>
                  <TableCell className="text-right">{inr(p.grossEarnings)}</TableCell>
                  <TableCell className="text-right text-destructive">{inr(p.totalDeductions)}</TableCell>
                  <TableCell className="text-right font-semibold">{inr(p.netPay)}</TableCell>
                  <TableCell><Badge variant={statusBadge[p.status] || "secondary"}>{p.status}</Badge></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" title="Download payslip" onClick={() => downloadPayslip(p)}>
                      <FileDown className="h-4 w-4" />
                    </Button>
                    {p.status !== "paid" && (
                      <Button variant="ghost" size="icon" title="Mark as paid" onClick={() => markPaid(p)}>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-lg font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
