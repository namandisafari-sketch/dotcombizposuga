import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localApi } from "@/lib/localApi";
import { DepartmentSelector } from "@/components/DepartmentSelector";
import Navigation from "@/components/Navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Package, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useDepartment } from "@/contexts/DepartmentContext";
import { ProductFormDialog } from "@/components/inventory/ProductFormDialog";
import { ProductList } from "@/components/inventory/ProductList";
import { LowStockAlerts } from "@/components/inventory/LowStockAlerts";

const Inventory = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const { selectedDepartmentId, selectedDepartment, setSelectedDepartmentId } = useDepartment();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    category_id: "",
    department_id: "",
    brand: "",
    unit: "",
    quantity_per_unit: 1,
    current_stock: 0,
    reorder_level: 10,
    cost_price: 0,
    selling_price: 0,
    is_bundle: false,
    tracking_type: "unit",
    volume_unit: "",
    allow_custom_price: false,
    min_price: 0,
    max_price: 0,
    supplier_id: "",
    pricing_tiers: {
      retail: 0,
      wholesale: 0,
      individual: 0,
    },
    bottle_size_ml: 0,
    current_stock_ml: 0,
    cost_per_ml: 0,
    wholesale_price_per_ml: 0,
    retail_price_per_ml: 0,
    imei: "",
    serial_number: "",
  });

  // Prevent adding perfume products from regular inventory
  useEffect(() => {
    if (isDialogOpen && !editingProduct) {
      setFormData(prev => ({
        ...prev,
        tracking_type: "unit", // Always unit for regular inventory
      }));
    }
  }, [isDialogOpen, editingProduct]);

  const { data: products } = useQuery({
    queryKey: ["products", selectedDepartmentId],
    queryFn: async () => {
      if (!selectedDepartmentId) return [];
      
      const data = await localApi.products.getAll();
      return data.filter((p: any) => 
        p.department_id === selectedDepartmentId && 
        !p.is_archived &&
        p.tracking_type !== 'milliliter'
      );
    },
    enabled: !!selectedDepartmentId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => localApi.departments.getAll(),
  });


  const { data: categories } = useQuery({
    queryKey: ["product-categories"],
    queryFn: () => localApi.categories.getAll(),
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => localApi.services.getAll(), // Using services as placeholder
  });

  const addStockMutation = useMutation({
    mutationFn: async ({ productId, stockToAdd }: { productId: string; stockToAdd: number }) => {
      const product = products?.find((p: any) => p.id === productId);
      if (!product) throw new Error("Product not found");
      
      await localApi.products.update(productId, {
        ...product,
        current_stock: (product.current_stock || 0) + stockToAdd,
      });
    },
    onSuccess: () => {
      toast.success("Stock added successfully");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to add stock: ${error.message}`);
    },
  });

  const archiveProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const product = products?.find((p: any) => p.id === productId);
      if (!product) throw new Error("Product not found");
      
      await localApi.products.update(productId, {
        ...product,
        is_archived: true,
      });
    },
    onSuccess: () => {
      toast.success("Product archived successfully");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to archive product: ${error.message}`);
    },
  });

  const saveProductMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Convert empty strings to null for UUID fields
      const dataToSave: any = { ...data };
      if (!dataToSave.category_id) dataToSave.category_id = null;
      if (!dataToSave.department_id) dataToSave.department_id = null;
      if (!dataToSave.supplier_id) dataToSave.supplier_id = null;
      if (!dataToSave.barcode) dataToSave.barcode = null;
      if (!dataToSave.brand) dataToSave.brand = null;

      if (editingProduct) {
        await localApi.products.update(editingProduct.id, dataToSave);
      } else {
        await localApi.products.create(dataToSave);
      }
    },
    onSuccess: async () => {
      toast.success(editingProduct ? "Product updated" : "Product added");
      
      setIsDialogOpen(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        barcode: "",
        category_id: "",
        department_id: "",
        brand: "",
        unit: "",
        quantity_per_unit: 1,
        current_stock: 0,
        reorder_level: 10,
        cost_price: 0,
        selling_price: 0,
        is_bundle: false,
        tracking_type: "unit",
        volume_unit: "",
        allow_custom_price: false,
        min_price: 0,
        max_price: 0,
        supplier_id: "",
        pricing_tiers: {
          retail: 0,
          wholesale: 0,
          individual: 0,
        },
        bottle_size_ml: 0,
        current_stock_ml: 0,
        cost_per_ml: 0,
        wholesale_price_per_ml: 0,
        retail_price_per_ml: 0,
        imei: "",
        serial_number: "",
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: any) => {
      console.error("Product save error:", error);
      toast.error(`Failed to save product: ${error.message || 'Unknown error'}`);
    },
  });

  const handleEdit = (product: any) => {
    if (!isAdmin) {
      toast.error("Only admins can edit products");
      return;
    }
    
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode || "",
      category_id: product.category_id || "",
      department_id: product.department_id || "",
      brand: product.brand || "",
      unit: product.unit,
      quantity_per_unit: product.quantity_per_unit,
      current_stock: product.current_stock,
      reorder_level: product.reorder_level,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      is_bundle: product.is_bundle || false,
      tracking_type: product.tracking_type || "unit",
      volume_unit: product.volume_unit || "",
      allow_custom_price: product.allow_custom_price || false,
      min_price: product.min_price || 0,
      max_price: product.max_price || 0,
      supplier_id: product.supplier_id || "",
      pricing_tiers: product.pricing_tiers || {
        retail: 0,
        wholesale: 0,
        individual: 0,
      },
      bottle_size_ml: product.bottle_size_ml || 0,
      current_stock_ml: product.current_stock_ml || 0,
      cost_per_ml: product.cost_per_ml || 0,
      wholesale_price_per_ml: product.wholesale_price_per_ml || 0,
      retail_price_per_ml: product.retail_price_per_ml || 0,
      imei: product.imei || "",
      serial_number: product.serial_number || "",
    });
    setIsDialogOpen(true);
  };

  // Check if current department is a perfume department
  const isPerfumeDept = selectedDepartment?.name?.toLowerCase().includes('perfume');

  if (isPerfumeDept) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-32 lg:pt-20">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 pt-24 pb-8">
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Perfume Department</h2>
            <p className="text-muted-foreground mb-6">
              Regular inventory is not available for perfume departments.
              <br />
              Please use the dedicated Perfume Inventory page to manage perfume products.
            </p>
            <Button onClick={() => window.location.href = '/perfume-inventory'}>
              Go to Perfume Inventory
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-32 lg:pt-20">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 pt-24 pb-8">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold">
              {selectedDepartment?.name || "Inventory"}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage regular products, bundles, and stock levels (Non-perfume products only)
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {isAdmin && <DepartmentSelector />}
            
            <Button
              onClick={() => {
                setEditingProduct(null);
                setFormData({
                  name: "",
                  barcode: "",
                  category_id: "",
                  department_id: selectedDepartmentId || "",
                  brand: "",
                  unit: "",
                  quantity_per_unit: 1,
                  current_stock: 0,
                  reorder_level: 10,
                  cost_price: 0,
                  selling_price: 0,
                  is_bundle: false,
                  tracking_type: "unit",
                  volume_unit: "",
                  allow_custom_price: false,
                  min_price: 0,
                  max_price: 0,
                  supplier_id: "",
                  pricing_tiers: {
                    retail: 0,
                    wholesale: 0,
                    individual: 0,
                  },
                  bottle_size_ml: 0,
                  current_stock_ml: 0,
                  cost_per_ml: 0,
                  wholesale_price_per_ml: 0,
                  retail_price_per_ml: 0,
                  imei: "",
                  serial_number: "",
                });
                setIsDialogOpen(true);
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by product name or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <ProductList 
              products={(products || []).filter((product: any) => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return (
                  product.name?.toLowerCase().includes(query) ||
                  product.barcode?.toLowerCase().includes(query) ||
                  product.internal_barcode?.toLowerCase().includes(query)
                );
              })} 
              onEdit={handleEdit} 
              onAddStock={(productId, quantity) => addStockMutation.mutate({ productId, stockToAdd: quantity })}
              onArchive={(productId) => archiveProductMutation.mutate(productId)}
              isAdmin={isAdmin} 
            />
          </div>
          <div>
            <LowStockAlerts />
          </div>
        </div>
      </main>

      <ProductFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        formData={formData}
        setFormData={setFormData}
        onSave={() => saveProductMutation.mutate(formData)}
        editingProduct={editingProduct}
        categories={categories || []}
        departments={departments}
        suppliers={suppliers || []}
        isAdmin={isAdmin}
        isPerfumeDepartment={false}
      />
    </div>
  );
};

export default Inventory;