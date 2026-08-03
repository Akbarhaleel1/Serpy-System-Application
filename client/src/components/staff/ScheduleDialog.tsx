import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Plus, Trash2, User, Loader2 } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: {
    id: string;
    name: string;
    role: string;
    department: string;
  };
  onScheduleSaved?: () => void;
}

interface ScheduleSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night';
}

export function ScheduleDialog({ open, onOpenChange, staff, onScheduleSaved }: ScheduleDialogProps) {
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [newSchedule, setNewSchedule] = useState<Omit<ScheduleSlot, 'id'>>({
    dayOfWeek: 'Monday',
    startTime: '09:00',
    endTime: '17:00',
    shiftType: 'morning'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load existing schedules when dialog opens
  useEffect(() => {
    if (open && staff.id) {
      loadSchedules();
    }
  }, [open, staff.id]);

  const loadSchedules = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getStaffSchedule(staff.id) as any[];
      const formattedSchedules = response.map((schedule: any) => ({
        id: schedule._id,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        shiftType: schedule.shiftType
      }));
      setSchedules(formattedSchedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast({
        title: "Error",
        description: "Failed to load existing schedules",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shiftTypes = [
    { value: 'morning', label: 'Morning (6AM-2PM)', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'afternoon', label: 'Afternoon (2PM-10PM)', color: 'bg-blue-100 text-blue-800' },
    { value: 'evening', label: 'Evening (4PM-12AM)', color: 'bg-purple-100 text-purple-800' },
    { value: 'night', label: 'Night (10PM-6AM)', color: 'bg-gray-100 text-gray-800' }
  ];

  const getShiftColor = (shiftType: string) => {
    const shift = shiftTypes.find(s => s.value === shiftType);
    return shift ? shift.color : 'bg-gray-100 text-gray-800';
  };

  const addSchedule = () => {
    const schedule: ScheduleSlot = {
      ...newSchedule,
      id: Date.now().toString()
    };
    setSchedules([...schedules, schedule]);
    setNewSchedule({
      dayOfWeek: 'Monday',
      startTime: '09:00',
      endTime: '17:00',
      shiftType: 'morning'
    });
  };

  const removeSchedule = (id: string) => {
    setSchedules(schedules.filter(schedule => schedule.id !== id));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Prepare schedules for backend (remove id for new schedules)
      const schedulesToSave = schedules.map(({ id, ...schedule }) => schedule);
      
      await apiClient.saveStaffSchedule(staff.id, schedulesToSave);
      
      toast({
        title: "Success",
        description: "Schedule saved successfully",
      });
      
      onScheduleSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Error",
        description: "Failed to save schedule",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getTotalHours = () => {
    return schedules.reduce((total, schedule) => {
      const start = new Date(`2000-01-01T${schedule.startTime}`);
      const end = new Date(`2000-01-01T${schedule.endTime}`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule for {staff.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Staff Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Staff Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {staff.name}
                </div>
                <div>
                  <span className="font-medium">Role:</span> {staff.role}
                </div>
                <div>
                  <span className="font-medium">Department:</span> {staff.department}
                </div>
                <div>
                  <span className="font-medium">Total Hours:</span> {getTotalHours().toFixed(1)}h/week
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Schedules */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-muted-foreground">Loading schedules...</span>
                </div>
              ) : schedules.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No schedules assigned</p>
              ) : (
                <div className="space-y-2">
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={getShiftColor(schedule.shiftType)}>
                          {schedule.shiftType}
                        </Badge>
                        <div className="text-sm">
                          <div className="font-medium">{schedule.dayOfWeek}</div>
                          <div className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {schedule.startTime} - {schedule.endTime}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeSchedule(schedule.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add New Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Add Schedule Slot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">Day of Week</Label>
                  <Select
                    value={newSchedule.dayOfWeek}
                    onValueChange={(value) => setNewSchedule({ ...newSchedule, dayOfWeek: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shiftType">Shift Type</Label>
                  <Select
                    value={newSchedule.shiftType}
                    onValueChange={(value: 'morning' | 'afternoon' | 'evening' | 'night') => 
                      setNewSchedule({ ...newSchedule, shiftType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shiftTypes.map((shift) => (
                        <SelectItem key={shift.value} value={shift.value}>
                          {shift.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newSchedule.startTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newSchedule.endTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                  />
                </div>
              </div>

              <Button
                onClick={addSchedule}
                className="w-full mt-4"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule Slot
              </Button>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Schedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
