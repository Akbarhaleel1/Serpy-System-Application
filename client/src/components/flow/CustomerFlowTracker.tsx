import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, ArrowRight, Clock, CheckCircle, AlertTriangle, User } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface FlowStage {
  stage: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const flowStages: FlowStage[] = [
  {
    stage: "customer_inquiry",
    label: "Customer Inquiry",
    description: "Initial customer contact and requirement discussion",
    icon: <User className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-800",
  },
  {
    stage: "job_handler_assigned",
    label: "Job Handler Assigned",
    description: "Job assigned to specific handler/operator",
    icon: <Users className="h-4 w-4" />,
    color: "bg-purple-100 text-purple-800",
  },
  {
    stage: "accountant_review",
    label: "Accountant Review",
    description: "Financial review and approval process",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "bg-orange-100 text-orange-800",
  },
  {
    stage: "job_complete",
    label: "Job Complete",
    description: "Work completed and ready for delivery",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "bg-green-100 text-green-800",
  },
  {
    stage: "product_received",
    label: "Product Received",
    description: "Customer has received the product",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "bg-green-100 text-green-800",
  },
  {
    stage: "exited",
    label: "Process Complete",
    description: "Customer flow completed successfully",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "bg-gray-100 text-gray-800",
  },
];

interface CustomerFlowTrackerProps {
  jobId?: string;
  walkInJobId?: string;
  customerId?: string;
}

export const CustomerFlowTracker = ({ jobId, walkInJobId, customerId }: CustomerFlowTrackerProps) => {
  const [flowData, setFlowData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateData, setUpdateData] = useState({
    new_stage: "",
    handler_name: "",
    stage_remarks: "",
  });

  const { toast } = useToast();

  useEffect(() => {
    if (jobId || walkInJobId) {
      fetchFlowData();
    }
  }, [jobId, walkInJobId]);

  const fetchFlowData = async () => {
    console.log('🔧 API call from', 'src/components/flow/CustomerFlowTracker.tsxjob_flow_tracking")
        ()

      if (jobId) {
        query = query;
      } else if (walkInJobId) {
        query = query;
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setFlowData(data[0]);
      }
    }

    } catch (error) {
      console.error("Error fetching flow data:", error);
    }
  };

  const getCurrentStageIndex = () => {
    if (!flowData) return 0;
    return flowStages.findIndex(stage => stage.stage === flowData.current_stage);
  };

  const getProgressPercentage = () => {
    const currentIndex = getCurrentStageIndex();
    return ((currentIndex + 1) / flowStages.length) * 100;
  };

  const handleStageUpdate = async () => {
    if (!updateData.new_stage) {
      toast({
        title: "Error",
        description: "Please select a new stage",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await apiClient.getCurrentUser();
      if (!userData.user) throw new Error("User not authenticatedjob_flow_tracking")
          .update({
            current_stage: updateData.new_stage as any,
            stage_entered_at: new Date().toISOString(),
            stage_remarks: updateData.stage_remarks,
            handler_name: updateData.handler_name,
            updated_at: new Date().toISOString(),
          })

      }

      toast({
        title: "Success",
        description: "Flow stage updated successfully",
      });

      setUpdateDialogOpen(false);
      setUpdateData({
        new_stage: "",
        handler_name: "",
        stage_remarks: "",
      });
      fetchFlowData();
    }
    }
    }

    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentStageIndex = getCurrentStageIndex();

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Customer Flow Progress
            </CardTitle>
            <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  Update Stage
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Flow Stage</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>New Stage</Label>
                    <Select 
                      value={updateData.new_stage} 
                      onValueChange={(value) => setUpdateData({...updateData, new_stage: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {flowStages.map((stage) => (
                          <SelectItem key={stage.stage} value={stage.stage}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Handler Name</Label>
                    <Input
                      value={updateData.handler_name}
                      onChange={(e) => setUpdateData({...updateData, handler_name: e.target.value})}
                      placeholder="Enter handler name"
                    />
                  </div>

                  <div>
                    <Label>Remarks</Label>
                    <Textarea
                      value={updateData.stage_remarks}
                      onChange={(e) => setUpdateData({...updateData, stage_remarks: e.target.value})}
                      placeholder="Add any remarks for this stage..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleStageUpdate} disabled={loading}>
                      {loading ? "Updating..." : "Update Stage"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600">
                {currentStageIndex + 1} of {flowStages.length} stages
              </span>
            </div>
            <Progress value={getProgressPercentage()} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Current Status */}
      {flowData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className={flowStages[currentStageIndex]?.color || "bg-gray-100 text-gray-800"}>
                  {flowStages[currentStageIndex]?.icon}
                  <span className="ml-2">{flowStages[currentStageIndex]?.label}</span>
                </Badge>
                <span className="text-sm text-gray-600">
                  Since {new Date(flowData.stage_entered_at).toLocaleDateString()}
                </span>
              </div>

              {flowData.handler_name && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Handler</Label>
                  <p className="font-semibold">{flowData.handler_name}</p>
                </div>
              )}

              {flowData.stage_remarks && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Remarks</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded">{flowData.stage_remarks}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flow Stages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Flow Stages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {flowStages.map((stage, index) => (
              <div key={stage.stage} className="relative">
                <div className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  index === currentStageIndex 
                    ? "bg-blue-50 border-2 border-blue-200" 
                    : index < currentStageIndex 
                    ? "bg-green-50 border border-green-200"
                    : "bg-gray-50 border border-gray-200"
                }`}>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    index === currentStageIndex
                      ? "bg-blue-500 text-white"
                      : index < currentStageIndex
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}>
                    {index < currentStageIndex ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : index === currentStageIndex ? (
                      <Clock className="h-5 w-5" />
                    ) : (
                      stage.icon
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold">{stage.label}</h3>
                    <p className="text-sm text-gray-600">{stage.description}</p>
                  </div>

                  {index === currentStageIndex && (
                    <Badge variant="default">Current</Badge>
                  )}
                  {index < currentStageIndex && (
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Completed
                    </Badge>
                  )}
                </div>

                {index < flowStages.length - 1 && (
                  <div className="flex justify-center">
                    <div className={`w-px h-6 ${
                      index < currentStageIndex ? "bg-green-300" : "bg-gray-300"
                    }`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};