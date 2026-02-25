import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')!;
const ASAAS_BASE_URL = 'https://api.asaas.com/v3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { billingType, planId, planDays, value, userId, userEmail, creditCard } = await req.json();

    if (!billingType || !planId || !value || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
    }

    const externalReference = `${userId}__${planId}__${planDays}`;

    // Create or find customer in Asaas
    const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify({
        name: userEmail || 'Cliente',
        email: userEmail,
        externalReference: userId,
      }),
    });

    const customerData = await customerRes.json();
    const customerId = customerData.id || customerData.errors?.[0]?.description?.includes('já cadastrado')
      ? undefined
      : customerData.id;

    // If customer already exists, find them
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      const findRes = await fetch(`${ASAAS_BASE_URL}/customers?externalReference=${userId}`, {
        headers: { 'access_token': ASAAS_API_KEY },
      });
      const findData = await findRes.json();
      finalCustomerId = findData.data?.[0]?.id;
    }

    if (!finalCustomerId) {
      return new Response(JSON.stringify({ error: 'Failed to create/find customer' }), { status: 500, headers: corsHeaders });
    }

    // Create payment
    const paymentBody: Record<string, unknown> = {
      customer: finalCustomerId,
      billingType,
      value,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: `Plano ${planId} - X AXIS`,
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
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify(paymentBody),
    });

    const paymentData = await paymentRes.json();

    if (paymentData.errors) {
      return new Response(JSON.stringify({ error: paymentData.errors[0]?.description || 'Payment error' }), { status: 400, headers: corsHeaders });
    }

    // For PIX, get QR code
    let pixQrCode = null;
    if (billingType === 'PIX' && paymentData.id) {
      const pixRes = await fetch(`${ASAAS_BASE_URL}/payments/${paymentData.id}/pixQrCode`, {
        headers: { 'access_token': ASAAS_API_KEY },
      });
      pixQrCode = await pixRes.json();
    }

    // If credit card was confirmed immediately, activate subscription
    if (billingType === 'CREDIT_CARD' && (paymentData.status === 'CONFIRMED' || paymentData.status === 'RECEIVED')) {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + planDays);

      await adminClient.from('profiles').update({
        subscription_status: 'active',
        subscription_plan: planId,
        subscription_expires_at: expiresAt.toISOString(),
      }).eq('id', userId);
    }

    return new Response(JSON.stringify({
      ...paymentData,
      pixQrCode,
      externalReference,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
