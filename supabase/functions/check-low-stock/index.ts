import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token for authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create client with anon key to verify user token
    const supabaseAnonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    const { data: { user }, error: authError } = await supabaseAnonClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Invalid token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAnonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      console.error("User is not admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated admin user:", user.id);

    // Use service role key for data operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get admin email from settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from("settings")
      .select("admin_email, business_name")
      .single();

    if (settingsError) {
      console.error("Settings error:", settingsError);
      throw new Error("Failed to fetch settings");
    }

    if (!settings?.admin_email) {
      return new Response(
        JSON.stringify({ message: "No admin email configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get low stock products with department info - filter in memory since we can't compare columns directly
    const { data: allProducts, error: productsError } = await supabaseClient
      .from("products")
      .select(`
        id,
        name,
        current_stock,
        reorder_level,
        department:departments(name)
      `);

    if (productsError) {
      console.error("Products error:", productsError);
      throw productsError;
    }

    // Filter products where current_stock <= reorder_level
    const lowStockProducts = allProducts?.filter(
      (p) => p.current_stock <= p.reorder_level
    ) || [];

    if (!lowStockProducts || lowStockProducts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No low stock items found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by department
    const productsByDept: Record<string, any[]> = {};
    lowStockProducts.forEach((product: any) => {
      const deptName = product.department?.name || "Unassigned";
      if (!productsByDept[deptName]) {
        productsByDept[deptName] = [];
      }
      productsByDept[deptName].push(product);
    });

    // Create email HTML
    let productsListHtml = "";
    for (const [dept, products] of Object.entries(productsByDept)) {
      productsListHtml += `
        <h3 style="color: #333; margin-top: 20px;">${dept}</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Product</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Current Stock</th>
              <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Reorder Level</th>
            </tr>
          </thead>
          <tbody>
            ${products.map((p: any) => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${p.name}</td>
                <td style="padding: 10px; text-align: center; border: 1px solid #ddd; color: ${p.current_stock === 0 ? 'red' : '#666'};">
                  ${p.current_stock}
                </td>
                <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${p.reorder_level}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h1 style="color: #d32f2f;">Low Stock Alert</h1>
        <p style="font-size: 16px; color: #666;">
          The following products are at or below their reorder levels:
        </p>
        ${productsListHtml}
        <p style="margin-top: 30px; color: #999; font-size: 14px;">
          This is an automated notification from ${settings.business_name || "Your POS System"}.
        </p>
      </div>
    `;

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${settings.business_name || "POS System"} <onboarding@resend.dev>`,
        to: [settings.admin_email],
        subject: `Low Stock Alert - ${lowStockProducts.length} items need attention`,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Low stock notification sent for ${lowStockProducts.length} products`,
        emailId: emailData.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-low-stock function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
