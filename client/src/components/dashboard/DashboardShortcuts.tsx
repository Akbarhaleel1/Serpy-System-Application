import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  DollarSign,
  FileText,
  ShoppingCart,
  Briefcase,
  Users,
  Search,
  MessageSquare
} from "lucide-react";
import { CreateJobDialog } from "@/components/jobs/CreateJobDialog";
import { CreatePaymentDialog } from "@/components/payments/CreatePaymentDialog";
import { CreateQuotationDialog } from "@/components/quotations/CreateQuotationDialog";
import { PurchaseOrderDialog } from "@/components/inventory/PurchaseOrderDialog";
import { CreateCustomerDialog } from "@/components/customers/CreateCustomerDialog";
import { WhatsAppSettingsDialog } from "@/components/whatsapp/WhatsAppSettingsDialog";

interface DashboardShortcutsProps {
  onJobCreated?: () => void;
  onPaymentCreated?: () => void;
  onQuotationCreated?: () => void;
  onOrderCreated?: () => void;
  onCustomerCreated?: () => void;
}

export function DashboardShortcuts({
  onJobCreated,
  onPaymentCreated,
  onQuotationCreated,
  onOrderCreated,
  onCustomerCreated
}: DashboardShortcutsProps) {
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [showReceivePayment, setShowReceivePayment] = useState(false);
  const [showCreateQuotation, setShowCreateQuotation] = useState(false);
  const [showPurchaseOrder, setShowPurchaseOrder] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);

  const handleJobCreated = () => {
    onJobCreated?.();
    setShowCreateJob(false);
  };

  // const handlePaymentCreated = () => {
  //   onPaymentCreated?.();
  //   setShowReceivePayment(false);
  // };

  const handleQuotationCreated = () => {
    onQuotationCreated?.();
    setShowCreateQuotation(false);
  };

  const handleOrderCreated = () => {
    onOrderCreated?.();
    setShowPurchaseOrder(false);
  };

  const handleCustomerCreated = () => {
    onCustomerCreated?.();
    setShowCreateCustomer(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Create Job */}
        <Button
          onClick={() => setShowCreateJob(true)}
          size="sm"
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-200 hover:scale-105"
        >
          <Plus className="h-4 w-4 mr-1" />
          Quick Job
        </Button>

        {/* Receive Payment */}
        {/* <Button
          onClick={() => setShowReceivePayment(true)}
          size="sm"
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg transition-all duration-200 hover:scale-105"
        >
          <DollarSign className="h-4 w-4 mr-1" />
          Receive Payment
        </Button> */}

        {/* Create Quotation */}
        <CreateQuotationDialog onQuotationCreated={handleQuotationCreated}>
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg transition-all duration-200 hover:scale-105"
          >
            <FileText className="h-4 w-4 mr-1" />
            Create Quotation
          </Button>
        </CreateQuotationDialog>



      </div>

      {/* Dialogs */}
      <CreateJobDialog
        open={showCreateJob}
        onOpenChange={setShowCreateJob}
        onJobCreated={handleJobCreated}
        customers={customers}
        onCustomersUpdate={() => { }} // Will be handled by refresh
      />

      {/* <CreatePaymentDialog
        open={showReceivePayment}
        onOpenChange={setShowReceivePayment}
      /> */}

      <PurchaseOrderDialog
        open={showPurchaseOrder}
        onOpenChange={setShowPurchaseOrder}
        onOrderCreated={handleOrderCreated}
      />

      <CreateCustomerDialog
        open={showCreateCustomer}
        onOpenChange={setShowCreateCustomer}
        onCustomerCreated={handleCustomerCreated}
      />
    </>
  );
}