import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Environment check
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    if (!ASAAS_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API Key do Asaas não configurada no Supabase Secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { billingType, planId, planDays, value, userId, userEmail, userName, creditCard } = await req.json();

    if (!billingType || !planId || !value || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const asaasHeaders = {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
    };

    // 2. Create or find customer
    let customerId: string | null = null;

    // Try to find existing customer by externalReference
    try {
      const findRes = await fetch(`${ASAAS_BASE_URL}/customers?externalReference=${userId}`, {
        headers: { 'access_token': ASAAS_API_KEY },
      });
      const findData = await findRes.json();
      if (findData.data && findData.data.length > 0) {
        customerId = findData.data[0].id;
      }
    } catch (e) {
      console.error('Error finding customer:', e);
    }

    // If not found, create new customer
    if (!customerId) {
      const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          name: userName || userEmail || 'Cliente',
          email: userEmail,
          externalReference: userId,
          notificationDisabled: true,
        }),
      });

      const customerData = await customerRes.json();

      if (customerData.errors) {
        const errorMsg = customerData.errors[0]?.description || 'Erro ao criar cliente no Asaas';
        console.error('Asaas customer creation error:', customerData.errors);
        return new Response(
          JSON.stringify({ error: errorMsg }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      customerId = customerData.id;
    }

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Falha ao criar/encontrar cliente no Asaas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create payment
    const externalReference = `${userId}__${planId}__${planDays}`;
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const paymentBody: Record<string, unknown> = {
      customer: customerId,
      billingType,
      value,
      dueDate,
      description: `Plano ${planId} - Synton`,
      externalReference,
    };

    if (billingType === 'CREDIT_CARD' && creditCard) {
      paymentBody.creditCard = creditCard;
      paymentBody.creditCardHolderInfo = {
        name: creditCard.holderName,
        email: userEmail,
        postalCode: '00000000',
        addressNumber: '0',
        phone: '0000000000',
      };
    }

    const paymentRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify(paymentBody),
    });

    const paymentData = await paymentRes.json();

    if (paymentData.errors) {
      const errorMsg = paymentData.errors[0]?.description || 'Erro ao criar pagamento no Asaas';
      console.error('Asaas payment error:', paymentData.errors);
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. For PIX, get QR code
    let pixQrCode = null;
    if (billingType === 'PIX' && paymentData.id) {
      try {
        const pixRes = await fetch(`${ASAAS_BASE_URL}/payments/${paymentData.id}/pixQrCode`, {
          headers: { 'access_token': ASAAS_API_KEY },
        });
        const pixData = await pixRes.json();

        if (pixData.errors) {
          console.error('Asaas PIX QR error:', pixData.errors);
        } else {
          pixQrCode = pixData;
        }
      } catch (e) {
        console.error('Error fetching PIX QR code:', e);
      }
    }

    // 5. If credit card confirmed immediately, activate subscription
    if (billingType === 'CREDIT_CARD' && (paymentData.status === 'CONFIRMED' || paymentData.status === 'RECEIVED')) {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (planDays || 30));

      await adminClient.from('profiles').update({
        subscription_status: 'active',
        subscription_plan: planId,
        subscription_expires_at: expiresAt.toISOString(),
      }).eq('id', userId);
    }

    // 6. Return response
    return new Response(JSON.stringify({
      id: paymentData.id,
      status: paymentData.status,
      billingType: paymentData.billingType,
      pixQrCode,
      externalReference,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
