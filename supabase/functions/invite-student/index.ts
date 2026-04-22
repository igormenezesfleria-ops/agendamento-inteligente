import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, { error: "Não autorizado" });
    }

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
    if (userError || !userData.user) {
      return jsonResponse(401, { error: "Não autorizado" });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profile?.role !== "admin") {
      return jsonResponse(403, {
        error: "Apenas personal/gestores podem cadastrar alunos",
      });
    }

    const { email, name, phone, birth_date }: InviteStudentRequest = await req.json();
    if (!email || !name) {
      return jsonResponse(400, { error: "Nome e e-mail são obrigatórios" });
    }

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
        return jsonResponse(409, {
          error: "Este aluno já está vinculado ao seu studio",
        });
      }
      return jsonResponse(409, {
        error: "Este e-mail já está em uso por outro usuário",
      });
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
      return jsonResponse(500, {
        error: createError?.message || "Falha ao criar conta do aluno",
      });
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
      return jsonResponse(500, { error: "Erro ao configurar perfil do aluno" });
    }

    await supabaseAdmin
      .from("user_roles")
      .update({ role: "student" })
      .eq("user_id", invited.user.id);

    return jsonResponse(200, {
      success: true,
      userId: invited.user.id,
      email,
      tempPassword,
    });
  } catch (error: any) {
    console.error("Error in invite-student:", error);
    return jsonResponse(500, {
      error: error?.message || "Erro inesperado ao cadastrar aluno",
    });
  }
});