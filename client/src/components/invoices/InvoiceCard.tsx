import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Download, Send, Eye, Edit, Trash2, MessageSquare } from "lucide-react";

interface InvoiceProps {
  invoice: {
    id: string;
    customerName: string;
    amount: number;
    gstAmount: number;
    totalAmount: number;
    status: string;
    dueDate: string;
    createdDate: string;
    items: any[];
  };
}

export function InvoiceCard({ invoice }: InvoiceProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "paid": return "success";
      case "unpaid": return "destructive";
      case "partial": return "warning";
      default: return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h3 className="font-semibold">{invoice.id}</h3>
              <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
            </div>
            <Badge variant={getStatusVariant(invoice.status)}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">₹{invoice.totalAmount.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">
              GST: ₹{invoice.gstAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Created: {new Date(invoice.createdDate).toLocaleDateString()}</span>
            <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
            <span>{invoice.items.length} items</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" className="gap-2">
              <Eye className="h-4 w-4" />
              View
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <Send className="h-4 w-4" />
              Email
            </Button>
            <Button size="sm" variant="outline">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}