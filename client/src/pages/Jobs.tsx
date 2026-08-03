import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Clock,
  User,
  FileText,
  Tag,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  ChevronDown,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  eye,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { CreateJobDialog } from "@/components/jobs/CreateJobDialog";
import { AssignTaskDialog } from "@/components/staff/AssignTaskDialog";
import { UpdateStatusDialog } from "@/components/jobs/UpdateStatusDialog";
import { AdvancedCreateInvoiceDialog } from "@/components/invoices/AdvancedCreateInvoiceDialog";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const statusConfig = {
  "inquiry": { variant: "secondary" as const, color: "bg-gray-100 text-gray-800", label: "Inquiry" },
  "quotation_sent": { variant: "pending" as const, color: "bg-blue-100 text-blue-800", label: "Quotation Sent" },
  "quotation_approved": { variant: "warning" as const, color: "bg-yellow-100 text-yellow-800", label: "Approved" },
  "design_in_progress": { variant: "pending" as const, color: "bg-purple-100 text-purple-800", label: "Designing" },
  "design_approved": { variant: "warning" as const, color: "bg-orange-100 text-orange-800", label: "Design OK" },
  "production_ready": { variant: "warning" as const, color: "bg-indigo-100 text-indigo-800", label: "Ready" },
  "ready_for_print": { variant: "warning" as const, color: "bg-cyan-100 text-cyan-800", label: "Print Ready" },
  "quality_check": { variant: "warning" as const, color: "bg-pink-100 text-pink-800", label: "QC" },
  "completed": { variant: "success" as const, color: "bg-green-100 text-green-800", label: "Completed" },
  "delivered": { variant: "success" as const, color: "bg-emerald-100 text-emerald-800", label: "Delivered" },
  "cancelled": { variant: "destructive" as const, color: "bg-red-100 text-red-800", label: "Cancelled" }
};

const priorityConfig = {
  "low": { variant: "secondary" as const, color: "text-gray-600", icon: "○", label: "Low" },
  "medium": { variant: "warning" as const, color: "text-yellow-600", icon: "◐", label: "Medium" },
  "high": { variant: "urgent" as const, color: "text-orange-600", icon: "◉", label: "High" },
  "urgent": { variant: "destructive" as const, color: "text-red-600", icon: "⬤", label: "Urgent" }
};

