import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
  preselectedJob?: {
    _id: string;
    title: string;
    customer: string;
    status: string;
    dueDate: string;
    priority: string;
  };
}

export function CreateTaskDialog({ open, onOpenChange, onTaskCreated, preselectedJob }: CreateTaskDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    jobId: "none",
    dueDate: "",
    startDate: "",
    priority: "medium" as 'low' | 'medium' | 'high' | 'urgent',
    status: "pending" as 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold',
    estimatedHours: "",
    tags: "",
    notes: ""
  });
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      console.log('🚀 CreateTaskDialog opened - fetching data...');
      fetchStaff();
      fetchJobs();
    }
  }, [open]);

  // Pre-fill form data when preselectedJob is provided
  useEffect(() => {
    if (open && preselectedJob) {
      console.log('🎯 Pre-filling form with preselected job:', preselectedJob);
      
      // Safe date formatting function
      const formatDateForInput = (dateValue: any) => {
        if (!dateValue || dateValue === 'No due date' || dateValue === 'Invalid date') {
          return '';
        }
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
          return '';
        }
        return date.toISOString().split('T')[0];
      };
      
      setFormData(prev => ({
        ...prev,
        jobId: preselectedJob._id,
        title: `Task for ${preselectedJob.title}`,
        description: `Task related to job: ${preselectedJob.title} (${preselectedJob.customer})`,
        priority: preselectedJob.priority as 'low' | 'medium' | 'high' | 'urgent' || 'medium',
        dueDate: formatDateForInput(preselectedJob.dueDate)
      }));
    }
  }, [open, preselectedJob]);

  const fetchStaff = async () => {
    try {
      // Use users endpoint with role filter to get staff users (same as Staff component)
      const response = await apiClient.get('/users', { role: 'staff' });
      console.log('👥 Staff response:', response);
      
      // Handle the actual response structure from API (same as Staff component)
      let staffData = [];
      if (response && typeof response === 'object' && response.users && Array.isArray(response.users)) {
        staffData = response.users;
        console.log('👥 Extracted staff from response.users:', staffData);
      } else if (response && response.data && Array.isArray(response.data.users)) {
        staffData = response.data.users;
        console.log('👥 Extracted staff from response.data.users:', staffData);
      } else if (Array.isArray(response)) {
        staffData = response;
        console.log('👥 Using direct response array:', staffData);
      } else if (response && Array.isArray(response.data)) {
        staffData = response.data;
        console.log('👥 Using response.data array:', staffData);
      } else {
        console.log('👥 Unexpected response structure:', response);
      }
      
      console.log('👥 Final staff data:', staffData);
      console.log('👥 Staff count:', staffData.length);
      console.log('👥 Is array:', Array.isArray(staffData));
      
      // Ensure we always have an array before setting state
      setStaff(Array.isArray(staffData) ? staffData : []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaff([]); // Set empty array on error
    }
  };

  const fetchJobs = async () => {
    setJobsLoading(true);
    try {
      const response = await apiClient.getJobs();
      console.log('📋 Jobs response:', response);
      
      // Handle the nested response structure from backend
      let jobsData = [];
      if (response?.data?.jobs) {
        // Backend returns { data: { jobs: [...], pagination: {...} } }
        jobsData = response.data.jobs;
        console.log('📋 Jobs extracted from response.data.jobs:', jobsData.length);
      } else if (response?.jobs) {
        // Backend returns { jobs: [...], pagination: {...} }
        jobsData = response.jobs;
        console.log('📋 Jobs extracted from response.jobs:', jobsData.length);
      } else if (Array.isArray(response)) {
        // Direct array response
        jobsData = response;
        console.log('📋 Jobs extracted from direct array:', jobsData.length);
      } else if (response?.data && Array.isArray(response.data)) {
        // Direct data array
        jobsData = response.data;
        console.log('📋 Jobs extracted from response.data array:', jobsData.length);
      } else {
        console.log('📋 No jobs found in response structure:', response);
      }
      
      console.log('📋 Extracted jobs data:', jobsData);
      
      // Process jobs to ensure we have the right structure
      const processedJobs = jobsData.map(job => {
        // Handle populated customer data
        const customerName = job.customerId?.name || job.customer || job.customerName || 'Unknown Customer';
        
        return {
          _id: job._id || job.id,
          title: job.title || job.name || 'Untitled Job',
          status: job.status || 'pending',
          customer: customerName,
          dueDate: job.dueDate,
          priority: job.priority || 'medium'
        };
      });
      
      console.log('📋 Processed jobs with structure:', processedJobs);
      setJobs(processedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]); // Set empty array on error
      toast({
        title: "Warning",
        description: "Could not load jobs. You can still create a standalone task.",
        variant: "destructive",
      });
    } finally {
      setJobsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.assignedTo) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const taskData = {
        ...formData,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        jobId: formData.jobId && formData.jobId !== 'none' ? formData.jobId : undefined
      };

      const response = await apiClient.createTask(taskData);
      console.log('📋 Task created:', response);
      
      toast({
        title: "Task Created",
        description: "Task has been created successfully",
      });
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        assignedTo: "",
        jobId: "none",
        dueDate: "",
        startDate: "",
        priority: "medium",
        status: "pending",
        estimatedHours: "",
        tags: "",
        notes: ""
      });
      
      onTaskCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a new task and assign it to a staff member with advanced options.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input 
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
          </div>

          {/* Assignment & Job */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Assignment & Job</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned Staff *</Label>
                <Select value={formData.assignedTo} onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(staff) && staff.map((member) => (
                      <SelectItem key={member._id} value={member._id}>
                        {member.fullName || member.name || 'Unknown Staff'} - {member.role || member.position || 'Staff'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>

              <div className="space-y-2">
                <Label htmlFor="jobId">Related Job</Label>
                {preselectedJob ? (
                  <div className="p-3 bg-gray-50 border rounded-md">
                    <div className="font-medium text-gray-900">{preselectedJob.title}</div>
                    <div className="text-sm text-gray-600">Customer: {preselectedJob.customer}</div>
                    <div className="text-sm text-gray-600">Status: {preselectedJob.status}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      (Fixed - Cannot be changed)
                    </div>
                  </div>
                ) : (
                  <Select value={formData.jobId} onValueChange={(value) => setFormData(prev => ({ ...prev, jobId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select job (optional)" />
                </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="none">
                          <div className="flex flex-col">
                            <span className="font-medium">No Job</span>
                            <span className="text-xs text-gray-500">Create standalone task</span>
                          </div>
                        </SelectItem>
                        {jobsLoading ? (
                          <SelectItem value="loading" disabled>
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                              <span>Loading jobs...</span>
                            </div>
                          </SelectItem>
                        ) : Array.isArray(jobs) && jobs.length > 0 ? (
                          jobs.map((job) => (
                            <SelectItem key={job._id} value={job._id}>
                              <div className="flex flex-col w-full">
                                <div className="flex justify-between items-start w-full">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{job.title}</div>
                                    <div className="text-xs text-gray-500 truncate">
                                      Customer: {job.customer}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end ml-2">
                                    <Badge 
                                      className={`text-xs ${
                                        job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                        job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      {job.status?.replace('_', ' ')}
                                    </Badge>
                                    {job.dueDate && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Due: {new Date(job.dueDate).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-jobs" disabled>
                            <div className="flex flex-col">
                              <span className="font-medium">No Jobs Available</span>
                              <span className="text-xs text-gray-500">Create a job first or check console for errors</span>
                            </div>
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Dates & Time */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dates & Time</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                step="0.5"
                min="0"
                value={formData.estimatedHours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
                placeholder="Enter estimated hours"
              />
            </div>
          </div>

          {/* Priority & Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Priority & Status</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                  setFormData(prev => ({ ...prev, priority: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">Low</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-100 text-orange-800">High</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-100 text-red-800">Urgent</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold') => 
                  setFormData(prev => ({ ...prev, status: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Enter tags separated by commas (e.g., design, urgent, client)"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
            <Textarea 
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Enter additional notes"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}