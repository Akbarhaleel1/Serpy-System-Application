import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, User, Briefcase, Plus, CheckCircle, Search } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

interface QuickPrintDialogProps {
  onJobCreated?: () => void;
}

interface CustomerData {
  name: string;
  phone: string;
  email: string;
}

interface JobData {
  title: string;
  description: string;
  priority: string;
  estimatedCost: string;
  dueDate: string;
}

export const QuickPrintDialog = ({ onJobCreated }: QuickPrintDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectOpen, setSelectOpen] = useState(false);
  
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "",
    phone: "",
    email: ""
  });

  const [jobData, setJobData] = useState<JobData>({
    title: "",
    description: "",
    priority: "high",
    estimatedCost: "",
    dueDate: ""
  });

  const { toast } = useToast();

  const fetchExistingCustomers = async () => {
    try {
      const response = await apiClient.getCustomers();
      console.log('Fetched customers:', response.customers);
      setExistingCustomers(response.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      fetchExistingCustomers();
      // Set default due date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setJobData(prev => ({
        ...prev,
        dueDate: tomorrow.toISOString().split('T')[0]
      }));
    } else {
      // Reset form when closing
      setStep(1);
      setUseExistingCustomer(false);
      setSelectedCustomerId("");
      setCustomerSearch("");
      setSelectOpen(false);
      setCustomerData({ name: "", phone: "", email: "" });
      setJobData({ title: "", description: "", priority: "high", estimatedCost: "", dueDate: "" });
    }
  };

  const handleCreateQuickJob = async () => {
    if (step === 1) {
      // Validate customer data
      if (!useExistingCustomer && !customerData.name.trim()) {
        toast({
          title: "Error",
          description: "Customer name is required",
          variant: "destructive"
        });
        return;
      }
      if (useExistingCustomer && !selectedCustomerId) {
        toast({
          title: "Error", 
          description: "Please select a customer",
          variant: "destructive"
        });
        return;
      }
      setStep(2);
      return;
    }

    // Validate job data
    if (!jobData.title.trim()) {
      toast({
        title: "Error",
        description: "Job title is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      let customerId = selectedCustomerId;

      // Create new customer if not using existing
      if (!useExistingCustomer) {
        const newCustomer = await apiClient.createCustomer({
          name: customerData.name,
          phone: customerData.phone || null,
          email: customerData.email || null,
          status: 'active'
        });
        customerId = newCustomer.id;
      }

      // Create the job
      const newJob = await apiClient.createJob({
        title: jobData.title,
        description: jobData.description || null,
        customerId: customerId,
        priority: jobData.priority,
        status: 'pending',
        estimatedCost: jobData.estimatedCost ? parseFloat(jobData.estimatedCost) : null,
        dueDate: jobData.dueDate ? new Date(jobData.dueDate).toISOString() : null
      });

      toast({
        title: "Quick Print Job Created!",
        description: `Job "${jobData.title}" has been created successfully for ${useExistingCustomer ? 'selected customer' : customerData.name}`,
      });

      setStep(3); // Success step
      onJobCreated?.();
      
      // Auto close after 2 seconds
      setTimeout(() => {
        setOpen(false);
      }, 2000);

    } catch (error: any) {
      console.error("Quick print error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create quick print job. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
        <User className="h-5 w-5 text-orange-600" />
        <div>
          <h3 className="font-medium text-orange-900">Customer Information</h3>
          <p className="text-sm text-orange-700">Add customer details for this print job</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={!useExistingCustomer ? "gradient" : "outline"}
            onClick={() => setUseExistingCustomer(false)}
            className="flex-1"
          >
            New Customer
          </Button>
          <Button
            type="button"
            variant={useExistingCustomer ? "gradient" : "outline"}
            onClick={() => setUseExistingCustomer(true)}
            className="flex-1"
          >
            Existing Customer
          </Button>
        </div>

        {useExistingCustomer ? (
          <div className="space-y-2">
            <Label>Select Customer</Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone number"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    // Auto-open dropdown when user starts typing
                    if (e.target.value.trim() && !selectOpen) {
                      setSelectOpen(true);
                    }
                    // Clear selection when search changes
                    if (selectedCustomerId) {
                      setSelectedCustomerId("");
                    }
                  }}
                  className="pl-10 hover-orange"
                />
              </div>
              <Select 
                key={customerSearch} // Force re-render when search changes
                value={selectedCustomerId} 
                onValueChange={(value) => {
                  setSelectedCustomerId(value);
                  setSelectOpen(false); // Close after selection
                }}
                open={selectOpen}
                onOpenChange={setSelectOpen}
              >
                <SelectTrigger className="hover-orange">
                  <SelectValue placeholder="Choose existing customer" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    let filtered = existingCustomers;
                    
                    // Only filter if there's a search term
                    if (customerSearch.trim()) {
                      const searchLower = customerSearch.toLowerCase();
                      filtered = existingCustomers.filter((customer: any) => {
                        const nameMatch = customer.name?.toLowerCase().includes(searchLower);
                        const phoneMatch = customer.phone?.includes(customerSearch);
                        return nameMatch || phoneMatch;
                      });
                    }
                    
                    if (filtered.length === 0 && customerSearch.trim()) {
                      return (
                        <div className="p-2 text-sm text-muted-foreground">
                          No customers found matching "{customerSearch}"
                        </div>
                      );
                    }
                    
                    return filtered.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.phone && `(${customer.phone})`}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                placeholder="Enter customer name"
                value={customerData.name}
                onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
                className="hover-orange"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  placeholder="Phone number"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                  className="hover-orange"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="Email address"
                  value={customerData.email}
                  onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                  className="hover-orange"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
        <Briefcase className="h-5 w-5 text-orange-600" />
        <div>
          <h3 className="font-medium text-orange-900">Job Details</h3>
          <p className="text-sm text-orange-700">Define the print job requirements</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="jobTitle">Job Title *</Label>
          <Input
            id="jobTitle"
            placeholder="e.g., Business Cards, Flyers, Banners"
            value={jobData.title}
            onChange={(e) => setJobData(prev => ({ ...prev, title: e.target.value }))}
            className="hover-orange"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobDescription">Description</Label>
          <Textarea
            id="jobDescription"
            placeholder="Job specifications, quantity, size, colors, etc."
            value={jobData.description}
            onChange={(e) => setJobData(prev => ({ ...prev, description: e.target.value }))}
            className="hover-orange min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select 
              value={jobData.priority} 
              onValueChange={(value) => setJobData(prev => ({ ...prev, priority: value }))}
            >
              <SelectTrigger className="hover-orange">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High (Urgent)</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedCost">Estimated Cost (₹)</Label>
            <Input
              id="estimatedCost"
              type="number"
              placeholder="0.00"
              value={jobData.estimatedCost}
              onChange={(e) => setJobData(prev => ({ ...prev, estimatedCost: e.target.value }))}
              className="hover-orange"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={jobData.dueDate}
            onChange={(e) => setJobData(prev => ({ ...prev, dueDate: e.target.value }))}
            className="hover-orange"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="text-center space-y-4 py-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-green-900">Job Created Successfully!</h3>
        <p className="text-sm text-green-700 mt-1">
          Your quick print job has been added and is ready for processing.
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          className="gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          size="sm"
        >
          <Zap className="h-5 w-5" />
          Quick Print
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            Quick Print Job - Step {step} of 2
          </DialogTitle>
        </DialogHeader>
        
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {step < 3 && (
          <div className="flex justify-between pt-4">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                Back
              </Button>
            )}
            <div className="ml-auto">
              <Button
                onClick={handleCreateQuickJob}
                variant="gradient"
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  "Processing..."
                ) : step === 1 ? (
                  "Next Step"
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Job
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};