export default function Jobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [assignTaskDialog, setAssignTaskDialog] = useState({ open: false, jobId: "" });
  const [updateStatusDialog, setUpdateStatusDialog] = useState({ open: false, jobId: "", currentStatus: "" });
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchJobs();
    fetchCustomers();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await apiClient.getJobs();
      const jobsData = (response as any)?.jobs || (response as any) || [];

      const processedJobs = jobsData.map((job: any) => ({
        ...job,
        customer: job.customerId?.name || job.customer || 'Unknown Customer',
        customerId: job.customerId?._id || job.customerId,
        customerEmail: job.customerId?.email,
        customerPhone: job.customerId?.phone,
        customerCompany: job.customerId?.company,
        invoiceId: job.invoices?.[0]?._id || null,
        invoiceItems: job.invoices?.[0]?.items || null
      }));

      setJobs(processedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch jobs",
        variant: "destructive",
      });
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.getCustomers();
      const customersData = (response as any)?.customers || (response as any) || [];
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
      return;
    }

    try {
      await apiClient.deleteJob(jobId);
      toast({
        title: "Job Deleted",
        description: "Job has been successfully deleted.",
      });
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: "Error",
        description: "Failed to delete job. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setUpdateStatusDialog({ open: true, jobId, currentStatus: job.status });
    }
  };

  const handleGenerateInvoice = (job: any) => {
    setSelectedJob(job);
    setShowInvoiceDialog(true);
  };

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    const customerName = job.customer || '';
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || job.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate stats
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(job => !["completed", "delivered", "cancelled"].includes(job.status)).length;
  const completedJobs = jobs.filter(job => ["completed", "delivered"].includes(job.status)).length;
  const totalRevenue = jobs.reduce((sum, job) => sum + (job.estimated_cost || job.estimatedCost || 0), 0);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 'Invalid';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex-1 space-y-6 p-8 bg-slate-50">
      {/* Professional Header with Gradient */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Job Management
          </h1>
          <p className="text-slate-600">
            Track and manage all your printing jobs in one place
          </p>
        </div>
        <Button
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 shadow-sm"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Job
        </Button>
      </div>

      {/* Professional Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Jobs</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{totalJobs}</p>
                <p className="text-slate-500 text-xs mt-2">All time</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-slate-50 flex items-center justify-center">
                <FileText className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">In Progress</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{activeJobs}</p>
                <p className="text-slate-500 text-xs mt-2 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Active now
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Completed</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{completedJobs}</p>
                <p className="text-slate-500 text-xs mt-2 flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(0) : 0}% done
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{formatCurrency(totalRevenue)}</p>
                <p className="text-slate-500 text-xs mt-2 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  All jobs
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-slate-50 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Professional Filters Bar */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by job title, customer, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-11 border-slate-200">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="inquiry">Inquiry</SelectItem>
                <SelectItem value="quotation_sent">Quotation Sent</SelectItem>
                <SelectItem value="quotation_approved">Approved</SelectItem>
                <SelectItem value="design_in_progress">Designing</SelectItem>
                <SelectItem value="production_ready">Ready</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[160px] h-11 border-slate-200">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Professional Table View */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Jobs List</CardTitle>
              <CardDescription className="mt-1">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredJobs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No jobs found</h3>
              <p className="text-slate-500 mb-6">
                {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first job to get started"}
              </p>
              {searchTerm || statusFilter !== "all" || priorityFilter !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="font-semibold">Job Details</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Due Date</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => (
                  <TableRow key={job.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">{job.title}</div>
                        <div className="text-xs text-slate-500">ID: {job.id}</div>
                        {job.createdBy?.fullName && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            Created by: <span className="font-medium text-slate-600">{job.createdBy.fullName}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium text-sm">
                          {job.customer.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{job.customer}</div>
                          {job.customerCompany && (
                            <div className="text-xs text-slate-500">{job.customerCompany}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusConfig[job.status]?.color} border-0 font-medium px-3 py-1`}>
                        {statusConfig[job.status]?.label || job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center space-x-2 ${priorityConfig[job.priority]?.color} font-medium`}>
                        <span>{priorityConfig[job.priority]?.icon}</span>
                        <span>{priorityConfig[job.priority]?.label || job.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2 text-slate-600">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{formatDate(job.dueDate)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold text-slate-900">
                        {formatCurrency(job.estimated_cost || job.estimatedCost || 0)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleGenerateInvoice(job)}>
                            <FileText className="h-4 w-4 mr-2" />
                            {job.invoiceId ? 'Edit Invoice' : 'Generate Invoice'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(job.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Update Status
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteJob(job.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Job
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateJobDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onJobCreated={fetchJobs}
        customers={customers}
        onCustomersUpdate={fetchCustomers}
      />

      <AssignTaskDialog
        open={assignTaskDialog.open}
        onOpenChange={(open) => setAssignTaskDialog({ open, jobId: "" })}
        jobId={assignTaskDialog.jobId}
        onTaskAssigned={fetchJobs}
      />

      <UpdateStatusDialog
        open={updateStatusDialog.open}
        onOpenChange={(open) => setUpdateStatusDialog({ open, jobId: "", currentStatus: "" })}
        jobId={updateStatusDialog.jobId}
        currentStatus={updateStatusDialog.currentStatus}
        onStatusUpdated={fetchJobs}
      />

      {selectedJob && (
        <AdvancedCreateInvoiceDialog
          open={showInvoiceDialog}
          onOpenChange={setShowInvoiceDialog}
          onInvoiceCreated={() => {
            fetchJobs();
            setShowInvoiceDialog(false);
          }}
          preselectedJob={selectedJob}
          preselectedCustomer={{
            _id: selectedJob.customerId,
            name: selectedJob.customer,
            email: selectedJob.customerEmail,
            phone: selectedJob.customerPhone,
            company: selectedJob.customerCompany
          }}
        />
      )}
    </div>
  );
}