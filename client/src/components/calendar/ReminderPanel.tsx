import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import {
  Bell,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Package,
  CreditCard,
  FileText,
  Users,
  BarChart3,
  Settings
} from "lucide-react";
import apiClient from "@/lib/apiClient";

interface Event {
  id: string;
  title: string;
  description?: string; 
  priority?: string; 
  eventType?: string;
  status?: string;
  startDate: string;
  endDate: string;
}

export function ReminderPanel({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);

  const fetchReminders = async () => {
    if (!user || !(user as any).id) {
      console.log('🔔 No user or user ID available');
      return;
    }
    
    try {
      const staffId = (user as any).id;
      console.log('🔔 Fetching reminders for staff:', staffId);
      
      // Fetch staff's assigned tasks
      const tasksResponse: any = await apiClient.get(`/tasks/by-staff/${staffId}`);
      console.log('📋 Raw tasks response:', tasksResponse);
      const tasksData = tasksResponse?.data || tasksResponse || [];
      console.log('📋 Processed tasks data:', tasksData);
      
      // Fetch staff's schedule for today
      const scheduleResponse: any = await apiClient.getStaffSchedule(staffId);
      console.log('📅 Raw schedule response:', scheduleResponse);
      let todaySchedule = null;
      
      // Handle different response structures for schedule
      if (scheduleResponse === null || scheduleResponse === undefined) {
        console.log('📅 No schedule response');
      } else if (Array.isArray(scheduleResponse)) {
        const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = dayNames[today];
        todaySchedule = scheduleResponse.find((s: any) => s.dayOfWeek === todayName);
        console.log('📅 Today\'s schedule from array:', todaySchedule);
      } else if (scheduleResponse.data && Array.isArray(scheduleResponse.data)) {
        const today = new Date().getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = dayNames[today];
        todaySchedule = scheduleResponse.data.find((s: any) => s.dayOfWeek === todayName);
        console.log('📅 Today\'s schedule from data array:', todaySchedule);
      } else if (scheduleResponse.success && scheduleResponse.data && Array.isArray(scheduleResponse.data)) {
        const today = new Date().getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = dayNames[today];
        todaySchedule = scheduleResponse.data.find((s: any) => s.dayOfWeek === todayName);
        console.log('📅 Today\'s schedule from success response:', todaySchedule);
      }
      
      console.log('📋 Final tasks count:', tasksData.length);
      console.log('📅 Today\'s schedule found:', !!todaySchedule);
      
      // Convert tasks to event format
      const taskEvents = tasksData.map((task: any) => {
        console.log('🔍 Processing task:', task);
        return {
          id: task._id || task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          eventType: 'task',
          status: task.status,
          startDate: task.dueDate || task.createdAt || new Date().toISOString(),
          endDate: task.dueDate || task.createdAt || new Date().toISOString()
        };
      });
      
      // Convert schedule to event format
      let scheduleEvents = [];
      if (todaySchedule) {
        scheduleEvents = [{
          id: `schedule-${todaySchedule._id}`,
          title: `${todaySchedule.shiftType} Shift`,
          description: `Working hours: ${todaySchedule.startTime} - ${todaySchedule.endTime}`,
          priority: 'medium',
          eventType: 'schedule',
          status: 'scheduled',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString()
        }];
      }
      
      const allEvents = [...taskEvents, ...scheduleEvents];
      console.log('🔔 All combined events:', allEvents);
      
      // If no events were found, create a default schedule event for today
      if (allEvents.length === 0) {
        console.log('🔔 No events found, creating default schedule');
        const defaultEvent = {
          id: 'default-schedule',
          title: 'Today\'s Schedule',
          description: 'Check your tasks and schedule in the dashboard',
          priority: 'medium',
          eventType: 'schedule',
          status: 'scheduled',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString()
        };
        setEvents([defaultEvent]);
      } else {
        setEvents(allEvents);
      }
    } catch (error) {
      console.error("Error fetching reminders:", error);
      toast.error("Failed to load reminders");
    }
  };

  const markAsCompleted = async (eventId: string) => {
    try {
      // Check if this is a task (starts with task ID format) or schedule
      if (eventId.startsWith('schedule-')) {
        // Schedules can't be marked as completed
        toast.info("Schedule cannot be marked as completed");
        return;
      }
      
      console.log('🔔 Marking task as completed:', eventId);
      
      // This is a task, update its status
      const response = await apiClient.updateTaskStatus(eventId, 'completed');
      console.log('🔔 Update response:', response);
      
      toast.success("Task completed");
      fetchReminders();
    } catch (error: any) {
      console.error("🔔 Error marking task as completed:", error);
      console.error("🔔 Error response:", error.response);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          "Failed to update task";
      
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    console.log('🔔 ReminderPanel useEffect triggered:', { user: !!user, refreshKey });
    if (user) {
      fetchReminders();
    }
  }, [user, refreshKey]);

  const getIcon = (eventType: string) => {
    switch (eventType) {
      case "task": return Clock;
      case "schedule": return Calendar;
      case "deadline": return AlertTriangle;
      case "meeting": return Calendar;
      case "delivery": return AlertTriangle;
      case "reminder": return Clock;
      default: return Clock;
    }
  };

  const getVariant = (priority: string, status: string) => {
    if (status === 'completed') return "secondary";
    if (priority === "urgent" || priority === "high") return "destructive";
    if (priority === "medium") return "default";
    return "secondary";
  };

  const getTimeUntil = (date: string) => {
    const now = new Date();
    const eventDate = new Date(date);
    const diff = eventDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return "Soon";
  };

  // Filter events for today only
  const todayEvents = events.filter(event => {
    if (event.eventType === 'schedule') {
      // Always show schedule events for today
      console.log('🔔 Including schedule event:', event.title);
      return true;
    }
    
    if (event.eventType === 'task') {
      // For tasks, show them if they're assigned to the staff (regardless of due date)
      // This matches the behavior in the staff dashboard
      console.log('🔔 Including task event:', {
        title: event.title,
        startDate: event.startDate,
        status: event.status
      });
      return true; // Show all assigned tasks for today's reminders
    }
    
    console.log('🔔 Excluding event:', event.title, event.eventType);
    return false;
  });

  console.log('🔔 Today events count:', todayEvents.length);
  console.log('🔔 Current date:', new Date().toDateString());
  console.log('🔔 All events:', events.map(e => ({ title: e.title, date: new Date(e.startDate).toDateString() })));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Today's Reminders</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {todayEvents.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayEvents.length === 0 ? (
            <div className="text-center py-6">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No events scheduled for today
              </p>
            </div>
          ) : (
            todayEvents.map((event) => {
              const Icon = getIcon(event.eventType || 'other');
              const eventTime = new Date(event.startDate);
              const isOverdue = eventTime < new Date() && event.status !== 'completed';
              
              return (
                <div key={event.id} className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                  isOverdue ? 'border-red-200 bg-red-50' : 'hover:bg-muted/30'
                }`}>
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4 w-4 ${
                      event.priority === 'urgent' || event.priority === 'high' ? 'text-destructive' :
                      event.priority === 'medium' ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{event.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          {event.eventType === 'schedule' 
                            ? event.description?.split(':')[1]?.trim() || 'All day'
                            : format(eventTime, 'h:mm a')
                          }
                        </p>
                        {isOverdue && event.eventType === 'task' && (
                          <Badge variant="destructive" className="text-xs">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={getVariant(event.priority || 'medium', event.status || 'scheduled') as any} className="text-xs">
                      {event.priority || 'medium'}
                    </Badge>
                    {event.eventType === 'task' && event.status !== 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsCompleted(event.id)}
                        className="h-6 w-6 p-0 hover:bg-green-100"
                        title="Mark as completed"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Primary Actions */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={() => navigate('/jobs')}
            >
              <CheckCircle className="h-4 w-4" />
              View All Jobs
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={() => navigate('/delivery')}
            >
              <Package className="h-4 w-4" />
              Track Deliveries
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={() => navigate('/payments')}
            >
              <CreditCard className="h-4 w-4" />
              Check Payments
            </Button>
          </div>
          
          {/* Secondary Actions */}
          <div className="border-t pt-2 mt-2">
            <p className="text-xs text-muted-foreground mb-2">Quick Create</p>
            <div className="grid grid-cols-2 gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs justify-start gap-1"
                onClick={() => navigate('/jobs?action=create')}
              >
                <Plus className="h-3 w-3" />
                New Job
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs justify-start gap-1"
                onClick={() => navigate('/customers?action=create')}
              >
                <Users className="h-3 w-3" />
                New Customer
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs justify-start gap-1"
                onClick={() => navigate('/invoices?action=create')}
              >
                <FileText className="h-3 w-3" />
                New Invoice
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs justify-start gap-1"
                onClick={() => navigate('/calendar?action=create')}
              >
                <Calendar className="h-3 w-3" />
                New Event
              </Button>
            </div>
          </div>
          
          {/* System Actions */}
          <div className="border-t pt-2 mt-2">
            <p className="text-xs text-muted-foreground mb-2">System</p>
            <div className="grid grid-cols-2 gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs justify-start gap-1"
                onClick={() => navigate('/reports')}
              >
                <BarChart3 className="h-3 w-3" />
                Reports
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs justify-start gap-1"
                onClick={() => navigate('/settings')}
              >
                <Settings className="h-3 w-3" />
                Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
