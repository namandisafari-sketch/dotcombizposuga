import { useQuery } from "@tanstack/react-query";
import { localApi } from "@/lib/localApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { DollarSign, TrendingUp, Users, Package, Building2, CreditCard, Receipt, Info } from "lucide-react";
import { PaymentTransactionsReport } from "@/components/admin/PaymentTransactionsReport";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AdminReports = () => {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState<"daily" | "weekly" | "monthly" | "all">("daily");

  // User role is already in the user object from AuthContext
  const isAdmin = user?.role === "admin";
  const isLoading = false;

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
    return null; // "all" - no date filter
  };

  // Sales by department with credits, reconciliation, and expenses factored in (excluding mobile money and card/bank payments)
  const { data: departmentSales } = useQuery({
    queryKey: ["department-sales", dateFilter],
    queryFn: async () => {
      const dateRange = getDateRange();
      
      const [sales, credits, reconciliations, expenses, departments, suspendedRevenue] = await Promise.all([
        localApi.sales.getAll(),
        localApi.credits.getAll(),
        localApi.reconciliations.getAll(),
        localApi.expenses.getAll(),
        localApi.departments.getAll(),
        localApi.suspendedRevenue.getAll(),
      ]);

      // Filter sales based on date and payment method
      let filteredSales = sales.filter((sale: any) => 
        sale.department_id && 
        !['mobile_money', 'card', 'bank'].includes(sale.payment_method) &&
        sale.status !== 'voided'
      );

      if (dateRange) {
        filteredSales = filteredSales.filter((sale: any) => {
          const saleDate = new Date(sale.created_at);
          return saleDate >= new Date(dateRange.start) && saleDate <= new Date(dateRange.end);
        });
      }

      const salesRes = { data: filteredSales, error: null };
      const creditsRes = { data: credits.filter((c: any) => c.status === 'approved'), error: null };
      const reconciliationsRes = { data: reconciliations, error: null };
      const expensesRes = { data: expenses, error: null };
      const departmentsRes = { data: departments, error: null };
      const suspendedRevenueRes = { data: suspendedRevenue.filter((s: any) => ['pending', 'explained'].includes(s.status)), error: null };
      
      if (salesRes.error) throw salesRes.error;
      
      const grouped = salesRes.data.reduce((acc: any, sale: any) => {
        const deptId = sale.department_id;
        const dept = departmentsRes.data?.find((d: any) => d.id === deptId);
        if (!acc[deptId]) {
          acc[deptId] = {
            id: deptId,
            name: dept?.name || "Unknown",
            grossSales: 0,
            count: 0,
            creditsIn: 0,
            creditsOut: 0,
            settledCreditsIn: 0,
            settledCreditsOut: 0,
            reconciliationDiff: 0,
            expenses: 0,
            suspendedRevenue: 0,
            netSales: 0,
          };
        }
        acc[deptId].grossSales += Number(sale.total);
        acc[deptId].count += 1;
        return acc;
      }, {});

      // Add credits adjustments
      creditsRes.data?.forEach((credit: any) => {
        const isSettled = credit.settlement_status === 'settled';
        
        // Credits IN: money received (borrowed) - when settled, it's a deduction (we pay it back)
        if (credit.to_department_id && grouped[credit.to_department_id]) {
          if (isSettled) {
            grouped[credit.to_department_id].settledCreditsIn += Number(credit.amount);
          } else {
            grouped[credit.to_department_id].creditsIn += Number(credit.amount);
          }
        }
        
        // Credits OUT: money given (lent) - when settled, it's an addition (we receive it back)
        if (credit.from_department_id && grouped[credit.from_department_id]) {
          if (isSettled) {
            grouped[credit.from_department_id].settledCreditsOut += Number(credit.amount);
          } else {
            grouped[credit.from_department_id].creditsOut += Number(credit.amount);
          }
        }
      });

      // Add reconciliation differences
      reconciliationsRes.data?.forEach((rec: any) => {
        // For now, since reconciliation doesn't have department_id, we'll show it separately
        // You may want to add department_id to reconciliations table
      });

      // Add expenses
      expensesRes.data?.forEach((expense: any) => {
        if (expense.department_id && grouped[expense.department_id]) {
          grouped[expense.department_id].expenses += Number(expense.amount);
        }
      });

      // Subtract suspended revenue (unapproved extra cash)
      suspendedRevenueRes.data?.forEach((suspended: any) => {
        if (suspended.department_id && grouped[suspended.department_id]) {
          grouped[suspended.department_id].suspendedRevenue += Number(suspended.amount);
        }
      });

      // Calculate net sales
      // Formula: Gross Sales + Unsettled Credits IN - Unsettled Credits OUT 
      //          - Settled Credits IN (refunded back) + Settled Credits OUT (received back)
      //          - Expenses - Reconciliation Differences - Suspended Revenue
      Object.keys(grouped).forEach((deptId) => {
        const dept = grouped[deptId];
        dept.netSales = dept.grossSales 
          + dept.creditsIn 
          - dept.creditsOut 
          - dept.settledCreditsIn  // Deduction: we're paying back borrowed money
          + dept.settledCreditsOut // Addition: we're receiving back lent money
          - dept.expenses 
          - dept.reconciliationDiff
          - dept.suspendedRevenue; // Subtract unapproved extra cash
      });
      
      return Object.values(grouped);
    },
  });

  // Total statistics (excluding mobile money and card/bank payments from revenue)
  const { data: totalStats } = useQuery({
    queryKey: ["total-stats", dateFilter],
    queryFn: async () => {
      const dateRange = getDateRange();
      
      const [sales, products, customers, departments] = await Promise.all([
        localApi.sales.getAll(),
        localApi.products.getAll(),
        localApi.customers.getAll(),
        localApi.departments.getAll(),
      ]);

      let filteredSales = sales.filter((sale: any) => 
        !['mobile_money', 'card', 'bank'].includes(sale.payment_method) &&
        sale.status !== 'voided'
      );

      if (dateRange) {
        filteredSales = filteredSales.filter((sale: any) => {
          const saleDate = new Date(sale.created_at);
          return saleDate >= new Date(dateRange.start) && saleDate <= new Date(dateRange.end);
        });
      }

      return {
        totalRevenue: filteredSales.reduce((sum, sale) => sum + Number(sale.total), 0) || 0,
        totalProducts: products.length || 0,
        totalCustomers: customers.length || 0,
        totalDepartments: departments.length || 0,
      };
    },
  });

  // Low stock by department - products only (perfumes included)
  const { data: lowStockByDept } = useQuery({
    queryKey: ["low-stock-by-dept"],
    queryFn: async () => {
      const [products, departments] = await Promise.all([
        localApi.products.getAll(),
        localApi.departments.getAll(),
      ]);

      const allProducts = (products || []).filter((p: any) => {
        // Handle both unit and milliliter tracking
        if (p.tracking_type === 'milliliter') {
          return (p.current_stock_ml || 0) <= (p.reorder_level || 0);
        }
        return (p.current_stock || 0) <= (p.reorder_level || 0);
      });

      const grouped = allProducts.reduce((acc: any, product: any) => {
        const dept = departments.find((d: any) => d.id === product.department_id);
        const deptName = dept?.name || "No Department";
        if (!acc[deptName]) {
          acc[deptName] = [];
        }
        acc[deptName].push(product);
        return acc;
      }, {});
      
      return grouped;
    },
  });

  // Reconciliation data
  const { data: reconciliations } = useQuery({
    queryKey: ["reconciliations"],
    queryFn: async () => {
      const data = await localApi.reconciliations.getAll();
      return data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
    },
  });

  // Expenses data
  const { data: expenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const data = await localApi.expenses.getAll();
      return data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
    },
  });

  // Credits data
  const { data: credits } = useQuery({
    queryKey: ["all-credits"],
    queryFn: async () => {
      const [creditsData, departments] = await Promise.all([
        localApi.credits.getAll(),
        localApi.departments.getAll(),
      ]);
      
      // Add department names to credits
      const enrichedCredits = creditsData.map((credit: any) => {
        const fromDept = departments.find((d: any) => d.id === credit.from_department_id);
        const toDept = departments.find((d: any) => d.id === credit.to_department_id);
        return {
          ...credit,
          from_department: fromDept ? { name: fromDept.name } : null,
          to_department: toDept ? { name: toDept.name } : null,
        };
      });
      
      return enrichedCredits.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });

  // Mobile Money Revenue (separate from total revenue)
  const { data: mobileMoneyStats } = useQuery({
    queryKey: ["mobile-money-stats"],
    queryFn: async () => {
      const sales = await localApi.sales.getAll();
      
      const mobileMoneyAndCardSales = sales.filter((sale: any) => 
        ['mobile_money', 'card', 'bank'].includes(sale.payment_method)
      );
      
      const totalMobileMoneyRevenue = mobileMoneyAndCardSales.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
      const transactionCount = mobileMoneyAndCardSales.length || 0;
      
      return {
        totalRevenue: totalMobileMoneyRevenue,
        transactionCount,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <main className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">Admin Reports & Statements</h2>
            <p className="text-sm sm:text-base text-muted-foreground">Comprehensive business analytics</p>
          </div>
          <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Today</SelectItem>
              <SelectItem value="weekly">Last 7 Days</SelectItem>
              <SelectItem value="monthly">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Report Explanation:</strong> Gross Sales = Total sales revenue (excluding mobile money/card/bank). 
            Net Sales = Gross Sales + Credits IN - Credits OUT - Settled Credits IN + Settled Credits OUT - Expenses - Reconciliation Differences - Suspended Revenue.
            Date filter applies to sales transactions. Use the same filter in department reports for matching data.
          </AlertDescription>
        </Alert>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                UGX {totalStats?.totalRevenue.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Excludes mobile money & card payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mobile Money & Cards</CardTitle>
              <CreditCard className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                UGX {mobileMoneyStats?.totalRevenue.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {mobileMoneyStats?.transactionCount || 0} transactions (not in total revenue)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats?.totalProducts || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats?.totalCustomers || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStats?.totalDepartments || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="departments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="departments">Sales</TabsTrigger>
            <TabsTrigger value="mobile-money">Card & Mobile Money</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
          </TabsList>

          <TabsContent value="departments">
            <Card>
              <CardHeader>
                <CardTitle>Department Sales Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentSales && departmentSales.length > 0 ? (
                    departmentSales.map((dept: any, index: number) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-lg">{dept.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {dept.count} transactions
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Net Sales</p>
                            <p className="text-2xl font-bold text-success">
                              UGX {dept.netSales.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-muted/50 p-2 rounded">
                            <p className="text-muted-foreground">Gross Sales</p>
                            <p className="font-semibold">UGX {dept.grossSales.toLocaleString()}</p>
                          </div>
                          <div className="bg-success/10 p-2 rounded">
                            <p className="text-muted-foreground">Credits In</p>
                            <p className="font-semibold text-success">+{dept.creditsIn.toLocaleString()}</p>
                          </div>
                          <div className="bg-destructive/10 p-2 rounded">
                            <p className="text-muted-foreground">Credits Out</p>
                            <p className="font-semibold text-destructive">-{dept.creditsOut.toLocaleString()}</p>
                          </div>
                          <div className="bg-warning/10 p-2 rounded">
                            <p className="text-muted-foreground">Expenses</p>
                            <p className="font-semibold text-warning">-{dept.expenses.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No sales data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mobile-money">
            <PaymentTransactionsReport />
          </TabsContent>

          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Items by Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {lowStockByDept && Object.keys(lowStockByDept).length > 0 ? (
                    Object.entries(lowStockByDept).map(([deptName, products]: [string, any]) => (
                      <div key={deptName}>
                        <h3 className="font-semibold text-lg mb-3">{deptName}</h3>
                        <div className="space-y-2">
                          {products.map((product: any) => (
                            <div
                              key={product.id}
                              className="flex items-center justify-between p-3 bg-warning/10 border border-warning/20 rounded-lg"
                            >
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  SKU: {product.barcode}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-warning">
                                  Stock: {product.tracking_type === 'milliliter' 
                                    ? `${product.current_stock_ml || 0} ml` 
                                    : `${product.current_stock || 0} ${product.unit}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Reorder at: {product.reorder_level} {product.tracking_type === 'milliliter' ? 'ml' : product.unit}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      All products are well stocked!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reconciliation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Cash Reconciliation Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reconciliations && reconciliations.length > 0 ? (
                  <div className="space-y-3">
                    {reconciliations.map((rec: any) => (
                      <div
                        key={rec.id}
                        className="flex justify-between items-center p-4 bg-muted/30 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{rec.cashier_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(rec.date), "MMM dd, yyyy")}
                          </p>
                          {rec.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{rec.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm">
                            System: <span className="font-medium">UGX {rec.system_cash.toLocaleString()}</span>
                          </p>
                          <p className="text-sm">
                            Reported: <span className="font-medium">UGX {rec.reported_cash.toLocaleString()}</span>
                          </p>
                          <p className={`text-sm font-semibold ${rec.difference >= 0 ? 'text-success' : 'text-destructive'}`}>
                            Diff: UGX {rec.difference.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No reconciliation records found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Business Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expenses && expenses.length > 0 ? (
                  <div className="space-y-3">
                    {expenses.map((expense: any) => (
                      <div
                        key={expense.id}
                        className="flex justify-between items-start p-4 bg-muted/30 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{expense.category}</p>
                          <p className="text-sm text-muted-foreground">{expense.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(expense.date), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-destructive">
                            UGX {expense.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No expenses recorded
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credits">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Interdepartmental Credits
                </CardTitle>
              </CardHeader>
              <CardContent>
                {credits && credits.length > 0 ? (
                  <div className="space-y-4">
                    {credits.map((credit: any) => (
                      <div
                        key={credit.id}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-lg">
                              UGX {credit.amount.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">{credit.purpose}</p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            credit.status === 'approved' ? 'bg-success/20 text-success' :
                            credit.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                            'bg-warning/20 text-warning'
                          }`}>
                            {credit.status.toUpperCase()}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">From:</span>
                            <p className="font-medium">
                              {credit.from_department?.name || credit.from_person || "External"}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">To:</span>
                            <p className="font-medium">
                              {credit.to_department?.name || credit.to_person || "External"}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(credit.created_at), "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No credit transactions found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminReports;
