import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Briefcase,
  Receipt,
  Users,
  Calendar,
  TrendingUp,
  Package,
  Clock,
  AlertTriangle,
  BarChart3,
  DollarSign,
  ShoppingCart,
  Activity,
  Target,
  CreditCard,
  UserPlus,
  Edit,
  Save,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import { QuickPrintDialog } from "@/components/dashboard/QuickPrintDialog";
import { TaskWidget } from "@/components/dashboard/TaskWidget";
import { PaymentDuesWidget } from "@/components/dashboard/PaymentDuesWidget";
import { QuickReminderDialog } from "@/components/dashboard/QuickReminderDialog";
import { DashboardShortcuts } from "@/components/dashboard/DashboardShortcuts";
import { StaffDashboard } from "@/components/dashboard/StaffDashboard";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    todaysJobs: 0,
    completedJobs: 0,
    todaysRevenue: 0,
    pendingDeliveries: 0,
    lowStockItems: 0,
    totalCustomers: 0,
    unpaidInvoices: 0,
    thisMonthRevenue: 0,
    monthlyTarget: 100000, // Default target, can be made configurable
    taxPayable: 0,
    cashBalance: 0,
    bankBalance: 0,
    todaysCheques: 0,
    loading: true
  });
  const { toast } = useToast();
  const [isEditingRevenue, setIsEditingRevenue] = useState(false);
  const [tempMonthlyTarget, setTempMonthlyTarget] = useState(stats.monthlyTarget);

  useEffect(() => {
    if (user && !authLoading) {
      fetchDashboardStats();
      // Auto-refresh every 30 seconds for real-time updates
      const interval = setInterval(fetchDashboardStats, 30000);
      return () => clearInterval(interval);
    }
  }, [user, authLoading]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      console.log('📊 Fetching dashboard stats...');

      // Fetch data from the actual backend endpoints
      const [jobStatsResponse, dashboardStatsResponse] = await Promise.all([
        apiClient.getJobStats() as any,
        apiClient.getDashboardStats() as any
      ]);

      console.log('📊 Job stats response:', jobStatsResponse);
      console.log('📊 Dashboard stats response:', dashboardStatsResponse);

      // Extract stats from the API responses
      const jobStats = jobStatsResponse?.stats || {};
      const dashboardStats = dashboardStatsResponse?.stats || {};

      // Set the stats with the actual data from backend
      setStats({
        todaysJobs: jobStats.todayJobs || 0,
        completedJobs: jobStats.completedToday || 0,
        todaysRevenue: dashboardStats.totalRevenue || 0, // Use actual revenue from dashboard stats
        pendingDeliveries: dashboardStats.pendingDeliveries || 0,
        lowStockItems: dashboardStats.lowStockItems || 0,
        totalCustomers: dashboardStats.totalCustomers || 0,
        unpaidInvoices: dashboardStats.unpaidInvoices || 0,
        thisMonthRevenue: jobStats.monthlyRevenue || 0,
        monthlyTarget: dashboardStats.monthlyTarget || 100000, // Use API response or fallback
        taxPayable: dashboardStats.taxPayable || 0,
        cashBalance: dashboardStats.cashBalance || 0,
        bankBalance: dashboardStats.bankBalance || 0,
        todaysCheques: dashboardStats.todaysCheques || 0,
        loading: false
      });

      console.log('📊 Stats updated successfully');
    } catch (error) {
      console.error('📊 Error fetching dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleEditRevenue = () => {
    setIsEditingRevenue(true);
    setTempMonthlyTarget(stats.monthlyTarget);
  };

  const handleSaveRevenue = async () => {
    try {
      console.log('💾 Saving monthly target:', tempMonthlyTarget);
      
      const response = await apiClient.put('/dashboard/monthly-target', {
        monthlyTarget: tempMonthlyTarget
      }) as any;

      console.log('📡 Full API Response:', response);

      // Handle different response structures
      const monthlyTargetValue = response?.data?.monthlyTarget || response?.monthlyTarget || tempMonthlyTarget;
      
      if (response && (response.status === 'success' || response.message === 'Monthly target updated successfully')) {
        setStats(prev => ({ ...prev, monthlyTarget: monthlyTargetValue }));
        setIsEditingRevenue(false);
        
        toast({
          title: "Success",
          description: "Monthly target updated successfully",
        });
      } else {
        console.error('❌ API Error Response:', response);
        throw new Error(response?.message || 'Failed to update monthly target');
      }
    } catch (error: any) {
      console.error('❌ Error saving monthly target:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data
      });
      
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to update monthly target",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditingRevenue(false);
    setTempMonthlyTarget(stats.monthlyTarget);
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="p-3 md:p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="p-3 md:p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to SerpY ERP</h2>
            <p className="text-gray-600 mb-4">Please login to access your dashboard</p>
            <Button onClick={() => navigate('/auth')} className="bg-blue-600 hover:bg-blue-700">
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show Staff Dashboard for staff role users
  console.log('🔍 Dashboard routing check:');
  console.log('🔍 User role:', user?.role);
  console.log('🔍 Is staff?', user?.role === 'staff');
  console.log('🔍 User data:', user);
  
  if (user.role === 'staff') {
    console.log('🎯 Rendering StaffDashboard component');
    return <StaffDashboard />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Enterprise Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Business Intelligence Dashboard</h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-xs text-slate-500">
                Last Updated: {format(currentTime, 'dd MMM yyyy, HH:mm:ss')}
              </p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs text-slate-600 font-medium">Live</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DashboardShortcuts
              onJobCreated={fetchDashboardStats}
              onPaymentCreated={fetchDashboardStats}
              onQuotationCreated={fetchDashboardStats}
              onOrderCreated={fetchDashboardStats}
              onCustomerCreated={fetchDashboardStats}
            />
            <QuickReminderDialog onReminderCreated={fetchDashboardStats} />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Performance Indicators */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Key Performance Indicators</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Jobs Metric */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                  </div>
                  <Badge variant="outline" className="text-xs font-normal border-slate-200 text-slate-600">
                    Today
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Jobs</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {stats.loading ? "—" : stats.todaysJobs}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: stats.todaysJobs > 0 ? `${(stats.completedJobs / stats.todaysJobs) * 100}%` : '0%' }}
                      ></div>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">
                      {stats.todaysJobs > 0 ? Math.round((stats.completedJobs / stats.todaysJobs) * 100) : 0}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{stats.completedJobs} completed</p>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Metric */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                  <Badge variant="outline" className="text-xs font-normal border-slate-200 text-slate-600">
                    Today
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Revenue</p>
                  <p className="text-3xl font-bold text-slate-900">
                    ₹{stats.loading ? "—" : (stats.todaysRevenue / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-slate-500 mt-1">From paid invoices</p>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Target */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Target className="h-5 w-5 text-indigo-600" />
                  </div>
                  <Badge variant="outline" className="text-xs font-normal border-slate-200 text-slate-600">
                    MTD
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Target Achievement</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {Math.round((stats.thisMonthRevenue / stats.monthlyTarget) * 100)}%
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div 
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((stats.thisMonthRevenue / stats.monthlyTarget) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    ₹{(stats.thisMonthRevenue / 1000).toFixed(0)}K / ₹{(stats.monthlyTarget / 1000).toFixed(0)}K
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tax Liability */}
            <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-amber-600" />
                  </div>
                  <Badge variant="outline" className="text-xs font-normal border-slate-200 text-slate-600">
                    GST
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tax Payable</p>
                  <p className="text-3xl font-bold text-slate-900">
                    ₹{stats.loading ? "—" : (stats.taxPayable / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Current month liability</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Operational Overview */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-slate-600 rounded-full"></div>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Operational Overview</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Customers</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.loading ? "—" : stats.totalCustomers}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <Users className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Pending Deliveries</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.loading ? "—" : stats.pendingDeliveries}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <Clock className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Low Stock Items</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-slate-900">{stats.loading ? "—" : stats.lowStockItems}</p>
                      {stats.lowStockItems > 0 && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <Package className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-slate-900">
                      ₹{stats.loading ? "—" : (stats.thisMonthRevenue / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Workflow Management */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-slate-600 rounded-full"></div>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Workflow Management</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TaskWidget onRefresh={fetchDashboardStats} />
            <PaymentDuesWidget onRefresh={fetchDashboardStats} />
          </div>
        </div>

        {/* Analytics & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <NotificationCenter />
          
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">Revenue Analytics</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">Monthly performance trends</p>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditingRevenue ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditRevenue}
                      className="h-8 w-8 p-0 hover:bg-slate-100"
                    >
                      <Edit className="h-4 w-4 text-slate-600" />
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveRevenue}
                        className="h-8 w-8 p-0 hover:bg-emerald-100"
                      >
                        <Save className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="h-8 w-8 p-0 hover:bg-red-100"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Current Month Revenue</span>
                  <span className="text-lg font-bold text-slate-900">₹{(stats.thisMonthRevenue / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Monthly Target</span>
                  {isEditingRevenue ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">₹</span>
                      <Input
                        type="number"
                        value={tempMonthlyTarget / 1000}
                        onChange={(e) => setTempMonthlyTarget(Number(e.target.value) * 1000)}
                        className="w-20 h-8 text-right text-lg font-bold"
                        min="0"
                        step="10"
                      />
                      <span className="text-sm text-slate-500">K</span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-slate-900">₹{(stats.monthlyTarget / 1000).toFixed(0)}K</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Achievement Rate</span>
                  <span className="text-lg font-bold text-emerald-600">
                    {Math.round((stats.thisMonthRevenue / (isEditingRevenue ? tempMonthlyTarget : stats.monthlyTarget)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div 
                    className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((stats.thisMonthRevenue / (isEditingRevenue ? tempMonthlyTarget : stats.monthlyTarget)) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-slate-500 text-center">
                  {stats.thisMonthRevenue >= (isEditingRevenue ? tempMonthlyTarget : stats.monthlyTarget) 
                    ? '🎉 Target Achieved!' 
                    : ''}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
