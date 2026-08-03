import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, MoreHorizontal, Edit, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CostAnalysisCardProps {
  analysis: {
    id: string;
    jobId: string;
    customerName: string;
    totalRevenue: number;
    totalCosts: number;
    profit: number;
    margin: number;
    status: string;
    costs: {
      materials: number;
      labor: number;
      overhead: number;
    };
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "in-progress":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getMarginColor = (margin: number) => {
  if (margin >= 30) return "text-green-600";
  if (margin >= 20) return "text-yellow-600";
  return "text-red-600";
};

export function CostAnalysisCard({ analysis }: CostAnalysisCardProps) {
  const costBreakdown = [
    { label: "Materials", amount: analysis.costs.materials, color: "bg-blue-500" },
    { label: "Labor", amount: analysis.costs.labor, color: "bg-green-500" },
    { label: "Overhead", amount: analysis.costs.overhead, color: "bg-orange-500" }
  ];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{analysis.jobId}</CardTitle>
            <p className="text-sm text-muted-foreground">{analysis.customerName}</p>
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
                Edit Analysis
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Badge className={getStatusColor(analysis.status)}>
          {analysis.status.replace("-", " ")}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-lg font-semibold">₹{analysis.totalRevenue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Costs</p>
            <p className="text-lg font-semibold">₹{analysis.totalCosts.toLocaleString()}</p>
          </div>
        </div>

        {/* Profit & Margin */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Profit</span>
            <div className="flex items-center gap-1">
              {analysis.profit > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={`font-semibold ${getMarginColor(analysis.margin)}`}>
                {analysis.margin.toFixed(1)}%
              </span>
            </div>
          </div>
          <p className={`text-xl font-bold ${analysis.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
            ₹{analysis.profit.toLocaleString()}
          </p>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Cost Breakdown</h4>
          {costBreakdown.map((cost) => (
            <div key={cost.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{cost.label}</span>
                <span className="font-medium">₹{cost.amount.toLocaleString()}</span>
              </div>
              <Progress 
                value={(cost.amount / analysis.totalCosts) * 100} 
                className="h-2"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}