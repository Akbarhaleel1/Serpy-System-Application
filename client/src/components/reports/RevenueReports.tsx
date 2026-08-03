import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import apiClient from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Download, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

interface RevenueData {
  date: string;
  revenue: number;
  invoices_count: number;
  payments_received: number;
  outstanding: number;
}

interface RevenueReportsProps {
  className?: string;
}

export const RevenueReports: React.FC<RevenueReportsProps> = ({ className }) => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalInvoices: 0,
    totalPayments: 0,
    totalOutstanding: 0,
    avgOrderValue: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    // Set default date range (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setDateRange({
      from: firstDay,
      to: lastDay
    });
  }, []);

  const fetchRevenueData = async () => {
    console.log('📋 API not yet implemented');;
    if (!dateRange?.from || !dateRange?.to) return;
    
    setLoading(true);
    try {
      const user = await apiClient.getCurrentUser();
      if (!user) throw new Error('Not authenticatedinvoices')
        ()
        .eq('user_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .neq('status', 'cancelled');

      if (invoiceError) throw invoiceError;

      // Process data for the chart
      const processedData: { [key: string]: RevenueData } = {};
      
      // Process invoices
      invoiceData?.forEach(invoice => {
        const dateKey = reportType === 'daily' 
          ? format(new Date(invoice.created_at), 'yyyy-MM-dd')
          : format(new Date(invoice.created_at), 'yyyy-MM');
        
        if (!processedData[dateKey]) {
          processedData[dateKey] = {
            date: dateKey,
            revenue: 0,
            invoices_count: 0,
            payments_received: 0,
            outstanding: 0
          };
        }
        
        processedData[dateKey].revenue += invoice.total_amount;
        processedData[dateKey].invoices_count += 1;
        
        if (invoice.status === 'paid') {
          processedData[dateKey].payments_received += invoice.total_amount;
        } else {
          processedData[dateKey].outstanding += invoice.total_amount;
        }
      });

      const dataArray = Object.values(processedData).sort((a, b) => a.date.localeCompare(b.date));
      setRevenueData(dataArray);

      // Calculate summary
      const totalRevenue = dataArray.reduce((sum, item) => sum + item.revenue, 0);
      const totalInvoices = dataArray.reduce((sum, item) => sum + item.invoices_count, 0);
      const totalPayments = dataArray.reduce((sum, item) => sum + item.payments_received, 0);
      const totalOutstanding = dataArray.reduce((sum, item) => sum + item.outstanding, 0);
      
      setSummary({
        totalRevenue,
        totalInvoices,
        totalPayments,
        totalOutstanding,
        avgOrderValue: totalInvoices > 0 ? totalRevenue / totalInvoices : 0
      });

    }
    }

    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (revenueData.length === 0) return;

    const headers = ['Date', 'Revenue', 'Invoices', 'Payments Received', 'Outstanding'];
    const csvContent = [
      headers.join(','),
      ...revenueData.map(row => [
        row.date,
        row.revenue.toFixed(2),
        row.invoices_count,
        row.payments_received.toFixed(2),
        row.outstanding.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchRevenueData();
    }
  }, [dateRange, reportType]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Date Range</Label>
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="flex items-end gap-2">
              <Button onClick={fetchRevenueData} disabled={loading}>
                Generate Report
              </Button>
              <Button 
                variant="outline" 
                onClick={exportToCSV}
                disabled={revenueData.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">₹{summary.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{summary.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">Total Invoices</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">₹{summary.totalPayments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Payments Received</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">₹{summary.totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">₹{summary.avgOrderValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Avg Order Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">Invoices</th>
                  <th className="text-right p-2">Payments</th>
                  <th className="text-right p-2">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      {reportType === 'daily' 
                        ? format(new Date(row.date), 'dd MMM yyyy')
                        : format(new Date(row.date + '-01'), 'MMM yyyy')
                      }
                    </td>
                    <td className="text-right p-2 font-medium">₹{row.revenue.toLocaleString()}</td>
                    <td className="text-right p-2">{row.invoices_count}</td>
                    <td className="text-right p-2 text-green-600">₹{row.payments_received.toLocaleString()}</td>
                    <td className="text-right p-2 text-orange-600">₹{row.outstanding.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {revenueData.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No data available for the selected period
              </div>
            )}
            
            {loading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading report data...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};