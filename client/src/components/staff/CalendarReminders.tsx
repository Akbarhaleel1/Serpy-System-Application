import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  User,
  Bell,
  CalendarDays,
  Filter,
  List,
  Grid3x3
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  jobId?: string | { _id: string; title: string };
  assignedTo?: string | { _id: string; fullName: string };
}

interface CalendarRemindersProps {
  onTaskUpdate?: () => void;
}

export function CalendarReminders({ onTaskUpdate }: CalendarRemindersProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    if (!user || !(user as any).id) return;
    
    try {
      setLoading(true);
      const staffId = (user as any).id;
      const response: any = await apiClient.get(`/tasks/by-staff/${staffId}`);
      
      let tasksData: Task[] = [];
      if (response?.data) {
        tasksData = response.data;
      } else if (Array.isArray(response)) {
        tasksData = response;
      }
      
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      setUpdatingTaskId(taskId);
      await apiClient.updateTaskStatus(taskId, newStatus);
      
      toast({
        title: "Task Updated",
        description: `Task status changed to ${newStatus}`,
      });
      
      fetchTasks();
      onTaskUpdate?.();
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update task",
        variant: "destructive",
      });
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    const dueDate = new Date(task.dueDate);
    return dueDate < new Date();
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatDueTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getDaysUntilDue = (dateString: string) => {
    const dueDate = new Date(dateString);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'overdue') return isOverdue(task);
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => isOverdue(t)).length,
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Calendar & Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{taskStats.total}</div>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{taskStats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{taskStats.overdue}</div>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Calendar & Reminders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Calendar & Reminders
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground">
                {filter === 'all' ? 'No tasks assigned to you yet.' : `No ${filter} tasks found.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => {
                const overdue = isOverdue(task);
                const daysUntilDue = task.dueDate ? getDaysUntilDue(task.dueDate) : null;
                
                return (
                  <Card key={task._id} className={`border ${overdue ? 'border-red-200 bg-red-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{task.title}</h4>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                            {overdue && (
                              <Badge variant="destructive" className="animate-pulse">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                OVERDUE
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                          
                          {task.dueDate && (
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{formatDueDate(task.dueDate)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>{formatDueTime(task.dueDate)}</span>
                              </div>
                              {daysUntilDue !== null && (
                                <span className={`font-medium ${
                                  overdue ? 'text-red-600' : 
                                  daysUntilDue <= 2 ? 'text-orange-600' : 
                                  'text-muted-foreground'
                                }`}>
                                  {overdue ? `${Math.abs(daysUntilDue)} days overdue` : 
                                   daysUntilDue === 0 ? 'Due today' : 
                                   daysUntilDue === 1 ? 'Due tomorrow' : 
                                   `${daysUntilDue} days left`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {task.status !== 'completed' && (
                            <Select
                              value={task.status}
                              onValueChange={(value) => updateTaskStatus(task._id, value)}
                              disabled={updatingTaskId === task._id}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
