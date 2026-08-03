import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WalkInJobDialog } from "@/components/walkIn/WalkInJobDialog";
import { JobQueueBoard } from "@/components/walkIn/JobQueueBoard";
import { CounterBillingDialog } from "@/components/walkIn/CounterBillingDialog";
import { Users, Clock, TrendingUp, CheckCircle } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

const WalkInJobs = () => {
  const [selectedJobForBilling, setSelectedJobForBilling] = useState<string | null>(null);
  const [refreshQueue, setRefreshQueue] = useState(0);
  const [stats, setStats] = useState({
    todayJobs: 0,
    activeQueue: 0,
    completedToday: 0,
    avgTime: 0,
    totalRevenue: 0,
    todayRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiClient.getWalkInJobStats();
      console.log('📊 Walk-in job stats response:', response);
      
      if (response.data?.stats) {
        setStats({
          todayJobs: response.data.stats.todayJobs || 0,
          activeQueue: response.data.stats.pendingJobs || 0,
          completedToday: response.data.stats.completedJobs || 0,
          avgTime: 45, // This would need to be calculated from actual data
          totalRevenue: response.data.stats.totalRevenue || 0,
          todayRevenue: response.data.stats.todayRevenue || 0
        });
      }
    } catch (error) {
      console.error('Error fetching walk-in job stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch walk-in job statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJobCreated = () => {
    setRefreshQueue(prev => prev + 1);
    fetchStats(); // Refresh stats when new job is created
  };

  const handleBillingCompleted = () => {
    setSelectedJobForBilling(null);
    setRefreshQueue(prev => prev + 1);
    fetchStats(); // Refresh stats when billing is completed
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg border">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Walk-In Job Flow</h1>
          <p className="text-gray-600 text-lg">
            Smart counter billing and production management
          </p>
        </div>
        <div className="shrink-0">
          <WalkInJobDialog onJobCreated={handleJobCreated} />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Today's Jobs</CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.todayJobs}</div>
            <p className="text-sm text-gray-500 mt-1">
              Walk-in orders today
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Queue</CardTitle>
            <Clock className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.activeQueue}</div>
            <p className="text-sm text-gray-500 mt-1">
              Jobs in production
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Completed Today</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.completedToday}</div>
            <p className="text-sm text-gray-500 mt-1">
              Jobs finished today
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Avg. Time</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.avgTime}m</div>
            <p className="text-sm text-gray-500 mt-1">
              Per job completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-lg shadow-sm border">
        <Tabs defaultValue="queue" className="w-full">
          <div className="border-b px-6 py-4">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="queue" className="text-sm">Active Queue</TabsTrigger>
              <TabsTrigger value="completed" className="text-sm">Completed Jobs</TabsTrigger>
              <TabsTrigger value="analytics" className="text-sm">Analytics</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="queue" className="p-6 space-y-6">
            <JobQueueBoard key={refreshQueue} />
          </TabsContent>

          <TabsContent value="completed" className="p-6">
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-xl">Completed Jobs Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Completed jobs list will be shown here...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="p-6">
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-xl">Production Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Analytics dashboard will be shown here...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Billing Dialog */}
      {selectedJobForBilling && (
        <CounterBillingDialog
          jobId={selectedJobForBilling}
          open={!!selectedJobForBilling}
          onOpenChange={(open) => !open && setSelectedJobForBilling(null)}
          onPaymentCompleted={handleBillingCompleted}
        />
      )}
    </div>
  );
};

export default WalkInJobs;