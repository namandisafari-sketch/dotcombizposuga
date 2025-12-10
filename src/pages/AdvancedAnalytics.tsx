import { useQuery } from "@tanstack/react-query";
import { localApi } from "@/lib/localApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, TrendingUp, Package, Users } from "lucide-react";

const AdvancedAnalytics = () => {
  const { data: salesTrends } = useQuery({
    queryKey: ["sales-trends"],
    queryFn: async () => {
      const data = await localApi.sales.getAll();
      return data?.slice(0, 100) || [];
    },
  });

  const { data: stockMovement } = useQuery({
    queryKey: ["stock-movement"],
    queryFn: async () => {
      const data = await localApi.products.getLowStock();
      return data?.slice(0, 20) || [];
    },
  });

  const { data: staffPerformance } = useQuery({
    queryKey: ["staff-performance"],
    queryFn: async () => {
      const data = await localApi.staffPerformance.getAll();
      return data?.sort((a, b) => Number(b.total_sales) - Number(a.total_sales)).slice(0, 10) || [];
    },
  });

  const calculateDailySales = () => {
    if (!salesTrends) return [];
    const dailyMap = new Map();
    
    salesTrends.forEach((sale) => {
      const date = new Date(sale.created_at).toLocaleDateString();
      const current = dailyMap.get(date) || 0;
      dailyMap.set(date, current + Number(sale.total));
    });

    return Array.from(dailyMap.entries()).map(([date, total]) => ({ date, total }));
  };

  const dailySales = calculateDailySales();
  const totalSales = salesTrends?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
  const averageSale = salesTrends?.length ? totalSales / salesTrends.length : 0;

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <main className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Advanced Analytics</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Sales trends, stock movement, and staff performance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales (Last 100)</p>
                  <p className="text-2xl font-bold">
                    UGX {totalSales.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Sale</p>
                  <p className="text-2xl font-bold">
                    UGX {Math.round(averageSale).toLocaleString()}
                  </p>
                </div>
                <BarChart className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{salesTrends?.length || 0}</p>
                </div>
                <Users className="w-8 h-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sales">Sales Trends</TabsTrigger>
            <TabsTrigger value="stock">Stock Movement</TabsTrigger>
            <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dailySales.map((day) => (
                    <div
                      key={day.date}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <p className="font-medium">{day.date}</p>
                      <p className="text-lg font-bold">
                        UGX {day.total.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Low Stock Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stockMovement?.map((product) => (
                    <div
                      key={product.name}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Reorder at: {product.reorder_level}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{product.current_stock}</p>
                        <p className="text-xs text-muted-foreground">in stock</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {staffPerformance?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No performance data yet
                    </p>
                  ) : (
                    staffPerformance?.map((staff, index) => (
                      <div
                        key={staff.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">Staff Member</p>
                            <p className="text-sm text-muted-foreground">
                              {staff.total_transactions} transactions
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            UGX {Number(staff.total_sales).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">total sales</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdvancedAnalytics;
