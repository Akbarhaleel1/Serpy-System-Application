import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Users, UserCheck, Building2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

const emptyEmployee = () => ({
  name: "", email: "", phone: "", gender: "", dateOfBirth: "", address: "",
  designation: "", department: "", dateOfJoining: "", employmentType: "full-time", status: "active",
  salary: { basic: 0, hra: 0, allowances: 0, specialAllowance: 0 },
  deductions: { pf: 0, professionalTax: 0, esi: 0, other: 0 },
  bankDetails: { accountName: "", accountNumber: "", ifscCode: "", bankName: "", upiId: "" },
  panNumber: "", aadhaarNumber: "", pfNumber: "", notes: "",
});

const inr = (n: number) =>
  "₹" + (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyEmployee());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    const t = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(t);
  }, [search, statusFilter]);

  const fetchAll = async () => { await Promise.all([fetchEmployees(), fetchStats()]); };

  const fetchEmployees = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      const res: any = await apiClient.getEmployees(params);
      setEmployees(res.employees || []);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load employees", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res: any = await apiClient.getEmployeeStats();
      setStats(res || {});
    } catch (e) { console.error(e); }
  };

  const openCreate = () => { setEditing(null); setForm(emptyEmployee()); setDialogOpen(true); };
  const openEdit = (emp: any) => {
    setEditing(emp);
    setForm({
      ...emptyEmployee(),
      ...emp,
      dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.substring(0, 10) : "",
      dateOfJoining: emp.dateOfJoining ? emp.dateOfJoining.substring(0, 10) : "",
      salary: { ...emptyEmployee().salary, ...(emp.salary || {}) },
      deductions: { ...emptyEmployee().deductions, ...(emp.deductions || {}) },
      bankDetails: { ...emptyEmployee().bankDetails, ...(emp.bankDetails || {}) },
    });
    setDialogOpen(true);
  };

  const gross = (form.salary?.basic || 0) + (form.salary?.hra || 0) + (form.salary?.allowances || 0) + (form.salary?.specialAllowance || 0);
  const totalDed = (form.deductions?.pf || 0) + (form.deductions?.professionalTax || 0) + (form.deductions?.esi || 0) + (form.deductions?.other || 0);
  const net = gross - totalDed;

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", description: "Please enter the employee name", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.dateOfBirth) delete payload.dateOfBirth;
      if (!payload.dateOfJoining) delete payload.dateOfJoining;
      if (editing) {
        await apiClient.updateEmployee(editing._id || editing.id, payload);
        toast({ title: "Updated", description: "Employee updated successfully" });
      } else {
        await apiClient.createEmployee(payload);
        toast({ title: "Created", description: "Employee added successfully" });
      }
      setDialogOpen(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save employee", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (emp: any) => {
    if (!confirm(`Delete employee "${emp.name}"? This cannot be undone.`)) return;
    try {
      await apiClient.deleteEmployee(emp._id || emp.id);
      toast({ title: "Deleted", description: "Employee removed" });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to delete", variant: "destructive" });
    }
  };

  const setSalary = (k: string, v: string) => setForm({ ...form, salary: { ...form.salary, [k]: Number(v) || 0 } });
  const setDed = (k: string, v: string) => setForm({ ...form, deductions: { ...form.deductions, [k]: Number(v) || 0 } });
  const setBank = (k: string, v: string) => setForm({ ...form, bankDetails: { ...form.bankDetails, [k]: v } });

  const statusColor: any = { active: "default", inactive: "secondary", terminated: "destructive", "on-leave": "outline" };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage your team, salary structure and details</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Employee</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Total Employees" value={stats.total ?? 0} />
        <StatCard icon={<UserCheck className="h-5 w-5" />} label="Active" value={stats.active ?? 0} />
        <StatCard icon={<Building2 className="h-5 w-5" />} label="Departments" value={stats.departments ?? 0} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Monthly Payroll" value={inr(stats.monthlyPayroll ?? 0)} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name, code, designation…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on-leave">On Leave</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : employees.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No employees yet. Click "Add Employee" to get started.</TableCell></TableRow>
              ) : employees.map((emp) => (
                <TableRow key={emp._id || emp.id}>
                  <TableCell className="font-mono text-xs">{emp.employeeCode}</TableCell>
                  <TableCell>
                    <div className="font-medium">{emp.name}</div>
                    <div className="text-xs text-muted-foreground">{emp.email || emp.phone}</div>
                  </TableCell>
                  <TableCell>{emp.designation || "-"}</TableCell>
                  <TableCell>{emp.department || "-"}</TableCell>
                  <TableCell className="text-right font-medium">{inr(emp.netSalary)}</TableCell>
                  <TableCell><Badge variant={statusColor[emp.status] || "secondary"}>{emp.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(emp)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Add Employee"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="personal">Personal & Job</TabsTrigger>
              <TabsTrigger value="salary">Salary</TabsTrigger>
              <TabsTrigger value="bank">Bank & IDs</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
                <Field label="Gender">
                  <Select value={form.gender || "none"} onValueChange={(v) => setForm({ ...form, gender: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Date of Birth"><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></Field>
                <Field label="Date of Joining"><Input type="date" value={form.dateOfJoining} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} /></Field>
                <Field label="Designation"><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
                <Field label="Department"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field>
                <Field label="Employment Type">
                  <Select value={form.employmentType} onValueChange={(v) => setForm({ ...form, employmentType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on-leave">On Leave</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Address"><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            </TabsContent>

            <TabsContent value="salary" className="space-y-4 pt-3">
              <p className="text-sm font-medium text-muted-foreground">Monthly Earnings</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Basic"><Input type="number" placeholder="0" value={form.salary.basic || ""} onChange={(e) => setSalary("basic", e.target.value)} /></Field>
                <Field label="HRA"><Input type="number" placeholder="0" value={form.salary.hra || ""} onChange={(e) => setSalary("hra", e.target.value)} /></Field>
                <Field label="Allowances"><Input type="number" placeholder="0" value={form.salary.allowances || ""} onChange={(e) => setSalary("allowances", e.target.value)} /></Field>
                <Field label="Special Allowance"><Input type="number" placeholder="0" value={form.salary.specialAllowance || ""} onChange={(e) => setSalary("specialAllowance", e.target.value)} /></Field>
              </div>
              <p className="text-sm font-medium text-muted-foreground pt-2">Monthly Deductions</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Provident Fund (PF)"><Input type="number" placeholder="0" value={form.deductions.pf || ""} onChange={(e) => setDed("pf", e.target.value)} /></Field>
                <Field label="Professional Tax"><Input type="number" placeholder="0" value={form.deductions.professionalTax || ""} onChange={(e) => setDed("professionalTax", e.target.value)} /></Field>
                <Field label="ESI"><Input type="number" placeholder="0" value={form.deductions.esi || ""} onChange={(e) => setDed("esi", e.target.value)} /></Field>
                <Field label="Other Deductions"><Input type="number" placeholder="0" value={form.deductions.other || ""} onChange={(e) => setDed("other", e.target.value)} /></Field>
              </div>
              <div className="rounded-lg bg-muted p-4 grid grid-cols-3 gap-2 text-center">
                <div><div className="text-xs text-muted-foreground">Gross</div><div className="font-semibold">{inr(gross)}</div></div>
                <div><div className="text-xs text-muted-foreground">Deductions</div><div className="font-semibold">{inr(totalDed)}</div></div>
                <div><div className="text-xs text-muted-foreground">Net / month</div><div className="font-bold text-primary">{inr(net)}</div></div>
              </div>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Account Holder Name"><Input value={form.bankDetails.accountName} onChange={(e) => setBank("accountName", e.target.value)} /></Field>
                <Field label="Account Number"><Input value={form.bankDetails.accountNumber} onChange={(e) => setBank("accountNumber", e.target.value)} /></Field>
                <Field label="IFSC Code"><Input value={form.bankDetails.ifscCode} onChange={(e) => setBank("ifscCode", e.target.value)} /></Field>
                <Field label="Bank Name"><Input value={form.bankDetails.bankName} onChange={(e) => setBank("bankName", e.target.value)} /></Field>
                <Field label="UPI ID"><Input value={form.bankDetails.upiId} onChange={(e) => setBank("upiId", e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="PAN Number"><Input value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} /></Field>
                <Field label="Aadhaar Number"><Input value={form.aadhaarNumber} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })} /></Field>
                <Field label="PF Number"><Input value={form.pfNumber} onChange={(e) => setForm({ ...form, pfNumber: e.target.value })} /></Field>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
