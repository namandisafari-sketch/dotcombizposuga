import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, AlertCircle, Package, Droplet, Clock, Box, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ProductVariantsDialog } from "./ProductVariantsDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  stock?: number;
  min_stock?: number;
  cost_price?: number;
  price: number;
  tracking_type?: string;
  barcode?: string;
  total_ml?: number;
  categories?: { name: string };
}

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onAddStock: (productId: string, quantity: number) => void;
  onArchive: (productId: string) => void;
  isAdmin: boolean;
}

export const ProductList = ({ products, onEdit, onAddStock, onArchive, isAdmin }: ProductListProps) => {
  const [variantsDialogOpen, setVariantsDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProductName, setSelectedProductName] = useState<string>("");
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [stockToAdd, setStockToAdd] = useState<number>(0);
  const [currentProductId, setCurrentProductId] = useState<string>("");

  // Fetch variant counts and stock for all products
  const { data: variantData } = useQuery({
    queryKey: ["variant-data", products?.map(p => p.id)],
    queryFn: async () => {
      if (!products || products.length === 0) return { counts: {}, variants: {} };
      
      const productIds = products.map(p => p.id);
      const { data, error } = await supabase
        .from("product_variants")
        .select("product_id, name, stock")
        .in("product_id", productIds);
      
      if (error) throw error;
      
      // Count variants per product and store variant details
      const counts: Record<string, number> = {};
      const variants: Record<string, Array<{ name: string; stock: number }>> = {};
      
      data?.forEach((variant) => {
        counts[variant.product_id] = (counts[variant.product_id] || 0) + 1;
        if (!variants[variant.product_id]) {
          variants[variant.product_id] = [];
        }
        variants[variant.product_id].push({
          name: variant.name,
          stock: variant.stock || 0,
        });
      });
      
      return { counts, variants };
    },
    enabled: products && products.length > 0,
  });

  const variantCounts = variantData?.counts || {};
  const productVariants = variantData?.variants || {};

  const getTrackingIcon = (type?: string) => {
    switch (type) {
      case "ml":
        return <Droplet className="w-4 h-4 text-primary" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  // Filter out Oil Perfume - it's managed separately in perfume inventory
  const filteredProducts = products?.filter(p => p.name !== "Oil Perfume") || [];

  const handleOpenVariants = (productId: string, productName: string) => {
    setSelectedProductId(productId);
    setSelectedProductName(productName);
    setVariantsDialogOpen(true);
  };

  const handleOpenAddStock = (productId: string) => {
    setCurrentProductId(productId);
    setStockToAdd(0);
    setAddStockDialogOpen(true);
  };

  const handleAddStock = () => {
    if (stockToAdd > 0) {
      onAddStock(currentProductId, stockToAdd);
      setAddStockDialogOpen(false);
    }
  };

  const handleArchive = (productId: string) => {
    if (window.confirm("Are you sure you want to archive this product? It will be hidden from inventory but remain in reports.")) {
      onArchive(productId);
    }
  };

  return (
    <>
      <ProductVariantsDialog
        open={variantsDialogOpen}
        onOpenChange={setVariantsDialogOpen}
        productId={selectedProductId}
        productName={selectedProductName}
      />
      <Card>
      <CardHeader>
        <CardTitle>Products Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filteredProducts.map((product) => {
            const stock = product.stock || 0;
            const minStock = product.min_stock || 5;
            
            return (
              <div
                key={product.id}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border gap-3 ${
                  !variantCounts[product.id] && stock <= minStock
                    ? "bg-destructive/5 border-destructive/20"
                    : "bg-card"
                }`}
              >
                <div className="flex-1 w-full sm:w-auto">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{product.name}</p>
                    {variantCounts[product.id] && (
                      <Badge variant="outline" className="text-xs">
                        Container ({variantCounts[product.id]} products)
                      </Badge>
                    )}
                    {!variantCounts[product.id] && stock <= minStock && (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                    <div className="flex items-center gap-1 text-muted-foreground">
                      {getTrackingIcon(product.tracking_type)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {product.description && `${product.description} • `}
                    {product.tracking_type === "ml" && (product.total_ml || 0) > 0 && (
                      <span className="font-semibold text-primary"> {product.total_ml}ml</span>
                    )}
                    {product.tracking_type !== "ml" && !variantCounts[product.id] && `Stock: ${stock}`}
                  </p>
                  {variantCounts[product.id] && productVariants[product.id] && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Products in Container:</p>
                      <div className="flex flex-wrap gap-2">
                        {productVariants[product.id].map((variant, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {variant.name}: {variant.stock}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {product.barcode && !variantCounts[product.id] && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Barcode: {product.barcode}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="font-bold">UGX {Number(product.price).toLocaleString()}</p>
                    {isAdmin && product.cost_price && (
                      <p className="text-xs text-muted-foreground">
                        Cost: {Number(product.cost_price).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenVariants(product.id, product.name)}
                        title={variantCounts?.[product.id] ? "Manage Products (Container)" : "Manage Products (Add Products to Container)"}
                      >
                        <Box className="w-4 h-4" />
                        {variantCounts?.[product.id] ? (
                          <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                            {variantCounts[product.id]}
                          </Badge>
                        ) : null}
                      </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleOpenAddStock(product.id)}
                      title="Add Stock"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="outline" onClick={() => onEdit(product)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleArchive(product.id)}
                        title="Archive Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No products found. Add your first product to get started.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    
    {/* Add Stock Dialog */}
    <Dialog open={addStockDialogOpen} onOpenChange={setAddStockDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stock to Container</DialogTitle>
          <DialogDescription>
            Increase stock for this container. Stock can then be allocated to specific products inside.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Quantity to Add</Label>
            <Input
              type="number"
              min="0"
              value={stockToAdd}
              onChange={(e) => setStockToAdd(Number(e.target.value))}
              placeholder="Enter quantity"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddStockDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddStock} disabled={stockToAdd <= 0}>
            Add Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};
