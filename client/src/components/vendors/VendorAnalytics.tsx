import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { TrendingUp, TrendingDown, Building, DollarSign, Star, AlertTriangle, Users, Award, Calendar, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import apiClient from "@/lib/apiClient";

interface VendorAnalyticsData {
  analytics: {
    totalVendors: number;
    activeVendors: number;
    totalPendingAmount: number;
    totalContractValue: number;
    avgRating: number;
    avgPerformanceScore: number;
  };
  topPerformingVendors: Array<{
    _id: string;
    name: string;
    vendorType: string;
    rating: number;
    performanceMetrics: {
      overallScore: number;
      onTimeDelivery: number;
      qualityRating: number;
      communicationRating: number;
      priceCompetitiveness: number;
    };
    totalAmount: number;
  }>;
  performanceCategories: Array<{
    _id: string;
    count: number;
    avgScore: number;
  }>;
  contractAlerts: Array<{
    _id: string;
    name: string;
    contractDetails: {
      contractEndDate: string;
      autoRenewal: boolean;
    };
  }>;
  paymentTrends: Array<{
    _id: {
      year: number;
      month: number;
    };
    totalPayments: number;
    paymentCount: number;
    avgPaymentAmount: number;
  }>;
  communicationSummary: Array<{
    communicationType: string;
    count: number;
    vendorCount: number;
  }>;
}

export function VendorAnalytics() {
  const [analytics, setAnalytics] = useState<VendorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30");

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getVendorAnalytics();
      console.log('🏢 Vendor Analytics:', response);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching vendor analytics:', error);
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

  const getPerformanceColor = (score: number) => {
    if (score >= 4.5) return '#10B981'; // Green
    if (score >= 3.5) return '#3B82F6'; // Blue
    if (score >= 2.5) return '#F59E0B'; // Yellow
    if (score >= 1.5) return '#EF4444'; // Red
    return '#6B7280'; // Gray
  };

  const getPerformanceText = (score: number) => {
    if (score >= 4.5) return 'Excellent';
    if (score >= 3.5) return 'Good';
    if (score >= 2.5) return 'Average';
    if (score >= 1.5) return 'Poor';
    return 'Very Poor';
  };

  const getCategoryColor = (index: number) => {
    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
    return colors[index % colors.length];
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

  if (!analytics) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Analytics Data</h3>
              <p className="text-muted-foreground">Add some vendors to see analytics</p>
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
              <Building className="h-4 w-4" />
              Total Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.analytics.totalVendors)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.analytics.activeVendors} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pending Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.analytics.totalPendingAmount)}</div>
            <p className="text-xs text-muted-foreground">across all vendors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.analytics.avgRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">out of 5 stars</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Performance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.analytics.avgPerformanceScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">overall performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.performanceCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.performanceCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.performanceCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getCategoryColor(index)} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No performance data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.paymentTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.paymentTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="_id.month" 
                    tickFormatter={(value) => `Month ${value}`}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value as number), 'Total Payments']}
                    labelFormatter={(label) => `Month ${label}`}
                  />
                  <Line type="monotone" dataKey="totalPayments" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No payment trends available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Vendors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Top Performing Vendors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.topPerformingVendors.length > 0 ? (
            <div className="space-y-4">
              {analytics.topPerformingVendors.map((vendor, index) => (
                <div key={vendor._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">{vendor.name}</h4>
                      <p className="text-sm text-muted-foreground">{vendor.vendorType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(vendor.totalAmount)}</p>
                      <p className="text-sm text-muted-foreground">Total Business</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{vendor.rating.toFixed(1)} ⭐</p>
                      <p className="text-sm text-muted-foreground">Rating</p>
                    </div>
                    <Badge 
                      style={{ backgroundColor: getPerformanceColor(vendor.performanceMetrics.overallScore) }}
                      className="text-white"
                    >
                      {getPerformanceText(vendor.performanceMetrics.overallScore)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No top performing vendors found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Contract Expiry Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.contractAlerts.length > 0 ? (
            <div className="space-y-4">
              {analytics.contractAlerts.map((vendor) => (
                <div key={vendor._id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50">
                  <div>
                    <h4 className="font-medium">{vendor.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Contract expires: {new Date(vendor.contractDetails.contractEndDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      {vendor.contractDetails.autoRenewal ? 'Auto Renewal' : 'Manual Renewal'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No contract expiry alerts
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Communication Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.communicationSummary.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {analytics.communicationSummary.map((comm, index) => (
                <div key={comm.communicationType} className="p-4 border rounded-lg">
                  <h4 className="font-medium">{comm.communicationType}</h4>
                  <p className="text-2xl font-bold text-blue-600">{comm.count}</p>
                  <p className="text-sm text-muted-foreground">
                    {comm.vendorCount} vendors
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No communication data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
