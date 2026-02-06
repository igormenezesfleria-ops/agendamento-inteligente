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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header to verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    // Create Supabase client with service role for admin operations
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

    // Check if user is admin
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

    // Create the user with admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for collaborators
      user_metadata: { name },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error(createError.message);
    }

    // Update profile to collaborator role
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "collaborator", name })
      .eq("id", newUser.user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Try to clean up created user
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
