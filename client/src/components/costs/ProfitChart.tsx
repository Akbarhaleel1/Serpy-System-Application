import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ProfitChartProps {
  data: Array<{
    id: string;
    jobId: string;
    customerName: string;
    totalRevenue: number;
    totalCosts: number;
    profit: number;
    margin: number;
  }>;
}

export function ProfitChart({ data }: ProfitChartProps) {
  const chartData = data.map(item => ({
    jobId: item.jobId,
    revenue: item.totalRevenue,
    costs: item.totalCosts,
    profit: item.profit,
    margin: item.margin
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="jobId" 
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-md">
                    <p className="font-medium mb-2">{label}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Revenue:</span>
                        <span className="font-medium">₹{data.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Costs:</span>
                        <span className="font-medium">₹{data.costs.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-t pt-1">
                        <span className="text-muted-foreground">Profit:</span>
                        <span className={`font-medium ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{data.profit.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Margin:</span>
                        <span className={`font-medium ${data.margin >= 20 ? 'text-green-600' : data.margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {data.margin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="revenue" 
            fill="hsl(var(--primary))" 
            name="Revenue"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="costs" 
            fill="hsl(var(--muted-foreground))" 
            name="Costs"
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="profit" 
            fill="hsl(var(--chart-2))" 
            name="Profit"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}