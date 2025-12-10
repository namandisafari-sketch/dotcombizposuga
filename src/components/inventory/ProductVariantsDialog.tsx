import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface ProductVariant {
  id?: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  ml_size?: number;
}

interface ProductVariantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}

export function ProductVariantsDialog({
  open,
  onOpenChange,
  productId,
  productName,
}: ProductVariantsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [newVariant, setNewVariant] = useState<ProductVariant>({
    name: "",
    sku: "",
    stock: 0,
    price: 0,
    ml_size: undefined,
  });

  // Fetch parent product to check available stock
  const { data: parentProduct } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("stock")
        .eq("id", productId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!productId,
  });

  // Fetch existing variants
  const { data: variants = [], refetch } = useQuery({
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!productId,
  });

  // Add variant mutation
  const addVariantMutation = useMutation({
    mutationFn: async (variant: ProductVariant) => {
      const parentStock = parentProduct?.stock || 0;
      const variantStock = variant.stock;

      if (variantStock > parentStock) {
        throw new Error(
          `Cannot allocate ${variantStock} units. Only ${parentStock} units available in parent product.`
        );
      }

      // Insert the variant
      const { error: variantError } = await supabase.from("product_variants").insert({
        product_id: productId,
        name: variant.name,
        sku: variant.sku || null,
        stock: variant.stock,
        price: variant.price,
        ml_size: variant.ml_size || null,
      });

      if (variantError) throw variantError;

      // Deduct the variant stock from parent product
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: parentStock - variantStock })
        .eq("id", productId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({ 
        title: "Product added successfully",
        description: "Stock has been allocated from container"
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setNewVariant({
        name: "",
        sku: "",
        stock: 0,
        price: 0,
        ml_size: undefined,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding variant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update variant mutation
  const updateVariantMutation = useMutation({
    mutationFn: async ({ id, variant }: { id: string; variant: ProductVariant }) => {
      const { error } = await supabase
        .from("product_variants")
        .update({
          name: variant.name,
          sku: variant.sku || null,
          stock: variant.stock,
          price: variant.price,
          ml_size: variant.ml_size || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Variant updated successfully" });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditingVariantId(null);
      setEditingVariant(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating variant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete variant mutation
  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const { data: variant, error: fetchError } = await supabase
        .from("product_variants")
        .select("stock")
        .eq("id", variantId)
        .single();

      if (fetchError) throw fetchError;

      const variantStock = variant?.stock || 0;

      const { error: deleteError } = await supabase
        .from("product_variants")
        .delete()
        .eq("id", variantId);

      if (deleteError) throw deleteError;

      // Return the stock to the parent product
      if (variantStock > 0) {
        const parentStock = parentProduct?.stock || 0;
        const { error: updateError } = await supabase
          .from("products")
          .update({ stock: parentStock + variantStock })
          .eq("id", productId);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      toast({ 
        title: "Product deleted successfully",
        description: "Stock has been returned to container"
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting variant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddVariant = () => {
    if (!newVariant.name) {
      toast({
        title: "Product name required",
        variant: "destructive",
      });
      return;
    }
    addVariantMutation.mutate(newVariant);
  };

  const handleEditVariant = (variant: any) => {
    setEditingVariantId(variant.id);
    setEditingVariant({
      name: variant.name,
      sku: variant.sku || "",
      stock: variant.stock || 0,
      price: variant.price || 0,
      ml_size: variant.ml_size,
    });
  };

  const handleSaveEdit = () => {
    if (!editingVariant?.name) {
      toast({
        title: "Product name required",
        variant: "destructive",
      });
      return;
    }
    updateVariantMutation.mutate({
      id: editingVariantId!,
      variant: editingVariant,
    });
  };

  const handleCancelEdit = () => {
    setEditingVariantId(null);
    setEditingVariant(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Products - {productName} (Container)</DialogTitle>
          <DialogDescription>
            This container holds multiple product variants. Add stock to the container, then allocate it to specific products.
          </DialogDescription>
          <p className="text-sm text-muted-foreground mt-2">
            Available stock in container: {parentProduct?.stock || 0} units
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Product Form */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Add New Product (Variant)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Product Name *</Label>
                <Input
                  value={newVariant.name}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, name: e.target.value })
                  }
                  placeholder="e.g., Red - Large"
                />
              </div>
              <div>
                <Label>SKU</Label>
                <Input
                  value={newVariant.sku}
                  onChange={(e) =>
                    setNewVariant({ ...newVariant, sku: e.target.value })
                  }
                  placeholder="SKU code"
                />
              </div>
              <div>
                <Label>Price *</Label>
                <Input
                  type="number"
                  value={newVariant.price}
                  onChange={(e) =>
                    setNewVariant({
                      ...newVariant,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Selling price"
                />
              </div>
              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={newVariant.stock}
                  onChange={(e) =>
                    setNewVariant({
                      ...newVariant,
                      stock: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>ML Size (optional)</Label>
                <Input
                  type="number"
                  value={newVariant.ml_size || ""}
                  onChange={(e) =>
                    setNewVariant({
                      ...newVariant,
                      ml_size: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="e.g., 100"
                />
              </div>
            </div>
            <Button onClick={handleAddVariant} disabled={addVariantMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>

          {/* Existing Variants List */}
          <div className="space-y-2">
            <h3 className="font-semibold">Products in Container</h3>
            {variants.length === 0 ? (
              <p className="text-muted-foreground text-sm">No products in this container yet.</p>
            ) : (
              <div className="space-y-2">
                {variants.map((variant: any) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    {editingVariantId === variant.id ? (
                      <div className="flex-1 grid grid-cols-4 gap-2">
                        <Input
                          value={editingVariant?.name || ""}
                          onChange={(e) =>
                            setEditingVariant({
                              ...editingVariant!,
                              name: e.target.value,
                            })
                          }
                          placeholder="Name"
                        />
                        <Input
                          type="number"
                          value={editingVariant?.price || 0}
                          onChange={(e) =>
                            setEditingVariant({
                              ...editingVariant!,
                              price: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="Price"
                        />
                        <Input
                          type="number"
                          value={editingVariant?.stock || 0}
                          onChange={(e) =>
                            setEditingVariant({
                              ...editingVariant!,
                              stock: parseInt(e.target.value) || 0,
                            })
                          }
                          placeholder="Stock"
                        />
                        <div className="flex gap-1">
                          <Button size="sm" onClick={handleSaveEdit}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="font-medium">{variant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Price: UGX {Number(variant.price).toLocaleString()} | Stock: {variant.stock}
                            {variant.ml_size && ` | ${variant.ml_size}ml`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditVariant(variant)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteVariantMutation.mutate(variant.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
