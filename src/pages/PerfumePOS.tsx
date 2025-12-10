import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Trash2, Plus, Sparkles, Barcode } from "lucide-react";
import { toast } from "sonner";
import { useDepartment } from "@/contexts/DepartmentContext";
import { useDemoMode } from "@/contexts/DemoModeContext";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "perfume" | "shop_product";
  productId?: string;
  customerType?: "retail" | "wholesale";
  scentMixture?: string;
  bottleCost?: number;
  totalMl?: number;
  subtotal: number;
}

const PerfumePOS = () => {
  const queryClient = useQueryClient();
  const { selectedDepartmentId } = useDepartment();
  const { isDemoMode, showDemoWarning } = useDemoMode();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "mobile_money" | "credit">("cash");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [cashierName, setCashierName] = useState("");
  const [customerName, setCustomerName] = useState<string>("Walk-in");
  const [barcode, setBarcode] = useState("");

  // Fetch perfume products
  const { data: perfumeProducts = [] } = useQuery({
    queryKey: ["perfume-products", selectedDepartmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("department_id", selectedDepartmentId)
        .eq("tracking_type", "ml")
        .eq("is_active", true)
        .neq("name", "Oil Perfume")
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDepartmentId,
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", selectedDepartmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("department_id", selectedDepartmentId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDepartmentId,
  });

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ["settings", selectedDepartmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("department_id", selectedDepartmentId)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!selectedDepartmentId,
  });

  // Fetch current user profile for cashier name
  const { data: userProfile } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (userProfile?.full_name && !cashierName) {
      setCashierName(userProfile.full_name);
    }
  }, [userProfile, cashierName]);

  const addProductToCart = (product: any) => {
    const cartItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      name: product.name,
      price: product.price,
      quantity: 1,
      type: "perfume",
      productId: product.id,
      subtotal: product.price,
    };
    setCart(prev => [...prev, cartItem]);
    toast.success(`Added ${product.name} to cart`);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, quantity: newQuantity, subtotal: item.price * newQuantity }
        : item
    ));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal;

  const completeSaleMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) {
        throw new Error("Cart is empty");
      }

      const saleNumber = `POS-${Date.now()}`;

      if (isDemoMode) {
        showDemoWarning();
        setCart([]);
        return { id: 'demo', sale_number: saleNumber };
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert([{
          department_id: selectedDepartmentId,
          cashier_id: user?.id || null,
          customer_id: selectedCustomerId,
          payment_method: paymentMethod,
          subtotal: subtotal,
          total: total,
          sale_number: saleNumber,
          status: 'completed' as const,
        }])
        .select()
        .single();

      if (saleError) {
        throw new Error("Failed to save sale: " + saleError.message);
      }

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.productId || null,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total: item.subtotal,
        ml_amount: item.totalMl || null,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) {
        throw new Error("Failed to save sale items: " + itemsError.message);
      }

      // Update stock for products - fetch fresh stock values from database
      for (const item of cart) {
        if (item.productId) {
          // Fetch current stock from database to avoid stale data issues
          const { data: currentProduct, error: fetchError } = await supabase
            .from("products")
            .select("stock, total_ml, tracking_type")
            .eq("id", item.productId)
            .single();
          
          if (fetchError || !currentProduct) {
            console.error("Failed to fetch product for stock update:", fetchError);
            continue;
          }
          
          if (currentProduct.tracking_type === 'ml' && item.totalMl) {
            const newMl = Math.max(0, (currentProduct.total_ml || 0) - item.totalMl);
            await supabase
              .from("products")
              .update({ total_ml: newMl })
              .eq("id", item.productId);
          } else {
            const newStock = Math.max(0, (currentProduct.stock || 0) - item.quantity);
            await supabase
              .from("products")
              .update({ stock: newStock })
              .eq("id", item.productId);
          }
        }
      }

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Sale completed successfully!");
      setCart([]);
      setPaymentMethod("cash");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to complete sale");
    },
  });

  const handleBarcodeSearch = () => {
    if (!barcode.trim()) return;
    
    const product = perfumeProducts.find(
      p => p.barcode === barcode || p.sku === barcode
    );
    
    if (product) {
      addProductToCart(product);
      setBarcode("");
    } else {
      toast.error("Product not found with this barcode");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-32 lg:pt-20">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 pt-24 pb-8">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Perfume Point of Sale</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Create custom perfume blends and process sales
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Product Selection */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Add Products
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Scan or enter barcode..."
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleBarcodeSearch();
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleBarcodeSearch}>
                    Search
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {perfumeProducts.slice(0, 9).map((product) => (
                    <Button
                      key={product.id}
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-start"
                      onClick={() => addProductToCart(product)}
                    >
                      <span className="font-medium text-sm">{product.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {product.price?.toLocaleString()} UGX
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shopping Cart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Cart ({cart.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Cart is empty. Add products to continue.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.price.toLocaleString()} UGX x {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-16 text-center"
                          />
                          <p className="font-semibold w-24 text-right">
                            {item.subtotal.toLocaleString()} UGX
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Checkout Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Checkout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Customer</Label>
                  <Select
                    value={selectedCustomerId || "walk-in"}
                    onValueChange={(value) => {
                      if (value === "walk-in") {
                        setSelectedCustomerId(null);
                        setCustomerName("Walk-in");
                      } else {
                        setSelectedCustomerId(value);
                        const customer = customers.find(c => c.id === value);
                        setCustomerName(customer?.name || "Walk-in");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value: "cash" | "card" | "mobile_money" | "credit") => setPaymentMethod(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{subtotal.toLocaleString()} UGX</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{total.toLocaleString()} UGX</span>
                  </div>
                </div>

                <Button
                  onClick={() => completeSaleMutation.mutate()}
                  disabled={cart.length === 0 || completeSaleMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {completeSaleMutation.isPending ? "Processing..." : "Complete Sale"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PerfumePOS;
