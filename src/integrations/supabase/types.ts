export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      exports: {
        Row: {
          branch: string;
          code_path: string | null;
          commit_sha: string | null;
          commit_url: string | null;
          created_at: string;
          error_message: string | null;
          id: string;
          readme_path: string | null;
          repository_full_name: string | null;
          solution_id: string;
          state: Database["public"]["Enums"]["export_state"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          branch?: string;
          code_path?: string | null;
          commit_sha?: string | null;
          commit_url?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          readme_path?: string | null;
          repository_full_name?: string | null;
          solution_id: string;
          state?: Database["public"]["Enums"]["export_state"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          branch?: string;
          code_path?: string | null;
          commit_sha?: string | null;
          commit_url?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          readme_path?: string | null;
          repository_full_name?: string | null;
          solution_id?: string;
          state?: Database["public"]["Enums"]["export_state"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exports_solution_id_fkey";
            columns: ["solution_id"];
            isOneToOne: false;
            referencedRelation: "solutions";
            referencedColumns: ["id"];
          },
        ];
      };
      github_installations: {
        Row: {
          account_login: string | null;
          connected_at: string;
          default_branch: string;
          id: string;
          installation_id: number;
          selected_repository_full_name: string | null;
          selected_repository_id: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_login?: string | null;
          connected_at?: string;
          default_branch?: string;
          id?: string;
          installation_id: number;
          selected_repository_full_name?: string | null;
          selected_repository_id?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_login?: string | null;
          connected_at?: string;
          default_branch?: string;
          id?: string;
          installation_id?: number;
          selected_repository_full_name?: string | null;
          selected_repository_id?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      github_connections: {
        Row: {
          connected_at: string;
          encrypted_access_token: string;
          github_login: string;
          github_user_id: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          connected_at?: string;
          encrypted_access_token: string;
          github_login: string;
          github_user_id: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          connected_at?: string;
          encrypted_access_token?: string;
          github_login?: string;
          github_user_id?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      github_oauth_states: {
        Row: {
          created_at: string;
          expires_at: string;
          purpose: string;
          state: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          purpose: string;
          state: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          purpose?: string;
          state?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          github_username: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          github_username?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          github_username?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      solutions: {
        Row: {
          approach: string | null;
          code: string;
          created_at: string;
          difficulty: string | null;
          export_status: Database["public"]["Enums"]["export_state"];
          id: string;
          language: string;
          last_exported_at: string | null;
          platform: Database["public"]["Enums"]["solution_platform"];
          problem_slug: string;
          problem_title: string;
          problem_url: string | null;
          notes: string | null;
          space_complexity: string | null;
          status: Database["public"]["Enums"]["solution_status"];
          submission_url: string | null;
          tags: string[];
          time_complexity: string | null;
          updated_at: string;
          user_id: string;
          verification: Database["public"]["Enums"]["verification_state"];
          verification_note: string | null;
          verified_at: string | null;
        };
        Insert: {
          approach?: string | null;
          code?: string;
          created_at?: string;
          difficulty?: string | null;
          export_status?: Database["public"]["Enums"]["export_state"];
          id?: string;
          language?: string;
          last_exported_at?: string | null;
          platform: Database["public"]["Enums"]["solution_platform"];
          problem_slug: string;
          problem_title: string;
          problem_url?: string | null;
          notes?: string | null;
          space_complexity?: string | null;
          status?: Database["public"]["Enums"]["solution_status"];
          submission_url?: string | null;
          tags?: string[];
          time_complexity?: string | null;
          updated_at?: string;
          user_id: string;
          verification?: Database["public"]["Enums"]["verification_state"];
          verification_note?: string | null;
          verified_at?: string | null;
        };
        Update: {
          approach?: string | null;
          code?: string;
          created_at?: string;
          difficulty?: string | null;
          export_status?: Database["public"]["Enums"]["export_state"];
          id?: string;
          language?: string;
          last_exported_at?: string | null;
          platform?: Database["public"]["Enums"]["solution_platform"];
          problem_slug?: string;
          problem_title?: string;
          problem_url?: string | null;
          notes?: string | null;
          space_complexity?: string | null;
          status?: Database["public"]["Enums"]["solution_status"];
          submission_url?: string | null;
          tags?: string[];
          time_complexity?: string | null;
          updated_at?: string;
          user_id?: string;
          verification?: Database["public"]["Enums"]["verification_state"];
          verification_note?: string | null;
          verified_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      export_state: "not_exported" | "queued" | "in_progress" | "exported" | "failed";
      solution_platform: "codechef" | "leetcode" | "geeksforgeeks" | "code360" | "codeforces";
      solution_status: "draft" | "submitted" | "accepted" | "manually_verified";
      verification_state: "not_required" | "manual_required" | "pending" | "verified" | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      export_state: ["not_exported", "queued", "in_progress", "exported", "failed"],
      solution_platform: ["codechef", "leetcode", "geeksforgeeks", "code360", "codeforces"],
      solution_status: ["draft", "submitted", "accepted", "manually_verified"],
      verification_state: ["not_required", "manual_required", "pending", "verified", "failed"],
    },
  },
} as const;
