import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Search, Droplet, ShoppingBag, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  department_id: string | null;
}

const CustomerScentMemory = () => {
  const [searchParams] = useSearchParams();
  const urlReceipt = searchParams.get("receipt");
  const urlName = searchParams.get("name");
  const urlPhone = searchParams.get("phone");
  const urlCustomerId = searchParams.get("customerId");
  const urlDepartmentId = searchParams.get("dept");

  const [searchTerm, setSearchTerm] = useState(urlName || "");
  const [searchPhone, setSearchPhone] = useState(urlPhone || "");
  const [searchReceipt, setSearchReceipt] = useState(urlReceipt || "");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [autoSearchDone, setAutoSearchDone] = useState(false);

  const searchCustomers = async () => {
    if (!searchTerm.trim() && !searchPhone.trim() && !searchReceipt.trim()) {
      toast.error("Please enter at least one search criteria");
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase.from("customers").select("id, name, phone, department_id");

      // Search by name
      if (searchTerm.trim()) {
        query = query.ilike("name", `%${searchTerm}%`);
      }

      // Search by phone
      if (searchPhone.trim()) {
        query = query.ilike("phone", `%${searchPhone}%`);
      }

      const { data: results, error } = await query.limit(20);

      if (error) throw error;

      let finalResults = results || [];

      // If searching by receipt number, find customer from sales
      if (searchReceipt.trim() && finalResults.length === 0) {
        const { data: salesData, error: salesError } = await supabase
          .from("sales")
          .select("customer_id, customers(id, name, phone)")
          .eq("receipt_number", searchReceipt.trim())
          .single();

        if (!salesError && salesData?.customers) {
          finalResults = [salesData.customers as any];
        }
      }

      // Filter results to include case matches if name search is used
      if (searchTerm.trim()) {
        finalResults = finalResults.filter(customer => 
          customer.name.includes(searchTerm)
        );
      }

      setCustomers(finalResults);
      
      if (finalResults.length === 0) {
        toast.info("No customers found with the provided criteria");
      }
    } catch (error) {
      console.error("Error searching customers:", error);
      toast.error("Failed to search customers");
    } finally {
      setLoading(false);
    }
  };

  const fetchLastPurchase = useCallback(async (customerId?: string, departmentId?: string) => {
    const targetCustomer = customerId || selectedCustomer?.id;
    const targetDepartment = departmentId || selectedCustomer?.department_id;

    if (!targetCustomer) {
      toast.error("Please select a customer first");
      return;
    }

    try {
      setLoadingAI(true);
      const { data: result, error } = await supabase.functions.invoke(
        "perfume-scent-assistant",
        {
          body: { 
            customerId: targetCustomer,
            departmentId: targetDepartment 
          },
        }
      );

      if (error) throw error;
      setData(result);
      
      if (result.lastPurchase) {
        toast.success("Found last purchase!");
      } else {
        toast.info("No previous perfume purchases found");
      }
    } catch (error: any) {
      console.error("Error fetching purchase history:", error);
      toast.error(error.message || "Failed to get purchase history");
    } finally {
      setLoadingAI(false);
    }
  }, [selectedCustomer]);

  // Auto-search on load if URL parameters are present
  useEffect(() => {
    if (autoSearchDone) return;

    const performAutoSearch = async () => {
      // If customerId is provided directly, fetch purchase immediately
      if (urlCustomerId) {
        setAutoSearchDone(true);
        await fetchLastPurchase(urlCustomerId, urlDepartmentId || undefined);
        return;
      }

      // Otherwise search for customer first
      if (urlReceipt || urlName || urlPhone) {
        setAutoSearchDone(true);
        try {
          setLoading(true);
          
          let query = supabase.from("customers").select("id, name, phone, department_id");

          // Search by name
          if (urlName) {
            query = query.ilike("name", `%${urlName}%`);
          }

          // Search by phone
          if (urlPhone) {
            query = query.ilike("phone", `%${urlPhone}%`);
          }

          const { data: results, error } = await query.limit(20);

          if (error) throw error;

          let finalResults = results || [];

          // If searching by receipt number, find customer from sales
          if (urlReceipt && finalResults.length === 0) {
            const { data: salesData, error: salesError } = await supabase
              .from("sales")
              .select("customer_id, customers(id, name, phone, department_id)")
              .eq("receipt_number", urlReceipt)
              .single();

            if (!salesError && salesData?.customers) {
              finalResults = [salesData.customers as any];
            }
          }

          if (finalResults.length > 0) {
            const customer = finalResults[0];
            setSelectedCustomer(customer);
            setCustomers(finalResults);
            // Automatically fetch purchase for first customer
            await fetchLastPurchase(customer.id, customer.department_id);
          } else {
            toast.info("No customers found with the provided criteria");
          }
        } catch (error) {
          console.error("Error auto-searching:", error);
          toast.error("Failed to auto-load customer data");
        } finally {
          setLoading(false);
        }
      }
    };

    performAutoSearch();
  }, [urlReceipt, urlName, urlPhone, urlCustomerId, urlDepartmentId, autoSearchDone, fetchLastPurchase]);

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Scent Memory</h1>
          <p className="text-muted-foreground">
            Find customers and view their previous scent purchases
          </p>
        </div>
      </div>

      {/* Customer Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Customer
          </CardTitle>
          <CardDescription>
            Search by name, phone number, or receipt number to find scent history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Customer Name</Label>
              <Input
                id="search"
                placeholder="Enter name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchCustomers()}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="Enter phone..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchCustomers()}
              />
            </div>
            <div>
              <Label htmlFor="receipt">Receipt Number</Label>
              <Input
                id="receipt"
                placeholder="Enter receipt..."
                value={searchReceipt}
                onChange={(e) => setSearchReceipt(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchCustomers()}
              />
            </div>
          </div>
          <Button
            onClick={searchCustomers}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Searching..." : "Search"}
          </Button>

          {customers.length > 0 && (
            <div className="space-y-2">
              <Label>Select Customer</Label>
              <div className="grid gap-2">
                {customers.map((customer) => (
                  <Button
                    key={customer.id}
                    variant={selectedCustomer?.id === customer.id ? "default" : "outline"}
                    className="justify-start h-auto py-3"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setData(null);
                    }}
                  >
                    <div className="text-left">
                      <div className="font-medium">{customer.name}</div>
                      {customer.phone && (
                        <div className="text-xs text-muted-foreground">
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {selectedCustomer && (
            <div className="pt-4 border-t">
              <Button
                onClick={() => fetchLastPurchase()}
                disabled={loadingAI}
                size="lg"
                className="w-full"
              >
                {loadingAI ? (
                  "Loading..."
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Show Last Purchase
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {loadingAI && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-2">
              <Search className="h-8 w-8 animate-pulse mx-auto text-primary" />
              <p className="text-muted-foreground">
                Searching purchase history...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {data && !loadingAI && (
        <>
          {/* Last Purchase - Highlighted */}
          {data.lastPurchase ? (
            <Card className="border-primary bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplet className="h-5 w-5 text-primary" />
                  Last Purchase - {selectedCustomer?.name}
                </CardTitle>
                <CardDescription>
                  {new Date(data.lastPurchase.sales.created_at).toLocaleDateString()} - Receipt: {data.lastPurchase.sales.receipt_number}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Product:
                  </div>
                  <div className="text-lg font-semibold">
                    {data.lastPurchase.item_name}
                  </div>
                </div>
                {data.lastPurchase.scent_mixture && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Scent Mixture Used:
                    </div>
                    <div className="text-base bg-background p-3 rounded-lg border border-primary/20 font-medium">
                      {data.lastPurchase.scent_mixture}
                    </div>
                  </div>
                )}
                {data.lastPurchase.quantity && (
                  <div className="text-sm text-muted-foreground">
                    Quantity: {data.lastPurchase.quantity}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center space-y-2">
                  <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No previous perfume purchases found for {selectedCustomer?.name}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Previous Purchases */}
          {data.allPurchases && data.allPurchases.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Previous Purchases
                </CardTitle>
                <CardDescription>
                  {data.allPurchases.length - 1} earlier purchase(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.allPurchases.slice(1).map((purchase: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border bg-muted/30 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Droplet className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{purchase.item_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(purchase.sales.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {purchase.scent_mixture && (
                      <div className="pl-6">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Scent:
                        </div>
                        <div className="text-xs bg-background p-2 rounded">
                          {purchase.scent_mixture}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Customer Preferences */}
          {data.preferences && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Saved Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.preferences.preferred_bottle_sizes &&
                  data.preferences.preferred_bottle_sizes.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">
                        Preferred Bottle Sizes:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {data.preferences.preferred_bottle_sizes.map(
                          (size: number, index: number) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                            >
                              {size}ml
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}
                {data.preferences.notes && (
                  <div>
                    <div className="text-sm font-medium mb-2">Notes:</div>
                    <p className="text-sm text-muted-foreground">
                      {data.preferences.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerScentMemory;
