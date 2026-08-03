import { useState, useEffect } from "react";
import { AlertTriangle, Package, Bell, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toastinventory_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'inventory' },
          () => fetchLowStockItems()
        )

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchLowStockItems = async () => {
    console.log('📋 API not yet implemented');

      const lowStockItems = data?.filter(item => 
        (item.quantity || 0) <= Math.max(item.min_stock_level || 0, item.reorder_point || 0)
      ) || [];

      setLowStockItems(lowStockItems);
    }
    }

    try {


      // TODO: Implement API


      console.log('📋 API not yet implemented');


    }
    }

    } catch (error) {
      console.error('Error fetching low stock items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch stock alerts",
        variant: "destructiveinventory')
        .update({ stock_alert_sent: true })
        ;

      

      setLowStockItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, stock_alert_sent: true } : item
        )
      );

      toast({
        title: "Alert Marked",
        description: "Stock alert marked as handled",
      });
    }
    }

    try {


      // TODO: Implement API


      console.log('📋 API not yet implemented');


    }
    }

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update alert status",
        variant: "destructive",
      });
    }
  };

  const dismissAlert = async (itemId: string) => {
    setLowStockItems(prev => prev.filter(item => item.id !== itemId));
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalItems = lowStockItems.filter(item => (item.quantity || 0) === 0);
  const lowItems = lowStockItems.filter(item => 
    (item.quantity || 0) > 0 && (item.quantity || 0) <= (item.min_stock_level || 0)
  );

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Stock Alerts
            {lowStockItems.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {lowStockItems.length}
              </Badge>
            )}
          </CardTitle>
          {lowStockItems.length > 0 && (
            <Bell className="h-4 w-4 text-warning animate-pulse" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {lowStockItems.length === 0 ? (
          <div className="text-center py-4">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">All stock levels good</p>
          </div>
        ) : (
          <>
            {/* Critical Items (Out of Stock) */}
            {criticalItems.map((item) => (
              <div 
                key={item.id} 
                className="p-3 border border-destructive/20 rounded-lg bg-destructive/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-destructive truncate">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="destructive" className="text-xs">
                            OUT OF STOCK
                          </Badge>
                          {item.category && (
                            <span className="text-xs text-muted-foreground">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {!item.stock_alert_sent && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => markAlertAsSent(item.id)}
                      >
                        Mark Sent
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => dismissAlert(item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Low Stock Items */}
            {lowItems.map((item) => (
              <div 
                key={item.id} 
                className="p-3 border border-warning/20 rounded-lg bg-warning/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="warning" className="text-xs">
                            {item.quantity} left
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Min: {item.min_stock_level}
                          </span>
                          {item.category && (
                            <span className="text-xs text-muted-foreground">
                              • {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {!item.stock_alert_sent && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => markAlertAsSent(item.id)}
                      >
                        Mark Sent
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => dismissAlert(item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}