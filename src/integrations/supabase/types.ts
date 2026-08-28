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
    PostgrestVersion: "14.17"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          trial_days: number | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          trial_days?: number | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          trial_days?: number | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      advertorial_events: {
        Row: {
          advertorial_id: string
          block_id: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          percent: number | null
          referrer: string | null
          region: string | null
          session_id: string
          target_url: string | null
          time_on_page_ms: number | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          advertorial_id: string
          block_id?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          percent?: number | null
          referrer?: string | null
          region?: string | null
          session_id: string
          target_url?: string | null
          time_on_page_ms?: number | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          advertorial_id?: string
          block_id?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          percent?: number | null
          referrer?: string | null
          region?: string | null
          session_id?: string
          target_url?: string | null
          time_on_page_ms?: number | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      advertorials: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          published_url: string | null
          settings: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          id?: string
          published_url?: string | null
          settings?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          published_url?: string | null
          settings?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      classrooms: {
        Row: {
          cover_aspect_ratio: string
          cover_image_url: string | null
          created_at: string
          id: string
          name: string
          order: number
          published: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_aspect_ratio?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          name?: string
          order?: number
          published?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_aspect_ratio?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          name?: string
          order?: number
          published?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_templates: {
        Row: {
          content: Json
          content_type: string
          created_at: string
          created_by: string
          description: string
          id: string
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          content_type: string
          created_at?: string
          created_by: string
          description?: string
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          content_type?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_domains: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          domain: string
          domain_id: string | null
          id: string
          path: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          domain: string
          domain_id?: string | null
          id?: string
          path?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          domain?: string
          domain_id?: string | null
          id?: string
          path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_domains_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          created_at: string
          dns_ok: boolean
          domain: string
          host_ok: boolean
          id: string
          last_checked_at: string | null
          last_error: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dns_ok?: boolean
          domain: string
          host_ok?: boolean
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dns_ok?: boolean
          domain?: string
          host_ok?: boolean
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          blocks: Json
          classroom_id: string
          content: string
          created_at: string
          id: string
          name: string
          order: number
          published: boolean
          settings: Json
          updated_at: string
        }
        Insert: {
          blocks?: Json
          classroom_id: string
          content?: string
          created_at?: string
          id?: string
          name?: string
          order?: number
          published?: boolean
          settings?: Json
          updated_at?: string
        }
        Update: {
          blocks?: Json
          classroom_id?: string
          content?: string
          created_at?: string
          id?: string
          name?: string
          order?: number
          published?: boolean
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      order_timeline_events: {
        Row: {
          created_at: string
          description: string
          event_date: string
          id: string
          order_id: string
          sort_order: number
          status_marker: string
        }
        Insert: {
          created_at?: string
          description?: string
          event_date?: string
          id?: string
          order_id: string
          sort_order?: number
          status_marker?: string
        }
        Update: {
          created_at?: string
          description?: string
          event_date?: string
          id?: string
          order_id?: string
          sort_order?: number
          status_marker?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_timeline_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_timeline_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "public_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: string
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          order_date: string
          order_number: string
          payment_method: string
          products: Json
          published: boolean
          shipping: number
          shipping_address: string
          shipping_method: string
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          order_date?: string
          order_number?: string
          payment_method?: string
          products?: Json
          published?: boolean
          shipping?: number
          shipping_address?: string
          shipping_method?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          id?: string
          order_date?: string
          order_number?: string
          payment_method?: string
          products?: Json
          published?: boolean
          shipping?: number
          shipping_address?: string
          shipping_method?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_cta_events: {
        Row: {
          button_text: string
          created_at: string
          id: string
          page_index: number
          product_name: string
          quiz_id: string
          response_id: string | null
          target_url: string
        }
        Insert: {
          button_text?: string
          created_at?: string
          id?: string
          page_index?: number
          product_name?: string
          quiz_id: string
          response_id?: string | null
          target_url?: string
        }
        Update: {
          button_text?: string
          created_at?: string
          id?: string
          page_index?: number
          product_name?: string
          quiz_id?: string
          response_id?: string | null
          target_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_cta_events_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "quiz_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_page_views: {
        Row: {
          created_at: string
          id: string
          page_index: number
          page_label: string
          page_type: string
          quiz_id: string
          response_id: string
          time_on_page_ms: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          page_index?: number
          page_label?: string
          page_type?: string
          quiz_id: string
          response_id: string
          time_on_page_ms?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          page_index?: number
          page_label?: string
          page_type?: string
          quiz_id?: string
          response_id?: string
          time_on_page_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_page_views_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "quiz_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_response_answers: {
        Row: {
          answered_at: string
          id: string
          question_index: number
          question_text: string
          quiz_id: string
          response_id: string
          selected_option_ids: Json
          selected_option_texts: Json
          time_on_question_ms: number | null
        }
        Insert: {
          answered_at?: string
          id?: string
          question_index: number
          question_text?: string
          quiz_id: string
          response_id: string
          selected_option_ids?: Json
          selected_option_texts?: Json
          time_on_question_ms?: number | null
        }
        Update: {
          answered_at?: string
          id?: string
          question_index?: number
          question_text?: string
          quiz_id?: string
          response_id?: string
          selected_option_ids?: Json
          selected_option_texts?: Json
          time_on_question_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_response_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "quiz_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          completed_at: string | null
          country: string | null
          created_at: string
          device_type: string | null
          id: string
          last_question_index: number
          questions_answered: number
          quiz_id: string
          referrer: string | null
          region: string | null
          result_product_name: string | null
          session_id: string
          started_at: string
          time_to_complete_ms: number | null
          total_questions: number
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          completed_at?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          last_question_index?: number
          questions_answered?: number
          quiz_id: string
          referrer?: string | null
          region?: string | null
          result_product_name?: string | null
          session_id: string
          started_at?: string
          time_to_complete_ms?: number | null
          total_questions?: number
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          completed_at?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          last_question_index?: number
          questions_answered?: number
          quiz_id?: string
          referrer?: string | null
          region?: string | null
          result_product_name?: string | null
          session_id?: string
          started_at?: string
          time_to_complete_ms?: number | null
          total_questions?: number
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          analytics: Json
          created_at: string
          id: string
          products: Json
          published_url: string | null
          questions: Json
          results: Json
          settings: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics?: Json
          created_at?: string
          id?: string
          products?: Json
          published_url?: string | null
          questions?: Json
          results?: Json
          settings?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics?: Json
          created_at?: string
          id?: string
          products?: Json
          published_url?: string | null
          questions?: Json
          results?: Json
          settings?: Json
          title?: string
          updated_at?: string
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
      winning_products: {
        Row: {
          created_at: string
          creative_videos: Json | null
          custom_links: Json
          customer_aspirational_identity: Json
          customer_state: Json
          description: string
          estimated_daily_sales: string
          estimated_total_sales_60d: string
          id: string
          image_url: string | null
          last_month_revenue: number
          name: string
          niche: string | null
          product_performance: Json
          published: boolean
          updated_at: string
          user_id: string
          website_traffic: Json
        }
        Insert: {
          created_at?: string
          creative_videos?: Json | null
          custom_links?: Json
          customer_aspirational_identity?: Json
          customer_state?: Json
          description?: string
          estimated_daily_sales?: string
          estimated_total_sales_60d?: string
          id?: string
          image_url?: string | null
          last_month_revenue?: number
          name: string
          niche?: string | null
          product_performance?: Json
          published?: boolean
          updated_at?: string
          user_id: string
          website_traffic?: Json
        }
        Update: {
          created_at?: string
          creative_videos?: Json | null
          custom_links?: Json
          customer_aspirational_identity?: Json
          customer_state?: Json
          description?: string
          estimated_daily_sales?: string
          estimated_total_sales_60d?: string
          id?: string
          image_url?: string | null
          last_month_revenue?: number
          name?: string
          niche?: string | null
          product_performance?: Json
          published?: boolean
          updated_at?: string
          user_id?: string
          website_traffic?: Json
        }
        Relationships: []
      }
    }
    Views: {
      domain_mappings: {
        Row: {
          content_id: string | null
          content_type: string | null
          domain: string | null
          path: string | null
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          domain?: string | null
          path?: string | null
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          domain?: string | null
          path?: string | null
        }
        Relationships: []
      }
      public_order_timeline_events: {
        Row: {
          description: string | null
          event_date: string | null
          id: string | null
          order_id: string | null
          sort_order: number | null
          status_marker: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_timeline_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_timeline_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "public_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      public_orders: {
        Row: {
          created_at: string | null
          id: string | null
          order_date: string | null
          order_number: string | null
          products: Json | null
          published: boolean | null
          shipping: number | null
          shipping_method: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          order_date?: string | null
          order_number?: string | null
          products?: Json | null
          published?: boolean | null
          shipping?: number | null
          shipping_method?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          order_date?: string | null
          order_number?: string | null
          products?: Json | null
          published?: boolean | null
          shipping?: number | null
          shipping_method?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_access_code: { Args: { _code: string }; Returns: boolean }
      check_trial_status: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_and_claim_access_code: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
