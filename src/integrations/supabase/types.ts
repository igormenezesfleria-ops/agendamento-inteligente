export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          attendance: string | null
          class_schedule_id: string | null
          collaborator_status: string
          completed_at: string | null
          created_at: string
          date: string
          id: string
          instructor_id: string | null
          notes: string | null
          private_notes: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          student_id: string
          time_slot: string
          updated_at: string
        }
        Insert: {
          attendance?: string | null
          class_schedule_id?: string | null
          collaborator_status?: string
          completed_at?: string | null
          created_at?: string
          date: string
          id?: string
          instructor_id?: string | null
          notes?: string | null
          private_notes?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          student_id: string
          time_slot: string
          updated_at?: string
        }
        Update: {
          attendance?: string | null
          class_schedule_id?: string | null
          collaborator_status?: string
          completed_at?: string | null
          created_at?: string
          date?: string
          id?: string
          instructor_id?: string | null
          notes?: string | null
          private_notes?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          student_id?: string
          time_slot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_class_schedule_id_fkey"
            columns: ["class_schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          action_window_hours: number
          capacity: number
          class_name: string
          created_at: string
          day_of_week: number
          default_collaborator_id: string | null
          end_time: string
          id: string
          instructor_id: string
          requires_approval: boolean
          start_time: string
        }
        Insert: {
          action_window_hours?: number
          capacity?: number
          class_name?: string
          created_at?: string
          day_of_week: number
          default_collaborator_id?: string | null
          end_time: string
          id?: string
          instructor_id: string
          requires_approval?: boolean
          start_time: string
        }
        Update: {
          action_window_hours?: number
          capacity?: number
          class_name?: string
          created_at?: string
          day_of_week?: number
          default_collaborator_id?: string | null
          end_time?: string
          id?: string
          instructor_id?: string
          requires_approval?: boolean
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_default_collaborator_id_fkey"
            columns: ["default_collaborator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedules_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          admin_id: string
          amount: number
          category: string
          created_at: string
          due_date: string
          id: string
          is_fixed: boolean
          is_paid: boolean
          name: string
        }
        Insert: {
          admin_id: string
          amount?: number
          category?: string
          created_at?: string
          due_date: string
          id?: string
          is_fixed?: boolean
          is_paid?: boolean
          name: string
        }
        Update: {
          admin_id?: string
          amount?: number
          category?: string
          created_at?: string
          due_date?: string
          id?: string
          is_fixed?: boolean
          is_paid?: boolean
          name?: string
        }
        Relationships: []
      }
      locked_slots: {
        Row: {
          created_at: string
          date: string
          id: string
          locked_by: string | null
          reason: string | null
          time_slot: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          locked_by?: string | null
          reason?: string | null
          time_slot: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          locked_by?: string | null
          reason?: string | null
          time_slot?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          creator_id: string | null
          id: string
          is_broadcast: boolean
          is_read: boolean
          message: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
          id?: string
          is_broadcast?: boolean
          is_read?: boolean
          message: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string | null
          id?: string
          is_broadcast?: boolean
          is_read?: boolean
          message?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          base_rate: number | null
          business_owner_id: string | null
          collaborator_rate: number | null
          cpf: string | null
          created_at: string
          date_of_birth: string | null
          default_capacity: number
          emergency_contact: string | null
          fixed_monthly_rate: number | null
          has_injury: boolean | null
          hourly_rate: number | null
          id: string
          injury_details: string | null
          instagram_handle: string | null
          is_active: boolean | null
          is_onboarded: boolean
          main_objective: string | null
          name: string | null
          no_show_rate: number | null
          pay_type: string | null
          phone: string | null
          photo_url: string | null
          profile_completed: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          studio_code: string | null
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_status: string
          updated_at: string
          vip_code_used: boolean
        }
        Insert: {
          base_rate?: number | null
          business_owner_id?: string | null
          collaborator_rate?: number | null
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          default_capacity?: number
          emergency_contact?: string | null
          fixed_monthly_rate?: number | null
          has_injury?: boolean | null
          hourly_rate?: number | null
          id: string
          injury_details?: string | null
          instagram_handle?: string | null
          is_active?: boolean | null
          is_onboarded?: boolean
          main_objective?: string | null
          name?: string | null
          no_show_rate?: number | null
          pay_type?: string | null
          phone?: string | null
          photo_url?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          studio_code?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string
          updated_at?: string
          vip_code_used?: boolean
        }
        Update: {
          base_rate?: number | null
          business_owner_id?: string | null
          collaborator_rate?: number | null
          cpf?: string | null
          created_at?: string
          date_of_birth?: string | null
          default_capacity?: number
          emergency_contact?: string | null
          fixed_monthly_rate?: number | null
          has_injury?: boolean | null
          hourly_rate?: number | null
          id?: string
          injury_details?: string | null
          instagram_handle?: string | null
          is_active?: boolean | null
          is_onboarded?: boolean
          main_objective?: string | null
          name?: string | null
          no_show_rate?: number | null
          pay_type?: string | null
          phone?: string | null
          photo_url?: string | null
          profile_completed?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          studio_code?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string
          updated_at?: string
          vip_code_used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_owner_id_fkey"
            columns: ["business_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_student_schedules: {
        Row: {
          business_owner_id: string
          class_schedule_id: string | null
          created_at: string
          day_of_week: number
          id: string
          instructor_id: string | null
          is_active: boolean
          student_id: string
          time_slot: string
          updated_at: string
        }
        Insert: {
          business_owner_id: string
          class_schedule_id?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          student_id: string
          time_slot: string
          updated_at?: string
        }
        Update: {
          business_owner_id?: string
          class_schedule_id?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          student_id?: string
          time_slot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_student_schedules_class_schedule_id_fkey"
            columns: ["class_schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decline_appointment: {
        Args: { appointment_id: string }
        Returns: undefined
      }
      delegate_appointment: {
        Args: { appt_id: string; target_instructor_id: string }
        Returns: undefined
      }
      get_business_owner_id: { Args: { _user_id: string }; Returns: string }
      get_slot_count: {
        Args: { slot_date: string; slot_time: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_student_to_trainer: {
        Args: { p_studio_code: string }
        Returns: Json
      }
      unlink_student: {
        Args: { target_student_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "student" | "admin" | "collaborator"
      appointment_status:
        | "pending"
        | "confirmed"
        | "delegated"
        | "completed"
        | "cancelled"
        | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "admin", "collaborator"],
      appointment_status: [
        "pending",
        "confirmed",
        "delegated",
        "completed",
        "cancelled",
        "rejected",
      ],
    },
  },
} as const
