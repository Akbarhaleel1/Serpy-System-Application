import { useState, useEffect } from "react";
import { Plus, Search, Users, Clock, CheckCircle, AlertCircle, Calendar, User, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CreateTaskDialog } from "@/components/staff/CreateTaskDialog";
import { EditTaskDialog } from "@/components/staff/EditTaskDialog";
import { CommentDialog } from "@/components/staff/CommentDialog";
import { StaffCard } from "@/components/staff/StaffCard";
import { TaskCard } from "@/components/staff/TaskCard";
import { ScheduleDialog } from "@/components/staff/ScheduleDialog";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

export default function Staff() {
  const [staff, setStaff] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: any; type: string }>({ open: false, user: null, type: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchStaff();
    fetchManagers();
    fetchTasks();
  }, []);

  const fetchStaff = async () => {
    try {
      const response: any = await apiClient.get('/users', { role: 'staff' });
      console.log('👥 Staff response:', response);
      
      let staffData: any[] = [];
      if (response && response.users && Array.isArray(response.users)) {
        staffData = response.users;
      } else if (response && response.data && Array.isArray(response.data.users)) {
        staffData = response.data.users;
      } else if (Array.isArray(response)) {
        staffData = response;
      } else if (response && Array.isArray(response.data)) {
        staffData = response.data;
      }
      
      setStaff(Array.isArray(staffData) ? staffData : []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error",
        description: "Failed to fetch staff",
        variant: "destructive",
      });
    }
  };

  const fetchManagers = async () => {
    try {
      const response: any = await apiClient.get('/users', { role: 'manager' });
      console.log('👨‍💼 Managers response:', response);
      
      let managersData: any[] = [];
      if (response && response.users && Array.isArray(response.users)) {
        managersData = response.users;
      } else if (response && response.data && Array.isArray(response.data.users)) {
        managersData = response.data.users;
      } else if (Array.isArray(response)) {
        managersData = response;
      } else if (response && Array.isArray(response.data)) {
        managersData = response.data;
      }
      
      setManagers(Array.isArray(managersData) ? managersData : []);
    } catch (error) {
      console.error('Error fetching managers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch managers",
        variant: "destructive",
      });
    }
  };

  const fetchTasks = async () => {
    try {
      const response: any = await apiClient.getTasks();
      console.log('📋 Tasks response:', response);
      
      let tasksData = [];
      if (response && response.data && Array.isArray(response.data)) {
        tasksData = response.data;
      } else if (Array.isArray(response)) {
        tasksData = response;
      }
      
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
    }
  };

  const filteredStaff = staff.filter(member => {
    try {
      const name = member?.fullName || member?.name || '';
      const position = member?.role || '';
      const searchTermLower = searchTerm.toLowerCase();
      
      if (!name) return false;
      
      if (searchTermLower) {
        return (typeof name === 'string' && name.toLowerCase().includes(searchTermLower)) ||
               (typeof position === 'string' && position.toLowerCase().includes(searchTermLower));
      }
      
      return true;
    } catch (error) {
      console.error('Error filtering staff member:', error, member);
      return false;
    }
  });

  const filteredManagers = managers.filter(member => {
    try {
      const name = member?.fullName || member?.name || '';
      const position = member?.role || '';
      const searchTermLower = searchTerm.toLowerCase();
      
      if (!name) return false;
      
      if (searchTermLower) {
        return (typeof name === 'string' && name.toLowerCase().includes(searchTermLower)) ||
               (typeof position === 'string' && position.toLowerCase().includes(searchTermLower));
      }
      
      return true;
    } catch (error) {
      console.error('Error filtering manager:', error, member);
      return false;
    }
  });

  const filteredTasks = tasks.filter(task => {
    try {
      const title = task?.title || '';
      const assignedStaff = task?.assignedTo;
      let staffName = '';
      
      if (assignedStaff) {
        if (typeof assignedStaff === 'string') {
          staffName = assignedStaff;
        } else if (assignedStaff?.fullName) {
          staffName = assignedStaff.fullName;
        } else if (assignedStaff?.name) {
          staffName = assignedStaff.name;
        }
      }
      
      const jobTitle = task?.jobId?.title || '';
      const searchTermLower = searchTerm.toLowerCase();
      
      return title.toLowerCase().includes(searchTermLower) ||
             staffName.toLowerCase().includes(searchTermLower) ||
             jobTitle.toLowerCase().includes(searchTermLower);
    } catch (error) {
      console.error('Error filtering task:', error, task);
      return false;
    }
  });
  
  const completedTasks = tasks.filter(task => task.status === "completed").length;
  const overdueTasks = tasks.filter(task => {
    if (!task.due_date || task.status === "completed") return false;
    const dueDate = new Date(task.due_date);
    const now = new Date();
    return dueDate < now;
  }).length;
  const activeStaff = staff.filter(member => member?.isActive === true).length;
  const activeManagers = managers.filter(member => member?.isActive === true).length;

  const handleScheduleClick = (staffMember: any) => {
    const formattedStaff = {
      id: staffMember._id || staffMember.id,
      name: staffMember.fullName || staffMember.name || 'Unknown Staff',
      role: staffMember.role || 'Staff',
      department: staffMember.department || 'General'
    };
    setSelectedStaff(formattedStaff);
    setShowScheduleDialog(true);
  };

  const handleEditTask = (task: any) => {
    console.log('🔧 Editing task:', task);
    setSelectedTask(task);
    setShowEditTaskDialog(true);
  };

  const handleComment = (task: any) => {
    console.log('💬 Adding comment to task:', task);
    setSelectedTask(task);
    setShowCommentDialog(true);
  };

  const handleComplete = async (task: any) => {
    console.log('✅ Completing task:', task);
    try {
      await apiClient.updateTaskStatus(task._id || task.id, 'completed');
      toast({
        title: "Task Completed",
        description: "Task has been marked as completed",
      });
      fetchTasks();
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to complete task",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (user: any, type: string) => {
    setDeleteDialog({ open: true, user, type });
  };

  const handleDeleteConfirm = async () => {
    try {
      await apiClient.deleteUser(deleteDialog.user._id || deleteDialog.user.id);
      toast({
        title: "User Deleted",
        description: `${deleteDialog.type} has been deleted successfully`,
      });
      
      if (deleteDialog.type === 'Manager') {
        fetchManagers();
      } else {
        fetchStaff();
      }
      
      setDeleteDialog({ open: false, user: null, type: '' });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff & Task Management</h1>
          <p className="text-muted-foreground">Manage team members, edit credentials, and assign tasks</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowCreateTaskDialog(true)} variant="gradient" size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStaff}</div>
            <p className="text-xs text-muted-foreground">team members</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Active Managers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeManagers}</div>
            <p className="text-xs text-muted-foreground">managers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">tasks finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground">need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search staff, managers or tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="managers">Managers</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="staff" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.map((member) => (
              <StaffCard 
                key={member._id || member.id}  
                staff={{
                  id: member._id || member.id,
                  name: member.fullName || member.name || 'Unknown Staff',
                  role: member.role || 'Staff',
                  department: member.department || 'General',
                  email: member.email || 'Not provided',
                  phone: member.phone || '',
                  fullName: member.fullName,
                  isActive: member.isActive,
                  companyName: member.companyName,
                  dataScope: member.dataScope,
                  permissions: member.permissions,
                  avatar: member.avatar,
                  lastLogin: member.lastLogin,
                  createdAt: member.createdAt,
                  updatedAt: member.updatedAt,
                  activeTasks: tasks.filter(task => {
                    const assignedTo = task.assignedTo;
                    if (typeof assignedTo === 'string') {
                      return assignedTo === (member._id || member.id) && task.status !== 'completed';
                    } else if (assignedTo?._id) {
                      return assignedTo._id === (member._id || member.id) && task.status !== 'completed';
                    }
                    return false;
                  }).length,
                  completedTasks: tasks.filter(task => {
                    const assignedTo = task.assignedTo;
                    if (typeof assignedTo === 'string') {
                      return assignedTo === (member._id || member.id) && task.status === 'completed';
                    } else if (assignedTo?._id) {
                      return assignedTo._id === (member._id || member.id) && task.status === 'completed';
                    }
                    return false;
                  }).length,
                  status: member.isActive ? 'active' : 'inactive'
                }}
                onSchedule={() => handleScheduleClick(member)}
                onStaffUpdated={fetchStaff}
                onDelete={() => handleDeleteClick(member, 'Staff')}
              />
            ))}
          </div>
          {filteredStaff.length === 0 && (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No staff found</h3>
              <p className="text-muted-foreground">No staff members match your search criteria.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="managers" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredManagers.map((member) => (
              <StaffCard 
                key={member._id || member.id}  
                staff={{
                  id: member._id || member.id,
                  name: member.fullName || member.name || 'Unknown Manager',
                  role: member.role || 'Manager',
                  department: member.department || 'Management',
                  email: member.email || 'Not provided',
                  phone: member.phone || '',
                  fullName: member.fullName,
                  isActive: member.isActive,
                  companyName: member.companyName,
                  dataScope: member.dataScope,
                  permissions: member.permissions,
                  avatar: member.avatar,
                  lastLogin: member.lastLogin,
                  createdAt: member.createdAt,
                  updatedAt: member.updatedAt,
                  activeTasks: tasks.filter(task => {
                    const assignedTo = task.assignedTo;
                    if (typeof assignedTo === 'string') {
                      return assignedTo === (member._id || member.id) && task.status !== 'completed';
                    } else if (assignedTo?._id) {
                      return assignedTo._id === (member._id || member.id) && task.status !== 'completed';
                    }
                    return false;
                  }).length,
                  completedTasks: tasks.filter(task => {
                    const assignedTo = task.assignedTo;
                    if (typeof assignedTo === 'string') {
                      return assignedTo === (member._id || member.id) && task.status === 'completed';
                    } else if (assignedTo?._id) {
                      return assignedTo._id === (member._id || member.id) && task.status === 'completed';
                    }
                    return false;
                  }).length,
                  status: member.isActive ? 'active' : 'inactive'
                }}
                onSchedule={() => handleScheduleClick(member)}
                onStaffUpdated={fetchManagers}
                onDelete={() => handleDeleteClick(member, 'Manager')}
              />
            ))}
          </div>
          {filteredManagers.length === 0 && (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No managers found</h3>
              <p className="text-muted-foreground">No managers match your search criteria.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {filteredTasks.map((task) => (
            <TaskCard key={task._id || task.id} task={task} onEdit={handleEditTask} onComment={handleComment} onComplete={handleComplete} />
          ))}
          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground">No tasks match your search criteria.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialog.type}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteDialog.user?.fullName || deleteDialog.user?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateTaskDialog
        open={showCreateTaskDialog}
        onOpenChange={setShowCreateTaskDialog}
        onTaskCreated={fetchTasks}
      />

      <EditTaskDialog
        open={showEditTaskDialog}
        onOpenChange={setShowEditTaskDialog}
        task={selectedTask}
        onTaskUpdated={fetchTasks}
      />

      <CommentDialog
        open={showCommentDialog}
        onOpenChange={setShowCommentDialog}
        task={selectedTask}
        onCommentAdded={fetchTasks}
      />

      <ScheduleDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        staff={selectedStaff || {
          id: '',
          name: '',
          role: '',
          department: ''
        }}
        onScheduleSaved={() => {
          fetchStaff();
        }}
      />
    </div>
  );
}
