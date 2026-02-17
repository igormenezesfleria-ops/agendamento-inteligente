import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateCollaboratorRequest {
  email: string;
  password: string;
  name: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify the requesting user is an admin
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
      throw new Error("Não autorizado");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profile?.role !== "admin") {
      throw new Error("Apenas administradores podem criar colaboradores");
    }

    const { email, password, name }: CreateCollaboratorRequest = await req.json();

    if (!email || !password || !name) {
      throw new Error("Todos os campos são obrigatórios");
    }

    const adminId = userData.user.id;

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

    if (existingUser) {
      // User exists — check if already a collaborator for this admin
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("role, business_owner_id")
        .eq("id", existingUser.id)
        .single();

      if (existingProfile?.role === "collaborator" && existingProfile?.business_owner_id === adminId) {
        throw new Error("Este colaborador já está vinculado ao seu studio");
      }

      // Update existing user to collaborator role linked to this admin
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ role: "collaborator", name, business_owner_id: adminId })
        .eq("id", existingUser.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        throw new Error("Erro ao configurar perfil do colaborador");
      }

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .update({ role: "collaborator" })
        .eq("user_id", existingUser.id);

      if (roleError) {
        console.error("Error updating user_roles:", roleError);
      }

      return new Response(
        JSON.stringify({ success: true, userId: existingUser.id }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error(createError.message);
    }

    // Update profile to collaborator role and link to admin's studio
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "collaborator", name, business_owner_id: adminId })
      .eq("id", newUser.user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error("Erro ao configurar perfil do colaborador");
    }

    // Update user_roles table
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: "collaborator" })
      .eq("user_id", newUser.user.id);

    if (roleError) {
      console.error("Error updating user_roles:", roleError);
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in create-collaborator:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
