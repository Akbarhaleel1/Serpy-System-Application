import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { format, isSameDay, isToday } from "date-fns";
import { toast } from "sonner";

interface CalendarViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  refreshKey?: number;
}

export function CalendarView({ selectedDate, onDateSelect, refreshKey }: CalendarViewProps) {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<{ 
    id: string; 
    _id?: string;
    title: string; 
    startDate: string; 
    endDate: string;
    description?: string; 
    priority?: string; 
    eventType?: string;
    status?: string;
  }[]>([]);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      setUpdatingTaskId(taskId);
      console.log('📅 Updating task status:', { taskId, newStatus });
      
      const response = await apiClient.updateTaskStatus(taskId, newStatus);
      console.log('📅 Update response:', response);
      
      toast.success(`Task status changed to ${newStatus}`);
      
      // Refresh events to show updated status
      fetchEvents();
    } catch (error: any) {
      console.error('📅 Error updating task status:', error);
      console.error('📅 Error response:', error.response);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          "Failed to update task status";
      
      toast.error(errorMessage);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const fetchEvents = async () => {
    if (!user || !(user as any).id) {
      console.log('📅 No user or user ID available');
      return;
    }
    
    try {
      const staffId = (user as any).id;
      console.log('📅 Fetching calendar events for staff:', staffId);
      
      // Fetch staff's assigned tasks
      const tasksResponse: any = await apiClient.get(`/tasks/by-staff/${staffId}`);
      console.log('📅 Raw tasks response:', tasksResponse);
      const tasksData = tasksResponse?.data || tasksResponse || [];
      console.log('📅 Processed tasks data:', tasksData);
      console.log('📅 Tasks count:', tasksData.length);
      
      // Convert tasks to event format
      const taskEvents = tasksData.map((task: any) => {
        console.log('🔍 Processing calendar task:', task);
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
      
      console.log('📅 All calendar events:', taskEvents);
      setEvents(taskEvents);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      // Set empty array on error to prevent showing old data
      setEvents([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, refreshKey]);

  // Auto-navigate to month with events
  useEffect(() => {
    if (events.length > 0) {
      const firstEventDate = new Date(events[0].startDate);
      const currentDate = new Date();
      
      console.log('🗓️ Auto-navigation check:', {
        firstEventDate: firstEventDate.toDateString(),
        firstEventYear: firstEventDate.getFullYear(),
        currentDate: currentDate.toDateString(),
        currentYear: currentDate.getFullYear(),
        shouldNavigate: firstEventDate.getFullYear() !== currentDate.getFullYear()
      });
      
      // If the first event is in a different year, navigate to that year
      if (firstEventDate.getFullYear() !== currentDate.getFullYear()) {
        console.log('🗓️ Auto-navigating to event year:', firstEventDate.getFullYear());
        setCurrentMonth(new Date(firstEventDate.getFullYear(), firstEventDate.getMonth(), 1));
      }
    }
  }, [events]);

  // Helper function to get events for a specific date
  const getEventsForDate = (date: Date) => {
    const filteredEvents = events.filter(event => {
      const eventStartDate = new Date(event.startDate);
      const eventEndDate = new Date(event.endDate);
      
      const isSameDayMatch = isSameDay(eventStartDate, date);
      const isInRangeMatch = date >= eventStartDate && date <= eventEndDate;
      
      if (isSameDayMatch || isInRangeMatch) {
        console.log('🎯 Event found for date:', {
          date: date.toDateString(),
          eventTitle: event.title,
          eventStart: eventStartDate.toDateString(),
          eventEnd: eventEndDate.toDateString(),
          isSameDay: isSameDayMatch,
          isInRange: isInRangeMatch
        });
      }
      
      // Check if the date falls within the event's date range
      return isSameDayMatch || isInRangeMatch;
    });
    
    if (filteredEvents.length > 0) {
      console.log(`📅 Found ${filteredEvents.length} events for ${date.toDateString()}`);
    }
    
    return filteredEvents;
  };

  // Helper function to get event badge variant based on priority and status
  const getEventBadgeVariant = (event: any) => {
    if (event.status === 'completed') return 'secondary';
    if (event.priority === 'urgent') return 'destructive';
    if (event.priority === 'high') return 'destructive';
    if (event.priority === 'medium') return 'default';
    return 'secondary';
  };

  // Helper function to get event icon based on type and status
  const getEventIcon = (event: any) => {
    if (event.status === 'completed') return <CheckCircle className="h-3 w-3" />;
    if (event.priority === 'urgent' || event.priority === 'high') return <AlertCircle className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            <span className="text-sm text-muted-foreground ml-2">
              ({events.length} tasks)
            </span>
          </CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center font-medium text-sm text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, i) => {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i - 6);
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
            const isTodayDate = isToday(date);
            const isSelected = isSameDay(date, selectedDate);
            const dayEvents = getEventsForDate(date);
            
            return (
              <TooltipProvider key={i}>
                <div
                  className={`p-2 min-h-[100px] border rounded cursor-pointer hover:bg-muted/50 transition-colors ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/20'
                  } ${isTodayDate ? 'border-primary bg-primary/5' : 'border-border'} ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => onDateSelect(date)}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                  } ${isTodayDate ? 'text-primary' : ''}`}>
                    {date.getDate()}
                  </div>
                  
                  {/* Events for this date */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <Tooltip key={event.id}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            {getEventIcon(event)}
                            <Badge 
                              variant={getEventBadgeVariant(event)}
                              className="text-xs px-1 py-0 flex-1 truncate"
                            >
                              {event.title.length > 12 ? `${event.title.substring(0, 12)}...` : event.title}
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-2">
                            <p className="font-medium">{event.title}</p>
                            {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
                            <div className="flex items-center gap-2 text-xs">
                              <span className={`px-2 py-1 rounded ${
                                event.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                event.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                event.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {event.priority}
                              </span>
                              <span className={`px-2 py-1 rounded ${
                                event.status === 'completed' ? 'bg-green-100 text-green-800' :
                                event.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {event.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Due: {format(new Date(event.startDate), 'MMM dd, h:mm a')}
                            </p>
                            {event.eventType === 'task' && event.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateTaskStatus(event._id || event.id, 'completed');
                                }}
                                disabled={updatingTaskId === (event._id || event.id)}
                              >
                                {updatingTaskId === (event._id || event.id) ? 'Updating...' : 'Mark Complete'}
                              </Button>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    
                    {/* Show "more" indicator if there are more than 3 events */}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </TooltipProvider>
            );
          })}
        </div>
        
        {/* Today's Events Summary */}
        <div className="mt-6 space-y-4">
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Today's Tasks</h3>
            {(() => {
              const todayEvents = getEventsForDate(new Date());
              console.log('📅 Today\'s events:', todayEvents);
              return todayEvents.length > 0;
            })() ? (
              <div className="space-y-2">
                {getEventsForDate(new Date()).map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    {getEventIcon(event)}
                    <div className="flex-1">
                      <p className="font-medium">{event.title}</p>
                      {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Due: {format(new Date(event.startDate), 'MMM dd, h:mm a')}</span>
                        {event.status === 'completed' && <span className="text-green-600">✓ Completed</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getEventBadgeVariant(event)} className="text-xs">
                        {event.priority}
                      </Badge>
                      {event.eventType === 'task' && event.status !== 'completed' ? (
                        <Select
                          value={event.status}
                          onValueChange={(value) => updateTaskStatus(event._id || event.id, value)}
                          disabled={updatingTaskId === (event._id || event.id)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {event.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No tasks due today</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
