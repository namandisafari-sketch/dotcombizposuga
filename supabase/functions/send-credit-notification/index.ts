import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  creditId: string;
  notificationType: "payment_due" | "payment_overdue" | "settlement_reminder";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { creditId, notificationType }: NotificationRequest = await req.json();

    console.log(`Processing ${notificationType} notification for credit: ${creditId}`);

    // Fetch credit details
    const { data: credit, error: creditError } = await supabase
      .from("credits")
      .select(`
        *,
        from_department:from_department_id(name),
        to_department:to_department_id(name)
      `)
      .eq("id", creditId)
      .single();

    if (creditError || !credit) {
      throw new Error("Credit not found");
    }

    // Determine the department that needs to pay (borrowed from)
    const payingDepartmentId = credit.transaction_type === "interdepartmental"
      ? credit.to_department_id // Department that received the money needs to pay back
      : credit.transaction_type === "external_in"
      ? credit.to_department_id // Department that received external funds
      : credit.from_department_id; // Department that lent money (for external_out)

    // Get department settings for contact info
    const { data: deptSettings } = await supabase
      .from("department_settings")
      .select("whatsapp_number, business_phone")
      .eq("department_id", payingDepartmentId)
      .maybeSingle();

    let message = "";
    
    switch (notificationType) {
      case "payment_due":
        message = `Payment Reminder: Credit of UGX ${credit.amount.toLocaleString()} for "${credit.purpose}" is due for settlement.`;
        break;
      case "payment_overdue":
        message = `URGENT: Overdue Payment - Credit of UGX ${credit.amount.toLocaleString()} for "${credit.purpose}" is overdue. Please settle immediately.`;
        break;
      case "settlement_reminder":
        message = `Settlement Reminder: Please settle the credit of UGX ${credit.amount.toLocaleString()} (${credit.purpose}) at your earliest convenience.`;
        break;
    }

    // For now, log the notification (in production, integrate with WhatsApp API or email)
    console.log("Notification to be sent:");
    console.log("Department:", payingDepartmentId);
    console.log("Contact:", deptSettings?.whatsapp_number || deptSettings?.business_phone || "No contact");
    console.log("Message:", message);

    // Store notification in a notifications table (you'd create this table)
    // For now, we'll just return success
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification processed",
        details: {
          creditId,
          notificationType,
          amount: credit.amount,
          departmentContact: deptSettings?.whatsapp_number || deptSettings?.business_phone,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});