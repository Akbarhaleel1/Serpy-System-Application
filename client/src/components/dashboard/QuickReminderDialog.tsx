import apiClient from "@/lib/apiClient";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Clock, Plus, Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { useToast } from "@/hooks/use-toast";

interface QuickReminderDialogProps {
  onReminderCreated?: () => void;
}

export function QuickReminderDialog({ onReminderCreated }: QuickReminderDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<unknown[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reminder_date: "",
    priority: "medium",
    category: "general",
    assignedTo: "",
    reminder_type: "task"
  });
  const { toast } = useToast();

  // Fetch staff list when dialog opens
  useEffect(() => {
    if (open) {
      fetchStaffList();
    }
  }, [open]);

  const fetchStaffList = async () => {
    try {
      const response = await apiClient.getUsers();
      const staff = response?.data?.users || response?.users || response?.data || [];
      const staffOnly = staff.filter((u: any) => u.role === 'staff');
      setStaffList(staffOnly);
      console.log('👥 Staff list fetched:', staffOnly);
    } catch (error) {
      console.error('Error fetching staff list:', error);
      toast({
        title: "Error",
        description: "Failed to fetch staff list",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create reminder/task with staff assignment
      const reminderData = {
        title: formData.title,
        description: formData.description,
        reminder_date: formData.reminder_date,
        priority: formData.priority,
        category: formData.category,
        assignedTo: formData.assignedTo || undefined,
        reminder_type: formData.reminder_type
      };

      console.log('📝 Creating reminder:', reminderData);
      
      // Call API to create reminder/task
      const response = await apiClient.createTask(reminderData);
      console.log('📝 Create reminder response:', response);

      toast({
        title: "Success",
        description: "Reminder created successfully",
      });

      setFormData({
        title: "",
        description: "",
        reminder_date: "",
        priority: "medium",
        category: "general",
        assignedTo: "",
        reminder_type: "task"
      });
      
      setOpen(false);
      onReminderCreated?.();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: "Error",
        description: "Failed to create reminder",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getQuickDateTime = (option: string) => {
    const now = new Date();
    switch (option) {
      case 'in1hour':
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
      case 'in4hours':
        return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16);
      case 'tomorrow':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow.toISOString().slice(0, 16);
      case 'nextweek':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(9, 0, 0, 0);
        return nextWeek.toISOString().slice(0, 16);
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-white" size="sm">
          <Plus className="w-4 h-4" />
          Quick Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Create Quick Reminder
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Staff Assignment */}
          <div>
            <Label htmlFor="assignedTo">Assign To Staff</Label>
            <Select
              value={formData.assignedTo}
              onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select staff member (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No assignment</SelectItem>
                {staffList.map((staff: any) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Reminder Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="What do you need to remember?"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Quick Time Options</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "In 1 hour", value: "in1hour" },
                { label: "In 4 hours", value: "in4hours" },
                { label: "Tomorrow 9 AM", value: "tomorrow" },
                { label: "Next week", value: "nextweek" }
              ].map((option) => (
                <Badge
                  key={option.value}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    reminder_date: getQuickDateTime(option.value) 
                  }))}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="reminder_date">Date & Time</Label>
            <Input
              id="reminder_date"
              type="datetime-local"
              value={formData.reminder_date}
              onChange={(e) => setFormData(prev => ({ ...prev, reminder_date: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Reminder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}