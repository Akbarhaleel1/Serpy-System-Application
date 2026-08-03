#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'src/components/walkIn/CounterBillingDialog.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Fix the component structure
const fixedContent = `import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calculator, CreditCard, Banknote, Smartphone, Wallet } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface CounterBillingDialogProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentCompleted?: () => void;
}

interface JobDetails {
  id: string;
  customer_name: string;
  customer_phone: string;
  job_title: string;
  print_size: string;
  quantity: number;
  color_type: string;
  paper_type: string | null;
  binding: string | null;
  lamination: string | null;
  estimated_cost: number;
  advance_paid: number;
  remarks: string | null;
}

export const CounterBillingDialog: React.FC<CounterBillingDialogProps> = ({
  jobId,
  open,
  onOpenChange,
  onPaymentCompleted
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [billingData, setBillingData] = useState({
    finalAmount: 0,
    discountAmount: 0,
    taxAmount: 0,
    paymentMethod: "",
    remarks: ""
  });

  useEffect(() => {
    if (open && jobId) {
      fetchJobDetails();
    }
  }, [open, jobId]);

  const fetchJobDetails = async () => {
    try {
      console.log('🔧 API call from', 'src/components/walkIn/CounterBillingDialog.tsx');
      // TODO: Implement API call to fetch job details
      console.log('📋 API not yet implemented');
    } catch (error) {
      console.error("Error fetching job details:", error);
      toast({
        title: "Error",
        description: "Failed to load job details",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setBillingData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Recalculate final amount when discount changes
      if (field === 'discountAmount' && jobDetails) {
        const baseAmount = jobDetails.estimated_cost - jobDetails.advance_paid;
        const discountAmount = parseFloat(value) || 0;
        const taxAmount = (baseAmount - discountAmount) * 0.18; // 18% GST
        updated.finalAmount = baseAmount - discountAmount + taxAmount;
        updated.taxAmount = taxAmount;
      }
      
      return updated;
    });
  };

  const handlePayment = async () => {
    if (!jobDetails || !billingData.paymentMethod) {
      toast({
        title: "Error",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Update job status
      await apiClient.updateJob(jobId, {
        status: "paid",
        remarks: \`Payment collected: ₹\${billingData.finalAmount} via \${billingData.paymentMethod}\`
      });

      // Record payment
      await apiClient.createPayment({
        amount: billingData.finalAmount,
        payment_method: billingData.paymentMethod,
        payment_date: new Date().toISOString(),
        notes: \`Walk-in job payment: \${jobDetails.job_title}\`,
        reference_number: \`WI-\${jobId.slice(-8)}\`
      });

      toast({
        title: "Success",
        description: "Payment collected successfully!",
      });
      toast({
        title: "Info",
        description: "Receipt can be printed and WhatsApp notification sent",
      });
      
      onOpenChange(false);
      onPaymentCompleted?.();
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    if (!jobDetails) return;
    
    const receiptContent = \`
      PRINT SHOP RECEIPT
      ==================
      
      Customer: \${jobDetails.customer_name}
      Phone: \${jobDetails.customer_phone}
      Job: \${jobDetails.job_title}
      
      Details:
      - Size: \${jobDetails.print_size}
      - Quantity: \${jobDetails.quantity}
      - Color: \${jobDetails.color_type}
      \${jobDetails.paper_type ? \`- Paper: \${jobDetails.paper_type}\` : ''}
      \${jobDetails.binding ? \`- Binding: \${jobDetails.binding}\` : ''}
      \${jobDetails.lamination ? \`- Lamination: \${jobDetails.lamination}\` : ''}
      
      Pricing:
      - Estimated Cost: ₹\${jobDetails.estimated_cost}
      - Advance Paid: ₹\${jobDetails.advance_paid}
      - Discount: ₹\${billingData.discountAmount}
      - Tax (18%): ₹\${billingData.taxAmount}
      - Final Amount: ₹\${billingData.finalAmount}
      
      Payment Method: \${billingData.paymentMethod}
      
      Thank you for your business!
    \`;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(\`<pre>\${receiptContent}</pre>\`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Counter Billing & Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobDetails ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Customer</Label>
                    <p className="font-medium">{jobDetails.customer_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{jobDetails.customer_phone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Job Title</Label>
                    <p className="font-medium">{jobDetails.job_title}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Size</Label>
                    <p className="font-medium">{jobDetails.print_size}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Quantity</Label>
                    <p className="font-medium">{jobDetails.quantity}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Color</Label>
                    <p className="font-medium">{jobDetails.color_type}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Loading job details...</p>
              )}
            </CardContent>
          </Card>

          {/* Billing Section */}
          <Card>
            <CardHeader>
              <CardTitle>Billing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimated-cost">Estimated Cost</Label>
                  <Input
                    id="estimated-cost"
                    value={jobDetails?.estimated_cost || 0}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="advance-paid">Advance Paid</Label>
                  <Input
                    id="advance-paid"
                    value={jobDetails?.advance_paid || 0}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="discount">Discount Amount</Label>
                  <Input
                    id="discount"
                    type="number"
                    value={billingData.discountAmount}
                    onChange={(e) => handleInputChange('discountAmount', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="tax">Tax (18%)</Label>
                  <Input
                    id="tax"
                    value={billingData.taxAmount}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Final Amount:</span>
                <span>₹{billingData.finalAmount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={billingData.paymentMethod} onValueChange={(value) => handleInputChange('paymentMethod', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Card
                      </div>
                    </SelectItem>
                    <SelectItem value="upi">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        UPI
                      </div>
                    </SelectItem>
                    <SelectItem value="wallet">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Digital Wallet
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={billingData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={printReceipt} disabled={!jobDetails}>
              Print Receipt
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handlePayment} 
                disabled={!billingData.paymentMethod || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? "Processing..." : "Collect Payment"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
`;

// Write the fixed content
fs.writeFileSync(filePath, fixedContent, 'utf8');

console.log('✅ Fixed CounterBillingDialog.tsx');
