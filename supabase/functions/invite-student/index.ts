import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteStudentRequest {
  email: string;
  name: string;
  phone?: string;
  birth_date?: string;
}

function generateTempPassword(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Synton${digits}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData.user) throw new Error("Não autorizado");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profile?.role !== "admin") {
      throw new Error("Apenas personal/gestores podem cadastrar alunos");
    }

    const { email, name, phone, birth_date }: InviteStudentRequest = await req.json();
    if (!email || !name) throw new Error("Nome e e-mail são obrigatórios");

    const adminId = userData.user.id;

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("role, business_owner_id")
        .eq("id", existingUser.id)
        .single();

      if (existingProfile?.business_owner_id === adminId) {
        throw new Error("Este aluno já está vinculado ao seu studio");
      }
      throw new Error("Este e-mail já está em uso por outro usuário");
    }

    // Concierge flow: generate a temp password and create the user immediately
    // (no invitation email is sent — trainer hands the credentials to the student)
    const tempPassword = generateTempPassword();

    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name, role: "student" },
      });

    if (createError || !created.user) {
      console.error("Create user error:", createError);
      throw new Error(createError?.message || "Falha ao criar conta do aluno");
    }

    const invited = created;

    // Update profile with details and link to admin
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        role: "student",
        name,
        phone: phone || null,
        birth_date: birth_date || null,
        business_owner_id: adminId,
        is_onboarded: true,
      })
      .eq("id", invited.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      throw new Error("Erro ao configurar perfil do aluno");
    }

    await supabaseAdmin
      .from("user_roles")
      .update({ role: "student" })
      .eq("user_id", invited.user.id);

    return new Response(
      JSON.stringify({
        success: true,
        userId: invited.user.id,
        email,
        tempPassword,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in invite-student:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});