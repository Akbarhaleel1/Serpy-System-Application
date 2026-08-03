import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Calendar, FileText, MoreHorizontal, Edit, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PaymentCardProps {
  payment: {
    id: string;
    paymentId: string;
    invoiceId: string;
    customerName: string;
    amount: number;
    method: string;
    status: string;
    date: string;
    dueDate: string;
    reference: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "failed":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getMethodLabel = (method: string) => {
  switch (method) {
    case "bank-transfer":
      return "Bank Transfer";
    case "cheque":
      return "Cheque";
    case "upi":
      return "UPI";
    case "cash":
      return "Cash";
    case "card":
      return "Card";
    default:
      return method;
  }
};

export function PaymentCard({ payment }: PaymentCardProps) {
  const isOverdue = new Date(payment.dueDate) < new Date() && payment.status === "pending";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{payment.paymentId}</CardTitle>
            <p className="text-sm text-muted-foreground">Invoice: {payment.invoiceId}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" />
                Edit Payment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-2">
          <Badge className={getStatusColor(payment.status)}>
            {payment.status}
          </Badge>
          {isOverdue && (
            <Badge className="bg-red-100 text-red-800 border-red-200">
              Overdue
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium text-sm mb-1">{payment.customerName}</h4>
          <p className="text-2xl font-bold">₹{payment.amount.toLocaleString()}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span>{getMethodLabel(payment.method)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Ref: {payment.reference}</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Paid: {payment.date}</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <span>Due: {payment.dueDate}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}