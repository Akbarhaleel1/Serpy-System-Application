import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  DollarSign,
  Briefcase,
  TrendingUp,
  Calendar,
  CalendarDays,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  User
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateJobDialog } from "@/components/jobs/CreateJobDialog";
import { CreateQuotationDialog } from "@/components/quotations/CreateQuotationDialog";
import { CalendarReminders } from "@/components/staff/CalendarReminders";
import { formatCurrency } from "@/lib/utils";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface Schedule {
  _id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night';
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  jobTitle?: string;
}

export function StaffDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [totalDesignCharge, setTotalDesignCharge] = useState(0);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<unknown[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'monthly' | 'yearly' | 'all'>('all');
  
  // New state for schedule and tasks
  const [todaySchedule, setTodaySchedule] = useState<Schedule | null>(null);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Debug: Check if component is mounting
  console.log('🎯 StaffDashboard component is mounting!');
  console.log('🎯 User data:', user);
  console.log('🎯 User ID:', (user as any)?.id || (user as any)?._id);
  console.log('🎯 User role:', user?.role);

  const fetchStaffStats = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching staff revenue for period:', selectedPeriod);

      // Fetch revenue/earnings from accounts ledger
      const response = await apiClient.get(`/accounts/ledger?period=${selectedPeriod}`) as any;
      console.log('📊 API response:', response);

      // Handle response - calculate net revenue from ledger data
      const ledgerData = response?.data || response || [];
      console.log('📊 Ledger data:', ledgerData);
      
      // Calculate total income and expenses from ledger
      let totalIncome = 0;
      let totalExpenses = 0;
      
      if (Array.isArray(ledgerData)) {
        totalIncome = ledgerData
          .filter((entry: any) => entry.type === 'income' || entry.amount > 0)
          .reduce((sum: number, entry: any) => sum + Math.abs(entry.amount || 0), 0);
          
        totalExpenses = ledgerData
          .filter((entry: any) => entry.type === 'expense' || entry.amount < 0)
          .reduce((sum: number, entry: any) => sum + Math.abs(entry.amount || 0), 0);
      }
      
      const netRevenue = totalIncome - totalExpenses;
      console.log('📊 Calculated - Income:', totalIncome, 'Expenses:', totalExpenses, 'Net Revenue:', netRevenue);
      
      setTotalDesignCharge(netRevenue);
      console.log('✅ Net revenue set to:', netRevenue);
    } catch (error: unknown) {
      console.error('❌ Error fetching revenue:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load revenue statistics";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setTotalDesignCharge(0);
    } finally {
      setLoading(false);
      console.log('📊 Loading complete. Net revenue:', totalDesignCharge);
    }
  }, [selectedPeriod, toast]);

  // Fetch today's schedule for the logged-in staff
  const fetchTodaySchedule = useCallback(async () => {
    if (!user || !(user as any).id) {
      console.log('📅 No user or user ID available');
      return;
    }
    
    try {
      setLoadingSchedule(true);
      const staffId = (user as any).id;
      console.log(`📅 Fetching today's schedule for staff ${staffId}`);
      
      const response = await apiClient.getStaffSchedule(staffId) as any;
      console.log(`📅 Raw Schedule response:`, response);
      console.log(`📅 Response type:`, typeof response);
      console.log(`📅 Response keys:`, response ? Object.keys(response) : 'null');
      
      // Handle different response structures
      let schedules: Schedule[] = [];
      
      if (response === null || response === undefined) {
        console.log('📅 Response is null/undefined');
      } else if (Array.isArray(response)) {
        console.log('📅 Response is direct array');
        schedules = response;
      } else if (response.data && Array.isArray(response.data)) {
        console.log('📅 Response has data array');
        schedules = response.data;
      } else if (response.success && response.data && Array.isArray(response.data)) {
        console.log('📅 Response has success + data array');
        schedules = response.data;
      } else if (response.schedules && Array.isArray(response.schedules)) {
        console.log('📅 Response has schedules array');
        schedules = response.schedules;
      } else if (response.users && Array.isArray(response.users)) {
        console.log('📅 Response has users array (unexpected for schedules)');
        schedules = response.users;
      } else {
        console.log('📅 Unknown response structure, attempting to find array');
        // Try to find any array in the response
        const values = Object.values(response);
        const foundArray = values.find(v => Array.isArray(v));
        if (foundArray) {
          schedules = foundArray;
          console.log('📅 Found array in response:', foundArray);
        }
      }
      
      console.log(`📅 Final processed schedules:`, schedules);
      console.log(`📅 Number of schedules found:`, schedules?.length || 0);
      
      if (schedules && schedules.length > 0) {
        // Get current day and find today's schedule
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        console.log(`📅 Today is: ${today}`);
        console.log(`📅 Available schedule days:`, schedules.map(s => s.dayOfWeek));
        
        const todaySched = schedules.find((s: Schedule) => 
          s.dayOfWeek && s.dayOfWeek.toLowerCase() === today.toLowerCase()
        );
        
        console.log(`📅 Today's schedule found:`, todaySched);
        setTodaySchedule(todaySched || null);
        
        if (!todaySched) {
          console.log(`📅 No schedule for today, but staff has ${schedules.length} total schedules`);
          // Show the next available schedule as fallback
          const nextSchedule = schedules[0];
          console.log(`📅 Using next available schedule as fallback:`, nextSchedule);
          setTodaySchedule(nextSchedule);
        }
      } else {
        console.log(`📅 No schedules found for this staff member`);
        setTodaySchedule(null);
      }
    } catch (error) {
      console.error('❌ Error fetching schedule:', error);
      console.error('❌ Error details:', error.response || error.message || error);
      setTodaySchedule(null);
    } finally {
      setLoadingSchedule(false);
    }
  }, [user]);

  // Fetch assigned tasks for the logged-in staff
  const fetchAssignedTasks = useCallback(async () => {
    if (!user || !(user as any).id) {
      console.log('📋 No user or user ID available');
      return;
    }
    
    try {
      setLoadingTasks(true);
      const staffId = (user as any).id;
      console.log(`📋 Fetching assigned tasks for staff ${staffId}`);
      
      // Use the tasks endpoint - apiClient.get() should extract data automatically
      const response = await apiClient.get(`/tasks/by-staff/${staffId}`) as any;
      console.log(`📋 Staff tasks response:`, response);
      
      // Handle response more simply
      const tasks = response?.tasks || response?.data?.tasks || response?.data || response || [];
      console.log(`📋 Processed tasks:`, tasks);
      
      setAssignedTasks(tasks);
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assigned tasks",
        variant: "destructive",
      });
      setAssignedTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, [user, toast]);

  useEffect(() => {
    console.log('🎯 useEffect is running in StaffDashboard');
    console.log('🎯 User available:', !!user);
    console.log('🎯 User ID:', (user as any)?.id);
    
    if (user && (user as any).id) {
      console.log('🎯 About to call fetchStaffStats, fetchTodaySchedule, fetchAssignedTasks');
      fetchStaffStats();
      fetchTodaySchedule();
      fetchAssignedTasks();
    } else {
      console.log('🎯 User or user ID not available, skipping API calls');
    }
  }, [user]); // Depend on user directly instead of the functions

  const handleJobCreated = () => {
    setShowCreateJob(false);
    fetchStaffStats(); // Refresh stats
  };

  const handleQuotationCreated = () => {
    fetchStaffStats(); // Refresh stats
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'warning';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-3 md:p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Welcome, {user?.fullName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Staff Dashboard - Quick actions and your earnings
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Job */}
          <Button
            onClick={() => setShowCreateJob(true)}
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-200 hover:scale-105"
          >
            <Plus className="h-5 w-5 mr-2" />
            Quick Job
          </Button>

          {/* Create Quotation */}
          <CreateQuotationDialog onQuotationCreated={handleQuotationCreated}>
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg transition-all duration-200 hover:scale-105"
            >
              <FileText className="h-5 w-5 mr-2" />
              Create Quotation
            </Button>
          </CreateQuotationDialog>
        </div>
      </div>

      {/* Earnings Section with Filter */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Your Earnings</h2>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedPeriod} onValueChange={(value: 'weekly' | 'monthly' | 'yearly' | 'all') => setSelectedPeriod(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="yearly">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Total Revenue Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border-0 shadow-elevated bg-gradient-to-br from-[#27AE60] to-[#2ECC71] text-white col-span-1 lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <CardTitle className="text-white font-semibold text-base">
                  Total Revenue
                </CardTitle>
              </div>
              <div className="text-2xl">💰</div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="text-3xl md:text-4xl font-bold mb-2">
              {loading ? "..." : formatCurrency(totalDesignCharge)}
            </div>
            <p className="text-white/80 text-sm font-medium">
              {selectedPeriod === 'all' && 'Your total revenue from all time'}
              {selectedPeriod === 'weekly' && 'Revenue from last 7 days'}
              {selectedPeriod === 'monthly' && 'Revenue from last 30 days'}
              {selectedPeriod === 'yearly' && 'Revenue from last year'}
            </p>
            {/* Decorative elements */}
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full"></div>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-white/10 rounded-full"></div>
          </CardContent>
        </Card>

        
        {/* Payment Dues Card */}
        <Card className="border-0 shadow-card bg-card hover:shadow-elevated transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Payment Dues
              </CardTitle>
              <Briefcase className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingTasks ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : assignedTasks.length > 0 ? (
              <div className="space-y-2">
                <div className="text-lg font-bold text-foreground">
                  {assignedTasks.filter(t => t.status === 'pending' && t.dueDate).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Payment dues pending
                </p>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {assignedTasks
                    .filter(t => t.status === 'pending' && t.dueDate)
                    .slice(0, 3)
                    .map((task) => (
                      <div key={task._id} className="flex items-center gap-2 text-xs">
                        <Badge variant="destructive" className="text-xs">
                          Due
                        </Badge>
                        <span className="truncate flex-1">{task.title}</span>
                        <span className="text-orange-600">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  {assignedTasks.filter(t => t.status === 'pending' && t.dueDate).length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{assignedTasks.filter(t => t.status === 'pending' && t.dueDate).length - 3} more dues
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">No payment dues</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  All payments are up to date
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-card bg-card hover:shadow-elevated transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Schedule
              </CardTitle>
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingSchedule ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : todaySchedule ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">
                    {todaySchedule.startTime} - {todaySchedule.endTime}
                  </span>
                </div>
                <Badge variant="outline" className="capitalize">
                  {todaySchedule.shiftType} Shift
                </Badge>
              </div>
            ) : assignedTasks.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Flexible Schedule</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Work on your {assignedTasks.length} assigned task{assignedTasks.length !== 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">No Schedule Set</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact admin to set up your work schedule
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Tasks Card */}
        <Card className="border-0 shadow-card bg-card hover:shadow-elevated transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your Tasks
              </CardTitle>
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingTasks ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : assignedTasks.length > 0 ? (
              <div className="space-y-2">
                <div className="text-lg font-bold text-foreground">
                  {assignedTasks.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {assignedTasks.filter(t => t.status === 'pending').length} pending, 
                  {assignedTasks.filter(t => t.status === 'in_progress').length} in progress
                </p>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {assignedTasks.slice(0, 3).map((task) => (
                    <div key={task._id} className="flex items-center gap-2 text-xs">
                      <Badge variant={getTaskStatusColor(task.status)} className="text-xs">
                        {task.status}
                      </Badge>
                      <span className="truncate flex-1">{task.title}</span>
                    </div>
                  ))}
                  {assignedTasks.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{assignedTasks.length - 3} more tasks
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">No assigned tasks</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar & Reminders Section */}
      <CalendarReminders onTaskUpdate={fetchAssignedTasks} />

      {/* Info Section */}
      <Card className="mt-6 border-0 shadow-card bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Staff Dashboard Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Today's Schedule:</strong> View your current day's shift timing and type
            </p>
            <p>
              <strong>Your Tasks:</strong> See all tasks assigned to you with status and priority
            </p>
            <p>
              <strong>Calendar & Reminders:</strong> Manage your tasks with due dates and status updates
            </p>
            <p>
              <strong>Quick Job:</strong> Create new jobs quickly and efficiently
            </p>
            <p>
              <strong>Create Quotation:</strong> Generate quotations for potential clients
            </p>
            <p>
              <strong>Total Design Charge:</strong> View your cumulative earnings from all your work
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateJobDialog
        open={showCreateJob}
        onOpenChange={setShowCreateJob}
        onJobCreated={handleJobCreated}
        customers={customers}
        onCustomersUpdate={() => { }}
      />
    </div>
  );
}
