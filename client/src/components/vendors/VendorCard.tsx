import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, Phone, Mail, Receipt, Edit, FileText, CreditCard, Package } from "lucide-react";
import { VendorBillDialog } from "./VendorBillDialog";
import { VendorLedgerDialog } from "./VendorLedgerDialog";
import { VendorPaymentDialog } from "./VendorPaymentDialog";
import { VendorDialog } from "./EditVendorDialog";

interface VendorCardProps {
  vendor: {
    _id: string;
    id?: string;
    name: string;
    vendorType: string;
    contactPerson: string;
    phone: string;
    email: string;
    gstNumber: string;
    paymentTerms: string;
    totalAmount: number;
    pendingAmount: number;
    lastOrderDate: string;
    status: string;
  };
  onVendorUpdated?: () => void;
}

export function VendorCard({ vendor, onVendorUpdated }: VendorCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{vendor.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{vendor.vendorType}</p>
              </div>
              <Badge variant={vendor.status === "active" ? "success" : "secondary"}>
                {vendor.status}
              </Badge>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">₹{(vendor.totalAmount || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Amount</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {vendor.contactPerson && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{vendor.contactPerson}</span>
              </div>
            )}
            {vendor.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{vendor.phone}</span>
              </div>
            )}
            {vendor.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{vendor.email}</span>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">GST Number</p>
              <p className="font-mono text-xs">{vendor.gstNumber || 'Not provided'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Pending Amount</p>
              <p className={`font-bold ${(vendor.pendingAmount || 0) > 0 ? 'text-warning' : 'text-success'}`}>
                ₹{(vendor.pendingAmount || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Terms</p>
              <p className="font-semibold">{vendor.paymentTerms || 'Net 30'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              {(vendor.pendingAmount || 0) > 0 ? "Payment pending" : "All payments cleared"}
            </div>

            <div className="flex items-center space-x-2">
              <VendorBillDialog
                vendor={{
                  id: vendor._id || vendor.id,
                  name: vendor.name
                }}
                onBillCreated={onVendorUpdated}
              />

              <VendorLedgerDialog
                vendor={{
                  id: vendor._id || vendor.id,
                  name: vendor.name,
                  total_purchases: vendor.totalAmount || 0,
                  pending_amount: vendor.pendingAmount || 0
                }}
              />

              {(vendor.pendingAmount || 0) > 0 && (
                <VendorPaymentDialog
                  vendor={{
                    id: vendor._id || vendor.id,
                    name: vendor.name,
                    pending_amount: vendor.pendingAmount || 0
                  }}
                  onPaymentMade={onVendorUpdated}
                />
              )}

              <Button size="sm" variant="outline" onClick={() => setShowEditDialog(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Vendor Dialog */}
      <VendorDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          setShowEditDialog(false);
          onVendorUpdated?.();
        }}
        vendor={vendor}
      />
    </>
  );
}