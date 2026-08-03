import apiClient from "@/lib/apiClient";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, MessageSquare, FileText, Clock } from "lucide-react";

import { useToast } from "@/hooks/use-toast";

interface BillApprovalDialogProps {
  children: React.ReactNode;
  invoice: {
    id: string;
    invoice_number: string;
    customer_id: string;
    total_amount: number;
    approval_status: string;
    billing_type: string;
    customer?: {
      name: string;
      company?: string;
      phone?: string;
    };
    invoice_items?: Array<{
      item_name: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }>;
  };
  onApprovalUpdate?: () => void;
}

export const BillApprovalDialog = ({ children, invoice, onApprovalUpdate }: BillApprovalDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const { toast } = useToast();

  const handleApproval = async (status: "approved" | "rejected" | "pending") => {
    setLoading(true);
    try {
      const { data: userData } = await apiClient.getCurrentUser();
      if (!userData.user) throw new Error("User not authenticated");

      const updateData = {
        approval_status: status,
        approved_by: userData.user.email || "Admin",
        approved_at: new Date().toISOString(),
      };

      

      // Send WhatsApp notification if approved and phone available
      if (status === "approved" && invoice.customer?.phone) {
        try {
          await apiClient.createwhatsapp_messages({
            user_id: userData.user.id,
            customer_phone: invoice.customer.phone,
            message_type: "bill_approval",
            message_content: `Your bill ${invoice.invoice_number} for ₹${invoice.total_amount} has been approved and is ready for payment.`,
          });
        } catch (whatsappError) {
          console.error("WhatsApp notification failed:", whatsappError);
        }
      }

      toast({
        title: "Success",
        description: `Bill ${status === "approved" ? "approved" : "rejected"} successfully`,
      });

      setOpen(false);
      onApprovalUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bill Approval - {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Current Status
                <Badge className={getStatusColor(invoice.approval_status)}>
                  <Clock className="h-3 w-3 mr-1" />
                  {invoice.approval_status.charAt(0).toUpperCase() + invoice.approval_status.slice(1)}
                </Badge>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Customer Name</Label>
                  <p className="font-semibold">{invoice.customer?.name}</p>
                </div>
                {invoice.customer?.company && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Company</Label>
                    <p className="font-semibold">{invoice.customer.company}</p>
                  </div>
                )}
                {invoice.customer?.phone && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Phone</Label>
                    <p className="font-semibold">{invoice.customer.phone}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-600">Billing Type</Label>
                  <Badge variant={invoice.billing_type === "b2b" ? "default" : "secondary"}>
                    {invoice.billing_type.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          {invoice.invoice_items && invoice.invoice_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoice.invoice_items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.item_name}</p>
                        <p className="text-sm text-gray-600">
                          Qty: {item.quantity} × ₹{item.unit_price}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{item.line_total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-xl font-bold text-primary">₹{invoice.total_amount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approval Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Approval Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="notes">Add notes for this approval decision</Label>
              <Textarea
                id="notes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Enter any notes about this approval decision..."
                rows={3}
                className="mt-2"
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            
            {invoice.approval_status === "pending" && (
              <>
                <Button 
                  variant="destructive" 
                  onClick={() => handleApproval("rejected")}
                  disabled={loading}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Bill
                </Button>
                <Button 
                  onClick={() => handleApproval("approved")}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Bill
                </Button>
              </>
            )}

            {invoice.approval_status !== "pending" && (
              <Button 
                onClick={() => handleApproval("pending")}
                disabled={loading}
                variant="outline"
              >
                <Clock className="h-4 w-4 mr-2" />
                Reset to Pending
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};