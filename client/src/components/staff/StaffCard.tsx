import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { User, Phone, Mail, CheckCircle, Clock, Edit, Calendar, CalendarDays, Loader2, Key, Shield, Trash2, MailIcon } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { EditStaffDialog } from "./EditStaffDialog";
import { StaffCredentialsDialog } from "./StaffCredentialsDialog";
import { useToast } from "@/hooks/use-toast";

interface Schedule {
  _id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night';
}

interface StaffCardProps {
  staff: {
    id: string;
    name: string;
    role: string;
    department: string;
    email: string;
    phone: string;
    activeTasks: number;
    completedTasks: number;
    status: string;
    fullName?: string;
    isActive?: boolean;
    companyName?: string;
    dataScope?: string;
    permissions?: string[];
    avatar?: string;
    lastLogin?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  onSchedule?: () => void;
  onStaffUpdated?: () => void;
  onDelete?: () => void;
}

export function StaffCard({ staff, onSchedule, onStaffUpdated, onDelete }: StaffCardProps) {
  const [nextShift, setNextShift] = useState<any>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (staff.id) {
      fetchNextShift();
    }
  }, [staff.id]);

  const fetchNextShift = async () => {
    try {
      setIsLoadingSchedule(true);
      console.log(`📅 Fetching schedule for staff ${staff.id} (${staff.name})`);
      
      const response = await apiClient.getStaffSchedule(staff.id) as any;
      console.log(`📅 Schedule response for ${staff.name}:`, response);
      
      // Handle different response structures
      let schedules: Schedule[] = [];
      if (response && response.data && Array.isArray(response.data)) {
        schedules = response.data;
      } else if (response && Array.isArray(response)) {
        schedules = response;
      } else if (response && (response as any).success && (response as any).data && Array.isArray((response as any).data)) {
        schedules = (response as any).data;
      }
      
      console.log(`📅 Processed schedules for ${staff.name}:`, schedules);
      
      if (schedules && schedules.length > 0) {
        // Get current day and find today's schedule
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        console.log(`📅 Today is: ${today}`);
        
        const todaySchedule = schedules.find((s: Schedule) => 
          s.dayOfWeek.toLowerCase() === today.toLowerCase()
        );
        
        console.log(`📅 Today's schedule for ${staff.name}:`, todaySchedule);
        
        if (todaySchedule) {
          setNextShift(todaySchedule);
        } else {
          // If no schedule for today, get the next available shift
          console.log(`📅 No schedule for today, using first available for ${staff.name}`);
          setNextShift(schedules[0]);
        }
      } else {
        console.log(`📅 No schedules found for ${staff.name}`);
        setNextShift(null);
      }
    } catch (error) {
      console.error(`❌ Error fetching schedule for ${staff.name}:`, error);
      setNextShift(null);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const formatShiftTime = (schedule: Schedule | null) => {
    if (!schedule) return 'No schedule';
    
    const shiftNames = {
      morning: 'Morning Shift',
      afternoon: 'Afternoon Shift', 
      evening: 'Evening Shift',
      night: 'Night Shift'
    };
    
    return `${schedule.startTime} - ${schedule.endTime}`;
  };
  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{staff.name}</h3>
                <p className="text-sm text-muted-foreground">{staff.role} • {staff.department}</p>
              </div>
            </div>
            <Badge variant={staff.status === "active" ? "success" : "secondary"}>
              {staff.status}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{staff.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{staff.email}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <div>
                <p className="text-sm font-semibold">{staff.activeTasks}</p>
                <p className="text-xs text-muted-foreground">Active Tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <div>
                <p className="text-sm font-semibold">{staff.completedTasks}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">Next Shift</p>
            </div>
            {isLoadingSchedule ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                <p className="text-xs text-blue-700">Loading...</p>
              </div>
            ) : nextShift ? (
              <>
                <p className="text-xs text-blue-700">{nextShift.dayOfWeek}, {formatShiftTime(nextShift)}</p>
                <p className="text-xs text-blue-600 capitalize">{nextShift.shiftType} Shift</p>
              </>
            ) : (
              <p className="text-xs text-blue-700">No scheduled shifts</p>
            )}
          </div>

          <div className="flex items-center justify-end pt-2">
            <div className="flex items-center space-x-1">
              <Button size="sm" variant="outline" className="gap-1 text-xs px-2" onClick={onSchedule}>
                <Calendar className="h-3 w-3" />
                Schedule
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-xs px-2 bg-blue-50 text-blue-700 hover:bg-blue-100" onClick={() => setShowCredentialsDialog(true)}>
                <Key className="h-3 w-3" />
                Password
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-xs px-2" onClick={() => setShowEditDialog(true)}>
                <Edit className="h-3 w-3" />
              </Button>
              {onDelete && (
                <Button size="sm" variant="destructive" className="gap-1 text-xs px-2" onClick={onDelete}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Staff Dialog */}
      <EditStaffDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        staff={staff}
        onStaffUpdated={() => {
          onStaffUpdated?.();
          setShowEditDialog(false);
        }}
      />
      
      {/* Staff Credentials Dialog */}
      <StaffCredentialsDialog
        open={showCredentialsDialog}
        onOpenChange={setShowCredentialsDialog}
        staff={{
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          status: staff.status
        }}
        onStaffUpdated={() => {
          onStaffUpdated?.();
          setShowCredentialsDialog(false);
        }}
      />
    </>
  );
}
