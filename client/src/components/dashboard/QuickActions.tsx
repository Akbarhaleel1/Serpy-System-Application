import { Plus, Receipt, Users, Briefcase, FileText, Calendar, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

import { DirectSalesDialog } from "./DirectSalesDialog";

const quickActions = [
  {
    title: "New Job",
    description: "Create a new printing job",
    icon: Briefcase,
    variant: "gradient" as const,
    route: "/jobs",
  },
  {
    title: "Add Customer",
    description: "Register new customer",
    icon: Users,
    variant: "default" as const,
    route: "/customers",
  },
  {
    title: "Create Invoice",
    description: "Generate new invoice",
    icon: Receipt,
    variant: "success" as const,
    route: "/invoices",
  },
  {
    title: "Upload Proof",
    description: "Share design proof",
    icon: FileText,
    variant: "secondary" as const,
    route: "/proofing",
  },
  {
    title: "Walk-In Job",
    description: "Process walk-in order",
    icon: UserPlus,
    variant: "urgent" as const,
    route: "/walk-in-jobs",
  },
];

export function QuickActions() {
  const navigate = useNavigate();
  return (
    <Card className="group relative overflow-hidden shadow-elevated hover:shadow-float transition-all duration-500 bg-gradient-card">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-glass opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <CardHeader className="relative">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <div className="p-2 rounded-lg bg-gradient-primary shadow-glow animate-float">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <span className="group-hover:text-primary transition-colors">Quick Actions</span>
        </CardTitle>
        <CardDescription className="group-hover:text-foreground transition-colors">
          Frequently used actions for daily operations
        </CardDescription>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <Button
              key={action.title}
              variant={action.variant}
              className="h-auto p-4 flex flex-col items-start space-y-2 animate-scale-up group/button relative overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => navigate(action.route)}
            >
              {/* Button background animation */}
              <div className="absolute inset-0 bg-gradient-glass opacity-0 group-hover/button:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative flex items-center space-x-2 w-full">
                <div className="p-1.5 rounded-md bg-white/20 group-hover/button:scale-110 transition-transform duration-300">
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="font-semibold text-sm">{action.title}</span>
              </div>
              <span className="relative text-xs opacity-90 text-left group-hover/button:opacity-100 transition-opacity">
                {action.description}
              </span>
              
              {/* Floating decoration */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white/10 rounded-full group-hover/button:scale-150 transition-transform duration-500"></div>
            </Button>
          ))}
          
          {/* Direct Sales Quick Action */}
          <div className="sm:col-span-2">
            <DirectSalesDialog />
          </div>
        </div>
        
        {/* Card decoration */}
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-primary opacity-5 rounded-full group-hover:scale-125 transition-transform duration-700"></div>
      </CardContent>
    </Card>
  );
}