import { useState, useEffect } from "react";
import { Plus, Search, Percent, Users, Tag, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";

interface DiscountRule {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'bulk';
  value: number;
  minimumAmount?: number;
  customerType?: 'all' | 'specific' | 'new' | 'returning';
  customerIds?: string[];
  jobTypes?: string[];
  validFrom: Date;
  validUntil?: Date;
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
  description?: string;
}

interface CustomerPricing {
  id: string;
  customerId: string;
  customerName: string;
  discountPercentage: number;
  specialRates: {
    jobType: string;
    rate: number;
  }[];
  isActive: boolean;
  notes?: string;
}

const Discounts = () => {
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);
  const [customerPricing, setCustomerPricing] = useState<CustomerPricing[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'rules' | 'customers'>('rules');
  const [isCreateRuleDialogOpen, setIsCreateRuleDialogOpen] = useState(false);
  const [isCreateCustomerPricingDialogOpen, setIsCreateCustomerPricingDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch data from API
  useEffect(() => {
    fetchDiscountData();
  }, []);

  const fetchDiscountData = async () => {
    try {
      const [discountRulesResponse, customerPricingResponse] = await Promise.all([
        apiClient.getDiscountRules(),
        apiClient.getCustomerPricing()
      ]);

      console.log('💰 Discount data response:', { discountRulesResponse, customerPricingResponse });
      
      setDiscountRules(discountRulesResponse.data?.discountRules || []);
      setCustomerPricing(customerPricingResponse.data?.customerPricing || []);
    } catch (error) {
      console.error('Error fetching discount data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch discount data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscountRule = async (ruleData: any) => {
    try {
      await apiClient.createDiscountRule(ruleData);
      toast({
        title: "Success",
        description: "Discount rule created successfully!",
      });
      fetchDiscountData(); // Refresh data
    } catch (error) {
      console.error('Error creating discount rule:', error);
      toast({
        title: "Error",
        description: "Failed to create discount rule",
        variant: "destructive",
      });
    }
  };

  const handleCreateCustomerPricing = async (pricingData: any) => {
    try {
      await apiClient.createCustomerPricing(pricingData);
      toast({
        title: "Success",
        description: "Customer pricing created successfully!",
      });
      fetchDiscountData(); // Refresh data
    } catch (error) {
      console.error('Error creating customer pricing:', error);
      toast({
        title: "Error",
        description: "Failed to create customer pricing",
        variant: "destructive",
      });
    }
  };

  const createDiscountRule = (data: Omit<DiscountRule, 'id' | 'usageCount'>) => {
    const newRule: DiscountRule = {
      ...data,
      id: `rule-${Date.now()}`,
      usageCount: 0
    };

    setDiscountRules(prev => [...prev, newRule]);
    setIsCreateRuleDialogOpen(false);
    
    toast({
      title: "Discount Rule Created",
      description: `${data.name} has been created successfully.`,
    });
  };

  const createCustomerPricing = (data: Omit<CustomerPricing, 'id'>) => {
    const newPricing: CustomerPricing = {
      ...data,
      id: `pricing-${Date.now()}`
    };

    setCustomerPricing(prev => [...prev, newPricing]);
    setIsCreateCustomerPricingDialogOpen(false);
    
    toast({
      title: "Customer Pricing Created",
      description: `Pricing for ${data.customerName} has been set up.`,
    });
  };

  const filteredRules = discountRules.filter(rule =>
    rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomerPricing = customerPricing.filter(pricing =>
    pricing.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDiscountTypeColor = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'bg-blue-100 text-blue-800';
      case 'fixed':
        return 'bg-green-100 text-green-800';
      case 'bulk':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discounts & Pricing</h1>
          <p className="text-muted-foreground">Manage discount rules and customer-specific pricing</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateRuleDialogOpen} onOpenChange={setIsCreateRuleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="gap-2">
                <Percent className="h-4 w-4" />
                New Discount Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Discount Rule</DialogTitle>
                <DialogDescription>
                  Set up a new discount rule for orders or customers.
                </DialogDescription>
              </DialogHeader>
              <CreateDiscountRuleForm onSubmit={handleCreateDiscountRule} />
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateCustomerPricingDialogOpen} onOpenChange={setIsCreateCustomerPricingDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Customer Pricing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Set Customer Pricing</DialogTitle>
                <DialogDescription>
                  Configure special pricing for a specific customer.
                </DialogDescription>
              </DialogHeader>
              <CreateCustomerPricingForm onSubmit={handleCreateCustomerPricing} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{discountRules.filter(r => r.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Special Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerPricing.filter(p => p.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{discountRules.reduce((sum, r) => sum + r.usageCount, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Discount</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {discountRules.length > 0 
                ? Math.round(discountRules.reduce((sum, r) => sum + r.value, 0) / discountRules.length)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'rules' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('rules')}
        >
          Discount Rules
        </Button>
        <Button
          variant={activeTab === 'customers' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('customers')}
        >
          Customer Pricing
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Content based on active tab */}
      {activeTab === 'rules' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">{rule.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                  <div className="flex gap-2 flex-col">
                    <Badge className={getDiscountTypeColor(rule.type)}>
                      {rule.type}
                    </Badge>
                    {rule.isActive ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {rule.type === 'percentage' ? `${rule.value}%` : `₹${rule.value}`}
                  </div>
                  {rule.minimumAmount && (
                    <p className="text-sm text-muted-foreground">
                      Min: ₹{rule.minimumAmount}
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer Type:</span>
                    <span className="capitalize">{rule.customerType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Usage:</span>
                    <span>{rule.usageCount}{rule.usageLimit && ` / ${rule.usageLimit}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valid Until:</span>
                    <span>{rule.validUntil ? rule.validUntil.toLocaleDateString() : 'No limit'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomerPricing.map((pricing) => (
            <Card key={pricing.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">{pricing.customerName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{pricing.notes}</p>
                  </div>
                  {pricing.isActive ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{pricing.discountPercentage}%</div>
                  <p className="text-sm text-muted-foreground">Base Discount</p>
                </div>

                {pricing.specialRates.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Special Rates:</h4>
                    {pricing.specialRates.map((rate, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{rate.jobType}:</span>
                        <span>₹{rate.rate}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Create Discount Rule Form Component
interface CreateDiscountRuleFormProps {
  onSubmit: (data: Omit<DiscountRule, 'id' | 'usageCount'>) => void;
}

function CreateDiscountRuleForm({ onSubmit }: CreateDiscountRuleFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "percentage" as const,
    value: 0,
    minimumAmount: 0,
    customerType: "all" as const,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: "",
    isActive: true,
    usageLimit: 0,
    description: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: Omit<DiscountRule, 'id' | 'usageCount'> = {
      ...formData,
      validFrom: new Date(formData.validFrom),
      validUntil: formData.validUntil ? new Date(formData.validUntil) : undefined,
      minimumAmount: formData.minimumAmount || undefined,
      usageLimit: formData.usageLimit || undefined
    };
    
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rule Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="New Customer Discount"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed Amount</SelectItem>
              <SelectItem value="bulk">Bulk Discount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Value</Label>
          <Input
            type="number"
            value={formData.value}
            onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
            placeholder={formData.type === 'percentage' ? '15' : '500'}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label>Minimum Amount (optional)</Label>
          <Input
            type="number"
            value={formData.minimumAmount}
            onChange={(e) => setFormData(prev => ({ ...prev, minimumAmount: parseFloat(e.target.value) || 0 }))}
            placeholder="5000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Customer Type</Label>
        <Select value={formData.customerType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, customerType: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            <SelectItem value="new">New Customers</SelectItem>
            <SelectItem value="returning">Returning Customers</SelectItem>
            <SelectItem value="specific">Specific Customers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Valid From</Label>
          <Input
            type="date"
            value={formData.validFrom}
            onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label>Valid Until (optional)</Label>
          <Input
            type="date"
            value={formData.validUntil}
            onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Usage Limit (optional)</Label>
        <Input
          type="number"
          value={formData.usageLimit}
          onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: parseInt(e.target.value) || 0 }))}
          placeholder="100"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe this discount rule..."
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
        />
        <Label>Active</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit">Create Rule</Button>
      </div>
    </form>
  );
}

// Create Customer Pricing Form Component
interface CreateCustomerPricingFormProps {
  onSubmit: (data: Omit<CustomerPricing, 'id'>) => void;
}

function CreateCustomerPricingForm({ onSubmit }: CreateCustomerPricingFormProps) {
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    discountPercentage: 0,
    isActive: true,
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: Omit<CustomerPricing, 'id'> = {
      ...formData,
      specialRates: [] // Can be extended to allow adding special rates
    };
    
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Customer ID</Label>
          <Input
            value={formData.customerId}
            onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
            placeholder="CUST-001"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label>Customer Name</Label>
          <Input
            value={formData.customerName}
            onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
            placeholder="ABC Corporation"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Discount Percentage</Label>
        <Input
          type="number"
          value={formData.discountPercentage}
          onChange={(e) => setFormData(prev => ({ ...prev, discountPercentage: parseFloat(e.target.value) || 0 }))}
          placeholder="25"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Special agreements, volume commitments, etc."
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
        />
        <Label>Active</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit">Create Pricing</Button>
      </div>
    </form>
  );
}

export default Discounts;