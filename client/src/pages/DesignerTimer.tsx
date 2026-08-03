import { useState, useEffect } from "react";
import { Play, Pause, Square, Clock, Plus, Timer, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface TimeEntry {
  id: string;
  jobId: string;
  jobTitle: string;
  taskName: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  isActive: boolean;
  notes?: string;
}

const DesignerTimer = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchTimeEntries();
    fetchJobs();
    fetchTasks();
    fetchActiveTimer();
  }, []);

  const fetchTimeEntries = async () => {
    try {
      const response = await apiClient.getTimeEntries();
      setTimeEntries(response.data?.timeEntries || []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch time entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await apiClient.getJobs();
      setJobs(response.data?.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await apiClient.getTasks();
      setTasks(response.data?.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchActiveTimer = async () => {
    try {
      const response = await apiClient.getActiveTimer();
      if (response.data?.activeTimer) {
        setActiveTimer(response.data.activeTimer._id);
      }
    } catch (error) {
      console.error('Error fetching active timer:', error);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getCurrentDuration = (entry: TimeEntry) => {
    if (!entry.isActive || !entry.startTime) return entry.duration;
    const now = new Date();
    const diffMs = now.getTime() - new Date(entry.startTime).getTime();
    return Math.floor(diffMs / (1000 * 60)) + entry.duration;
  };

  const startTimer = async (entryId: string) => {
    try {
      await apiClient.startTimer(entryId);
      setActiveTimer(entryId);
      toast({
        title: "Timer Started",
        description: "Time tracking has begun",
      });
      fetchTimeEntries();
    } catch (error: any) {
      console.error('Error starting timer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start timer",
        variant: "destructive",
      });
    }
  };

  const pauseTimer = async (entryId: string) => {
    try {
      await apiClient.pauseTimer(entryId);
      setActiveTimer(null);
      toast({
        title: "Timer Paused",
        description: "Time tracking has been paused",
      });
      fetchTimeEntries();
    } catch (error: any) {
      console.error('Error pausing timer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to pause timer",
        variant: "destructive",
      });
    }
  };

  const stopTimer = async (entryId: string) => {
    try {
      await apiClient.stopTimer(entryId);
      setActiveTimer(null);
      toast({
        title: "Timer Stopped",
        description: "Time tracking has been completed",
      });
      fetchTimeEntries();
    } catch (error: any) {
      console.error('Error stopping timer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to stop timer",
        variant: "destructive",
      });
    }
  };

  const createNewTimer = async (data: { jobId: string; jobTitle: string; taskName: string; notes?: string }) => {
    try {
      await apiClient.createTimeEntry({
        jobId: data.jobId,
        description: `${data.jobTitle} - ${data.taskName}`,
        notes: data.notes
      });
      toast({
        title: "Timer Created",
        description: "New time entry has been created",
      });
      fetchTimeEntries();
      setIsCreateDialogOpen(false);
    } catch (error: any) {
      console.error('Error creating timer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create timer",
        variant: "destructive",
      });
    }
  };

  const todayEntries = timeEntries.filter(entry => {
    const today = new Date();
    const entryDate = new Date(entry.startTime);
    return entryDate.toDateString() === today.toDateString();
  });

  const totalTimeToday = todayEntries.reduce((total, entry) => total + getCurrentDuration(entry), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Designer Timer</h1>
          <p className="text-muted-foreground">Track time spent on design tasks</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              New Timer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Timer</DialogTitle>
              <DialogDescription>
                Start tracking time for a new design task.
              </DialogDescription>
            </DialogHeader>
            <CreateTimerForm onSubmit={createNewTimer} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalTimeToday)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeEntries.filter(e => e.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayEntries.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Timers */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {timeEntries.map((entry) => (
          <Card key={entry.id} className={`${entry.isActive ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">{entry.taskName}</CardTitle>
                  <p className="text-sm text-muted-foreground">Job: {entry.jobTitle}</p>
                </div>
                {entry.isActive && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-mono font-bold">
                  {formatDuration(getCurrentDuration(entry))}
                </div>
                {entry.isActive && (
                  <p className="text-sm text-muted-foreground">
                    Started at {formatTime(new Date(entry.startTime))}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-center">
                {!entry.isActive ? (
                  <Button 
                    onClick={() => startTimer(entry.id)}
                    size="sm"
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Start
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={() => pauseTimer(entry.id)}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                    <Button 
                      onClick={() => stopTimer(entry.id)}
                      size="sm"
                      variant="destructive"
                      className="gap-2"
                    >
                      <Square className="h-4 w-4" />
                      Stop
                    </Button>
                  </>
                )}
              </div>

              {entry.notes && (
                <div className="text-sm text-muted-foreground">
                  <strong>Notes:</strong> {entry.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {timeEntries.length === 0 && (
        <div className="text-center py-12">
          <Timer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No timers yet</h3>
          <p className="text-muted-foreground">Create your first timer to start tracking design time.</p>
        </div>
      )}
    </div>
  );
};

interface CreateTimerFormProps {
  onSubmit: (data: { jobId: string; jobTitle: string; taskName: string; notes?: string }) => void;
}

function CreateTimerForm({ onSubmit }: CreateTimerFormProps) {
  const [formData, setFormData] = useState({
    jobId: "",
    jobTitle: "",
    taskName: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.jobId && formData.jobTitle && formData.taskName) {
      onSubmit(formData);
      setFormData({ jobId: "", jobTitle: "", taskName: "", notes: "" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="jobId">Job ID</Label>
        <Input
          id="jobId"
          value={formData.jobId}
          onChange={(e) => setFormData(prev => ({ ...prev, jobId: e.target.value }))}
          placeholder="JOB-001"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="jobTitle">Job Title</Label>
        <Input
          id="jobTitle"
          value={formData.jobTitle}
          onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
          placeholder="Business Card Design"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="taskName">Task Name</Label>
        <Input
          id="taskName"
          value={formData.taskName}
          onChange={(e) => setFormData(prev => ({ ...prev, taskName: e.target.value }))}
          placeholder="Logo Design"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Input
          id="notes"
          value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit">Create Timer</Button>
      </div>
    </form>
  );
}

export default DesignerTimer;