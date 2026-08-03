import { useState } from "react";
import { 
  Calendar, 
  User, 
  DollarSign, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Edit, 
  Trash2,
  Users,
  Clock,
  Tag as TagIcon,
  Paperclip,
  Receipt,
  CreditCard,
  CheckSquare,
  Edit3
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AdvancedCreateInvoiceDialog } from "@/components/invoices/AdvancedCreateInvoiceDialog";
import { JobPaymentDialog } from "./JobPaymentDialog";
import { CreateTaskDialog } from "@/components/staff/CreateTaskDialog";

interface Job {
  id: string;
  title: string;
  customer: string;
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCompany?: string;
  type: string;
  priority: string;
  status: string;
  assignedStaff: string[];
  dueDate: string;
  createdDate: string;
  dimensions?: { length: number; width: number };
  rate?: number;
  hourlyRate?: number;
  hoursWorked?: number;
  components: Array<{
    name: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
  subtotal: number;
  discount: { type: string; value: number };
  total: number;
  tags: string[];
  description: string;
  files: string[];
  invoiceId?: string;
  invoiceItems?: Array<{
    itemName: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    hsnCode: string;
    gstRate: number;
    gstAmount: number;
    itemTotal: number;
  }>;
}

interface JobCardProps {
  job: Job;
  index: number;
  statusConfig: Record<string, { variant: any; color: string }>;
  priorityConfig: Record<string, { variant: any; color: string }>;
  onEdit?: (job: Job) => void;
  onDelete?: (jobId: string) => void;
  onDuplicate?: (job: Job) => void;
  onUpdateStatus?: (jobId: string) => void;
  onAssignTasks?: (jobId: string) => void;
  onInvoiceGenerated?: () => void;
  onPaymentReceived?: () => void;
}

export function JobCard({ job, index, statusConfig, priorityConfig, onEdit, onDelete, onDuplicate, onUpdateStatus, onAssignTasks, onInvoiceGenerated, onPaymentReceived }: JobCardProps) {
  console.log('🎴 JobCard rendering for job:', {
    id: job.id,
    title: job.title,
    customer: job.customer,
    customerId: job.customerId,
    customerEmail: job.customerEmail,
    customerPhone: job.customerPhone,
    customerCompany: job.customerCompany,
    status: job.status,
    priority: job.priority,
    dueDate: job.dueDate,
    total: job.total,
    components: job.components
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '₹0';
    }
    return `₹${amount.toLocaleString()}`;
  };
  
  const getDaysUntilDue = () => {
    // Handle formatted date strings
    if (!job.dueDate || job.dueDate === 'No due date' || job.dueDate === 'Invalid date') {
      return null; // No due date
    }
    
    const today = new Date();
    const dueDate = new Date(job.dueDate);
    
    // Check if the date is valid
    if (isNaN(dueDate.getTime())) {
      return null; // Invalid date
    }
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue();
  const isUrgent = daysUntilDue !== null && daysUntilDue <= 1 && !["Completed", "Delivered"].includes(job.status);

  return (
    <>
    <Card 
      className={`shadow-card hover:shadow-elevated transition-all duration-300 animate-fade-in ${
        isUrgent ? 'ring-2 ring-urgent ring-opacity-50' : ''
      }`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <CardContent className="p-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-12 rounded-full ${statusConfig[job.status]?.color || 'bg-gray-400'}`} />
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold">{job.title}</h3>
                {isUrgent && (
                  <Badge variant="urgent" className="animate-glow-pulse">
                    URGENT
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span className="flex items-center">
                  <FileText className="h-3 w-3 mr-1" />
                  {job.id}
                </span>
                <span className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  <div className="flex flex-col">
                    <span>{job.customer}</span>
                    {job.customerCompany && (
                      <span className="text-xs text-muted-foreground">{job.customerCompany}</span>
                    )}
                  </div>
                </span>
                <span className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  Due: {job.dueDate}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(job.total)}
              </div>
              <div className="text-xs text-muted-foreground">
                {job.type} • {job.components.length} items
              </div>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Badge variant={statusConfig[job.status]?.variant || "secondary"}>
                {job.status}
              </Badge>
              <Badge variant={priorityConfig[job.priority]?.variant || "secondary"} className="text-xs">
                {job.priority} Priority
              </Badge>
            </div>

            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>

        {/* Tags and Staff */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {/* Tags */}
            <div className="flex items-center space-x-2">
              <TagIcon className="h-3 w-3 text-muted-foreground" />
              <div className="flex gap-1">
                {job.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Files */}
            {job.files.length > 0 && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                <span>{job.files.length} files</span>
              </div>
            )}
          </div>

          {/* Assigned Staff */}
          <div className="flex items-center space-x-2">
            <Users className="h-3 w-3 text-muted-foreground" />
            <div className="flex space-x-1">
              {job.assignedStaff.map((staff) => (
                <Badge key={staff} variant="secondary" className="text-xs">
                  {staff}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Expandable Content */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-4">
            {/* Description */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{job.description}</p>
            </div>

            {/* Invoice Items Table - Replaces Job Components */}
            {job.invoiceItems && job.invoiceItems.length > 0 ? (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Invoice Items & Price Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Item</th>
                        <th className="text-right py-2 font-medium">Qty</th>
                        <th className="text-right py-2 font-medium">Unit Price</th>
                        <th className="text-right py-2 font-medium">GST Rate</th>
                        <th className="text-right py-2 font-medium">GST Amount</th>
                        <th className="text-right py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.invoiceItems.map((item, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="py-2">
                            <div>
                              <div className="font-medium">{item.itemName}</div>
                              {item.description && (
                                <div className="text-xs text-muted-foreground">{item.description}</div>
                              )}
                              {item.hsnCode && (
                                <div className="text-xs text-muted-foreground">HSN: {item.hsnCode}</div>
                              )}
                            </div>
                          </td>
                          <td className="text-right py-2">{item.quantity}</td>
                          <td className="text-right py-2">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="text-right py-2">{item.gstRate}%</td>
                          <td className="text-right py-2">₹{item.gstAmount.toFixed(2)}</td>
                          <td className="text-right py-2 font-medium">₹{item.itemTotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t">
                        <td colSpan={5} className="text-right py-2 font-medium">Subtotal:</td>
                        <td className="text-right py-2 font-medium">
                          ₹{job.invoiceItems.reduce((sum, item) => sum + item.totalAmount, 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="text-right py-2 font-medium">Total GST:</td>
                        <td className="text-right py-2 font-medium">
                          ₹{job.invoiceItems.reduce((sum, item) => sum + item.gstAmount, 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr className="border-t font-semibold text-base">
                        <td colSpan={5} className="text-right py-2">Grand Total:</td>
                        <td className="text-right py-2">₹{job.invoiceItems.reduce((sum, item) => sum + item.itemTotal, 0).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : job.components && job.components.length > 0 ? (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-3">Job Components (No Invoice Yet)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Component</th>
                        <th className="text-right py-2 font-medium">Qty</th>
                        <th className="text-right py-2 font-medium">Rate</th>
                        <th className="text-right py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.components.map((component, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="py-2 font-medium">{component.name}</td>
                          <td className="text-right py-2">{component.quantity}</td>
                          <td className="text-right py-2">₹{component.rate.toFixed(2)}</td>
                          <td className="text-right py-2 font-medium">₹{component.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td colSpan={3} className="text-right py-2">Grand Total:</td>
                        <td className="text-right py-2">₹{job.components.reduce((sum, comp) => sum + comp.total, 0).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : null}

            {/* Job Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Job Type Specific Info */}
              {/* <div className="space-y-2">
                <h4 className="font-medium">Job Details</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{job.type}</span>
                  </div>
                  {job.dimensions && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dimensions:</span>
                        <span>{job.dimensions.length} × {job.dimensions.width} ft</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Area:</span>
                        <span>{job.dimensions.length * job.dimensions.width} sq ft</span>
                      </div>
                      {job.rate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rate:</span>
                          <span>₹{job.rate}/sq ft</span>
                        </div>
                      )}
                    </>
                  )}
                  {job.hourlyRate && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hourly Rate:</span>
                        <span>₹{job.hourlyRate}/hour</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hours Worked:</span>
                        <span>{job.hoursWorked} hours</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(job.createdDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div> */}

              {/* Files */}
              {/* {job.files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Attached Files</h4>
                  <div className="space-y-1">
                    {job.files.map((file) => (
                      <div key={file} className="flex items-center space-x-2 text-sm">
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        <span className="text-primary hover:underline cursor-pointer">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}
            </div>

            {/* Components Breakdown */}
            {/* <div className="space-y-2">
              <h4 className="font-medium">Cost Breakdown</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3">Component</th>
                      <th className="text-right p-3">Qty</th>
                      <th className="text-right p-3">Rate</th>
                      <th className="text-right p-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.components.map((component, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-3">{component.name}</td>
                        <td className="text-right p-3">{component.quantity}</td>
                        <td className="text-right p-3">₹{component.rate}</td>
                        <td className="text-right p-3 font-medium">₹{component.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/50 border-t">
                    <tr>
                      <td colSpan={3} className="p-3 font-medium">Subtotal</td>
                      <td className="text-right p-3 font-medium">₹{job.subtotal}</td>
                    </tr>
                    {job.discount.value > 0 && (
                      <tr>
                        <td colSpan={3} className="p-3 text-muted-foreground">
                          Discount ({job.discount.type === 'percentage' ? `${job.discount.value}%` : `₹${job.discount.value}`})
                        </td>
                        <td className="text-right p-3 text-muted-foreground">
                          -₹{job.discount.type === 'percentage' 
                            ? (job.subtotal * job.discount.value / 100) 
                            : job.discount.value}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t">
                      <td colSpan={3} className="p-3 font-bold">Total</td>
                      <td className="text-right p-3 font-bold text-primary text-lg">₹{job.total}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div> */}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex space-x-2">
                {/* <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onEdit) {
                      onEdit(job);
                    } else {
                      alert('Edit button clicked - no handler provided');
                    }
                  }}
                  className="hover-orange"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button> */}
                {/* <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onDuplicate) {
                      onDuplicate(job);
                    } else {
                      alert('Duplicate button clicked - no handler provided');
                    }
                  }}
                  className="hover-orange"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Duplicate
                </Button> */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onDelete) {
                      onDelete(job.id);
                    } else {
                      alert('Delete button clicked - no handler provided');
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>

              {/* Invoice & Payment Actions */}
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  onClick={() => setShowInvoiceDialog(true)}
                >
                  {job.invoiceId ? (
                    <>
                      <Edit3 className="h-3 w-3 mr-1" />
                      Edit Invoice
                    </>
                  ) : (
                    <>
                      <Receipt className="h-3 w-3 mr-1" />
                      Generate Invoice
                    </>
                  )}
                </Button>

                {/* <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                  onClick={() => setShowTaskDialog(true)}
                >
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Assign Task
                </Button> */}

                <JobPaymentDialog job={job} onPaymentReceived={onPaymentReceived}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    Receive Payment
                  </Button>
                </JobPaymentDialog>
              </div>

              <div className="flex space-x-2">
                {/* <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onAssignTasks) {
                      onAssignTasks(job.id);
                    } else {
                      alert('Assign Tasks button clicked - no handler provided');
                    }
                  }}
                  className="hover-orange"
                >
                  Assign Tasks
                </Button> */}
                <Button 
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onUpdateStatus) {
                      onUpdateStatus(job.id);
                    } else {
                      alert('Update Status button clicked - no handler provided');
                    }
                  }}
                  className="hover-glow"
                >
                  Update Status
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>

    {/* Advanced Invoice Creation Dialog */}
    <AdvancedCreateInvoiceDialog
      open={showInvoiceDialog}
      onOpenChange={setShowInvoiceDialog}
      onInvoiceCreated={() => {
        onInvoiceGenerated?.();
        setShowInvoiceDialog(false);
      }}
      preselectedJob={job}
      preselectedCustomer={{
        _id: job.customerId,
        name: job.customer,
        email: job.customerEmail,
        phone: job.customerPhone,
        company: job.customerCompany
      }}
    />

    {/* Task Assignment Dialog */}
    <CreateTaskDialog
      open={showTaskDialog}
      onOpenChange={setShowTaskDialog}
      onTaskCreated={() => {
        onAssignTasks?.(job.id);
        setShowTaskDialog(false);
      }}
      preselectedJob={{
        _id: job.id,
        title: job.title,
        customer: job.customer,
        status: job.status,
        dueDate: job.dueDate,
        priority: job.priority
      }}
    />
    </>
  );
}