import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useDepartment } from "@/contexts/DepartmentContext";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, AlertCircle, Package, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Using the existing products table schema
interface PerfumeProduct {
  id: string;
  name: string;
  description: string | null;
  barcode: string | null;
  sku: string | null;
  cost_price: number | null;
  price: number;
  stock: number | null;
  total_ml: number | null;
  min_stock: number | null;
  tracking_type: 'ml' | 'quantity' | null;
  department_id: string | null;
  is_active: boolean | null;
}

export default function PerfumeInventory() {
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const { selectedDepartmentId: contextDepartmentId, selectedDepartment: contextDepartment, isPerfumeDepartment } = useDepartment();
  
  const [selectedPerfumeDeptId, setSelectedPerfumeDeptId] = useState<string | null>(null);
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [restockAmount, setRestockAmount] = useState(0);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PerfumeProduct | null>(null);
  
  // Oil perfume pricing state (using price as retail, cost_price as cost)
  const [oilPerfumePricing, setOilPerfumePricing] = useState({
    cost_price: 0,
    retail_price_per_ml: 0,
    min_stock: 1000,
  });

  // Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    barcode: "",
    cost_price: 0,
    price: 0,
    stock: 0,
    min_stock: 10,
    sku: "",
  });

  // Fetch perfume departments
  const { data: perfumeDepartments = [] } = useQuery({
    queryKey: ["perfume-departments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departments")
        .select("*")
        .ilike("name", "%perfume%")
        .order("name");
      return data || [];
    },
  });
  
  useEffect(() => {
    if (isPerfumeDepartment && contextDepartmentId) {
      setSelectedPerfumeDeptId(contextDepartmentId);
    } else if (perfumeDepartments.length > 0 && !selectedPerfumeDeptId) {
      setSelectedPerfumeDeptId(perfumeDepartments[0].id);
    }
  }, [isPerfumeDepartment, contextDepartmentId, perfumeDepartments, selectedPerfumeDeptId]);
  
  const selectedDepartmentId = selectedPerfumeDeptId;
  const selectedDepartment = perfumeDepartments.find(d => d.id === selectedPerfumeDeptId) || contextDepartment;

  // Fetch master perfume (tracking_type = 'ml')
  const { data: masterPerfume, refetch: refetchMasterPerfume } = useQuery({
    queryKey: ["master-perfume", selectedDepartmentId],
    queryFn: async () => {
      if (!selectedDepartmentId) return null;
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("name", "Oil Perfume")
        .eq("tracking_type", "ml")
        .eq("department_id", selectedDepartmentId)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setOilPerfumePricing({
          cost_price: data.cost_price || 0,
          retail_price_per_ml: data.price || 0,
          min_stock: data.min_stock || 1000,
        });
      }
      return data;
    },
    enabled: !!selectedDepartmentId,
  });

  // Create master perfume mutation
  const createMasterPerfumeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDepartmentId) throw new Error("No department selected");
      
      const { data: existing } = await supabase
        .from("products")
        .select("*")
        .eq("name", "Oil Perfume")
        .eq("tracking_type", "ml")
        .eq("department_id", selectedDepartmentId)
        .maybeSingle();
      
      if (existing) {
        toast.info("Oil Perfume product already exists for this department");
        return existing;
      }

      const { data, error } = await supabase
        .from("products")
        .insert([{
          name: "Oil Perfume",
          cost_price: 0,
          price: 800,
          tracking_type: "ml" as const,
          total_ml: 0,
          min_stock: 1000,
          department_id: selectedDepartmentId,
          is_active: true,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Oil Perfume master product created");
      setOilPerfumePricing({
        cost_price: data.cost_price || 0,
        retail_price_per_ml: data.price || 800,
        min_stock: data.min_stock || 1000,
      });
      refetchMasterPerfume();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      console.error("Error creating master perfume:", error);
      toast.error("Failed to create Oil Perfume master product");
    },
  });

  // Fetch shop products (ml tracking, excluding Oil Perfume)
  const { data: shopProducts = [], refetch: refetchShopProducts, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["perfume-shop-products", selectedDepartmentId],
    queryFn: async () => {
      if (!selectedDepartmentId) return [];
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("department_id", selectedDepartmentId)
        .eq("tracking_type", "ml")
        .neq("name", "Oil Perfume")
        .order("name", { ascending: true });
      
      if (error) throw error;
      return (data || []) as PerfumeProduct[];
    },
    enabled: !!selectedDepartmentId,
  });

  // Oil perfume restock mutation
  const restockMutation = useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      if (!masterPerfume) throw new Error("Master perfume product not found");
      const newStock = (masterPerfume.total_ml || 0) + amount;
      const { error } = await supabase
        .from("products")
        .update({ total_ml: newStock })
        .eq("id", masterPerfume.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oil perfume stock updated");
      refetchMasterPerfume();
      setRestockDialogOpen(false);
      setRestockAmount(0);
    },
  });

  // Oil perfume pricing mutation
  const updatePricingMutation = useMutation({
    mutationFn: async () => {
      if (!masterPerfume) throw new Error("Master perfume product not found");
      const { error } = await supabase
        .from("products")
        .update({
          cost_price: oilPerfumePricing.cost_price,
          price: oilPerfumePricing.retail_price_per_ml,
          min_stock: oilPerfumePricing.min_stock,
        })
        .eq("id", masterPerfume.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oil perfume pricing updated");
      refetchMasterPerfume();
      setPricingDialogOpen(false);
    },
  });

  // Shop product mutations
  const saveProductMutation = useMutation({
    mutationFn: async () => {
      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update({
            name: productForm.name,
            description: productForm.description,
            barcode: productForm.barcode,
            cost_price: productForm.cost_price,
            price: productForm.price,
            stock: productForm.stock,
            min_stock: productForm.min_stock,
            sku: productForm.sku,
          })
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("products")
          .insert([{
            name: productForm.name,
            description: productForm.description,
            barcode: productForm.barcode,
            cost_price: productForm.cost_price,
            price: productForm.price,
            stock: productForm.stock,
            min_stock: productForm.min_stock,
            sku: productForm.sku,
            department_id: selectedDepartmentId,
            tracking_type: "ml" as const,
            is_active: true,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingProduct ? "Product updated" : "Product added");
      refetchShopProducts();
      setProductDialogOpen(false);
      resetProductForm();
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      refetchShopProducts();
    },
  });

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      barcode: "",
      cost_price: 0,
      price: 0,
      stock: 0,
      min_stock: 10,
      sku: "",
    });
    setEditingProduct(null);
  };

  const openEditProduct = (product: PerfumeProduct) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || "",
      barcode: product.barcode || "",
      cost_price: product.cost_price || 0,
      price: product.price,
      stock: product.stock || 0,
      min_stock: product.min_stock || 10,
      sku: product.sku || "",
    });
    setProductDialogOpen(true);
  };

  const isOilPerfumeLowStock = (masterPerfume?.total_ml || 0) < (masterPerfume?.min_stock || 1000);
  const lowStockProducts = shopProducts.filter(p => (p.stock || 0) <= (p.min_stock || 5));

  return (
    <div className="min-h-screen bg-background pt-32 lg:pt-20">
      <Navigation />
      <main className="container mx-auto p-4 md:p-6 space-y-6 mt-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">Perfume Shop Management</h1>
          </div>
          
          {isAdmin && perfumeDepartments.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-lg border">
              <Package className="w-4 h-4 text-muted-foreground" />
              <Select 
                value={selectedPerfumeDeptId || ""} 
                onValueChange={setSelectedPerfumeDeptId}
              >
                <SelectTrigger className="w-[200px] border-0 focus:ring-0 h-8">
                  <SelectValue>
                    {selectedDepartment?.name || "Select Perfume Dept"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {perfumeDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Tabs defaultValue="oil-perfume" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="oil-perfume" className="relative">
              Oil Perfume
              {isOilPerfumeLowStock && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">
                  Low Stock
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="shop-products">Shop Products</TabsTrigger>
          </TabsList>

          {/* Oil Perfume Tab */}
          <TabsContent value="oil-perfume" className="space-y-6">
            {!masterPerfume ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">Oil Perfume Master Product Not Found</h3>
                  <p className="text-muted-foreground mb-6">
                    Create the master Oil Perfume product to start managing perfume inventory and sales.
                  </p>
                  <Button 
                    onClick={() => createMasterPerfumeMutation.mutate()}
                    disabled={createMasterPerfumeMutation.isPending}
                    size="lg"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    {createMasterPerfumeMutation.isPending ? "Creating..." : "Create Oil Perfume Product"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {isOilPerfumeLowStock && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Low Stock Alert</AlertTitle>
                    <AlertDescription>
                      Oil perfume stock is below reorder level ({masterPerfume.min_stock?.toLocaleString() || 0} ml)
                    </AlertDescription>
                  </Alert>
                )}

                <Card className={cn(
                  "border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10",
                  isOilPerfumeLowStock && "border-destructive/50"
                )}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-2xl">
                        <Sparkles className="w-7 h-7 text-primary" />
                        Oil Perfume - Master Stock
                      </span>
                      {isOilPerfumeLowStock && (
                        <AlertCircle className="w-6 h-6 text-destructive" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Stock Level</span>
                        <span className="text-sm font-semibold">
                          {masterPerfume.total_ml?.toLocaleString() || 0} / {masterPerfume.min_stock?.toLocaleString() || 0} ml
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(((masterPerfume.total_ml || 0) / (masterPerfume.min_stock || 1000)) * 100, 100)} 
                        className={cn(
                          "h-3",
                          isOilPerfumeLowStock && "[&>div]:bg-destructive"
                        )}
                      />
                      <p className="text-xs text-muted-foreground">
                        {isOilPerfumeLowStock ? "⚠️ Stock is below reorder level" : "✓ Stock is healthy"}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Total Stock</span>
                        <div className="text-4xl font-bold text-primary">
                          {masterPerfume.total_ml?.toLocaleString() || 0} ml
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <span className="text-sm text-muted-foreground">Reorder Level</span>
                        <div className="text-2xl font-semibold">
                          {masterPerfume.min_stock?.toLocaleString() || 0} ml
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Cost Price</span>
                        <div className="text-lg font-semibold">
                          {masterPerfume.cost_price?.toLocaleString() || 0} UGX/ml
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Retail Price</span>
                        <div className="text-lg font-semibold">
                          {masterPerfume.price?.toLocaleString() || 0} UGX/ml
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3 flex-wrap">
                      <Button 
                        onClick={() => setRestockDialogOpen(true)}
                        className="flex-1"
                        size="lg"
                        variant={isOilPerfumeLowStock ? "default" : "outline"}
                      >
                        <Package className="w-5 h-5 mr-2" />
                        Add Stock
                      </Button>
                      <Button 
                        onClick={() => setPricingDialogOpen(true)}
                        className="flex-1"
                        size="lg"
                        variant="secondary"
                      >
                        <Edit className="w-5 h-5 mr-2" />
                        Configure Pricing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Shop Products Tab */}
          <TabsContent value="shop-products" className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Manage bottles, bags, packaging materials, and other perfume shop products
              </p>
              <Button onClick={() => { resetProductForm(); setProductDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>

            {lowStockProducts.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Low Stock Items</AlertTitle>
                <AlertDescription>
                  {lowStockProducts.length} product(s) are running low on stock
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shopProducts.map((product) => (
                <Card key={product.id} className={cn(
                  (product.stock || 0) <= (product.min_stock || 5) && "border-destructive/50"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        {product.sku && (
                          <p className="text-sm text-muted-foreground mt-1">SKU: {product.sku}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {product.description && (
                      <p className="text-sm text-muted-foreground">{product.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Cost:</span>
                        <p className="font-semibold">{product.cost_price?.toLocaleString() || 0} UGX</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Price:</span>
                        <p className="font-semibold">{product.price?.toLocaleString() || 0} UGX</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stock:</span>
                        <p className={cn(
                          "font-semibold",
                          (product.stock || 0) <= (product.min_stock || 5) && "text-destructive"
                        )}>
                          {product.stock || 0}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => openEditProduct(product)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => {
                          if (confirm(`Delete ${product.name}?`)) {
                            deleteProductMutation.mutate(product.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {shopProducts.length === 0 && !isLoadingProducts && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No shop products yet. Add bottles, bags, and packaging materials.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Restock Dialog */}
        <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Oil Perfume Stock</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="restock-amount">Amount to Add (ml)</Label>
                <Input
                  id="restock-amount"
                  type="number"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Number(e.target.value))}
                  placeholder="Enter amount in ml"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Current stock: {masterPerfume?.total_ml?.toLocaleString() || 0} ml
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRestockDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => restockMutation.mutate({ amount: restockAmount })}
                disabled={restockMutation.isPending || restockAmount <= 0}
              >
                {restockMutation.isPending ? "Adding..." : "Add Stock"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pricing Dialog */}
        <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Oil Perfume Pricing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="cost-price">Cost Price (UGX/ml)</Label>
                <Input
                  id="cost-price"
                  type="number"
                  value={oilPerfumePricing.cost_price}
                  onChange={(e) => setOilPerfumePricing({ ...oilPerfumePricing, cost_price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="retail-price">Retail Price (UGX/ml)</Label>
                <Input
                  id="retail-price"
                  type="number"
                  value={oilPerfumePricing.retail_price_per_ml}
                  onChange={(e) => setOilPerfumePricing({ ...oilPerfumePricing, retail_price_per_ml: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="min-stock">Reorder Level (ml)</Label>
                <Input
                  id="min-stock"
                  type="number"
                  value={oilPerfumePricing.min_stock}
                  onChange={(e) => setOilPerfumePricing({ ...oilPerfumePricing, min_stock: Number(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPricingDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => updatePricingMutation.mutate()}
                disabled={updatePricingMutation.isPending}
              >
                {updatePricingMutation.isPending ? "Saving..." : "Save Pricing"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Product Dialog */}
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div>
                <Label htmlFor="product-name">Product Name</Label>
                <Input
                  id="product-name"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <Label htmlFor="product-description">Description</Label>
                <Textarea
                  id="product-description"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Enter description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-barcode">Barcode</Label>
                  <Input
                    id="product-barcode"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                    placeholder="Barcode"
                  />
                </div>
                <div>
                  <Label htmlFor="product-sku">SKU</Label>
                  <Input
                    id="product-sku"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    placeholder="SKU"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-cost">Cost Price</Label>
                  <Input
                    id="product-cost"
                    type="number"
                    value={productForm.cost_price}
                    onChange={(e) => setProductForm({ ...productForm, cost_price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="product-price">Selling Price</Label>
                  <Input
                    id="product-price"
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="product-stock">Current Stock</Label>
                  <Input
                    id="product-stock"
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="product-min-stock">Reorder Level</Label>
                  <Input
                    id="product-min-stock"
                    type="number"
                    value={productForm.min_stock}
                    onChange={(e) => setProductForm({ ...productForm, min_stock: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setProductDialogOpen(false); resetProductForm(); }}>
                Cancel
              </Button>
              <Button 
                onClick={() => saveProductMutation.mutate()}
                disabled={saveProductMutation.isPending || !productForm.name}
              >
                {saveProductMutation.isPending ? "Saving..." : editingProduct ? "Update" : "Add Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
