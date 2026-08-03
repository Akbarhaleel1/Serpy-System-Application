import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Phone, MapPin, Calendar, Package, MoreHorizontal, Edit, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DeliveryCardProps {
  delivery: {
    id: string;
    deliveryId: string;
    jobId: string;
    customerName: string;
    address: string;
    status: string;
    driverName?: string;
    driverPhone?: string;
    scheduledDate: string;
    items: number;
    priority: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "in-transit":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "delivered":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "low":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export function DeliveryCard({ delivery }: DeliveryCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{delivery.deliveryId}</CardTitle>
            <p className="text-sm text-muted-foreground">Job: {delivery.jobId}</p>
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
                Edit Delivery
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-2">
          <Badge className={getStatusColor(delivery.status)}>
            {delivery.status.replace("-", " ")}
          </Badge>
          <Badge className={getPriorityColor(delivery.priority)}>
            {delivery.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium text-sm mb-2">{delivery.customerName}</h4>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{delivery.address}</span>
          </div>
        </div>

        {delivery.driverName && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{delivery.driverName}</span>
            </div>
            {delivery.driverPhone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{delivery.driverPhone}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{delivery.scheduledDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{delivery.items} items</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}