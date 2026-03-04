import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active recurring schedules
    const { data: recurringSchedules, error: rsError } = await supabase
      .from("recurring_student_schedules")
      .select("*, class_schedules!recurring_student_schedules_class_schedule_id_fkey(requires_approval, default_collaborator_id, capacity, start_time)")
      .eq("is_active", true);

    if (rsError) throw rsError;
    if (!recurringSchedules || recurringSchedules.length === 0) {
      return new Response(JSON.stringify({ message: "No active recurring schedules" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    let created = 0;
    let skipped = 0;

    for (const rs of recurringSchedules) {
      // Generate appointments for 31 days from today
      for (let i = 0; i <= 31; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);

        // Check if this day matches the recurring day_of_week
        if (targetDate.getDay() !== rs.day_of_week) continue;

        const dateStr = targetDate.toISOString().split("T")[0];

        // Check if appointment already exists for this student/date/time
        const { count } = await supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("student_id", rs.student_id)
          .eq("date", dateStr)
          .eq("time_slot", rs.time_slot);

        if ((count ?? 0) > 0) {
          skipped++;
          continue;
        }

        // Check slot capacity
        const { count: slotCount } = await supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("date", dateStr)
          .eq("time_slot", rs.time_slot)
          .in("status", ["pending", "confirmed", "delegated"]);

        const capacity = rs.class_schedules?.capacity ?? 10;
        if ((slotCount ?? 0) >= capacity) {
          skipped++;
          continue;
        }

        // Determine status based on requires_approval
        const requiresApproval = rs.class_schedules?.requires_approval ?? true;
        const defaultCollaborator = rs.class_schedules?.default_collaborator_id;

        let status: string;
        let instructorId: string | null = rs.instructor_id || defaultCollaborator || rs.business_owner_id;
        let collaboratorStatus = "accepted";

        if (requiresApproval) {
          // Will stay pending — the UI filters by 72h (3-day) window
          status = "pending";
          collaboratorStatus = "pending";
        } else {
          // Auto-confirm
          status = "confirmed";
          collaboratorStatus = "accepted";
        }

        const { error: insertError } = await supabase
          .from("appointments")
          .insert({
            student_id: rs.student_id,
            instructor_id: instructorId,
            date: dateStr,
            time_slot: rs.time_slot,
            status,
            class_schedule_id: rs.class_schedule_id,
            collaborator_status: collaboratorStatus,
            notes: "Aluno Fixo (agendamento automático)",
          });

        if (insertError) {
          console.error(`Failed to create appointment for ${rs.student_id} on ${dateStr}:`, insertError);
          skipped++;
        } else {
          created++;
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Generated ${created} appointments, skipped ${skipped}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
