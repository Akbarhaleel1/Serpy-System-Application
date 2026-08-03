import { useState } from "react";
import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarView } from "@/components/calendar/CalendarView";
import { ReminderPanel } from "@/components/calendar/ReminderPanel";

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  console.log('📅 CalendarPage rendered with refreshKey:', refreshKey);

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar & Reminders</h1>
          <p className="text-muted-foreground">Centralized view of tasks, deliveries, and deadlines</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <CalendarView 
            selectedDate={selectedDate} 
            onDateSelect={setSelectedDate}
            refreshKey={refreshKey}
          />
        </div>
        <div className="lg:col-span-1">
          <ReminderPanel refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}