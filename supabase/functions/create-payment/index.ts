
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, amount, customerDetails, itemDetails, batchOrderIds } = await req.json();

    console.log('Creating payment for order:', orderId);
    console.log('Batch order IDs:', batchOrderIds);

    // Validate required fields
    if (!orderId) {
      throw new Error('Order ID is required');
    }

    if (!amount || amount <= 0) {
      throw new Error('Valid amount is required');
    }

    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');
    if (!serverKey) {
      throw new Error('Midtrans server key not configured');
    }

    // Create Midtrans transaction - use same order ID for reusable virtual account
    const midtransResponse = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(serverKey + ':')}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: amount,
        },
        customer_details: customerDetails || {
          first_name: 'Customer',
          email: 'customer@example.com',
          phone: '08123456789',
        },
        item_details: itemDetails || [],
        credit_card: {
          secure: true,
        },
        // Enable virtual account reusability
        payment_type: 'bank_transfer',
        bank_transfer: {
          bank: 'permata',
        },
        // Custom expiry for reusable VA
        custom_expiry: {
          expiry_duration: 7,
          unit: 'day'
        }
      }),
    });

    if (!midtransResponse.ok) {
      const errorText = await midtransResponse.text();
      console.error('Midtrans error:', errorText);
      
      // If order already exists, try to get existing transaction
      if (errorText.includes('Order ID has been utilized previously')) {
        console.log('Order ID already exists, trying to get existing transaction...');
        
        // Try to get existing transaction status
        const statusResponse = await fetch(`https://api.sandbox.midtrans.com/v2/${orderId}/status`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${btoa(serverKey + ':')}`,
          },
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('Existing transaction status:', statusData);
          
          // Return existing transaction details
          return new Response(
            JSON.stringify({
              snap_token: statusData.snap_token || null,
              redirect_url: statusData.redirect_url || null,
              virtual_account: statusData.va_numbers || null,
              payment_status: statusData.transaction_status,
              message: 'Using existing payment session'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
      
      throw new Error(`Midtrans API error: ${errorText}`);
    }

    const midtransData = await midtransResponse.json();
    console.log('Midtrans response:', midtransData);

    // If this is a batch payment, update all orders with the same midtrans_order_id
    if (batchOrderIds && batchOrderIds.length > 0) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      for (const orderDbId of batchOrderIds) {
        await supabase
          .from('orders')
          .update({ 
            midtrans_order_id: orderId,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderDbId);
      }
      
      console.log(`Updated ${batchOrderIds.length} orders with batch payment ID: ${orderId}`);
    }

    return new Response(
      JSON.stringify({
        snap_token: midtransData.token,
        redirect_url: midtransData.redirect_url,
        virtual_account: midtransData.va_numbers || null,
        payment_status: 'pending'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
