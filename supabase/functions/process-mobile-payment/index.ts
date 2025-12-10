import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

interface ProcessMobilePaymentRequest {
  phoneNumber: string;
  provider: "mtn" | "airtel";
  amount: number;
  saleId: string;
  departmentId: string;
}

interface MTNPaymentResponse {
  status: string;
  message?: string;
  transactionId?: string;
  referenceId?: string;
}

interface AirtelPaymentResponse {
  status: string;
  message?: string;
  transactionId?: string;
  referenceId?: string;
}

// MTN Mobile Money API handler
async function processMTNPayment(
  phoneNumber: string,
  amount: number,
  merchantId: string,
  apiKey: string
): Promise<MTNPaymentResponse> {
  try {
    const response = await fetch("https://api.mtn.co.ug/api/v1/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Merchant-Id": merchantId,
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber.replace(/\D/g, ""),
        amount: Math.round(amount),
        currency: "UGX",
        description: "Sale Payment",
      }),
    });

    if (!response.ok) {
      return {
        status: "error",
        message: `MTN API error: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      status: "success",
      transactionId: data.transactionId,
      referenceId: data.referenceId,
    };
  } catch (error) {
    return {
      status: "error",
      message: `MTN payment error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Airtel Money API handler
async function processAirtelPayment(
  phoneNumber: string,
  amount: number,
  merchantId: string,
  apiKey: string
): Promise<AirtelPaymentResponse> {
  try {
    const response = await fetch("https://api.airtel.co.ug/api/v1/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Merchant-Id": merchantId,
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber.replace(/\D/g, ""),
        amount: Math.round(amount),
        currency: "UGX",
        description: "Sale Payment",
      }),
    });

    if (!response.ok) {
      return {
        status: "error",
        message: `Airtel API error: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      status: "success",
      transactionId: data.transactionId,
    };
  } catch (error) {
    return {
      status: "error",
      message: `Airtel payment error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      )
    }

    const body: ProcessMobilePaymentRequest = await req.json();
    const { phoneNumber, provider, amount, saleId, departmentId } = body;

    // Validate inputs
    if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Valid phone number is required' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    if (!provider || !['mtn', 'airtel'].includes(provider)) {
      return new Response(
        JSON.stringify({ error: 'Provider must be either mtn or airtel' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 100000000 || !Number.isInteger(amount)) {
      return new Response(
        JSON.stringify({ error: 'Amount must be a positive integer between 1 and 100,000,000' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    if (!saleId || typeof saleId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Valid sale ID is required' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    if (!departmentId || typeof departmentId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Valid department ID is required' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Verify user has access to the department
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('department_id')
      .eq('id', user.id)
      .single()

    const { data: isAdmin } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!isAdmin && profile?.department_id !== departmentId) {
      return new Response(
        JSON.stringify({ error: 'Access denied to this department' }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    }

    // Fetch payment provider credentials
    const { data: settings, error: settingsError } = await supabase
      .from("mobile_money_settings")
      .select("*")
      .eq("department_id", departmentId)
      .eq("provider", provider)
      .maybeSingle();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: "Payment provider not configured" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process payment based on provider
    let paymentResult;
    if (provider === "mtn") {
      paymentResult = await processMTNPayment(
        phoneNumber,
        amount,
        settings.merchant_id,
        settings.api_key
      );
    } else {
      paymentResult = await processAirtelPayment(
        phoneNumber,
        amount,
        settings.merchant_id,
        settings.api_key
      );
    }

    // Store payment record
    const { data: paymentRecord, error: insertError } = await supabase
      .from("mobile_money_payments")
      .insert({
        sale_id: saleId,
        department_id: departmentId,
        provider,
        phone_number: phoneNumber,
        amount,
        status: paymentResult.status === "success" ? "pending" : "failed",
        transaction_id: paymentResult.transactionId,
        reference_id: paymentResult.referenceId,
        response: paymentResult,
      })
      .select();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to record payment" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: paymentResult.status === "success",
        message: paymentResult.message || "Payment initiated successfully",
        paymentId: paymentRecord?.[0]?.id,
        transactionId: paymentResult.transactionId,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing mobile payment:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});