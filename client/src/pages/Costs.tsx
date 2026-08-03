import { useState, useEffect } from "react";
import { Search, Plus, TrendingUp, TrendingDown, DollarSign, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateCostDialog } from "@/components/costs/CreateCostDialog";
import { CostAnalysisCard } from "@/components/costs/CostAnalysisCard";
import { ProfitChart } from "@/components/costs/ProfitChart";
import apiClient from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

const Costs = () => {
  const [costs, setCosts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCosts();
  }, []);

  const fetchCosts = async () => {
    try {
      const response = await apiClient.getCosts();
      console.log('💰 Costs response:', response);
      setCosts(response.data?.costs || []);
    } catch (error) {
      console.error('Error fetching costs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch costs",
        variant: "destructive",
      });
    }
  };

  const filteredAnalysis = costs.filter(cost => {
    const jobTitle = cost.jobs?.title || '';
    const matchesSearch = jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (cost.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalStats = {
    totalRevenue: costs.reduce((sum, cost) => sum + (cost.jobs?.estimated_cost || 0), 0),
    totalCosts: costs.reduce((sum, cost) => sum + (cost.amount || 0), 0),
    totalProfit: costs.reduce((sum, cost) => sum + ((cost.jobs?.estimated_cost || 0) - (cost.amount || 0)), 0),
    averageMargin: costs.length > 0 ? costs.reduce((sum, cost) => {
      const revenue = cost.jobs?.estimated_cost || 0;
      const costAmount = cost.amount || 0;
      const margin = revenue > 0 ? ((revenue - costAmount) / revenue) * 100 : 0;
      return sum + margin;
    }, 0) / costs.length : 0
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cost & Profit Analysis</h1>
          <p className="text-muted-foreground">Track costs and analyze profitability</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} variant="gradient" size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Cost Analysis
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalStats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalStats.totalCosts.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalStats.totalProfit.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.averageMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Profit Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Profit Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfitChart data={costs.map(cost => ({
            id: cost.id,
            jobId: cost.jobs?.title || cost.id,
            customerName: 'Customer',
            totalRevenue: cost.jobs?.estimated_cost || 0,
            totalCosts: cost.amount || 0,
            profit: (cost.jobs?.estimated_cost || 0) - (cost.amount || 0),
            margin: (cost.jobs?.estimated_cost || 0) > 0 ? 
              (((cost.jobs?.estimated_cost || 0) - (cost.amount || 0)) / (cost.jobs?.estimated_cost || 0)) * 100 : 0
          }))} />
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cost analysis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            onClick={() => setStatusFilter("completed")}
            size="sm"
          >
            Completed
          </Button>
          <Button
            variant={statusFilter === "in-progress" ? "default" : "outline"}
            onClick={() => setStatusFilter("in-progress")}
            size="sm"
          >
            In Progress
          </Button>
        </div>
      </div>

      {/* Cost Analysis Grid */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {filteredAnalysis.map((cost) => (
          <CostAnalysisCard key={cost.id} analysis={{
            id: cost.id,
            jobId: cost.jobs?.title || cost.id,
            customerName: 'Customer',
            totalRevenue: cost.jobs?.estimated_cost || 0,
            totalCosts: cost.amount || 0,
            profit: (cost.jobs?.estimated_cost || 0) - (cost.amount || 0),
            margin: (cost.jobs?.estimated_cost || 0) > 0 ? 
              (((cost.jobs?.estimated_cost || 0) - (cost.amount || 0)) / (cost.jobs?.estimated_cost || 0)) * 100 : 0,
            status: 'completed',
            costs: {
              materials: cost.amount || 0,
              labor: 0,
              overhead: 0
            }
          }} />
        ))}
      </div>

      {filteredAnalysis.length === 0 && (
        <div className="text-center py-12">
          <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No cost analysis found</h3>
          <p className="text-muted-foreground">No analysis match your current filters.</p>
        </div>
      )}

      <CreateCostDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
};

export default Costs;