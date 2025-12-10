import { supabase } from "@/integrations/supabase/client";

/**
 * Check stock availability for a product
 */
export const checkStockAvailability = async (
  productId: string,
  requestedQuantity: number,
  trackingType?: string,
  mlAmount?: number
): Promise<{ available: boolean; currentStock: number; message?: string }> => {
  const { data: product } = await supabase
    .from("products")
    .select("stock, total_ml, tracking_type, name")
    .eq("id", productId)
    .single();

  if (!product) return { available: false, currentStock: 0, message: "Product not found" };

  const isMlTracking = (trackingType === "ml" || trackingType === "milliliter" || product.tracking_type === "ml");
  const currentStock = isMlTracking 
    ? (product.total_ml || 0) 
    : (product.stock || 0);
  
  const requiredAmount = isMlTracking && mlAmount ? mlAmount : requestedQuantity;
  const available = currentStock >= requiredAmount;
  
  return {
    available,
    currentStock,
    message: available ? undefined : `Insufficient stock for ${product.name}. Available: ${currentStock}`,
  };
};

/**
 * Check stock availability for a product variant
 */
export const checkVariantStockAvailability = async (
  variantId: string,
  requestedQuantity: number
): Promise<{ available: boolean; currentStock: number; message?: string }> => {
  const { data: variant } = await supabase
    .from("product_variants")
    .select("stock, name")
    .eq("id", variantId)
    .single();

  if (!variant) return { available: false, currentStock: 0, message: "Variant not found" };

  const currentStock = variant.stock || 0;
  const available = currentStock >= requestedQuantity;
  
  return {
    available,
    currentStock,
    message: available ? undefined : `Insufficient stock for ${variant.name}. Available: ${currentStock}`,
  };
};

interface CartItem {
  id: string;
  name?: string;
  productId?: string;
  serviceId?: string;
  variantId?: string;
  quantity: number;
  trackingType?: string;
  volumeUnit?: string;
  isPerfumeRefill?: boolean;
  totalMl?: number;
}

/**
 * Reduce stock for all items in cart after successful sale
 */
export const reduceStock = async (
  cartItems: CartItem[],
  departmentId: string,
  isDemoMode: boolean = false
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (isDemoMode) {
      console.log("DEMO MODE: Simulating stock reduction without saving");
      return { success: true };
    }

    for (const item of cartItems) {
      if (!item.productId && !item.isPerfumeRefill) {
        continue;
      }

      if (item.variantId) {
        await reduceVariantStock(item.variantId, item.quantity);
      } else if (item.isPerfumeRefill && item.totalMl) {
        // For perfume refills, reduce from Oil Perfume master stock
        const { data: masterPerfume } = await supabase
          .from("products")
          .select("id, total_ml")
          .eq("name", "Oil Perfume")
          .eq("tracking_type", "ml")
          .eq("department_id", departmentId)
          .maybeSingle();
        
        if (masterPerfume) {
          await supabase
            .from("products")
            .update({ total_ml: (masterPerfume.total_ml || 0) - item.totalMl } as any)
            .eq("id", masterPerfume.id);
        }
      } else if (item.productId) {
        await reduceProductStock(item.productId, item.quantity, item.trackingType, item.totalMl);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Stock reduction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reduce stock",
    };
  }
};

/**
 * Reduce stock for a specific product variant
 */
const reduceVariantStock = async (variantId: string, quantity: number): Promise<void> => {
  const { data: variant, error: fetchError } = await supabase
    .from("product_variants")
    .select("stock")
    .eq("id", variantId)
    .single();

  if (fetchError) throw fetchError;
  if (!variant) throw new Error("Variant not found");

  const newStock = Math.max(0, (variant.stock || 0) - quantity);

  const { error: updateError } = await supabase
    .from("product_variants")
    .update({ stock: newStock })
    .eq("id", variantId);

  if (updateError) throw updateError;
};

/**
 * Reduce stock for a specific product
 */
const reduceProductStock = async (
  productId: string,
  quantity: number,
  trackingType?: string,
  totalMl?: number
): Promise<void> => {
  const { data: product, error: fetchError } = await supabase
    .from("products")
    .select("stock, total_ml, tracking_type")
    .eq("id", productId)
    .single();

  if (fetchError) throw fetchError;
  if (!product) throw new Error("Product not found");

  if (product.tracking_type === "ml" && totalMl) {
    const newMl = Math.max(0, (product.total_ml || 0) - totalMl);
    await supabase
      .from("products")
      .update({ total_ml: newMl } as any)
      .eq("id", productId);
  } else {
    const newStock = Math.max(0, (product.stock || 0) - quantity);
    await supabase
      .from("products")
      .update({ stock: newStock } as any)
      .eq("id", productId);
  }
};

/**
 * Restore stock when voiding a sale
 */
export const restoreStock = async (
  saleId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("*, products(id, stock, total_ml, tracking_type), product_variants(id, stock)")
      .eq("sale_id", saleId);

    if (!saleItems) return { success: true };

    for (const item of saleItems as any[]) {
      if (item.variant_id && item.product_variants) {
        const variant = item.product_variants;
        await supabase
          .from("product_variants")
          .update({ stock: (variant.stock || 0) + item.quantity } as any)
          .eq("id", item.variant_id);
      } else if (item.product_id && item.products) {
        const product = item.products;
        if (product.tracking_type === "ml") {
          await supabase
            .from("products")
            .update({ total_ml: (product.total_ml || 0) + (item.ml_amount || item.quantity) } as any)
            .eq("id", item.product_id);
        } else {
          await supabase
            .from("products")
            .update({ stock: (product.stock || 0) + item.quantity } as any)
            .eq("id", item.product_id);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Stock restore error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore stock",
    };
  }
};
