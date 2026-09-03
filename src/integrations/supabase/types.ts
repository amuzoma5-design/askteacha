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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          detail: Json
          id: string
          target_user_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          detail?: Json
          id?: string
          target_user_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          detail?: Json
          id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      cbt_results: {
        Row: {
          created_at: string
          id: string
          score: number
          subject: string
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          score?: number
          subject?: string
          total?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number
          subject?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      notebook_entries: {
        Row: {
          answer: Json
          created_at: string
          id: string
          key_mistake: string | null
          local_id: string | null
          question: string
          revised: boolean
          subject: string
          user_id: string
        }
        Insert: {
          answer?: Json
          created_at?: string
          id?: string
          key_mistake?: string | null
          local_id?: string | null
          question?: string
          revised?: boolean
          subject?: string
          user_id: string
        }
        Update: {
          answer?: Json
          created_at?: string
          id?: string
          key_mistake?: string | null
          local_id?: string | null
          question?: string
          revised?: boolean
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          career_goal: string | null
          class_level: string
          created_at: string
          email: string | null
          exam_date: string | null
          exam_type: string
          full_name: string
          id: string
          learning_style: string | null
          notes: string | null
          plan: Database["public"]["Enums"]["app_plan"]
          strong_subjects: string[]
          student_code: string
          subjects: string[]
          target_score: string | null
          trial_expires_at: string
          trial_start_at: string
          updated_at: string
          weak_subjects: string[]
        }
        Insert: {
          career_goal?: string | null
          class_level?: string
          created_at?: string
          email?: string | null
          exam_date?: string | null
          exam_type?: string
          full_name?: string
          id: string
          learning_style?: string | null
          notes?: string | null
          plan?: Database["public"]["Enums"]["app_plan"]
          strong_subjects?: string[]
          student_code?: string
          subjects?: string[]
          target_score?: string | null
          trial_expires_at?: string
          trial_start_at?: string
          updated_at?: string
          weak_subjects?: string[]
        }
        Update: {
          career_goal?: string | null
          class_level?: string
          created_at?: string
          email?: string | null
          exam_date?: string | null
          exam_type?: string
          full_name?: string
          id?: string
          learning_style?: string | null
          notes?: string | null
          plan?: Database["public"]["Enums"]["app_plan"]
          strong_subjects?: string[]
          student_code?: string
          subjects?: string[]
          target_score?: string | null
          trial_expires_at?: string
          trial_start_at?: string
          updated_at?: string
          weak_subjects?: string[]
        }
        Relationships: []
      }
      question_history: {
        Row: {
          answer: Json
          created_at: string
          id: string
          local_id: string | null
          question: string
          subject: string
          user_id: string
        }
        Insert: {
          answer?: Json
          created_at?: string
          id?: string
          local_id?: string | null
          question?: string
          subject?: string
          user_id: string
        }
        Update: {
          answer?: Json
          created_at?: string
          id?: string
          local_id?: string | null
          question?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string
          expires_at: string
          id: string
          plan: Database["public"]["Enums"]["app_plan"]
          started_at: string
          status: Database["public"]["Enums"]["sub_status"]
          user_id: string
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          expires_at: string
          id?: string
          plan?: Database["public"]["Enums"]["app_plan"]
          started_at?: string
          status?: Database["public"]["Enums"]["sub_status"]
          user_id: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["app_plan"]
          started_at?: string
          status?: Database["public"]["Enums"]["sub_status"]
          user_id?: string
        }
        Relationships: []
      }
      upgrade_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          plan: Database["public"]["Enums"]["app_plan"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          subscription_expires_at: string | null
          subscription_start_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          plan?: Database["public"]["Enums"]["app_plan"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          subscription_expires_at?: string | null
          subscription_start_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          plan?: Database["public"]["Enums"]["app_plan"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          subscription_expires_at?: string | null
          subscription_start_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string
          feature: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
      effective_plan: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_plan"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      sync_access_state: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_plan"]
      }
    }
    Enums: {
      app_plan: "trial" | "free" | "foundation" | "scholar" | "achiever"
      app_role: "student" | "admin"
      request_status: "pending" | "approved" | "rejected" | "expired"
      sub_status: "active" | "expired" | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_plan: ["trial", "free", "foundation", "scholar", "achiever"],
      app_role: ["student", "admin"],
      request_status: ["pending", "approved", "rejected", "expired"],
      sub_status: ["active", "expired", "cancelled"],
    },
  },
} as const
