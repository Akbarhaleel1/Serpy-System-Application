import { useState, useEffect } from "react";
import { Bell, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/lib/apiClient";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  variant: "destructive" | "warning" | "pending" | "success";
}

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);

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
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center space-x-6">
          <SidebarTrigger className="hover:bg-muted rounded-lg p-2 transition-colors" />
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search customers, jobs, invoices..."
              className="pl-10 w-64 bg-muted/50 border-0 focus:bg-background"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
                  >
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <DropdownMenuItem className="p-4 text-center text-muted-foreground">
                  No new notifications
                </DropdownMenuItem>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-4">
                    <div className="flex w-full items-center justify-between">
                      <span className="font-medium">{notification.title}</span>
                      <Badge variant={notification.variant}>
                        {notification.type === 'job' ? 'Urgent' : 
                         notification.type === 'stock' ? 'Warning' : 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.description}
                    </p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {user?.email || "My Account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                console.log('Navigating to profile settings');
                navigate('/profile-settings');
              }}>
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                console.log('Navigating to user management');
                navigate('/user-management');
              }}>
                User Management
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                console.log('Navigating to activity log');
                navigate('/activity-log');
              }}>
                Activity Log
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => signOut()}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}