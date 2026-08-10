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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      book_images: {
        Row: {
          book_id: number
          created_at: string
          id: number
          sort_order: number
          storage_path: string
        }
        Insert: {
          book_id: number
          created_at?: string
          id?: number
          sort_order?: number
          storage_path: string
        }
        Update: {
          book_id?: number
          created_at?: string
          id?: number
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_images_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string | null
          category_id: number | null
          condition: Database["public"]["Enums"]["book_condition"] | null
          cover_path: string | null
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          isbn: string | null
          owner_id: string
          published_year: number | null
          status: Database["public"]["Enums"]["book_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category_id?: number | null
          condition?: Database["public"]["Enums"]["book_condition"] | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          id?: number
          is_active?: boolean
          isbn?: string | null
          owner_id: string
          published_year?: number | null
          status?: Database["public"]["Enums"]["book_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category_id?: number | null
          condition?: Database["public"]["Enums"]["book_condition"] | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          id?: number
          is_active?: boolean
          isbn?: string | null
          owner_id?: string
          published_year?: number | null
          status?: Database["public"]["Enums"]["book_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      borrow_requests: {
        Row: {
          book_id: number
          cancelled_at: string | null
          created_at: string
          expires_at: string
          id: string
          message: string | null
          owner_id: string
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          book_id: number
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          message?: string | null
          owner_id: string
          requester_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          book_id?: number
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          message?: string | null
          owner_id?: string
          requester_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "borrow_requests_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrow_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrow_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          abbreviation: string | null
          created_at: string
          id: number
          name: string
          slug: string
        }
        Insert: {
          abbreviation?: string | null
          created_at?: string
          id?: number
          name: string
          slug: string
        }
        Update: {
          abbreviation?: string | null
          created_at?: string
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      loans: {
        Row: {
          book_id: number
          borrower_id: string
          created_at: string
          due_at: string
          id: string
          owner_id: string
          request_id: string | null
          returned_at: string | null
          started_at: string
          status: Database["public"]["Enums"]["loan_status"]
          updated_at: string
        }
        Insert: {
          book_id: number
          borrower_id: string
          created_at?: string
          due_at?: string
          id?: string
          owner_id: string
          request_id?: string | null
          returned_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Update: {
          book_id?: number
          borrower_id?: string
          created_at?: string
          due_at?: string
          id?: string
          owner_id?: string
          request_id?: string | null
          returned_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "borrow_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: number
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: number
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: number
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["profile_role"]
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_borrow_request: {
        Args: { p_request_id: string }
        Returns: string
      }
      cancel_borrow_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      decline_borrow_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      return_loan: { Args: { p_loan_id: string }; Returns: undefined }
    }
    Enums: {
      book_condition: "new" | "like_new" | "good" | "fair" | "poor"
      book_status: "available" | "reserved" | "borrowed" | "unavailable"
      loan_status: "active" | "returned" | "overdue" | "cancelled"
      notification_type:
        | "request_received"
        | "request_approved"
        | "request_declined"
        | "request_cancelled"
        | "loan_started"
        | "loan_due"
        | "loan_returned"
        | "system"
      profile_role: "user" | "admin"
      request_status:
        | "pending"
        | "approved"
        | "declined"
        | "cancelled"
        | "expired"
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
      book_condition: ["new", "like_new", "good", "fair", "poor"],
      book_status: ["available", "reserved", "borrowed", "unavailable"],
      loan_status: ["active", "returned", "overdue", "cancelled"],
      notification_type: [
        "request_received",
        "request_approved",
        "request_declined",
        "request_cancelled",
        "loan_started",
        "loan_due",
        "loan_returned",
        "system",
      ],
      profile_role: ["user", "admin"],
      request_status: [
        "pending",
        "approved",
        "declined",
        "cancelled",
        "expired",
      ],
    },
  },
} as const
