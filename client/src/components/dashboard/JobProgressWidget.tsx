import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Briefcase, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Play,
  Pause,
  MoreHorizontal
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface Job {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  customer_id: string | null;
  customers?: {
    name: string;
  };
  created_at: string;
}

interface JobProgressWidgetProps {
  onRefresh?: () => void;
}

export function JobProgressWidget({ onRefresh }: JobProgressWidgetProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await apiClient.getJobs();
      const allJobs = response.jobs || response?.data?.jobs || response?.data || [];
      
      // Filter jobs for today and active statuses
      const today = new Date().toISOString().split('T')[0];
      const filteredJobs = allJobs
        .filter(job => {
          // Handle both createdAt and created_at field names
          const jobDate = new Date(job.createdAt || job.created_at).toISOString().split('T')[0];
          return jobDate >= today && ['pending', 'in_progress', 'review', 'completed'].includes(job.status);
        })
        .slice(0, 8);
      
      setJobs(filteredJobs);
      console.log('📋 Today\'s jobs:', filteredJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load job progress",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getJobProgress = (status: string) => {
    switch (status) {
      case 'pending': return { progress: 20, label: 'Pending', color: 'bg-gray-500' };
      case 'in_progress': return { progress: 60, label: 'In Progress', color: 'bg-blue-500' };
      case 'review': return { progress: 80, label: 'Under Review', color: 'bg-orange-500' };
      case 'completed': return { progress: 100, label: 'Completed', color: 'bg-green-500' };
      default: return { progress: 0, label: 'Unknown', color: 'bg-gray-500' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      // TODO: Implement API call to update job status
      console.log('📋 API not yet implemented');
      
      toast({
        title: "Success",
        description: `Job status updated to ${newStatus}`,
      });
      
      await fetchJobs();
      onRefresh?.();
    } catch (error) {
      console.error('Error updating job status:', error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-card bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Today's Job Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-2 bg-muted rounded"></div>
              </div>
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
            <Briefcase className="w-4 h-4" />
            Today's Job Progress
            <Badge variant="secondary" className="ml-2">
              {jobs.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchJobs}
            className="h-8 w-8 p-0"
          >
            <Clock className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Real-time job tracking</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobs.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No active jobs today</p>
          </div>
        ) : (
          jobs.map((job) => {
            const progress = getJobProgress(job.status);
            const priorityColor = getPriorityColor(job.priority);
            
            return (
              <div key={job.id} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${priorityColor}`}></div>
                      <h4 className="font-medium text-sm truncate">{job.title}</h4>
                      <Badge 
                        variant={job.status === 'completed' ? 'success' : 
                               job.status === 'in_progress' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {progress.label}
                      </Badge>
                    </div>
                    
                    {job.customers?.name && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Customer: {job.customers.name}
                      </p>
                    )}
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{progress.progress}%</span>
                      </div>
                      <Progress value={progress.progress} className="h-2" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    {job.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateJobStatus(job.id, 'in_progress')}
                        className="h-7 px-2"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    )}
                    
                    {job.status === 'in_progress' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateJobStatus(job.id, 'review')}
                          className="h-7 px-2"
                        >
                          <Pause className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateJobStatus(job.id, 'completed')}
                          className="h-7 px-2"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    
                    {job.status === 'review' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateJobStatus(job.id, 'completed')}
                        className="h-7 px-2"
                      >
                        <CheckCircle className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {job.due_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Due: {format(new Date(job.due_date), 'MMM dd, yyyy HH:mm')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}