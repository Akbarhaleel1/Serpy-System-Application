import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface PermissionRouteProps {
  children: React.ReactNode;
  permission: string | string[]; // The permission(s) required to access this route
}

/**
 * PermissionRoute component
 * Wraps routes and checks if the current user has the required permission
 * If the user doesn't have permission, shows an access denied message
 */
export function PermissionRoute({ children, permission }: PermissionRouteProps) {
  const { hasPermission, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user has permission(s)
  const hasAccess = Array.isArray(permission)
    ? permission.some(p => hasPermission(p)) // User needs at least one permission
    : hasPermission(permission);

  if (!hasAccess) {
    const permissionText = Array.isArray(permission)
      ? permission.join(' or ')
      : permission;

    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md shadow-elevated">
          <CardHeader className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription className="text-base">
              You don't have permission to access this section
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Required permission: <span className="font-semibold text-foreground">{permissionText}</span>
            </p>
            <a
              href="/"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go to Dashboard
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
