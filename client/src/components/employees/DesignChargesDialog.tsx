import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface DesignChargesDialogProps {
  children: React.ReactNode;
  onChargeAdded?: () => void;
}

export const DesignChargesDialog = ({ children, onChargeAdded }: DesignChargesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [walkInJobs, setWalkInJobs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    job_id: "",
    walk_in_job_id: "",
    employee_name: "",
    design_description: "",
    hours_worked: 0,
    hourly_rate: 50, // Default hourly rate
    work_date: new Date(),
  });

  const { toast } = useToast();

  const fetchJobs = async () => {
    console.log('🔧 API call from', 'src/components/employees/DesignChargesDialog.tsxjobs")
        ()
        
        
        ()
        
        
        ()
        
        ;

      if (jobsData) setJobs(jobsData);
      if (walkInData) setWalkInJobs(walkInData);
      if (staffData) setEmployees(staffData);
    }
    }
    }

    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchJobs();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee_name || (!formData.job_id && !formData.walk_in_job_id)) {
      toast({
        title: "Error",
        description: "Please select an employee and a job",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await apiClient.getCurrentUser();
      if (!userData.user) throw new Error("User not authenticated");

      const chargeData = {
        user_id: userData.user.id,
        job_id: formData.job_id || null,
        walk_in_job_id: formData.walk_in_job_id || null,
        employee_name: formData.employee_name,
        design_description: formData.design_description,
        hours_worked: formData.hours_worked,
        hourly_rate: formData.hourly_rate,
        work_date: format(formData.work_date, 'yyyy-MM-ddemployee_design_charges")

      toast({
        title: "Success",
        description: "Design charge recorded successfully",
      });

      setOpen(false);
      setFormData({
        job_id: "",
        walk_in_job_id: "",
        employee_name: "",
        design_description: "",
        hours_worked: 0,
        hourly_rate: 50,
        work_date: new Date(),
      });
      onChargeAdded?.();
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

  const totalCharge = formData.hours_worked * formData.hourly_rate;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Record Design Charges
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Selection */}
          <div>
            <Label htmlFor="employee">Employee *</Label>
            {employees.length > 0 ? (
              <Select value={formData.employee_name} onValueChange={(value) => setFormData({...formData, employee_name: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name} - {employee.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={formData.employee_name}
                onChange={(e) => setFormData({...formData, employee_name: e.target.value})}
                placeholder="Enter employee name"
                required
              />
            )}
          </div>

          {/* Job Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="job">Regular Job</Label>
              <Select 
                value={formData.job_id} 
                onValueChange={(value) => setFormData({
                  ...formData, 
                  job_id: value,
                  walk_in_job_id: value ? "" : formData.walk_in_job_id
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select regular job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} ({job.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="walk_in_job">Walk-in Job</Label>
              <Select 
                value={formData.walk_in_job_id} 
                onValueChange={(value) => setFormData({
                  ...formData, 
                  walk_in_job_id: value,
                  job_id: value ? "" : formData.job_id
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select walk-in job" />
                </SelectTrigger>
                <SelectContent>
                  {walkInJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.job_title} ({job.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Design Description */}
          <div>
            <Label htmlFor="description">Design Description</Label>
            <Textarea
              value={formData.design_description}
              onChange={(e) => setFormData({...formData, design_description: e.target.value})}
              placeholder="Describe the design work done..."
              rows={3}
            />
          </div>

          {/* Time and Rate */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="hours">Hours Worked *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.hours_worked}
                  onChange={(e) => setFormData({...formData, hours_worked: parseFloat(e.target.value) || 0})}
                  className="pl-10"
                  placeholder="0.0"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="rate">Hourly Rate (₹) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value) || 0})}
                  className="pl-10"
                  placeholder="50.00"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="total">Total Charge</Label>
              <div className="relative">
                <Input
                  value={`₹${totalCharge.toFixed(2)}`}
                  disabled
                  className="bg-gray-50 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Work Date */}
          <div>
            <Label>Work Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.work_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.work_date ? format(formData.work_date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.work_date}
                  onSelect={(date) => date && setFormData({...formData, work_date: date})}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Summary Card */}
          {totalCharge > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg text-blue-800">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Employee:</span>
                    <span className="font-semibold">{formData.employee_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hours:</span>
                    <span className="font-semibold">{formData.hours_worked} hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate:</span>
                    <span className="font-semibold">₹{formData.hourly_rate}/hr</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-lg font-semibold">Total:</span>
                    <Badge variant="default" className="text-lg px-3 py-1">
                      ₹{totalCharge.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || totalCharge === 0}>
              {loading ? "Recording..." : "Record Charge"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};