import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Search, User, Phone, UserPlus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface EmergencyOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  order_details: string;
  estimated_amount: number;
  priority: string;
  status: string;
  created_at: string;
  notes: string;
  job_id?: string;
}

export default function EmergencyOrders() {
  const [orders, setOrders] = useState<EmergencyOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    order_details: "",
    estimated_amount: "",
    priority: "high",
    notes: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEmergencyOrders();
  }, []);

  const fetchEmergencyOrders = async () => {
    try {
      const response = await apiClient.getEmergencyOrders();
      console.log('🚨 Emergency Orders response:', response);
      setOrders(response.data?.emergencyOrders || []);
    } catch (error) {
      console.error('Error fetching emergency orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch emergency orders",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.createEmergencyOrder({
        customerName: formData.customer_name,
        customerPhone: formData.customer_phone,
        orderDetails: formData.order_details,
        estimatedAmount: parseFloat(formData.estimated_amount),
        priority: formData.priority,
        notes: formData.notes
      });

      toast({
        title: "Success",
        description: "Emergency order created successfully",
      });

      // Reset form
      setFormData({
        customer_name: "",
        customer_phone: "",
        order_details: "",
        estimated_amount: "",
        priority: "high",
        notes: ""
      });
      
      setShowCreateDialog(false);
      fetchEmergencyOrders();
    } catch (error: any) {
      console.error('Error creating emergency order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create emergency order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const convertToFullJob = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const user = await apiClient.getCurrentUser();
      if (!user) throw new Error('User not authenticatedjobs')
        .insert([{
          user_id: user.id,
          title: `Emergency Order - ${order.customer_name}`,
          description: order.order_details,
          estimated_cost: order.estimated_amount,
          priority: order.priority,
          status: 'pending'
        }])
        .select()
        .single();

      if (jobError) throw jobError;

      // Update the emergency order with job reference

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Emergency order converted to full job",
      });

      fetchEmergencyOrders();
    } catch (error: any) {
      console.error('Error converting to job:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to convert to job",
        variant: "destructive",
      });
    }
  };

  const filteredOrders = orders.filter(order => 
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_phone.includes(searchTerm) ||
    order.order_details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'converted': return 'success';
      case 'completed': return 'default';
      case 'cancelled': return 'secondary';
      default: return 'warning';
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Emergency Orders</h1>
          <p className="text-muted-foreground">Quick orders for walk-ins and urgent requests</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Quick Order
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {orders.filter(o => o.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === 'converted').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Urgent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {orders.filter(o => o.priority === 'urgent' && o.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search orders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <h3 className="font-semibold">{order.customer_name}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {order.customer_phone}
                    </div>
                    <Badge variant={getPriorityColor(order.priority)}>
                      {order.priority.toUpperCase()}
                    </Badge>
                    <Badge variant={getStatusColor(order.status)}>
                      {order.status.toUpperCase()}
                    </Badge>
                    {order.priority === 'urgent' && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Order Details:</span>
                      <p className="font-medium">{order.order_details}</p>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Estimated Amount:</span>
                      <p className="font-bold text-lg">₹{order.estimated_amount.toLocaleString()}</p>
                    </div>
                    
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <p>{format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  </div>
                  
                  {order.notes && (
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Notes:</span>
                      <p className="text-muted-foreground">{order.notes}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {order.status === 'pending' && (
                    <Button
                      onClick={() => convertToFullJob(order.id)}
                      size="sm"
                      className="gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Convert to Job
                    </Button>
                  )}
                  
                  {order.status === 'converted' && (
                    <Badge variant="success">Converted to Job</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No emergency orders found</h3>
          <p className="text-muted-foreground">Create your first quick order for walk-in customers.</p>
        </div>
      )}

      {/* Create Order Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Quick Order</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="Walk-in customer"
                required
              />
            </div>

            <div>
              <Label htmlFor="customer_phone">Phone Number *</Label>
              <Input
                id="customer_phone"
                value={formData.customer_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                placeholder="+91 9876543210"
                required
              />
            </div>

            <div>
              <Label htmlFor="order_details">Order Details *</Label>
              <Textarea
                id="order_details"
                value={formData.order_details}
                onChange={(e) => setFormData(prev => ({ ...prev, order_details: e.target.value }))}
                placeholder="Quick description of the printing job"
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated_amount">Estimated Amount</Label>
                <Input
                  id="estimated_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimated_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_amount: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any special requirements or notes"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Quick Order"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}