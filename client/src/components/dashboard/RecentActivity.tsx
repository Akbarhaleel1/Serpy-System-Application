import { useState, useEffect } from "react";
import { Clock, CheckCircle, AlertCircle, Truck, Receipt, Briefcase, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  icon: any;
  status: string;
  created_at: string;
}

const statusConfig = {
  completed: { variant: "success" as const, color: "text-success" },
  pending: { variant: "pending" as const, color: "text-pending" },
  urgent: { variant: "urgent" as const, color: "text-urgent" },
};

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const fetchRecentActivities = async () => {
    try {
      const activities: Activity[] = [];

      // Fetch recent jobs
      const recentJobs = await apiClient.getJobs({ limit: 3 });
      console.log('📋 Recent jobs response:', recentJobs);

      // Fetch recent invoices
      const recentInvoices = await apiClient.getInvoices({ limit: 2 });
      console.log('📄 Recent invoices response:', recentInvoices);

      // Fetch recent deliveries
      const recentDeliveries = await apiClient.getDeliveries({ limit: 2 });
      console.log('🚚 Recent deliveries response:', recentDeliveries);

      // Process jobs
      recentJobs?.forEach((job: any) => {
        const timeAgo = getTimeAgo(job.createdAt || job.created_at);
        activities.push({
          id: job._id || job.id,
          type: job.status === 'completed' ? 'job_completed' : 'job_created',
          title: job.status === 'completed' ? 'Job completed' : 'New job created',
          description: `${job.title}${job.customerName ? ` for ${job.customerName}` : ''}`,
          time: timeAgo,
          icon: job.status === 'completed' ? CheckCircle : Briefcase,
          status: job.status === 'completed' ? 'completed' : job.priority === 'high' ? 'urgent' : 'pending',
          created_at: job.createdAt || job.created_at
        });
      });

      // Process invoices
      recentInvoices?.forEach((invoice: any) => {
        const timeAgo = getTimeAgo(invoice.createdAt || invoice.created_at);
        activities.push({
          id: invoice._id || invoice.id,
          type: 'invoice_created',
          title: 'Invoice generated',
          description: `${invoice.invoiceNumber || invoice.invoice_number} for ₹${invoice.totalAmount?.toLocaleString() || invoice.total_amount?.toLocaleString()}${invoice.customerName ? ` - ${invoice.customerName}` : ''}`,
          time: timeAgo,
          icon: Receipt,
          status: invoice.status === 'paid' ? 'completed' : 'pending',
          created_at: invoice.createdAt || invoice.created_at
        });
      });

      // Process deliveries
      recentDeliveries?.forEach((delivery: any) => {
        const timeAgo = getTimeAgo(delivery.createdAt || delivery.created_at);
        activities.push({
          id: delivery._id || delivery.id,
          type: 'delivery_scheduled',
          title: delivery.status === 'delivered' ? 'Delivery completed' : 'Delivery scheduled',
          description: `${delivery.jobTitle || delivery.job_title || 'Order'}${delivery.customerName ? ` for ${delivery.customerName}` : ''}`,
          time: timeAgo,
          icon: Truck,
          status: delivery.status === 'delivered' ? 'completed' : 'pending',
          created_at: delivery.createdAt || delivery.created_at
        });
      });

      // Sort by creation time and take the 5 most recent
      const sortedActivities = activities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      setActivities(sortedActivities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      toast({
        title: "Error",
        description: "Failed to load recent activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Recent Activity</span>
        </CardTitle>
        <CardDescription>
          Latest updates from your print shop
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start space-x-4 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
            <p className="text-xs">Start creating jobs or invoices to see activity here</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <div
              key={activity.id}
              className="flex items-start space-x-4 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`p-2 rounded-lg ${statusConfig[activity.status]?.color || 'text-muted-foreground'} bg-opacity-10`}>
                <activity.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <Badge variant={statusConfig[activity.status]?.variant || 'default'} className="ml-2">
                    {activity.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}