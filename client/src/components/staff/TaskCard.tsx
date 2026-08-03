import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, User, AlertTriangle, CheckCircle, Edit, MessageSquare } from "lucide-react";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    jobId: string | { _id: string; title: string; status: string };
    assignedTo: string | { _id: string; fullName: string; email: string; role: string; department: string };
    priority: string;
    status: string;
    dueDate: string;
    description: string;
    attachments: any[];
    comments?: any[];
  };
  onEdit?: (task: any) => void;
  onComment?: (task: any) => void;
  onComplete?: (task: any) => void;
}

export function TaskCard({ task, onComment, onComplete, onEdit }: TaskCardProps) {
  // Helper functions to safely extract values from objects
  const getJobInfo = () => {
    if (typeof task.jobId === 'string') {
      return { id: task.jobId, title: 'Unknown Job' };
    }
    return {
      id: task.jobId?._id || task.jobId?.id || 'Unknown',
      title: task.jobId?.title || 'Unknown Job'
    };
  };

  const getAssignedStaffInfo = () => {
    console.log('🔍 TaskCard - assignedTo data:', task.assignedTo);
    
    if (typeof task.assignedTo === 'string') {
      return { name: task.assignedTo, position: 'Staff' };
    }
    return {
      name: task.assignedTo?.fullName || 'Unassigned',
      position: task.assignedTo?.role || 'Staff'
    };
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "warning";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "success";
      case "in-progress": return "secondary";
      case "pending": return "outline";
      case "overdue": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-3 w-3" />;
      case "overdue": return <AlertTriangle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const isOverdue = () => {
    if (!task.dueDate || task.dueDate === 'No due date' || task.dueDate === 'Invalid date') {
      return false;
    }
    const dueDate = new Date(task.dueDate);
    if (isNaN(dueDate.getTime())) {
      return false;
    }
    return dueDate < new Date() && task.status !== "completed";
  };

  const formatDueDate = () => {
    if (!task.dueDate || task.dueDate === 'No due date' || task.dueDate === 'Invalid date') {
      return 'No due date';
    }
    const dueDate = new Date(task.dueDate);
    if (isNaN(dueDate.getTime())) {
      return 'Invalid date';
    }
    return dueDate.toLocaleDateString();
  };

  const getDaysUntilDue = () => {
    if (!task.dueDate || task.dueDate === 'No due date' || task.dueDate === 'Invalid date') {
      return null;
    }
    const dueDate = new Date(task.dueDate);
    if (isNaN(dueDate.getTime())) {
      return null;
    }
    return Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <Card className={isOverdue() ? "border-destructive/50" : ""}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h3 className="font-semibold">{task.title}</h3>
              <p className="text-sm text-muted-foreground">Job: {getJobInfo().title}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getPriorityVariant(task.priority)}>
              {task.priority}
            </Badge>
            <Badge variant={getStatusVariant(task.status)} className="gap-1">
              {getStatusIcon(task.status)}
              {task.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{task.description}</p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{getAssignedStaffInfo().name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Due: {formatDueDate()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            {isOverdue() ? "Task is overdue" : (() => {
              const days = getDaysUntilDue();
              return days !== null ? `Due in ${days} days` : 'No due date';
            })()}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => onComment?.(task)}>
              <MessageSquare className="h-4 w-4" />
              Comment
              {task.comments && task.comments.length > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                  {task.comments.length}
                </span>
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onEdit?.(task)}>
              <Edit className="h-4 w-4" />
            </Button>
            {task.status !== "completed" && (
              <Button size="sm" variant="outline" className="gap-2" onClick={() => onComplete?.(task)}>
                <CheckCircle className="h-4 w-4" />
                Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}