import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting scheduled low stock check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get WhatsApp number from settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('whatsapp_number')
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw settingsError;
    }

    if (!settings?.whatsapp_number) {
      console.log('No WhatsApp number configured, skipping notification');
      return new Response(
        JSON.stringify({ message: 'No WhatsApp number configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsAppFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppFrom) {
      console.error('Twilio credentials not configured');
      throw new Error('Twilio credentials not configured');
    }

    // Fetch low stock products
    const { data: lowStockProducts, error: productsError } = await supabase
      .from('products')
      .select('id, name, current_stock, reorder_level, department_id, departments(name)')
      .or(`current_stock.lte.reorder_level,and(current_stock.is.null,reorder_level.gt.0)`)
      .order('current_stock', { ascending: true });

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw productsError;
    }

    if (!lowStockProducts || lowStockProducts.length === 0) {
      console.log('No low stock products found');
      return new Response(
        JSON.stringify({ message: 'No low stock products' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Group products by department
    const productsByDepartment: Record<string, any[]> = {};
    lowStockProducts.forEach((product: any) => {
      const deptName = product.departments?.name || 'General';
      if (!productsByDepartment[deptName]) {
        productsByDepartment[deptName] = [];
      }
      productsByDepartment[deptName].push(product);
    });

    // Format message
    let message = `🚨 *Low Stock Alert* 🚨\n\n`;
    message += `Total items running low: ${lowStockProducts.length}\n\n`;

    Object.entries(productsByDepartment).forEach(([dept, products]) => {
      message += `*${dept}*\n`;
      products.forEach((product: any) => {
        message += `• ${product.name}: ${product.current_stock} units (Reorder at: ${product.reorder_level})\n`;
      });
      message += `\n`;
    });

    message += `Please restock these items soon.`;

    // Send WhatsApp message via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const whatsappNumber = settings.whatsapp_number.replace(/\D/g, '');
    const formattedTo = whatsappNumber.startsWith('+') ? `whatsapp:${whatsappNumber}` : `whatsapp:+${whatsappNumber}`;

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioWhatsAppFrom,
        To: formattedTo,
        Body: message,
      }),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error('Twilio API error:', errorText);
      throw new Error(`Twilio API error: ${errorText}`);
    }

    const twilioData = await twilioResponse.json();
    console.log('WhatsApp notification sent successfully:', twilioData.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Low stock notification sent',
        productCount: lowStockProducts.length,
        messageSid: twilioData.sid 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in schedule-low-stock-check:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});