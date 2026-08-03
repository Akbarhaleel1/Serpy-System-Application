import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, Package, Receipt, Clock, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  dismissed?: boolean;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      // TODO: Implement notifications API endpoint
      console.warn('Notifications API not yet implemented - using placeholder data');
      setNotifications([]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, dismissed: true }
          : notification
      )
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <Package className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Receipt className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <Clock className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const activeNotifications = notifications.filter(n => !n.dismissed);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {activeNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {activeNotifications.length}
              </Badge>
            )}
          </CardTitle>
          {activeNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {activeNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No notifications</p>
            <p className="text-sm text-gray-400">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeNotifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getPriorityColor(notification.priority)}`}
                    >
                      {notification.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissNotification(notification.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}