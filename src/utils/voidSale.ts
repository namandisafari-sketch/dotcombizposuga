import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VoidSaleParams {
  saleId: string;
  reason: string;
  userId: string;
}

export const voidSale = async ({ saleId, reason, userId }: VoidSaleParams) => {
  try {
    // 1. Fetch the sale with all items
    const { data: sale, error: fetchError } = await supabase
      .from("sales")
      .select(`
        *,
        sale_items(
          *,
          products(id, stock, total_ml, tracking_type),
          product_variants(id, stock)
        )
      `)
      .eq("id", saleId)
      .single();

    if (fetchError) throw fetchError;
    if (!sale) throw new Error("Sale not found");

    // Check if already voided
    if (sale.status === "voided") {
      toast.error("This sale has already been voided");
      return false;
    }

    // 2. Restore stock for each item
    const stockRestorePromises = (sale.sale_items as any[]).map(async (item: any) => {
      // Skip stock restoration for perfume mixtures
      if (item.scent_mixture) {
        console.log(`Skipping stock restoration for perfume mixture: ${item.name}`);
        return;
      }

      // Restore product stock
      if (item.product_id && item.products) {
        const product = item.products;
        
        if (product.tracking_type === "ml" && product.total_ml !== null) {
          // Restore ml stock
          const { error } = await supabase
            .from("products")
            .update({
              total_ml: (product.total_ml || 0) + (item.ml_amount || item.quantity),
            } as any)
            .eq("id", item.product_id);

          if (error) throw error;
        } else if (product.stock !== null) {
          // Restore unit stock
          const { error } = await supabase
            .from("products")
            .update({
              stock: (product.stock || 0) + item.quantity,
            } as any)
            .eq("id", item.product_id);

          if (error) throw error;
        }
      }

      // Restore variant stock
      if (item.variant_id && item.product_variants) {
        const variant = item.product_variants;
        const { error } = await supabase
          .from("product_variants")
          .update({
            stock: (variant.stock || 0) + item.quantity,
          } as any)
          .eq("id", item.variant_id);

        if (error) throw error;
      }
    });

    await Promise.all(stockRestorePromises);

    // 3. Mark the sale as voided
    const { error: voidError } = await supabase
      .from("sales")
      .update({
        status: "voided",
        voided_at: new Date().toISOString(),
        voided_by: userId,
        void_reason: reason,
      } as any)
      .eq("id", saleId);

    if (voidError) throw voidError;

    toast.success("Sale voided successfully. Stock has been restored.");
    return true;
  } catch (error: any) {
    console.error("Error voiding sale:", error);
    toast.error(error.message || "Failed to void sale");
    return false;
  }
};
