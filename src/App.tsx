import * as React from "react";
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DepartmentProvider } from "./contexts/DepartmentContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { DemoModeProvider } from "./contexts/DemoModeContext";
import { OfflineSyncIndicator } from "./components/OfflineSyncIndicator";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { GettingStarted } from "./components/GettingStarted";
import { DemoModeBanner } from "./components/DemoModeBanner";
import WhatsAppButton from "./components/WhatsAppButton";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { lazyRetry } from "./utils/lazyRetry";

// Lazy load pages for better performance
const Dashboard = lazyRetry(() => import("./pages/Dashboard"), "Dashboard");
const Sales = lazyRetry(() => import("./pages/Sales"), "Sales");
const Inventory = lazyRetry(() => import("./pages/Inventory"), "Inventory");
const Services = lazyRetry(() => import("./pages/Services"), "Services");
const Customers = lazyRetry(() => import("./pages/Customers"), "Customers");
const Appointments = lazyRetry(() => import("./pages/Appointments"), "Appointments");
const Reports = lazyRetry(() => import("./pages/Reports"), "Reports");
const Settings = lazyRetry(() => import("./pages/Settings"), "Settings");
const Auth = lazyRetry(() => import("./pages/Auth"), "Auth");
const NotFound = lazyRetry(() => import("./pages/NotFound"), "NotFound");
const AdminReports = lazyRetry(() => import("./pages/AdminReports"), "AdminReports");
const MobileMoney = lazyRetry(() => import("./pages/MobileMoney"), "MobileMoney");
const MobileMoneyDashboard = lazyRetry(() => import("./pages/MobileMoneyDashboard"), "MobileMoneyDashboard");
const AdvancedAnalytics = lazyRetry(() => import("./pages/AdvancedAnalytics"), "AdvancedAnalytics");
const PerfumeAnalytics = lazyRetry(() => import("./pages/PerfumeAnalytics"), "PerfumeAnalytics");
const PerfumeInventory = lazyRetry(() => import("./pages/PerfumeInventory"), "PerfumeInventory");
const PerfumeDashboard = lazyRetry(() => import("./pages/PerfumeDashboard"), "PerfumeDashboard");
const PerfumePOS = lazyRetry(() => import("./pages/PerfumePOS"), "PerfumePOS");
const StaffManagement = lazyRetry(() => import("./pages/StaffManagement"), "StaffManagement");
const Reconcile = lazyRetry(() => import("./pages/Reconcile"), "Reconcile");
const Expenses = lazyRetry(() => import("./pages/Expenses"), "Expenses");
const SyncUsers = lazyRetry(() => import("./pages/SyncUsers"), "SyncUsers");
const InternalUsage = lazyRetry(() => import("./pages/InternalUsage"), "InternalUsage");
const SalesHistory = lazyRetry(() => import("./pages/SalesHistory"), "SalesHistory");
const BundleGuide = lazyRetry(() => import("./pages/BundleGuide"), "BundleGuide");
const BarcodeGenerator = lazyRetry(() => import("./pages/BarcodeGenerator"), "BarcodeGenerator");
const ScentPopularityTracker = lazyRetry(() => import("./pages/ScentPopularityTracker"), "ScentPopularityTracker");
const PerfumeRevenueReport = lazyRetry(() => import("./pages/PerfumeRevenueReport"), "PerfumeRevenueReport");
const PerfumeDepartmentReport = lazyRetry(() => import("./pages/PerfumeDepartmentReport"), "PerfumeDepartmentReport");
const ScentManager = lazyRetry(() => import("./pages/ScentManager"), "ScentManager");
const Credits = lazyRetry(() => import("./pages/Credits"), "Credits");
const AdminCreditApproval = lazyRetry(() => import("./pages/AdminCreditApproval"), "AdminCreditApproval");
const Inbox = lazyRetry(() => import("./pages/Inbox"), "Inbox");
const LandingPage = lazyRetry(() => import("./pages/LandingPage"), "LandingPage");
const LandingPageEditor = lazyRetry(() => import("./pages/LandingPageEditor"), "LandingPageEditor");
const ComingSoon = lazyRetry(() => import("./pages/ComingSoon"), "ComingSoon");
const Suppliers = lazyRetry(() => import("./pages/Suppliers"), "Suppliers");
const SuspendedRevenue = lazyRetry(() => import("./pages/SuspendedRevenue"), "SuspendedRevenue");
const InstallPWA = lazyRetry(() => import("./pages/InstallPWA"), "InstallPWA");
const PerfumeSalesHistory = lazyRetry(() => import("./pages/PerfumeSalesHistory"), "PerfumeSalesHistory");
const CustomerCredits = lazyRetry(() => import("./pages/CustomerCredits"), "CustomerCredits");
const CustomerScentCheckIn = lazyRetry(() => import("./pages/CustomerScentCheckIn"), "CustomerScentCheckIn");
const CustomerScentMemory = lazyRetry(() => import("./pages/CustomerScentMemory"), "CustomerScentMemory");
const ScentCheckInQR = lazyRetry(() => import("./pages/ScentCheckInQR"), "ScentCheckInQR");
const DataImport = lazyRetry(() => import("./pages/DataImport"), "DataImport");
const UserAccountsGuide = lazyRetry(() => import("./pages/UserAccountsGuide"), "UserAccountsGuide");
const CashDrawer = lazyRetry(() => import("./pages/CashDrawer"), "CashDrawer");

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Configure QueryClient with caching for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // Data is fresh for 2 minutes
      gcTime: 1000 * 60 * 10, // Cache for 10 minutes
      refetchOnWindowFocus: false, // Don't refetch when window gains focus
      retry: 1, // Only retry once on failure
    },
  },
});

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  // Always render the same structure to maintain consistent hook usage
  return (
    <>
      {user && (
        <>
          <DemoModeBanner />
          <GettingStarted />
          <WhatsAppButton />
        </>
      )}
      {!user ? (
        <>{children}</>
      ) : (
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <header className="sticky top-0 z-[60] w-full">
                <div className="flex h-14 items-center gap-4 px-4">
                  <SidebarTrigger />
                  <div className="flex-1" />
                  <ThemeToggle />
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              </header>
              <main className="flex-1">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      )}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <DemoModeProvider>
              <DepartmentProvider>
                <OfflineSyncIndicator />

                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route element={<AppLayout><ProtectedRoute /></AppLayout>}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/sales" element={<Sales />} />
                      <Route path="/inventory" element={<Inventory />} />
                      <Route path="/services" element={<Services />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/appointments" element={<Appointments />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/admin-reports" element={<AdminReports />} />
                      <Route path="/mobile-money" element={<MobileMoney />} />
                      <Route path="/mobile-money-dashboard" element={<MobileMoneyDashboard />} />
                      <Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
                      <Route path="/perfume-analytics" element={<PerfumeAnalytics />} />
                      <Route path="/perfume-dashboard" element={<PerfumeDashboard />} />
                      <Route path="/perfume-pos" element={<PerfumePOS />} />
                      <Route path="/perfume-inventory" element={<PerfumeInventory />} />
                      <Route path="/perfume-sales-history" element={<PerfumeSalesHistory />} />
                      <Route path="/staff-management" element={<StaffManagement />} />
                      <Route path="/reconcile" element={<Reconcile />} />
                      <Route path="/suspended-revenue" element={<SuspendedRevenue />} />
                      <Route path="/expenses" element={<Expenses />} />
                      <Route path="/sync-users" element={<SyncUsers />} />
                      <Route path="/internal-usage" element={<InternalUsage />} />
                      <Route path="/sales-history" element={<SalesHistory />} />
                      <Route path="/bundle-guide" element={<BundleGuide />} />
                      <Route path="/barcode-generator" element={<BarcodeGenerator />} />
                      <Route path="/scent-popularity" element={<ScentPopularityTracker />} />
                      <Route path="/perfume-revenue" element={<PerfumeRevenueReport />} />
                      <Route path="/perfume-report" element={<PerfumeDepartmentReport />} />
                      <Route path="/scent-manager" element={<ScentManager />} />
                      <Route path="/credits" element={<Credits />} />
                      <Route path="/admin-credit-approval" element={<AdminCreditApproval />} />
                      <Route path="/inbox" element={<Inbox />} />
                      <Route path="/landing-page-editor" element={<LandingPageEditor />} />
                      <Route path="/suppliers" element={<Suppliers />} />
                      <Route path="/install" element={<InstallPWA />} />
                      <Route path="/customer-credits" element={<CustomerCredits />} />
                      <Route path="/scent-qr" element={<ScentCheckInQR />} />
                      <Route path="/data-import" element={<DataImport />} />
                      <Route path="/user-accounts-guide" element={<UserAccountsGuide />} />
                      <Route path="/cash-drawer" element={<CashDrawer />} />
                    </Route>
                    {/* Public routes for customer self-service */}
                    <Route path="/customer-scent-check-in" element={<CustomerScentCheckIn />} />
                    <Route path="/customer-scent-memory" element={<CustomerScentMemory />} />
                    {/* Redirect /home to root */}
                    <Route path="/home" element={<Navigate to="/" replace />} />
                    {/* Catch-all route for 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </DepartmentProvider>
            </DemoModeProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
