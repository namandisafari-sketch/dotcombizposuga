import { useQuery } from "@tanstack/react-query";
import { localApi } from "@/lib/localApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, TrendingUp, AlertTriangle, Users } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useUserRole } from "@/hooks/useUserRole";
import { useDepartment } from "@/contexts/DepartmentContext";
import { DepartmentSelector } from "@/components/DepartmentSelector";

const Dashboard = () => {
  const { isAdmin } = useUserRole();
  const { selectedDepartmentId, selectedDepartment, isPerfumeDepartment } = useDepartment();

  // All hooks must be called before any conditional returns
  const { data: todaySales } = useQuery({
    queryKey: ["today-sales", selectedDepartmentId],
    queryFn: async () => {
      if (!selectedDepartmentId) return 0;
      
      const today = new Date().toISOString().split("T")[0];
      const data = await localApi.sales.getAll({ 
        startDate: `${today}T00:00:00`,
        endDate: `${today}T23:59:59`,
        status: 'completed'
      });
      
      return data
        .filter((s: any) => s.department_id === selectedDepartmentId && s.status !== 'voided')
        .reduce((sum: number, sale: any) => sum + Number(sale.total), 0) || 0;
    },
    enabled: !!selectedDepartmentId && !isPerfumeDepartment,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ["low-stock", selectedDepartmentId],
    queryFn: async () => {
      if (!selectedDepartmentId) return [];
      
      const data = await localApi.products.getAll();
      return data
        .filter((p: any) => 
          p.department_id === selectedDepartmentId && 
          p.current_stock <= p.reorder_level
        );
    },
    enabled: !!selectedDepartmentId && !isPerfumeDepartment,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: recentSales } = useQuery({
    queryKey: ["recent-sales", selectedDepartmentId],
    queryFn: async () => {
      if (!selectedDepartmentId) return [];
      
      const data = await localApi.sales.getAll();
      return data
        .filter((s: any) => s.department_id === selectedDepartmentId && s.status !== 'voided')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
    },
    enabled: !!selectedDepartmentId && !isPerfumeDepartment,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: totalProducts } = useQuery({
    queryKey: ["total-products", selectedDepartmentId],
    queryFn: async () => {
      if (!selectedDepartmentId) return 0;
      
      const data = await localApi.products.getAll();
      return data.filter((p: any) => p.department_id === selectedDepartmentId).length;
    },
    enabled: !!selectedDepartmentId && !isPerfumeDepartment,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: totalCustomers } = useQuery({
    queryKey: ["total-customers", selectedDepartmentId],
    queryFn: async () => {
      if (!selectedDepartmentId) return 0;
      
      const data = await localApi.customers.getAll();
      return data.filter((c: any) => c.department_id === selectedDepartmentId).length;
    },
    enabled: !!selectedDepartmentId && !isPerfumeDepartment,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Check if current department is a perfume department
  if (isPerfumeDepartment) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-32 lg:pt-20">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 pt-24 pb-8">
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Perfume Department</h2>
            <p className="text-muted-foreground mb-6">
              This dashboard is not available for perfume departments.
              <br />
              Perfume departments have dedicated pages for their operations.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-20 pt-32 lg:pt-20">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-2 sm:px-4 pt-20 sm:pt-24 pb-8">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                {selectedDepartment?.name || "Dashboard"}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Department Overview - Test Update
              </p>
            </div>
            {isAdmin && <DepartmentSelector />}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
              <DollarSign className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                UGX {todaySales?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total revenue today
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total inventory items
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total customers
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
              <AlertTriangle className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockProducts?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Items need reordering
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sales */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {recentSales?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sales yet. Start making sales from the Sales page.
                </p>
              ) : (
                recentSales?.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm sm:text-base">{sale.receipt_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto">
                      <p className="font-bold text-sm sm:text-base">UGX {Number(sale.total).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{sale.payment_method}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-card border-t py-2 z-40">
        <p className="text-center text-[10px] sm:text-xs text-muted-foreground px-2">
          Made with hope by JagoniX44 for DOTCOM BROTHERS LTD
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;