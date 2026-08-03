import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Play, Pause, CheckCircle, AlertTriangle, User } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import { format } from "date-fns";

interface JobQueueItem {
  job_id: string;
  customer_name: string;
  job_title: string;
  priority: string;
  status: string;
  assigned_operator: string | null;
  estimated_duration: number;
  actual_duration: number | null;
  queue_position: number;
  started_at: string | null;
  estimated_completion: string | null;
  print_details: any;
}

export const JobQueueBoard: React.FC = () => {
  const [queueItems, setQueueItems] = useState<JobQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [operators] = useState(["Operator 1", "Operator 2", "Operator 3", "Auto Assign"]);

  const fetchJobQueue = async () => {
    console.log('🔧 API call from', 'src/components/walkIn/JobQueueBoard.tsx');
    try {
      const user = await apiClient.getCurrentUser();
      if (!user) return;

      // TODO: Implement job queue API
      console.log('📋 Job queue API not yet implemented - using placeholder data');
      setQueueItems([]);
    } catch (error) {
      console.error("Error fetching job queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: string, operatorName?: string) => {
    try {
      // TODO: Implement job status update API
      console.log('📋 Job status update API not yet implemented');

      const result = data as any;
      if (result?.success) {
        toast.success(`Job status updated to ${newStatus}`);
        if (result.message_sent) {
          toast.info("WhatsApp notification sent to customer");
        }
        fetchJobQueue();
      }
    } catch (error) {
      console.error("Error updating job status:", error);
      toast.error("Failed to update job status");
    }
  };

  const assignOperator = async (jobId: string, operator: string) => {
    await updateJobStatus(jobId, "queued", operator);
  };

  const startJob = async (jobId: string) => {
    await updateJobStatus(jobId, "in_progress");
  };

  const pauseJob = async (jobId: string) => {
    await updateJobStatus(jobId, "hold");
  };

  const completeJob = async (jobId: string) => {
    await updateJobStatus(jobId, "completed");
  };

  useEffect(() => {
    fetchJobQueue();
    
    // TODO: Implement real-time updates
    console.log('📋 Real-time updates not yet implemented');
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "queued": return "bg-blue-500";
      case "in_progress": return "bg-green-500";
      case "hold": return "bg-yellow-500";
      case "completed": return "bg-gray-500";
      default: return "bg-gray-400";
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority === "Urgent" ? "destructive" : "secondary";
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading job queue...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Active Job Queue</h2>
        <Button onClick={fetchJobQueue} variant="outline">
          Refresh Queue
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {queueItems.map((item) => (
          <Card key={item.job_id} className="relative">
            <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${getStatusColor(item.status)}`} />
            
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg truncate">{item.job_title}</CardTitle>
                <Badge variant={getPriorityColor(item.priority)}>
                  {item.priority}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {item.customer_name}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Print Details */}
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span>{item.print_details.print_size}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span>{item.print_details.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Color:</span>
                  <span>{item.print_details.color_type}</span>
                </div>
                {item.print_details.paper_type && (
                  <div className="flex justify-between">
                    <span>Paper:</span>
                    <span>{item.print_details.paper_type}</span>
                  </div>
                )}
              </div>

              {/* Operator Assignment */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Operator:</label>
                <Select
                  value={item.assigned_operator || ""}
                  onValueChange={(value) => assignOperator(item.job_id, value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Assign operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op} value={op}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {op}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Information */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Est: {formatDuration(item.estimated_duration)}
                </div>
                {item.actual_duration && (
                  <div className="flex items-center gap-1">
                    Actual: {formatDuration(item.actual_duration)}
                  </div>
                )}
              </div>

              {item.started_at && (
                <div className="text-xs text-muted-foreground">
                  Started: {format(new Date(item.started_at), "HH:mm")}
                </div>
              )}

              {item.estimated_completion && (
                <div className="text-xs text-muted-foreground">
                  Est. Completion: {format(new Date(item.estimated_completion), "HH:mm")}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {item.status === "queued" && (
                  <Button
                    size="sm"
                    onClick={() => startJob(item.job_id)}
                    className="flex-1"
                    disabled={!item.assigned_operator}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Start
                  </Button>
                )}

                {item.status === "in_progress" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => pauseJob(item.job_id)}
                      className="flex-1"
                    >
                      <Pause className="h-3 w-3 mr-1" />
                      Hold
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => completeJob(item.job_id)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Button>
                  </>
                )}

                {item.status === "hold" && (
                  <Button
                    size="sm"
                    onClick={() => startJob(item.job_id)}
                    className="flex-1"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Resume
                  </Button>
                )}

                {item.status === "completed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {/* Navigate to billing */}}
                    className="flex-1"
                  >
                    Send to Billing
                  </Button>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex justify-center">
                <Badge
                  variant="outline"
                  className={`${getStatusColor(item.status)} text-white border-0`}
                >
                  {item.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {queueItems.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No active jobs in queue</h3>
          <p className="text-muted-foreground">
            Create a new walk-in job to get started.
          </p>
        </div>
      )}
    </div>
  );
};