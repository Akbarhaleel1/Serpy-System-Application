import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient";
import { Search, User, Mail, Phone, Plus, Trash2 } from "lucide-react";
import { JobInvoiceDialog } from "./JobInvoiceDialog";
import { ViewInvoiceDialog } from "../invoices/ViewInvoiceDialog";

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobCreated: () => void;
  customers?: any[];
  onCustomersUpdate?: () => void;
  preselectedCustomer?: any;
}

interface InvoiceItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  hsnCode?: string;
  gstRate: number;
  itemTotal: number;
  itemType?: 'Numbers' | 'Square Feet';
  unit?: string; // unit from inventory (pieces, boxes, sqft, sqm, etc.)
  length?: number;
  width?: number;
  totalSquareFeet?: number;
}

interface DesignCharge {
  amount: number;
  sacCode: string;
  gstRate: number;
  totalAmount: number;
}

export function CreateJobDialog({
  open,
  onOpenChange,
  onJobCreated,
  customers = [],
  preselectedCustomer,
  onCustomersUpdate
}: CreateJobDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    customerId: preselectedCustomer?.id || "",
    priority: "medium" as 'low' | 'medium' | 'high',
    status: "inquiry" as 'inquiry' | 'quotation_sent' | 'quotation_approved' | 'design_in_progress' | 'design_approved' | 'production_ready' | 'ready_for_print' | 'quality_check' | 'completed' | 'delivered' | 'cancelled',
    estimatedCost: "",
    dueDate: "",
    notes: "",
    items: [] as InvoiceItem[],
    designCharge: null as DesignCharge | null
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(preselectedCustomer || null);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [safeCustomers, setSafeCustomers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({});
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [hsnCodes, setHsnCodes] = useState<any[]>([]);
  const [sacCodes, setSacCodes] = useState<any[]>([]);
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [showInvoiceQuestion, setShowInvoiceQuestion] = useState(false);
  const [showInvoiceCreation, setShowInvoiceCreation] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [createdJob, setCreatedJob] = useState<any>(null);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const invoiceTriggerRef = useRef<HTMLButtonElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchInventoryItems();
      fetchHsnCodes();
      fetchSacCodes();
    }
  }, [open]);

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.autocomplete-container')) {
        setShowSuggestions({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchCustomers = async () => {
    try {
      console.log('fetchCustomers is working')
      const response = await apiClient.getCustomer();
      console.log('response', response)
      setSafeCustomers(response.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const response = await apiClient.getInventory();
      const inventoryData = Array.isArray(response) ? response : (response?.inventory || []);
      setInventoryItems(inventoryData);
      console.log('🔍 Inventory items loaded:', inventoryData.length);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    }
  };

  const fetchHsnCodes = async () => {
    try {
      const response = await apiClient.getHsnCodes();
      console.log('response', response)
      const hsnData = Array.isArray(response) ? response : (response?.hsnCodes || []);
      setHsnCodes(hsnData);
      console.log('🔍 HSN codes loaded:', hsnData.length);
    } catch (error) {
      console.error('Error fetching HSN codes:', error);
    }
  };

  const fetchSacCodes = async () => {
    try {
      const response = await apiClient.getSacCodes();
      console.log('SAC codes response:', response);
      const sacData = Array.isArray(response) ? response : (response?.sacCodes || []);
      setSacCodes(sacData);
      console.log('🔍 SAC codes loaded:', sacData.length);
    } catch (error) {
      console.error('Error fetching SAC codes:', error);
    }
  };

  // Filter customers based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCustomers(safeCustomers.slice(0, 5));
    } else {
      const filtered = safeCustomers.filter(customer =>
        customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.includes(searchQuery)
      ).slice(0, 5);
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, safeCustomers]);

  // Update selected customer when preselectedCustomer changes
  useEffect(() => {
    if (preselectedCustomer) {
      setSelectedCustomer(preselectedCustomer);
      setFormData(prev => ({
        ...prev,
        customerId: preselectedCustomer.id || ""
      }));
    }
  }, [preselectedCustomer]);

  // Invoice Items Functions
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemName: '',
          quantity: 1,
          unitPrice: '' as any,
          hsnCode: '',
          gstRate: 18,
          itemTotal: 0,
          itemType: 'Numbers',
          unit: 'pieces',
          length: undefined,
          width: undefined,
          totalSquareFeet: 0
        }
      ]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    setShowSuggestions(prev => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      const item = newItems[index];

      // Handle Square Feet items differently
      if (item.itemType === 'Square Feet') {
        // Calculate total square feet if length and width are provided
        if (item.length && item.width) {
          item.totalSquareFeet = item.length * item.width;
          const subtotal = item.totalSquareFeet * item.unitPrice;
          const gstAmount = (subtotal * item.gstRate) / 100;
          item.itemTotal = subtotal + gstAmount;
        } else {
          item.itemTotal = 0;
        }
      } else {
        // Handle regular quantity items
        const subtotal = item.quantity * item.unitPrice;
        const gstAmount = (subtotal * item.gstRate) / 100;
        item.itemTotal = subtotal + gstAmount;
      }

      return { ...prev, items: newItems };
    });
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customerId: customer.id || customer._id
    }));
    setSearchQuery(customer.name);
    setShowCustomerResults(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim() && !selectedCustomer) {
      setShowCustomerResults(true);
    } else {
      setShowCustomerResults(false);
    }
  };

  const clearCustomerSelection = () => {
    setSelectedCustomer(null);
    setSearchQuery("");
    setFormData(prev => ({
      ...prev,
      customerId: ""
    }));
    setShowCustomerResults(false);
  };

  const handleAddCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter at least a customer name",
        variant: "destructive",
      });
      return;
    }

    setCreatingCustomer(true);
    try {
      const customerData = {
        name: newCustomerData.name,
        email: newCustomerData.email || undefined,
        phone: newCustomerData.phone || undefined,
        address: newCustomerData.address || undefined,
      };

      console.log('📋 Creating customer with data:', customerData);

      const response = await apiClient.createCustomer(customerData);
      console.log('📋 Customer creation response:', response);

      toast({
        title: "Customer Created",
        description: "Customer has been created successfully",
      });

      const newCustomer = response?.customer || response;
      console.log('newCustomer', newCustomer)
      setSafeCustomers(prev => [...prev, newCustomer]);

      setNewCustomerData({
        name: "",
        email: "",
        phone: "",
        address: ""
      });
      setShowAddCustomerForm(false);

      if (onCustomersUpdate) {
        onCustomersUpdate();
      }

      handleCustomerSelect(newCustomer);

    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      });
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleGenerateInvoiceDirectly = async () => {
    if (!createdJob) return;

    setIsGeneratingInvoice(true);
    try {
      console.log('📄 Generating invoice directly for job:', createdJob._id);

      // Calculate totals from job items and design charge
      let itemsSubtotal = 0;
      let itemsTax = 0;

      if (createdJob.items && Array.isArray(createdJob.items)) {
        createdJob.items.forEach((item: any) => {
          // Calculate subtotal based on itemType (Square Feet vs Numbers)
          const itemSubtotal = item.itemType === 'Square Feet'
            ? (item.totalSquareFeet || 0) * item.unitPrice
            : (item.quantity || 0) * item.unitPrice;

          itemsSubtotal += itemSubtotal;

          // Calculate tax from subtotal
          const itemTax = itemSubtotal * (item.gstRate / 100);
          itemsTax += itemTax;
        });
      }

      let designChargeSubtotal = 0;
      let designChargeTax = 0;

      if (createdJob.designCharge) {
        designChargeSubtotal = createdJob.designCharge.amount || 0;
        designChargeTax = createdJob.designCharge.totalAmount - createdJob.designCharge.amount || 0;
      }

      const grandSubtotal = itemsSubtotal + designChargeSubtotal;
      const grandTax = itemsTax + designChargeTax;
      const grandTotal = grandSubtotal + grandTax;

      // Build invoice items - preserve all necessary fields for backend
      const items = (createdJob.items || []).map((item: any) => ({
        itemName: item.itemName,
        itemType: item.itemType || 'Numbers',  // Pass itemType to backend
        quantity: item.quantity || 0,  // Send actual quantity field
        totalSquareFeet: item.totalSquareFeet || 0,  // Send actual totalSquareFeet field
        length: item.length || 0,  // Send length for square feet items
        width: item.width || 0,    // Send width for square feet items
        unitPrice: item.unitPrice,
        hsnCode: item.hsnCode,
        gstRate: item.gstRate,
        itemTotal: item.itemTotal || 0
      }));

      // Set invoice date to today and due date to 30 days from today
      const invoiceDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const invoiceData = {
        jobId: createdJob._id,
        customerId: createdJob.customerId,
        billingType: 'b2c',
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        items: items,
        designCharge: createdJob.designCharge || null,
        subtotal: grandSubtotal,
        taxAmount: grandTax,
        totalAmount: grandTotal,
        paymentTerms: 'Immediate',
        notes: createdJob.notes || '',
        po_reference: '',
        terms_conditions: '',
        isInterstate: false,
        customerGSTIN: ''
      };

      console.log('📄 Creating invoice with data:', invoiceData);

      const response = await apiClient.createInvoice(invoiceData);
      console.log('📄 Invoice created:', response);

      const invoiceId = response?.invoice?._id || response?._id || response?.id;

      if (!invoiceId) {
        throw new Error('Invoice ID not received from server');
      }

      setCreatedInvoice(response?.invoice || response);

      toast({
        title: "Success",
        description: "Invoice generated successfully",
      });

      // Close the question dialog and show the invoice
      setShowInvoiceQuestion(false);
      setShowInvoiceCreation(false);
      setShowInvoiceView(true);

      // Optionally auto-download PDF after a delay
      setTimeout(async () => {
        try {
          console.log('📥 Auto-downloading PDF for invoice:', invoiceId);
          await apiClient.downloadInvoicePDF(invoiceId);
          console.log('✅ PDF downloaded automatically');
        } catch (downloadError) {
          console.error('Error auto-downloading PDF:', downloadError);
          // Don't show error to user since invoice is already created
        }
      }, 500);

    } catch (error: any) {
      console.error('Error generating invoice:', error);
      if (error.stockCheck?.length > 0) {
        const lines = (error.details as string[]) || error.stockCheck.map((s: any) =>
          `"${s.itemName}": Available ${s.availableQuantity}, Required ${s.requiredQuantity} (${s.unit})`
        );
        toast({
          title: "Insufficient Stock",
          description: lines.join('\n'),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to generate invoice",
          variant: "destructive",
        });
      }
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title || !formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Job title is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.customerId) {
      toast({
        title: "Validation Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    // Validate items if present
    if (formData.items && formData.items.length > 0) {
      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];

        // Validate item name
        if (!item.itemName || !item.itemName.trim()) {
          toast({
            title: "Validation Error",
            description: `Item ${i + 1}: Item name is required`,
            variant: "destructive",
          });
          return;
        }

        // Validate based on item type
        if (item.itemType === 'Square Feet') {
          // Validate length and width for Square Feet items
          if (!item.length || item.length <= 0) {
            toast({
              title: "Validation Error",
              description: `Item ${i + 1}: Length is required for Square Feet items`,
              variant: "destructive",
            });
            return;
          }
          if (!item.width || item.width <= 0) {
            toast({
              title: "Validation Error",
              description: `Item ${i + 1}: Width is required for Square Feet items`,
              variant: "destructive",
            });
            return;
          }
        } else {
          // Validate quantity for Numbers items
          if (!item.quantity || item.quantity <= 0) {
            toast({
              title: "Validation Error",
              description: `Item ${i + 1}: Quantity must be greater than 0`,
              variant: "destructive",
            });
            return;
          }
        }

        // Validate unit price
        if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice < 0) {
          toast({
            title: "Validation Error",
            description: `Item ${i + 1}: Unit price is required and cannot be negative`,
            variant: "destructive",
          });
          return;
        }

        // Validate GST Rate
        if (item.gstRate === undefined || item.gstRate === null || item.gstRate < 0 || item.gstRate > 100) {
          toast({
            title: "Validation Error",
            description: `Item ${i + 1}: GST Rate must be between 0 and 100`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Validate design charge if present
    if (formData.designCharge) {
      if (!formData.designCharge.sacCode || !formData.designCharge.sacCode.trim()) {
        toast({
          title: "Validation Error",
          description: "Please select SAC Code for design charge",
          variant: "destructive",
        });
        return;
      }
      if (!formData.designCharge.amount || formData.designCharge.amount <= 0) {
        toast({
          title: "Validation Error",
          description: "Design charge amount must be greater than 0",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const jobData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        customerId: formData.customerId,
        priority: formData.priority,
        status: formData.status,
        estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : 0,
        dueDate: formData.dueDate || null,
        notes: formData.notes.trim(),
        items: formData.items,
        designCharge: formData.designCharge
      };

      console.log('📋 Creating job with data:', jobData);

      const response = await apiClient.createJob(jobData);
      console.log('📋 Job creation response:', response);

      toast({
        title: "Success",
        description: "Job has been created successfully",
      });

      // Store the created job and show invoice question dialog
      const createdJobData = response?.job || response;
      setCreatedJob(createdJobData);
      setCreatedJobId(createdJobData?._id || createdJobData?.id);
      setShowInvoiceQuestion(true);

      // Reset form
      setFormData({
        title: "",
        description: "",
        customerId: "",
        priority: "medium",
        status: "inquiry",
        estimatedCost: "",
        dueDate: "",
        notes: "",
        items: [],
        designCharge: null
      });
      setSelectedCustomer(null);
      setSearchQuery("");
      setShowSuggestions({});
    } catch (error: any) {
      console.error('Error creating job:', error);
      const errorMessage = error?.message || "Failed to create job";
      const errorDetails = error?.errors?.join(", ") || errorMessage;

      toast({
        title: "Error",
        description: errorDetails,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const customerExists = safeCustomers.some(customer =>
    customer.name?.toLowerCase() === searchQuery.trim().toLowerCase()
  );
  const shouldShowAddCustomerButton = searchQuery.trim() !== "" && filteredCustomers.length === 0 && !customerExists;
  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-[1200px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {preselectedCustomer ? `Quick Job for ${preselectedCustomer.name}` : 'Quick Job'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {preselectedCustomer
                ? `Create a new job for ${preselectedCustomer.name}. Customer is pre-selected and cannot be changed.`
                : 'Create a new job for a customer.'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter job title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter job description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerSearch">Customer *</Label>
              {preselectedCustomer ? (
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 p-3 border rounded-md bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{preselectedCustomer.name}</div>
                    {preselectedCustomer.email && (
                      <div className="text-sm text-muted-foreground truncate">{preselectedCustomer.email}</div>
                    )}
                    {preselectedCustomer.phone && (
                      <div className="text-sm text-muted-foreground truncate">{preselectedCustomer.phone}</div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border shrink-0">
                    Fixed Selection
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {!showAddCustomerForm ? (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="customerSearch"
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          onFocus={() => {
                            if (searchQuery.trim() || safeCustomers.length > 0) {
                              setShowCustomerResults(true);
                            }
                          }}
                          placeholder="Search for a customer..."
                          className="pl-10 pr-10"
                        />
                        {selectedCustomer && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-7 w-7 p-0"
                            onClick={clearCustomerSelection}
                          >
                            ×
                          </Button>
                        )}
                      </div>

                      {showCustomerResults && (
                        <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredCustomers.length === 0 ? (
                            <div className="space-y-2 p-2">
                              <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                                {searchQuery.trim()
                                  ? customerExists
                                    ? `Customer "${searchQuery}" exists - click to select`
                                    : `No customers found for "${searchQuery}"`
                                  : safeCustomers.length === 0
                                    ? "No customers available"
                                    : "Type to search for customers"
                                }
                              </div>
                              {customerExists && searchQuery.trim() && (
                                <>
                                  {safeCustomers
                                    .filter(customer => customer.name?.toLowerCase() === searchQuery.trim().toLowerCase())
                                    .map((customer) => (
                                      <div
                                        key={customer.id || customer._id}
                                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 border-b border-border"
                                        onClick={() => handleCustomerSelect(customer)}
                                      >
                                        <div className="flex-shrink-0">
                                          <User className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-sm truncate">{customer.name}</div>
                                          <div className="flex flex-col sm:flex-row sm:gap-2 text-xs text-muted-foreground">
                                            {customer.email && (
                                              <div className="flex items-center gap-1">
                                                <Mail className="h-3 w-3" />
                                                <span className="truncate">{customer.email}</span>
                                              </div>
                                            )}
                                            {customer.phone && (
                                              <div className="flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                <span>{customer.phone}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </>
                              )}
                              {shouldShowAddCustomerButton && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-start gap-2"
                                  onClick={() => setShowAddCustomerForm(true)}
                                >
                                  <Plus className="h-4 w-4" />
                                  Add "{searchQuery}" as New Customer
                                </Button>
                              )}
                            </div>
                          ) : (
                            <>
                              {filteredCustomers.map((customer) => (
                                <div
                                  key={customer.id || customer._id}
                                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 border-b border-border last:border-b-0"
                                  onClick={() => handleCustomerSelect(customer)}
                                >
                                  <div className="flex-shrink-0">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{customer.name}</div>
                                    <div className="flex flex-col sm:flex-row sm:gap-2 text-xs text-muted-foreground">
                                      {customer.email && (
                                        <div className="flex items-center gap-1">
                                          <Mail className="h-3 w-3" />
                                          <span className="truncate">{customer.email}</span>
                                        </div>
                                      )}
                                      {customer.phone && (
                                        <div className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          <span>{customer.phone}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 p-3 border rounded-md bg-muted/5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Add New Customer</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddCustomerForm(false)}
                        >
                          ×
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="newCustomerName" className="text-xs">Name *</Label>
                          <Input
                            id="newCustomerName"
                            value={newCustomerData.name}
                            onChange={(e) => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Customer name"
                            className="text-sm"
                            defaultValue={searchQuery}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="newCustomerEmail" className="text-xs">Email</Label>
                            <Input
                              id="newCustomerEmail"
                              type="email"
                              value={newCustomerData.email}
                              onChange={(e) => setNewCustomerData(prev => ({ ...prev, email: e.target.value }))}
                              placeholder="Email address"
                              className="text-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="newCustomerPhone" className="text-xs">Phone</Label>
                            <Input
                              id="newCustomerPhone"
                              value={newCustomerData.phone}
                              onChange={(e) => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="Phone number"
                              className="text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newCustomerAddress" className="text-xs">Address</Label>
                          <Textarea
                            id="newCustomerAddress"
                            value={newCustomerData.address}
                            onChange={(e) => setNewCustomerData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Customer address"
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddCustomerForm(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddCustomer}
                            disabled={creatingCustomer || !newCustomerData.name.trim()}
                            className="flex-1"
                          >
                            {creatingCustomer ? "Adding..." : "Add Customer"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!preselectedCustomer && safeCustomers.length === 0 && !showAddCustomerForm && searchQuery === "" && (
                <div className="text-center p-4 border border-dashed rounded-md">
                  <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">No customers found</p>
                  <p className="text-xs text-muted-foreground mb-3">Start typing to search for customers</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: 'low' | 'medium' | 'high') =>
                  setFormData(prev => ({ ...prev, priority: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'inquiry' | 'quotation_sent' | 'quotation_approved' | 'design_in_progress' | 'design_approved' | 'production_ready' | 'ready_for_print' | 'quality_check' | 'completed' | 'delivered' | 'cancelled') =>
                  setFormData(prev => ({ ...prev, status: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inquiry">Inquiry</SelectItem>
                    <SelectItem value="quotation_sent">Quotation Sent</SelectItem>
                    <SelectItem value="quotation_approved">Quotation Approved</SelectItem>
                    <SelectItem value="design_in_progress">Design In Progress</SelectItem>
                    <SelectItem value="design_approved">Design Approved</SelectItem>
                    <SelectItem value="production_ready">Production Ready</SelectItem>
                    <SelectItem value="ready_for_print">Ready for Print</SelectItem>
                    <SelectItem value="quality_check">Quality Check</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedCost">Estimated Cost</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  step="0.01"
                  value={formData.estimatedCost}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Bill Date</Label>
                <div className="p-3 bg-gray-50 border rounded-md">
                  <div className="text-sm font-medium">
                    {new Date(today).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    (Auto-set to today's date)
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes (optional)"
                rows={3}
              />
            </div>

            {/* Invoice Items Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Inventory Items</span>
                  <Button type="button" onClick={addItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-7 gap-2 p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-xs">Item Name</Label>
                      <div className="relative autocomplete-container">
                        <Input
                          value={item.itemName}
                          onChange={(e) => {
                            updateItem(index, 'itemName', e.target.value);
                            setShowSuggestions(prev => ({ ...prev, [index]: true }));
                          }}
                          onFocus={() => {
                            setShowSuggestions(prev => ({ ...prev, [index]: true }));
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              setShowSuggestions(prev => ({ ...prev, [index]: false }));
                            }, 300);
                          }}
                          placeholder="Type item name"
                          className="pr-8"
                        />
                        {item.itemName && inventoryItems.length > 0 && showSuggestions[index] && (
                          <div
                            className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {inventoryItems
                              .filter(inv =>
                                inv.name.toLowerCase().includes(item.itemName.toLowerCase())
                              )
                              .slice(0, 5)
                              .map((invItem) => (
                                <div
                                  key={invItem._id || invItem.id}
                                  className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setFormData(prev => {
                                      const newItems = [...prev.items];
                                      const invUnit = invItem.unit || 'pieces';
                                      const isAreaUnit = ['sqft', 'sqm'].includes(invUnit);

                                      newItems[index] = {
                                        ...newItems[index],
                                        itemName: invItem.name,
                                        unitPrice: invItem.unitCost || 0,
                                        hsnCode: invItem.hsnCode || undefined,
                                        gstRate: invItem.gstRate || 18,
                                        unit: invUnit,
                                        itemType: isAreaUnit ? 'Square Feet' : 'Numbers',
                                        length: isAreaUnit ? newItems[index].length : undefined,
                                        width: isAreaUnit ? newItems[index].width : undefined,
                                        totalSquareFeet: isAreaUnit ? (newItems[index].totalSquareFeet || 0) : 0,
                                      };

                                      if (isAreaUnit) {
                                        const l = newItems[index].length || 0;
                                        const w = newItems[index].width || 0;
                                        if (l && w) {
                                          newItems[index].totalSquareFeet = l * w;
                                          const subtotal = newItems[index].totalSquareFeet! * newItems[index].unitPrice;
                                          const gstAmount = (subtotal * newItems[index].gstRate) / 100;
                                          newItems[index].itemTotal = subtotal + gstAmount;
                                        } else {
                                          newItems[index].itemTotal = 0;
                                        }
                                      } else {
                                        const subtotal = (newItems[index].quantity || 1) * newItems[index].unitPrice;
                                        const gstAmount = (subtotal * newItems[index].gstRate) / 100;
                                        newItems[index].itemTotal = subtotal + gstAmount;
                                      }

                                      return { ...prev, items: newItems };
                                    });
                                    setShowSuggestions(prev => ({ ...prev, [index]: false }));
                                  }}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium text-gray-900">{invItem.name}</div>
                                      <div className="text-sm text-gray-600">{invItem.description || 'No description'}</div>
                                    </div>
                                    <div className="text-right text-sm">
                                      <div className="font-medium">₹{invItem.unitCost || 0}</div>
                                      <div className="text-gray-500">Stock: {invItem.quantity || 0}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            {item.itemName && inventoryItems.length > 0 && showSuggestions[index] && 
                             inventoryItems.filter(inv =>
                                inv.name.toLowerCase().includes(item.itemName.toLowerCase())
                              ).length === 0 && (
                              <div className="p-4 text-center border-b">
                                <div className="text-gray-500 text-sm">
                                  Inventory does not have this item
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {item.itemName && inventoryItems.length === 0 && showSuggestions[index] && (
                          <div
                            className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center"
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <div className="text-gray-500 text-sm">
                              No inventory items available
                            </div>
                            <div className="text-gray-400 text-xs mt-1">
                              Add items in Inventory section first
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Conditional fields based on item unit */}
                    {item.itemType === 'Square Feet' ? (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Length</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.length || ''}
                            onChange={(e) => updateItem(index, 'length', parseFloat(e.target.value) || undefined)}
                            placeholder="Enter length"
                            min="0"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Width</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.width || ''}
                            onChange={(e) => updateItem(index, 'width', parseFloat(e.target.value) || undefined)}
                            placeholder="Enter width"
                            min="0"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">
                            {item.unit === 'sqm' ? 'Price per Sq M' : 'Price per Sq Ft'}
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            placeholder={item.unit === 'sqm' ? 'Price per sq m' : 'Price per sq ft'}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {item.unit === 'boxes' ? 'Qty (Boxes)'
                              : item.unit === 'reams' ? 'Qty (Reams)'
                              : item.unit === 'kg' ? 'Qty (kg)'
                              : item.unit === 'grams' ? 'Qty (g)'
                              : item.unit === 'liters' ? 'Qty (L)'
                              : item.unit === 'meters' ? 'Qty (m)'
                              : item.unit === 'rolls' ? 'Qty (Rolls)'
                              : item.unit === 'sheets' ? 'Qty (Sheets)'
                              : 'Qty (Pcs)'}
                          </Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <Label className="text-xs">HSN Code (Optional)</Label>
                      <Select
                        value={item.hsnCode || 'no-hsn'}
                        onValueChange={(value) => updateItem(index, 'hsnCode', value === 'no-hsn' ? undefined : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Optional - Select HSN" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-hsn">No HSN Code</SelectItem>
                          {hsnCodes.map((hsn) => (
                            <SelectItem key={hsn._id || hsn.id} value={hsn.hsnCode}>
                              {hsn.hsnCode} - {hsn.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">GST %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.gstRate}
                        onChange={(e) => updateItem(index, 'gstRate', parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">
                        {item.itemType === 'Square Feet'
                          ? (item.unit === 'sqm' ? 'Area / Amount' : 'Sq Ft / Amount')
                          : 'Total'}
                      </Label>
                      <div className="flex flex-col items-start space-y-1">
                        {item.itemType === 'Square Feet' && (
                          <span className="text-xs text-muted-foreground">
                            {item.length && item.width
                              ? `${item.totalSquareFeet?.toFixed(2)} ${item.unit === 'sqm' ? 'sq m' : 'sq ft'} (${item.length} × ${item.width})`
                              : 'Set L & W'}
                          </span>
                        )}
                        <div className="flex items-center space-x-1 w-full">
                          <span className="text-sm font-medium">₹{item.itemTotal.toFixed(2)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="h-8 w-8 p-0 ml-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {formData.items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No items added yet. Click "Add Item" to get started.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Design Charge Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Design Charge</span>
                  {!formData.designCharge ? (
                    <Button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          designCharge: {
                            amount: 0,
                            sacCode: '',
                            gstRate: 18,
                            totalAmount: 0
                          }
                        }));
                      }}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Design Charge
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          designCharge: null
                        }));
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              {formData.designCharge && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="designChargeAmount">Design Charge Amount *</Label>
                      <Input
                        id="designChargeAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.designCharge.amount === 0 ? '' : formData.designCharge.amount}
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          setFormData(prev => {
                            if (!prev.designCharge) return prev;
                            const subtotal = amount;
                            const gstAmount = (subtotal * prev.designCharge.gstRate) / 100;
                            const totalAmount = subtotal + gstAmount;
                            return {
                              ...prev,
                              designCharge: {
                                ...prev.designCharge,
                                amount,
                                totalAmount
                              }
                            };
                          });
                        }}
                        placeholder="Enter amount"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="designChargeSac">SAC Code *</Label>
                      <Select
                        value={formData.designCharge.sacCode}
                        onValueChange={(value) => {
                          setFormData(prev => {
                            if (!prev.designCharge) return prev;
                            return {
                              ...prev,
                              designCharge: {
                                ...prev.designCharge,
                                sacCode: value
                              }
                            };
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select SAC" />
                        </SelectTrigger>
                        <SelectContent>
                          {sacCodes.map((sac) => (
                            <SelectItem key={sac._id || sac.id} value={sac.sacCode}>
                              {sac.sacCode} - {sac.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="designChargeGst">GST % *</Label>
                      <Input
                        id="designChargeGst"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.designCharge.gstRate}
                        onChange={(e) => {
                          const gstRate = parseFloat(e.target.value) || 0;
                          setFormData(prev => {
                            if (!prev.designCharge) return prev;
                            const subtotal = prev.designCharge.amount;
                            const gstAmount = (subtotal * gstRate) / 100;
                            const totalAmount = subtotal + gstAmount;
                            return {
                              ...prev,
                              designCharge: {
                                ...prev.designCharge,
                                gstRate,
                                totalAmount
                              }
                            };
                          });
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end p-4 border-t">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground mb-1">
                        Subtotal: ₹{formData.designCharge.amount.toFixed(2)}
                      </div>
                      <div className="text-lg font-semibold">
                        Total: ₹{formData.designCharge.totalAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Total Amount Summary */}
            <Card className="bg-gray-50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {formData.items.length > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Items Subtotal:</span>
                        <span>₹{formData.items.reduce((sum, item) => {
                          const itemSubtotal = item.itemType === 'Square Feet'
                            ? (item.totalSquareFeet || 0) * item.unitPrice
                            : item.quantity * item.unitPrice;
                          return sum + itemSubtotal;
                        }, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Items Tax (GST):</span>
                        <span>₹{formData.items.reduce((sum, item) => {
                          const itemSubtotal = item.itemType === 'Square Feet'
                            ? (item.totalSquareFeet || 0) * item.unitPrice
                            : item.quantity * item.unitPrice;
                          const gstAmount = (itemSubtotal * item.gstRate) / 100;
                          return sum + gstAmount;
                        }, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Items Total:</span>
                        <span>₹{formData.items.reduce((sum, item) => sum + item.itemTotal, 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {formData.designCharge && (
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Design Charge Total:</span>
                      <span>₹{formData.designCharge.totalAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {(formData.items.length > 0 || formData.designCharge) && (
                    <div className="flex justify-between text-lg font-bold border-t pt-3 text-primary">
                      <span>Grand Total:</span>
                      <span>₹{(
                        formData.items.reduce((sum, item) => sum + item.itemTotal, 0) +
                        (formData.designCharge?.totalAmount || 0)
                      ).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !formData.customerId} className="w-full sm:w-auto">
                {loading ? "Creating..." : "Create Job"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice Choice Dialog */}
      <Dialog open={showInvoiceQuestion} onOpenChange={(open) => {
        if (!open) {
          setShowInvoiceQuestion(false);
          onOpenChange(false);
          setCreatedJob(null);
          setCreatedJobId(null);
          onJobCreated();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>
              Would you like to generate an invoice for this job?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              You can create an invoice now with all the job items or skip for now.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowInvoiceQuestion(false);
                onOpenChange(false);
                setCreatedJob(null);
                setCreatedJobId(null);
                onJobCreated();
              }}
              className="w-full sm:w-auto"
            >
              Skip for Now
            </Button>
            <Button
              type="button"
              onClick={handleGenerateInvoiceDirectly}
              disabled={isGeneratingInvoice}
              className="w-full sm:w-auto"
            >
              {isGeneratingInvoice ? "Generating..." : "Generate Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Generation Dialog */}
      {createdJob && showInvoiceCreation && (
        <JobInvoiceDialog
          job={createdJob}
          onInvoiceGenerated={() => {
            setShowInvoiceCreation(false);
            setShowInvoiceQuestion(false);
            onOpenChange(false);
            setCreatedJob(null);
            setCreatedJobId(null);
            onJobCreated();
          }}
        >
          <button ref={invoiceTriggerRef} style={{ display: 'none' }} />
        </JobInvoiceDialog>
      )}

      {/* Invoice View Dialog */}
      {createdInvoice && (
        <ViewInvoiceDialog
          open={showInvoiceView}
          onOpenChange={(open) => {
            setShowInvoiceView(open);
            if (!open) {
              setCreatedInvoice(null);
              onOpenChange(false);
              onJobCreated();
            }
          }}
          invoice={createdInvoice}
        />
      )}
    </>
  );
}