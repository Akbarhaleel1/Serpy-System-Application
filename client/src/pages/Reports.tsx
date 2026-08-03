import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { 
  Download, 
  Mail, 
  Calendar, 
  DollarSign, 
  FileText, 
  TrendingUp,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface MonthlyReportData {
  month: string;
  totalInvoices: number;
  totalRevenue: number;
  totalDiscounts: number;
  gstBreakdown: {
    gst0: { count: number; amount: number; tax: number };
    gst5: { count: number; amount: number; tax: number };
    gst12: { count: number; amount: number; tax: number };
    gst18: { count: number; amount: number; tax: number };
    gst28: { count: number; amount: number; tax: number };
  };
  totalTaxPayable: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

export default function Reports() {
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(false);
  const [accountantNotes, setAccountantNotes] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({
    email: "",
    subject: "",
    message: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    generateReport();
  }, [selectedMonth]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getRevenueReports({ 
        month: selectedMonth
      });
      console.log('📊 Reports response:', response);
      setReportData(response || null);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    const csvContent = [
      ['GST Report for', reportData.month],
      [''],
      ['Summary'],
      ['Total Invoices', reportData.totalInvoices],
      ['Total Revenue', `₹${reportData.totalRevenue.toLocaleString()}`],
      ['Total Discounts', `₹${reportData.totalDiscounts.toLocaleString()}`],
      ['Total Tax Payable', `₹${reportData.totalTaxPayable.toLocaleString()}`],
      [''],
      ['GST Breakdown'],
      ['Tax Slab', 'Invoice Count', 'Taxable Amount', 'Tax Amount'],
      ['0%', reportData.gstBreakdown.gst0.count, `₹${reportData.gstBreakdown.gst0.amount.toLocaleString()}`, `₹${reportData.gstBreakdown.gst0.tax.toLocaleString()}`],
      ['5%', reportData.gstBreakdown.gst5.count, `₹${reportData.gstBreakdown.gst5.amount.toLocaleString()}`, `₹${reportData.gstBreakdown.gst5.tax.toLocaleString()}`],
      ['12%', reportData.gstBreakdown.gst12.count, `₹${reportData.gstBreakdown.gst12.amount.toLocaleString()}`, `₹${reportData.gstBreakdown.gst12.tax.toLocaleString()}`],
      ['18%', reportData.gstBreakdown.gst18.count, `₹${reportData.gstBreakdown.gst18.amount.toLocaleString()}`, `₹${reportData.gstBreakdown.gst18.tax.toLocaleString()}`],
      ['28%', reportData.gstBreakdown.gst28.count, `₹${reportData.gstBreakdown.gst28.amount.toLocaleString()}`, `₹${reportData.gstBreakdown.gst28.tax.toLocaleString()}`],
      [''],
      ['Tax Distribution'],
      ['CGST', `₹${reportData.cgstAmount.toLocaleString()}`],
      ['SGST', `₹${reportData.sgstAmount.toLocaleString()}`],
      ['IGST', `₹${reportData.igstAmount.toLocaleString()}`],
      [''],
      ['Notes to Accountant'],
      [accountantNotes || 'No additional notes']
    ];

    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gst-report-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleEmailToAccountant = () => {
    setEmailData({
      email: "",
      subject: `GST Report for ${reportData?.month}`,
      message: `Please find attached the GST report for ${reportData?.month}.\n\nKey highlights:\n- Total Revenue: ₹${reportData?.totalRevenue.toLocaleString()}\n- Total Tax Payable: ₹${reportData?.totalTaxPayable.toLocaleString()}\n\nAdditional Notes:\n${accountantNotes || 'None'}`
    });
    setEmailDialogOpen(true);
  };

  const sendEmailToAccountant = () => {
    // In a real implementation, this would send the email
    toast({
      title: "Email Prepared",
      description: "Report email is ready to send to your accountant",
    });
    setEmailDialogOpen(false);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Reports & Tax Summary</h1>
          <p className="text-muted-foreground">GST reports and tax summaries for accounting</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportToCSV} disabled={!reportData} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button onClick={handleEmailToAccountant} disabled={!reportData} className="gap-2">
            <Mail className="w-4 h-4" />
            Email to Accountant
          </Button>
        </div>
      </div>

      {/* Month Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Select Report Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div>
              <Label htmlFor="month">Month & Year</Label>
              <Input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-48"
              />
            </div>
            <Button onClick={generateReport} disabled={loading} className="mt-6">
              {loading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      {reportData && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalInvoices}</div>
                <p className="text-xs text-muted-foreground">for {reportData.month}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{reportData.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">including all taxes</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">₹{reportData.totalDiscounts.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">discount given</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tax Payable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₹{reportData.totalTaxPayable.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">total GST liability</p>
              </CardContent>
            </Card>
          </div>

          {/* GST Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>GST Slab-wise Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">Auto-categorized by tax rate</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(reportData.gstBreakdown).map(([key, data]) => {
                  const percentage = key.replace('gst', '') + '%';
                  return (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{percentage} GST</Badge>
                        <span className="text-sm text-muted-foreground">{data.count} invoices</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">₹{data.amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Tax: ₹{data.tax.toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Tax Distribution */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">CGST</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">₹{reportData.cgstAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Central GST</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">SGST</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">₹{reportData.sgstAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">State GST</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">IGST</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">₹{reportData.igstAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Interstate GST</p>
              </CardContent>
            </Card>
          </div>

          {/* Notes to Accountant */}
          <Card>
            <CardHeader>
              <CardTitle>Notes to Accountant</CardTitle>
              <p className="text-sm text-muted-foreground">Add any additional information for your accountant</p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={accountantNotes}
                onChange={(e) => setAccountantNotes(e.target.value)}
                placeholder="Add notes about special transactions, adjustments, or other relevant information..."
                rows={4}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Email Report to Accountant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Accountant Email</Label>
              <Input
                id="email"
                type="email"
                value={emailData.email}
                onChange={(e) => setEmailData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="accountant@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={emailData.message}
                onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                rows={6}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={sendEmailToAccountant}>
                Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}