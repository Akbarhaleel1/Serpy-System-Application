import { useState, useEffect } from "react";
import { Save, CalendarDays, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

const STATUSES = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "half-day", label: "Half Day" },
  { value: "leave", label: "Leave" },
  { value: "holiday", label: "Holiday" },
  { value: "week-off", label: "Week Off" },
];

const todayStr = () => new Date().toISOString().substring(0, 10);

export default function Attendance() {
  const [date, setDate] = useState(todayStr());
  const [employees, setEmployees] = useState<any[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { load(); }, [date]);

  const load = async () => {
    setLoading(true);
    try {
      const [empRes, attRes]: any = await Promise.all([
        apiClient.getEmployees({ status: "active" }),
        apiClient.getAttendance({ date }),
      ]);
      const emps = empRes.employees || [];
      setEmployees(emps);
      const map: Record<string, string> = {};
      emps.forEach((e: any) => { map[e._id] = "present"; });
      (attRes.attendance || []).forEach((a: any) => {
        const id = a.employeeId?._id || a.employeeId;
        if (id) map[id] = a.status;
      });
      setStatusMap(map);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load attendance", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const setAll = (status: string) => {
    const map: Record<string, string> = {};
    employees.forEach((e) => { map[e._id] = status; });
    setStatusMap(map);
  };

  const save = async () => {
    setSaving(true);
    try {
      const records = employees.map((e) => ({ employeeId: e._id, status: statusMap[e._id] || "present" }));
      await apiClient.markAttendanceBulk(date, records);
      toast({ title: "Saved", description: `Attendance saved for ${records.length} employees` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">Mark daily attendance for your team</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button onClick={save} disabled={saving || employees.length === 0}>
            <Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Quick set all:</span>
          <Button size="sm" variant="outline" onClick={() => setAll("present")}><Check className="h-3 w-3 mr-1" />All Present</Button>
          <Button size="sm" variant="outline" onClick={() => setAll("week-off")}>All Week Off</Button>
          <Button size="sm" variant="outline" onClick={() => setAll("holiday")}>All Holiday</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="w-44">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : employees.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No active employees found.</TableCell></TableRow>
              ) : employees.map((e) => (
                <TableRow key={e._id}>
                  <TableCell className="font-mono text-xs">{e.employeeCode}</TableCell>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell>{e.department || "-"}</TableCell>
                  <TableCell>
                    <Select value={statusMap[e._id] || "present"} onValueChange={(v) => setStatusMap({ ...statusMap, [e._id]: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
