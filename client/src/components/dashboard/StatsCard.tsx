import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  description?: string;
  badge?: {
    text: string;
    variant?: "default" | "success" | "warning" | "destructive" | "pending" | "urgent";
  };
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
  badge,
}: StatsCardProps) {
  const changeColor = {
    positive: "text-success",
    negative: "text-destructive",
    neutral: "text-muted-foreground",
  }[changeType];

  return (
    <Card className="group relative overflow-hidden bg-gradient-card shadow-card hover:shadow-float transition-all duration-500 hover:scale-105 animate-fade-in cursor-pointer">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-glass opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </CardTitle>
        <div className="flex items-center space-x-2">
          {badge && (
            <Badge 
              variant={badge.variant || "default"} 
              className="text-xs animate-bounce-gentle"
            >
              {badge.text}
            </Badge>
          )}
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-glow">
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="flex flex-col space-y-1">
          <div className="text-2xl md:text-3xl font-bold group-hover:scale-105 transition-transform duration-300">
            {value}
          </div>
          {change && (
            <div className={`text-xs md:text-sm font-medium ${changeColor} flex items-center animate-fade-in`}>
              <span className="truncate">{change}</span>
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2 group-hover:text-foreground transition-colors">
            {description}
          </p>
        )}
        
        {/* Floating decoration */}
        <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-primary opacity-5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
      </CardContent>
    </Card>
  );
}