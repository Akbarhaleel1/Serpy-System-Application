import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, DollarSign, Calendar, Plus, Edit, Trash2 } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface VendorPerformanceProps {
  vendorId: string;
  vendorName: string;
}

interface PerformanceMetrics {
  onTimeDelivery: number;
  qualityRating: number;
  communicationRating: number;
  priceCompetitiveness: number;
  overallScore: number;
  lastEvaluated: string;
}

interface CommunicationRecord {
  _id: string;
  date: string;
  type: string;
  subject: string;
  notes: string;
  initiatedBy: string;
}

interface PaymentRecord {
  _id: string;
  date: string;
  amount: number;
  invoiceNumber: string;
  paymentMethod: string;
  status: string;
  notes: string;
}

export function VendorPerformance({ vendorId, vendorName }: VendorPerformanceProps) {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [communicationHistory, setCommunicationHistory] = useState<CommunicationRecord[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPerformanceDialog, setShowPerformanceDialog] = useState(false);
  const [showCommunicationDialog, setShowCommunicationDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const { toast } = useToast();

  // Form states
  const [performanceForm, setPerformanceForm] = useState({
    onTimeDelivery: 0,
    qualityRating: 3,
    communicationRating: 3,
    priceCompetitiveness: 3
  });

  const [communicationForm, setCommunicationForm] = useState({
    type: 'Email',
    subject: '',
    notes: '',
    initiatedBy: 'Company'
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    invoiceNumber: '',
    paymentMethod: 'Bank Transfer',
    status: 'Pending',
    notes: ''
  });

  useEffect(() => {
    fetchPerformanceData();
  }, [vendorId]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getVendorPerformance(vendorId);
      console.log('📊 Vendor Performance:', response);
      
      const data = response.data.vendor;
      setPerformanceMetrics(data.performanceMetrics);
      setCommunicationHistory(data.communicationHistory || []);
      setPaymentHistory(data.paymentHistory || []);
    } catch (error) {
      console.error('Error fetching vendor performance:', error);
      toast({
        title: "Error",
        description: "Failed to fetch vendor performance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePerformanceUpdate = async () => {
    try {
      await apiClient.updateVendorPerformance(vendorId, performanceForm);
      toast({
        title: "Success",
        description: "Vendor performance updated successfully",
      });
      setShowPerformanceDialog(false);
      fetchPerformanceData();
    } catch (error) {
      console.error('Error updating performance:', error);
      toast({
        title: "Error",
        description: "Failed to update vendor performance",
        variant: "destructive",
      });
    }
  };

  const handleCommunicationAdd = async () => {
    try {
      await apiClient.addVendorCommunication(vendorId, communicationForm);
      toast({
        title: "Success",
        description: "Communication record added successfully",
      });
      setShowCommunicationDialog(false);
      setCommunicationForm({ type: 'Email', subject: '', notes: '', initiatedBy: 'Company' });
      fetchPerformanceData();
    } catch (error) {
      console.error('Error adding communication:', error);
      toast({
        title: "Error",
        description: "Failed to add communication record",
        variant: "destructive",
      });
    }
  };

  const handlePaymentAdd = async () => {
    try {
      await apiClient.addVendorPayment(vendorId, paymentForm);
      toast({
        title: "Success",
        description: "Payment record added successfully",
      });
      setShowPaymentDialog(false);
      setPaymentForm({ amount: 0, invoiceNumber: '', paymentMethod: 'Bank Transfer', status: 'Pending', notes: '' });
      fetchPerformanceData();
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: "Error",
        description: "Failed to add payment record",
        variant: "destructive",
      });
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

  const getPerformanceColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-yellow-600';
    if (score >= 1.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Performance Metrics
            </span>
            <Dialog open={showPerformanceDialog} onOpenChange={setShowPerformanceDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Update Performance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Performance Metrics</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="onTimeDelivery">On-Time Delivery (%)</Label>
                    <Input
                      id="onTimeDelivery"
                      type="number"
                      min="0"
                      max="100"
                      value={performanceForm.onTimeDelivery}
                      onChange={(e) => setPerformanceForm({ ...performanceForm, onTimeDelivery: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="qualityRating">Quality Rating (1-5)</Label>
                    <Input
                      id="qualityRating"
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={performanceForm.qualityRating}
                      onChange={(e) => setPerformanceForm({ ...performanceForm, qualityRating: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="communicationRating">Communication Rating (1-5)</Label>
                    <Input
                      id="communicationRating"
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={performanceForm.communicationRating}
                      onChange={(e) => setPerformanceForm({ ...performanceForm, communicationRating: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceCompetitiveness">Price Competitiveness (1-5)</Label>
                    <Input
                      id="priceCompetitiveness"
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={performanceForm.priceCompetitiveness}
                      onChange={(e) => setPerformanceForm({ ...performanceForm, priceCompetitiveness: Number(e.target.value) })}
                    />
                  </div>
                  <Button onClick={handlePerformanceUpdate} className="w-full">
                    Update Performance
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {performanceMetrics ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-4 border rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground">On-Time Delivery</h4>
                <p className="text-2xl font-bold">{performanceMetrics.onTimeDelivery}%</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground">Quality Rating</h4>
                <p className={`text-2xl font-bold ${getPerformanceColor(performanceMetrics.qualityRating)}`}>
                  {performanceMetrics.qualityRating.toFixed(1)} ⭐
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground">Communication</h4>
                <p className={`text-2xl font-bold ${getPerformanceColor(performanceMetrics.communicationRating)}`}>
                  {performanceMetrics.communicationRating.toFixed(1)} ⭐
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground">Overall Score</h4>
                <p className={`text-2xl font-bold ${getPerformanceColor(performanceMetrics.overallScore)}`}>
                  {performanceMetrics.overallScore.toFixed(1)} ⭐
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No performance metrics available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Communication History
            </span>
            <Dialog open={showCommunicationDialog} onOpenChange={setShowCommunicationDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Communication
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Communication Record</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="commType">Type</Label>
                    <Select value={communicationForm.type} onValueChange={(value) => setCommunicationForm({ ...communicationForm, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Phone">Phone</SelectItem>
                        <SelectItem value="Meeting">Meeting</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={communicationForm.subject}
                      onChange={(e) => setCommunicationForm({ ...communicationForm, subject: e.target.value })}
                      placeholder="Communication subject"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={communicationForm.notes}
                      onChange={(e) => setCommunicationForm({ ...communicationForm, notes: e.target.value })}
                      placeholder="Communication details"
                    />
                  </div>
                  <div>
                    <Label htmlFor="initiatedBy">Initiated By</Label>
                    <Select value={communicationForm.initiatedBy} onValueChange={(value) => setCommunicationForm({ ...communicationForm, initiatedBy: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Company">Company</SelectItem>
                        <SelectItem value="Vendor">Vendor</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCommunicationAdd} className="w-full">
                    Add Communication
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {communicationHistory.length > 0 ? (
            <div className="space-y-4">
              {communicationHistory.map((comm) => (
                <div key={comm._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{comm.subject}</h4>
                    <p className="text-sm text-muted-foreground">
                      {comm.type} • {new Date(comm.date).toLocaleDateString()}
                    </p>
                    {comm.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{comm.notes}</p>
                    )}
                  </div>
                  <Badge variant="outline">{comm.initiatedBy}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No communication history available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment History
            </span>
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Payment Record</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                      placeholder="Payment amount"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      value={paymentForm.invoiceNumber}
                      onChange={(e) => setPaymentForm({ ...paymentForm, invoiceNumber: e.target.value })}
                      placeholder="Invoice number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={paymentForm.paymentMethod} onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentMethod: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={paymentForm.status} onValueChange={(value) => setPaymentForm({ ...paymentForm, status: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paymentNotes">Notes</Label>
                    <Textarea
                      id="paymentNotes"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      placeholder="Payment notes"
                    />
                  </div>
                  <Button onClick={handlePaymentAdd} className="w-full">
                    Add Payment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentHistory.length > 0 ? (
            <div className="space-y-4">
              {paymentHistory.map((payment) => (
                <div key={payment._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{formatCurrency(payment.amount)}</h4>
                    <p className="text-sm text-muted-foreground">
                      {payment.paymentMethod} • {new Date(payment.date).toLocaleDateString()}
                    </p>
                    {payment.invoiceNumber && (
                      <p className="text-sm text-muted-foreground">Invoice: {payment.invoiceNumber}</p>
                    )}
                    {payment.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{payment.notes}</p>
                    )}
                  </div>
                  <Badge className={getStatusColor(payment.status)}>
                    {payment.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No payment history available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
