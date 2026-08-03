import { useState, useEffect } from "react";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

const LEAVE_TYPES = ["casual", "sick", "earned", "unpaid", "maternity", "other"];

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB") : "-";

export default function Leaves() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ employeeId: "", leaveType: "casual", fromDate: "", toDate: "", reason: "" });
  const { toast } = useToast();

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { fetchLeaves(); }, [statusFilter]);

  const fetchEmployees = async () => {
    try {
      const res: any = await apiClient.getEmployees({ status: "active" });
      setEmployees(res.employees || []);
    } catch (e) { console.error(e); }
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res: any = await apiClient.getLeaves(params);
      setLeaves(res.leaves || []);
    } catch (e) {
      toast({ title: "Error", description: "Failed to load leaves", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const apply = async () => {
    if (!form.employeeId || !form.fromDate || !form.toDate) {
      toast({ title: "Missing fields", description: "Employee, from and to dates are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiClient.createLeave(form);
      toast({ title: "Applied", description: "Leave request created" });
      setOpen(false);
      setForm({ employeeId: "", leaveType: "casual", fromDate: "", toDate: "", reason: "" });
      fetchLeaves();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (l: any, status: string) => {
    try {
      let rejectionReason;
      if (status === "rejected") rejectionReason = prompt("Reason for rejection (optional):") || "";
      await apiClient.updateLeaveStatus(l._id || l.id, status, rejectionReason);
      toast({ title: `Leave ${status}` });
      fetchLeaves();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed", variant: "destructive" });
    }
  };

  const remove = async (l: any) => {
    if (!confirm("Delete this leave request?")) return;
    try {
      await apiClient.deleteLeave(l._id || l.id);
      fetchLeaves();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed", variant: "destructive" });
    }
  };

  const statusBadge: any = { pending: "secondary", approved: "default", rejected: "destructive", cancelled: "outline" };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Requests</h1>
          <p className="text-muted-foreground">Apply, approve and track employee leave</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Apply Leave</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-center">Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : leaves.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No leave requests.</TableCell></TableRow>
              ) : leaves.map((l) => (
                <TableRow key={l._id || l.id}>
                  <TableCell className="font-medium">{l.employeeId?.name || "-"}</TableCell>
                  <TableCell className="capitalize">{l.leaveType}</TableCell>
                  <TableCell>{fmtDate(l.fromDate)}</TableCell>
                  <TableCell>{fmtDate(l.toDate)}</TableCell>
                  <TableCell className="text-center">{l.days}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={l.reason}>{l.reason || "-"}</TableCell>
                  <TableCell><Badge variant={statusBadge[l.status] || "secondary"}>{l.status}</Badge></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {l.status === "pending" && (
                      <>
                        <Button variant="ghost" size="icon" title="Approve" onClick={() => setStatus(l, "approved")}>
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Reject" onClick={() => setStatus(l, "rejected")}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" title="Delete" onClick={() => remove(l)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Employee</Label>
              <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e._id} value={e._id}>{e.name} ({e.employeeCode})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Leave Type</Label>
              <Select value={form.leaveType} onValueChange={(v) => setForm({ ...form, leaveType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">From</Label>
                <Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To</Label>
                <Input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason</Label>
              <Textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={apply} disabled={saving}>{saving ? "Submitting…" : "Submit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
