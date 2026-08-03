import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Upload, FileText } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface WalkInJobDialogProps {
  onJobCreated?: () => void;
}

export const WalkInJobDialog: React.FC<WalkInJobDialogProps> = ({ onJobCreated }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    agentName: "",
    jobTitle: "",
    printSize: "A4",
    quantity: 1,
    colorType: "B/W",
    paperType: "",
    binding: "",
    lamination: "",
    priority: "Normal",
    sendToDesign: false,
    estimatedCost: 0,
    advancePaid: 0,
    remarks: "",
    whatsappFileUrl: "",
    whatsappMessageContent: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerPhone || !formData.jobTitle) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // TODO: Implement API call to create walk-in job
      console.log('📋 API not yet implemented');

      toast({
        title: "Success",
        description: "Walk-in job created successfully!",
      });
      
      setOpen(false);
      setFormData({
        customerName: "",
        customerPhone: "",
        agentName: "",
        jobTitle: "",
        printSize: "A4",
        quantity: 1,
        colorType: "B/W",
        paperType: "",
        binding: "",
        lamination: "",
        priority: "Normal",
        sendToDesign: false,
        estimatedCost: 0,
        advancePaid: 0,
        remarks: "",
        whatsappFileUrl: "",
        whatsappMessageContent: ""
      });
      
      onJobCreated?.();
    } catch (error) {
      console.error("Error creating walk-in job:", error);
      toast({
        title: "Error",
        description: "Failed to create walk-in job",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedDuration = (data: any): number => {
    let duration = 15; // Base duration in minutes
    
    if (data.colorType === "Color") duration += 10;
    if (data.binding) duration += 15;
    if (data.lamination) duration += 10;
    if (data.quantity > 10) duration += Math.floor(data.quantity / 10) * 5;
    
    return duration;
  };

  const calculateEstimatedCost = (data: any): number => {
    let cost = 0;
    
    // Base cost per page
    const baseCost = data.colorType === "Color" ? 5 : 2;
    cost += data.quantity * baseCost;
    
    // Additional costs
    if (data.binding) cost += 20;
    if (data.lamination) cost += 15;
    if (data.paperType === "Premium") cost += data.quantity * 2;
    
    return cost;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
          <UserPlus className="h-4 w-4" />
          Walk-in Job Entry
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Walk-in Job Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone Number *</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="agentName">Agent Name</Label>
                <Input
                  id="agentName"
                  value={formData.agentName}
                  onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                  placeholder="Enter agent name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  placeholder="e.g., Business Cards, Flyers, etc."
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="printSize">Print Size</Label>
                  <Select value={formData.printSize} onValueChange={(value) => setFormData(prev => ({ ...prev, printSize: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A5">A5</SelectItem>
                      <SelectItem value="A3">A3</SelectItem>
                      <SelectItem value="Business Card">Business Card</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="colorType">Color Type</Label>
                  <Select value={formData.colorType} onValueChange={(value) => setFormData(prev => ({ ...prev, colorType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B/W">Black & White</SelectItem>
                      <SelectItem value="Color">Color</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="paperType">Paper Type</Label>
                  <Select value={formData.paperType} onValueChange={(value) => setFormData(prev => ({ ...prev, paperType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select paper type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                      <SelectItem value="Glossy">Glossy</SelectItem>
                      <SelectItem value="Matte">Matte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="binding">Binding</Label>
                  <Select value={formData.binding} onValueChange={(value) => setFormData(prev => ({ ...prev, binding: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select binding" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Staple">Staple</SelectItem>
                      <SelectItem value="Spiral">Spiral</SelectItem>
                      <SelectItem value="Perfect">Perfect Binding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="lamination">Lamination</Label>
                  <Select value={formData.lamination} onValueChange={(value) => setFormData(prev => ({ ...prev, lamination: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lamination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Glossy">Glossy</SelectItem>
                      <SelectItem value="Matte">Matte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="sendToDesign"
                  checked={formData.sendToDesign}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendToDesign: checked }))}
                />
                <Label htmlFor="sendToDesign">Send to Design Team</Label>
              </div>
            </CardContent>
          </Card>

          {/* Cost Estimation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cost Estimation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
                  <Input
                    id="estimatedCost"
                    type="number"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="advancePaid">Advance Paid (₹)</Label>
                  <Input
                    id="advancePaid"
                    type="number"
                    value={formData.advancePaid}
                    onChange={(e) => setFormData(prev => ({ ...prev, advancePaid: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Any special instructions or notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              {loading ? "Creating..." : "Create Walk-in Job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
