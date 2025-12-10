import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Package, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface DataPackageAnalyticsProps {
  departmentId?: string;
  dateFilter?: "daily" | "weekly" | "monthly" | "all";
}

export const DataPackageAnalytics = ({ departmentId, dateFilter = "all" }: DataPackageAnalyticsProps) => {
  const getDateRange = () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    
    if (dateFilter === "daily") {
      return {
        start: `${today}T00:00:00`,
        end: `${today}T23:59:59`,
      };
    } else if (dateFilter === "weekly") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        start: weekAgo.toISOString(),
        end: now.toISOString(),
      };
    } else if (dateFilter === "monthly") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        start: monthAgo.toISOString(),
        end: now.toISOString(),
      };
    }
    return null;
  };

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["data-package-analytics", departmentId, dateFilter],
    queryFn: async () => {
      // Get all data packages for the department
      let packagesQuery = supabase
        .from("data_packages")
        .select("id, name, price, data_amount, data_unit, department_id");
      
      if (departmentId) {
        packagesQuery = packagesQuery.eq("department_id", departmentId);
      }
      
      const { data: packages, error: packagesError } = await packagesQuery;
      if (packagesError) throw packagesError;

      // Get sale items that match data package names
      // Data packages are stored in sale_items with just the item_name (no product_id or service_id)
      const packageNames = packages?.map(p => p.name) || [];
      
      if (packageNames.length === 0) {
        return {
          packageStats: [],
          totalRevenue: 0,
          totalSold: 0,
        };
      }

      // Build the sales query
      let salesQuery = supabase
        .from("sale_items")
        .select(`
          item_name,
          quantity,
          subtotal,
          sale_id,
          sales!inner (
            created_at,
            department_id,
            status
          )
        `)
        .in("item_name", packageNames)
        .is("service_id", null)
        .is("product_id", null)
        .neq("sales.status", "voided");

      if (departmentId) {
        salesQuery = salesQuery.eq("sales.department_id", departmentId);
      }

      const dateRange = getDateRange();
      if (dateRange) {
        salesQuery = salesQuery
          .gte("sales.created_at", dateRange.start)
          .lte("sales.created_at", dateRange.end);
      }

      const { data: saleItems, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      // Calculate statistics per package
      const statsMap = new Map<string, {
        name: string;
        totalSold: number;
        totalRevenue: number;
        packageInfo: any;
      }>();

      packages?.forEach(pkg => {
        statsMap.set(pkg.name, {
          name: pkg.name,
          totalSold: 0,
          totalRevenue: 0,
          packageInfo: pkg,
        });
      });

      saleItems?.forEach((item: any) => {
        const stats = statsMap.get(item.item_name);
        if (stats) {
          stats.totalSold += item.quantity;
          stats.totalRevenue += Number(item.subtotal);
        }
      });

      const packageStats = Array.from(statsMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      const totalRevenue = packageStats.reduce((sum, stat) => sum + stat.totalRevenue, 0);
      const totalSold = packageStats.reduce((sum, stat) => sum + stat.totalSold, 0);

      return {
        packageStats,
        totalRevenue,
        totalSold,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  const hasData = analytics && analytics.packageStats.length > 0 && analytics.totalSold > 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {analytics?.totalRevenue.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From data package sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Packages Sold</CardTitle>
            <Package className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalSold.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total units sold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Package Types</CardTitle>
            <TrendingUp className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.packageStats.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Different packages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Package Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <p className="text-center text-muted-foreground py-8">
              No data package sales yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package Name</TableHead>
                  <TableHead>Data Size</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics?.packageStats.map((stat) => {
                  const revenuePercentage = analytics.totalRevenue > 0 
                    ? ((stat.totalRevenue / analytics.totalRevenue) * 100).toFixed(1)
                    : "0.0";
                  
                  return (
                    <TableRow key={stat.name}>
                      <TableCell className="font-medium">{stat.name}</TableCell>
                      <TableCell>
                        {stat.packageInfo.data_amount}{stat.packageInfo.data_unit}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {stat.totalSold.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        UGX {stat.packageInfo.price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        UGX {stat.totalRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {revenuePercentage}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
