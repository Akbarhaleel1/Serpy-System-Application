import { useState, useEffect } from "react";
import { format, isAfter, isBefore, addHours } from "date-fns";
import { Clock, AlertTriangle, CheckCircle, User, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface Task {
  _id: string;
  id?: string;
  title: string;
  status: string;
  description?: string;
  priority: string;
  due_date?: string;
  createdAt?: string;
  updatedAt?: string;
  assignedTo?: any;
  jobs?: any;
  staff?: any;
}

interface TaskWidgetProps {
  onRefresh?: () => void;
}

export function TaskWidget({ onRefresh }: TaskWidgetProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await apiClient.getTasks();
      console.log('📋 Tasks response:', response);
      setTasks(response as Task[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isTaskCompleted = (task: Task) => {
    return task.status === 'completed';
  };

  const getTaskUrgency = (dueDate: string | null, priority: string) => {
    if (!dueDate) return { color: "bg-slate-500", label: "No deadline" };
    
    const due = new Date(dueDate);
    const now = new Date();
    const urgent = addHours(now, 4); // Next 4 hours
    const soon = addHours(now, 24); // Next 24 hours

    if (isBefore(due, now)) {
      return { color: "bg-red-500", label: "Overdue" };
    } else if (isBefore(due, urgent)) {
      return { color: "bg-red-400", label: "Urgent" };
    } else if (isBefore(due, soon)) {
      return { color: "bg-yellow-500", label: "Due soon" };
    } else if (priority === 'high') {
      return { color: "bg-orange-500", label: "High priority" };
    } else {
      return { color: "bg-green-500", label: "On track" };
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await apiClient.updateTaskStatus(taskId, newStatus);
      
      toast({
        title: "Success",
        description: `Task marked as ${newStatus}`,
      });
      
      await fetchTasks();
      onRefresh?.();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-card bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Active Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-card bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Active Tasks
            <Badge variant="secondary" className="ml-2">
              {tasks.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTasks}
            className="h-8 w-8 p-0"
          >
            <Clock className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Real-time task monitoring</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All tasks completed!</p>
          </div>
        ) : (
          tasks.map((task) => {
            const urgency = getTaskUrgency(task.due_date, task.priority);
            
            return (
              <div key={task._id || task.id} className={`border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow ${
                isTaskCompleted(task) ? 'bg-green-50 border-green-200' : ''
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isTaskCompleted(task) ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <div className={`w-2 h-2 rounded-full ${urgency.color}`}></div>
                      )}
                      <h4 className={`font-medium text-sm truncate ${
                        isTaskCompleted(task) ? 'text-green-700 line-through' : ''
                      }`}>{task.title}</h4>
                      {isTaskCompleted(task) && (
                        <Badge variant="default" className="ml-2 bg-green-100 text-green-800 text-xs">
                          Completed
                        </Badge>
                      )}
                    </div>
                    
                    {task.jobs?.title && (
                      <p className="text-xs text-muted-foreground mb-1">
                        Job: {task.jobs.title}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {task.staff?.name && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.staff.name}
                        </div>
                      )}
                      
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(task.due_date), 'MMM dd, HH:mm')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 ml-2">
                    <Badge 
                      variant={isTaskCompleted(task) ? 'default' : 
                              urgency.color.includes('red') ? 'destructive' : 
                              urgency.color.includes('yellow') ? 'warning' : 'default'}
                      className={`text-xs ${
                        isTaskCompleted(task) ? 'bg-green-100 text-green-800' : ''
                      }`}
                    >
                      {isTaskCompleted(task) ? 'Completed' : urgency.label}
                    </Badge>
                    
                    {!isTaskCompleted(task) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateTaskStatus(task._id || task.id, 'completed')}
                        className="h-6 text-xs"
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}