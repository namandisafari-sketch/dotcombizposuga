import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceEmailRequest {
  customerEmail: string;
  customerName: string;
  invoiceHTML: string;
  invoiceNumber: string;
  total: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { customerEmail, customerName, invoiceHTML, invoiceNumber, total }: InvoiceEmailRequest = await req.json();

    if (!customerEmail || !invoiceHTML || !invoiceNumber) {
      throw new Error('Missing required fields');
    }

    // Dynamic import of Resend
    const { Resend } = await import('https://esm.sh/resend@2.0.0');
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const emailResponse = await resend.emails.send({
      from: 'Invoice <onboarding@resend.dev>',
      to: [customerEmail],
      subject: `Invoice ${invoiceNumber} - UGX ${total.toLocaleString()}`,
      html: invoiceHTML,
    });

    console.log('Invoice email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error sending invoice email:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send invoice email' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
