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
      ads: {
        Row: {
          active: boolean
          created_at: string
          cta_label: string | null
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          internal_link: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          internal_link: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_label?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          internal_link?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          audience: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          message: string
          show_as_popup: boolean
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message: string
          show_as_popup?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          show_as_popup?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          ip: string | null
          meta: Json
          target: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          meta?: Json
          target?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          meta?: Json
          target?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      crop_samples: {
        Row: {
          created_at: string
          humidity: number
          id: string
          k: number
          label: string
          n: number
          p: number
          ph: number
          rainfall: number
          temperature: number
        }
        Insert: {
          created_at?: string
          humidity: number
          id?: string
          k: number
          label: string
          n: number
          p: number
          ph: number
          rainfall: number
          temperature: number
        }
        Update: {
          created_at?: string
          humidity?: number
          id?: string
          k?: number
          label?: string
          n?: number
          p?: number
          ph?: number
          rainfall?: number
          temperature?: number
        }
        Relationships: []
      }
      disease_reference: {
        Row: {
          created_at: string
          crop: string
          description: string | null
          disease_key: string
          id: string
          name_en: string
          name_hi: string | null
          name_te: string | null
          source: string | null
          typical_severity: string | null
          visual_signs: string | null
        }
        Insert: {
          created_at?: string
          crop: string
          description?: string | null
          disease_key: string
          id?: string
          name_en: string
          name_hi?: string | null
          name_te?: string | null
          source?: string | null
          typical_severity?: string | null
          visual_signs?: string | null
        }
        Update: {
          created_at?: string
          crop?: string
          description?: string | null
          disease_key?: string
          id?: string
          name_en?: string
          name_hi?: string | null
          name_te?: string | null
          source?: string | null
          typical_severity?: string | null
          visual_signs?: string | null
        }
        Relationships: []
      }
      disease_reference_images: {
        Row: {
          created_at: string
          crop: string
          disease_key: string
          id: string
          image_url: string
          source: string | null
        }
        Insert: {
          created_at?: string
          crop: string
          disease_key: string
          id?: string
          image_url: string
          source?: string | null
        }
        Update: {
          created_at?: string
          crop?: string
          disease_key?: string
          id?: string
          image_url?: string
          source?: string | null
        }
        Relationships: []
      }
      farming_method_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          method_id: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          method_id: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          method_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "farming_method_images_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "farming_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      farming_methods: {
        Row: {
          active: boolean
          benefits: string[]
          category: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string
          example_crops: string[]
          id: string
          slug: string
          title: string
          updated_at: string
          use_cases: string[]
        }
        Insert: {
          active?: boolean
          benefits?: string[]
          category: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          example_crops?: string[]
          id?: string
          slug: string
          title: string
          updated_at?: string
          use_cases?: string[]
        }
        Update: {
          active?: boolean
          benefits?: string[]
          category?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          example_crops?: string[]
          id?: string
          slug?: string
          title?: string
          updated_at?: string
          use_cases?: string[]
        }
        Relationships: []
      }
      fields: {
        Row: {
          created_at: string
          crop: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crop: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crop?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      mixed_crop_rules: {
        Row: {
          active: boolean
          benefits: string[]
          companion_crop: string
          compatibility_score: number
          created_at: string
          created_by: string | null
          existing_crop: string | null
          id: string
          min_land_acres: number
          notes: string
          primary_crop: string
          principles: string[]
          soil_types: string[]
          source: string
          updated_at: string
          weather: string
        }
        Insert: {
          active?: boolean
          benefits?: string[]
          companion_crop: string
          compatibility_score?: number
          created_at?: string
          created_by?: string | null
          existing_crop?: string | null
          id?: string
          min_land_acres?: number
          notes?: string
          primary_crop: string
          principles?: string[]
          soil_types?: string[]
          source?: string
          updated_at?: string
          weather?: string
        }
        Update: {
          active?: boolean
          benefits?: string[]
          companion_crop?: string
          compatibility_score?: number
          created_at?: string
          created_by?: string | null
          existing_crop?: string | null
          id?: string
          min_land_acres?: number
          notes?: string
          primary_crop?: string
          principles?: string[]
          soil_types?: string[]
          source?: string
          updated_at?: string
          weather?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_login_at: string | null
          moderated_at: string | null
          moderation_reason: string | null
          preferred_language: string
          suspicious: boolean
          suspicious_at: string | null
          suspicious_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_login_at?: string | null
          moderated_at?: string | null
          moderation_reason?: string | null
          preferred_language?: string
          suspicious?: boolean
          suspicious_at?: string | null
          suspicious_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_login_at?: string | null
          moderated_at?: string | null
          moderation_reason?: string | null
          preferred_language?: string
          suspicious?: boolean
          suspicious_at?: string | null
          suspicious_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rag_documents: {
        Row: {
          chunk: string
          created_at: string
          crop: string
          disease_key: string | null
          embedding: string | null
          id: string
          lang: string
          source_url: string | null
          title: string | null
        }
        Insert: {
          chunk: string
          created_at?: string
          crop: string
          disease_key?: string | null
          embedding?: string | null
          id?: string
          lang?: string
          source_url?: string | null
          title?: string | null
        }
        Update: {
          chunk?: string
          created_at?: string
          crop?: string
          disease_key?: string | null
          embedding?: string | null
          id?: string
          lang?: string
          source_url?: string | null
          title?: string | null
        }
        Relationships: []
      }
      rag_image_embeddings: {
        Row: {
          created_at: string
          crop: string
          disease_key: string
          embedding: string | null
          id: string
          image_url: string
        }
        Insert: {
          created_at?: string
          crop: string
          disease_key: string
          embedding?: string | null
          id?: string
          image_url: string
        }
        Update: {
          created_at?: string
          crop?: string
          disease_key?: string
          embedding?: string | null
          id?: string
          image_url?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          id: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          id?: string
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          id?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          confidence: number | null
          created_at: string
          crop: string
          diagnosis: Json | null
          disease_name: string | null
          field_id: string | null
          id: string
          image_urls: string[]
          interview: Json
          language: string
          severity: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          crop: string
          diagnosis?: Json | null
          disease_name?: string | null
          field_id?: string | null
          id?: string
          image_urls?: string[]
          interview?: Json
          language?: string
          severity?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          crop?: string
          diagnosis?: Json | null
          disease_name?: string | null
          field_id?: string | null
          id?: string
          image_urls?: string[]
          interview?: Json
          language?: string
          severity?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scans_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_admin: boolean
          ticket_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_admin?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          scan_id: string | null
          screenshot_url: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          scan_id?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          scan_id?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action: string
          created_at: string
          endpoint: string | null
          id: string
          ip: string | null
          meta: Json
          status: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          endpoint?: string | null
          id?: string
          ip?: string | null
          meta?: Json
          status?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          endpoint?: string | null
          id?: string
          ip?: string | null
          meta?: Json
          status?: number | null
          user_id?: string | null
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
      check_rate_limit: {
        Args: { _key: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
      evaluate_suspicious: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_active: { Args: { _user_id: string }; Returns: boolean }
      match_rag_documents: {
        Args: {
          match_count?: number
          match_crop: string
          query_embedding: string
        }
        Returns: {
          chunk: string
          crop: string
          disease_key: string
          id: string
          similarity: number
          source_url: string
          title: string
        }[]
      }
      match_rag_images: {
        Args: {
          match_count?: number
          match_crop: string
          query_embedding: string
        }
        Returns: {
          crop: string
          disease_key: string
          id: string
          image_url: string
          similarity: number
        }[]
      }
      recommend_crops_knn: {
        Args: {
          _humidity: number
          _k: number
          _knn?: number
          _n: number
          _p: number
          _ph: number
          _rainfall: number
          _temperature: number
          _top?: number
        }
        Returns: {
          avg_humidity: number
          avg_k: number
          avg_n: number
          avg_p: number
          avg_ph: number
          avg_rainfall: number
          avg_temperature: number
          label: string
          suitability: number
          votes: number
        }[]
      }
      touch_last_login: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      ticket_category: "bug" | "wrong_diagnosis" | "feature" | "other"
      ticket_priority: "low" | "normal" | "high"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
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
      app_role: ["admin", "user"],
      ticket_category: ["bug", "wrong_diagnosis", "feature", "other"],
      ticket_priority: ["low", "normal", "high"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
    },
  },
} as const
