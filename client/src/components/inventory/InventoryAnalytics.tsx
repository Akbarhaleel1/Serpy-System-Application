import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import apiClient from "@/lib/apiClient";

interface AnalyticsData {
  analytics: {
    totalItems: number;
    totalValue: number;
    totalQuantity: number;
    avgUnitCost: number;
    lowStockCount: number;
    criticalStockCount: number;
  };
  categoryDistribution: Array<{
    _id: string;
    count: number;
    totalValue: number;
    totalQuantity: number;
  }>;
  topMovingItems: Array<{
    _id: string;
    name: string;
    category: string;
    quantity: number;
    unitCost: number;
    minStockLevel: number;
  }>;
  trends: Array<{
    _id: {
      year: number;
      month: number;
      day: number;
    };
    itemsUpdated: number;
    valueChange: number;
  }>;
}

export function InventoryAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30");

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getInventoryAnalytics();
      console.log('📊 Inventory Analytics:', response);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const getCategoryColor = (index: number) => {
    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
    return colors[index % colors.length];
  };

  const getStockStatusColor = (quantity: number, minLevel: number) => {
    if (quantity <= minLevel / 2) return 'destructive';
    if (quantity <= minLevel) return 'secondary';
    return 'default';
  };

  const getStockStatusText = (quantity: number, minLevel: number) => {
    if (quantity <= minLevel / 2) return 'Critical';
    if (quantity <= minLevel) return 'Low';
    return 'Good';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics || analytics.analytics.totalItems === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Analytics Data</h3>
              <p className="text-muted-foreground">Add some inventory items to see analytics</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.analytics.totalItems)}</div>
            <p className="text-xs text-muted-foreground">inventory items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.analytics.totalValue)}</div>
            <p className="text-xs text-muted-foreground">inventory value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.analytics.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">items need reorder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Critical Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.analytics.criticalStockCount}</div>
            <p className="text-xs text-muted-foreground">immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.categoryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="totalValue"
                  >
                    {analytics.categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getCategoryColor(index)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Moving Items</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topMovingItems.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topMovingItems}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [formatNumber(value as number), 'Quantity']}
                    labelFormatter={(label) => `Item: ${label}`}
                  />
                  <Bar dataKey="quantity" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No movement data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Moving Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Moving Items</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.topMovingItems.length > 0 ? (
            <div className="space-y-4">
              {analytics.topMovingItems.map((item, index) => (
                <div key={item._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{formatNumber(item.quantity)} units</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(item.unitCost)}/unit</p>
                    </div>
                    <Badge variant={getStockStatusColor(item.quantity, item.minStockLevel)}>
                      {getStockStatusText(item.quantity, item.minStockLevel)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No top moving items found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-orange-600 mb-2">Low Stock Items</h4>
              <p className="text-2xl font-bold text-orange-600">{analytics.analytics.lowStockCount}</p>
              <p className="text-sm text-muted-foreground">Items below minimum level</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-red-600 mb-2">Critical Stock Items</h4>
              <p className="text-2xl font-bold text-red-600">{analytics.analytics.criticalStockCount}</p>
              <p className="text-sm text-muted-foreground">Items requiring immediate attention</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}