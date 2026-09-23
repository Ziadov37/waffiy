// =============================================================================
// FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN
// =============================================================================
// Produit par scripts/generate-types.sh à partir des migrations Supabase.
// Toute modification manuelle sera écrasée, et `npm run types:check` échouera.
// Pour faire évoluer ces types : modifier une migration, puis `npm run types:gen`.

export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          points: number;
          lifetime_points: number;
          rewards_redeemed: number;
          last_credit_at: string | null;
          created_at: string;
          id: string;
          joined_at: string;
          last_activity_at: string | null;
          merchant_id: string;
          profile_id: string;
        };
        Insert: {
          points?: number;
          lifetime_points?: number;
          rewards_redeemed?: number;
          last_credit_at?: string | null;
          created_at?: string;
          id?: string;
          joined_at?: string;
          last_activity_at?: string | null;
          merchant_id: string;
          profile_id: string;
        };
        Update: {
          points?: number;
          lifetime_points?: number;
          rewards_redeemed?: number;
          last_credit_at?: string | null;
          created_at?: string;
          id?: string;
          joined_at?: string;
          last_activity_at?: string | null;
          merchant_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'memberships_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memberships_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      merchants: {
        Row: {
          category: Database['public']['Enums']['merchant_category'];
          city: string;
          created_at: string;
          id: string;
          join_code: string;
          logo_url: string | null;
          min_credit_interval_seconds: number | null;
          name: string;
          owner_id: string;
          phone: string | null;
          status: Database['public']['Enums']['merchant_status'];
          timezone: string;
          updated_at: string;
        };
        Insert: {
          category: Database['public']['Enums']['merchant_category'];
          city: string;
          created_at?: string;
          id?: string;
          join_code: string;
          logo_url?: string | null;
          min_credit_interval_seconds?: number | null;
          name: string;
          owner_id: string;
          phone?: string | null;
          status?: Database['public']['Enums']['merchant_status'];
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          category?: Database['public']['Enums']['merchant_category'];
          city?: string;
          created_at?: string;
          id?: string;
          join_code?: string;
          logo_url?: string | null;
          min_credit_interval_seconds?: number | null;
          name?: string;
          owner_id?: string;
          phone?: string | null;
          status?: Database['public']['Enums']['merchant_status'];
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'merchants_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          data: Json;
          id: string;
          kind: Database['public']['Enums']['notification_kind'];
          merchant_id: string | null;
          profile_id: string;
          program_id: string | null;
          pushed_at: string | null;
          read_at: string | null;
          title: string;
          transaction_id: string | null;
        };
        Insert: {
          body: string;
          created_at?: string;
          data?: Json;
          id?: string;
          kind: Database['public']['Enums']['notification_kind'];
          merchant_id?: string | null;
          profile_id: string;
          program_id?: string | null;
          pushed_at?: string | null;
          read_at?: string | null;
          title: string;
          transaction_id?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          data?: Json;
          id?: string;
          kind?: Database['public']['Enums']['notification_kind'];
          merchant_id?: string | null;
          profile_id?: string;
          program_id?: string | null;
          pushed_at?: string | null;
          read_at?: string | null;
          title?: string;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'programs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'merchant_activity';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_transaction_id_fkey';
            columns: ['transaction_id'];
            isOneToOne: false;
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          deleted_at: string | null;
          email: string | null;
          first_name: string;
          id: string;
          is_platform_admin: boolean;
          last_name: string;
          locale: string;
          phone: string | null;
          phone_verified_at: string | null;
          public_code: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          first_name?: string;
          id: string;
          is_platform_admin?: boolean;
          last_name?: string;
          locale?: string;
          phone?: string | null;
          phone_verified_at?: string | null;
          public_code: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          first_name?: string;
          id?: string;
          is_platform_admin?: boolean;
          last_name?: string;
          locale?: string;
          phone?: string | null;
          phone_verified_at?: string | null;
          public_code?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      program_progress: {
        Row: {
          created_at: string;
          id: string;
          last_credit_at: string | null;
          lifetime_stamps: number;
          merchant_id: string;
          profile_id: string;
          program_id: string;
          rewards_redeemed: number;
          stamps: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_credit_at?: string | null;
          lifetime_stamps?: number;
          merchant_id: string;
          profile_id: string;
          program_id: string;
          rewards_redeemed?: number;
          stamps?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_credit_at?: string | null;
          lifetime_stamps?: number;
          merchant_id?: string;
          profile_id?: string;
          program_id?: string;
          rewards_redeemed?: number;
          stamps?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'program_progress_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'program_progress_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'program_progress_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'programs';
            referencedColumns: ['id'];
          },
        ];
      };
      programs: {
        Row: {
          border_color: string | null;
          created_at: string;
          description: string | null;
          emoji: string;
          id: string;
          merchant_id: string;
          name: string;
          sort_order: number;
          status: Database['public']['Enums']['program_status'];
          surface_color: string | null;
          threshold: number;
          updated_at: string;
        };
        Insert: {
          border_color?: string | null;
          created_at?: string;
          description?: string | null;
          emoji?: string;
          id?: string;
          merchant_id: string;
          name: string;
          sort_order?: number;
          status?: Database['public']['Enums']['program_status'];
          surface_color?: string | null;
          threshold: number;
          updated_at?: string;
        };
        Update: {
          border_color?: string | null;
          created_at?: string;
          description?: string | null;
          emoji?: string;
          id?: string;
          merchant_id?: string;
          name?: string;
          sort_order?: number;
          status?: Database['public']['Enums']['program_status'];
          surface_color?: string | null;
          threshold?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'programs_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
        ];
      };
      push_tokens: {
        Row: {
          created_at: string;
          device_id: string | null;
          disabled_at: string | null;
          id: string;
          last_seen_at: string;
          platform: string;
          profile_id: string;
          token: string;
        };
        Insert: {
          created_at?: string;
          device_id?: string | null;
          disabled_at?: string | null;
          id?: string;
          last_seen_at?: string;
          platform: string;
          profile_id: string;
          token: string;
        };
        Update: {
          created_at?: string;
          device_id?: string | null;
          disabled_at?: string | null;
          id?: string;
          last_seen_at?: string;
          platform?: string;
          profile_id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      merchant_staff: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          merchant_id: string;
          name: string;
          pin_hash: string;
          revoked_at: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          merchant_id: string;
          name: string;
          pin_hash: string;
          revoked_at?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          merchant_id?: string;
          name?: string;
          pin_hash?: string;
          revoked_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          actor_profile_id: string;
          actor_staff_id: string | null;
          client_request_id: string;
          created_at: string;
          delta: number;
          id: string;
          kind: Database['public']['Enums']['transaction_kind'];
          merchant_id: string;
          note: string | null;
          profile_id: string;
          program_id: string;
          reward_label: string | null;
          source: string;
          stamps_after: number;
          stamps_before: number;
          threshold_at_time: number;
        };
        Insert: {
          actor_profile_id: string;
          actor_staff_id?: string | null;
          client_request_id: string;
          created_at?: string;
          delta: number;
          id?: string;
          kind: Database['public']['Enums']['transaction_kind'];
          merchant_id: string;
          note?: string | null;
          profile_id: string;
          program_id: string;
          reward_label?: string | null;
          source?: string;
          stamps_after: number;
          stamps_before: number;
          threshold_at_time: number;
        };
        Update: {
          actor_profile_id?: string;
          actor_staff_id?: string | null;
          client_request_id?: string;
          created_at?: string;
          delta?: number;
          id?: string;
          kind?: Database['public']['Enums']['transaction_kind'];
          merchant_id?: string;
          note?: string | null;
          profile_id?: string;
          program_id?: string;
          reward_label?: string | null;
          source?: string;
          stamps_after?: number;
          stamps_before?: number;
          threshold_at_time?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_actor_profile_id_fkey';
            columns: ['actor_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_actor_staff_id_fkey';
            columns: ['actor_staff_id'];
            isOneToOne: false;
            referencedRelation: 'merchant_staff';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'programs';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      merchant_activity: {
        Row: {
          actor_staff_id: string | null;
          created_at: string | null;
          delta: number | null;
          first_name: string | null;
          id: string | null;
          kind: Database['public']['Enums']['transaction_kind'] | null;
          last_name: string | null;
          merchant_id: string | null;
          operator_name: string | null;
          profile_id: string | null;
          program_emoji: string | null;
          program_id: string | null;
          program_name: string | null;
          reward_label: string | null;
          source: string | null;
          stamps_after: number | null;
          stamps_before: number | null;
          threshold_at_time: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'programs';
            referencedColumns: ['id'];
          },
        ];
      };
      merchant_customers: {
        Row: {
          avatar_url: string | null;
          first_name: string | null;
          has_reward_available: boolean | null;
          joined_at: string | null;
          last_activity_at: string | null;
          last_name: string | null;
          merchant_id: string | null;
          profile_id: string | null;
          public_code: string | null;
          rewards_redeemed: number | null;
          total_visits: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'memberships_merchant_id_fkey';
            columns: ['merchant_id'];
            isOneToOne: false;
            referencedRelation: 'merchants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'memberships_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      app_setting_int: {
        Args: { p_default: number; p_key: string };
        Returns: number;
      };
      auth_is_member_of: { Args: { p_merchant: string }; Returns: boolean };
      auth_is_merchant_operator: {
        Args: { p_merchant: string };
        Returns: boolean;
      };
      auth_is_platform_admin: { Args: never; Returns: boolean };
      change_merchant_staff_pin: {
        Args: { p_pin: string; p_staff: string };
        Returns: undefined;
      };
      close_merchant_staff_session: {
        Args: { p_session_token: string };
        Returns: undefined;
      };
      create_merchant_staff: {
        Args: { p_merchant: string; p_name: string; p_pin: string };
        Returns: {
          active: boolean;
          created_at: string;
          id: string;
          merchant_id: string;
          name: string;
          revoked_at: string | null;
          updated_at: string;
        }[];
      };
      create_merchant: {
        Args: {
          p_border_color?: string;
          p_category: Database['public']['Enums']['merchant_category'];
          p_city: string;
          p_logo_url?: string;
          p_name: string;
          p_phone?: string;
          p_program_description?: string;
          p_program_emoji?: string;
          p_program_name: string;
          p_surface_color?: string;
          p_threshold: number;
        };
        Returns: {
          category: Database['public']['Enums']['merchant_category'];
          city: string;
          created_at: string;
          id: string;
          join_code: string;
          logo_url: string | null;
          min_credit_interval_seconds: number | null;
          name: string;
          owner_id: string;
          phone: string | null;
          status: Database['public']['Enums']['merchant_status'];
          timezone: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'merchants';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      credit_visit: {
        Args: {
          p_client_code: string;
          p_count?: number;
          p_program_id: string;
          p_request_id: string;
          p_staff_session_token?: string | null;
        };
        Returns: Database['public']['CompositeTypes']['scan_result'];
        SetofOptions: {
          from: '*';
          to: 'scan_result';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_public_merchant: {
        Args: { p_join_code: string };
        Returns: {
          merchant_category: Database['public']['Enums']['merchant_category'];
          merchant_city: string;
          merchant_id: string;
          merchant_logo_url: string | null;
          merchant_name: string;
          reward_description: string | null;
          reward_emoji: string | null;
          reward_name: string | null;
          reward_threshold: number | null;
        }[];
      };
      join_merchant: {
        Args: { p_join_code: string };
        Returns: Database['public']['CompositeTypes']['join_result'];
        SetofOptions: {
          from: '*';
          to: 'join_result';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      lookup_login_email: { Args: { p_phone: string }; Returns: string };
      list_merchant_staff: {
        Args: { p_merchant: string };
        Returns: {
          active: boolean;
          created_at: string;
          id: string;
          merchant_id: string;
          name: string;
          revoked_at: string | null;
          updated_at: string;
        }[];
      };
      normalize_dz_phone: { Args: { p_phone: string }; Returns: string };
      normalize_stored_phone: { Args: { p_phone: string }; Returns: string };
      merchant_day_bounds: {
        Args: { p_merchant: string };
        Returns: {
          day_end: string;
          day_start: string;
        }[];
      };
      merchant_stats: {
        Args: { p_merchant: string };
        Returns: {
          customers_count: number;
          returning_rate: number;
          rewards_this_month: number;
          scans_today: number;
        }[];
      };
      open_merchant_staff_session: {
        Args: { p_device_label?: string | null; p_merchant: string; p_pin: string };
        Returns: {
          expires_at: string;
          session_token: string;
          staff_id: string;
          staff_name: string;
        }[];
      };
      program_threshold_impact: {
        Args: { p_program_id: string; p_threshold: number };
        Returns: {
          current_threshold: number;
          enrolled_count: number;
          in_progress_count: number;
          requires_warning: boolean;
          would_delay: number;
          would_unlock: number;
        }[];
      };
      random_code: { Args: { p_length: number }; Returns: string };
      redeem_reward: {
        Args: {
          p_client_code: string;
          p_program_id: string;
          p_request_id: string;
          p_staff_session_token?: string | null;
        };
        Returns: Database['public']['CompositeTypes']['scan_result'];
        SetofOptions: {
          from: '*';
          to: 'scan_result';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      redeem_points: {
        Args: {
          p_client_code: string;
          p_program_id: string;
          p_request_id: string;
          p_quantity?: number;
          p_staff_session_token?: string | null;
        };
        Returns: Database['public']['CompositeTypes']['scan_result'];
      };
      resolve_client_for_scan: {
        Args: { p_client_code: string; p_merchant_id: string };
        Returns: {
          client_first_name: string;
          client_joined_at: string;
          client_last_name: string;
          client_profile_id: string;
          client_public_code: string;
          is_enrolled: boolean;
          is_suggested: boolean;
          program_emoji: string;
          program_id: string;
          program_name: string;
          program_threshold: number;
          reward_available: boolean;
          rewards_redeemed: number;
          seconds_until_next_credit: number;
          stamps: number;
          total_visits: number;
        }[];
      };
      set_merchant_staff_active: {
        Args: { p_active: boolean; p_staff: string };
        Returns: undefined;
      };
      set_program_threshold: {
        Args: {
          p_confirmed?: boolean;
          p_program_id: string;
          p_threshold: number;
        };
        Returns: {
          border_color: string | null;
          created_at: string;
          description: string | null;
          emoji: string;
          id: string;
          merchant_id: string;
          name: string;
          sort_order: number;
          status: Database['public']['Enums']['program_status'];
          surface_color: string | null;
          threshold: number;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'programs';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      merchant_category:
        'restaurant' | 'cafe' | 'fast_food' | 'bakery' | 'beauty' | 'retail' | 'other';
      merchant_status: 'active' | 'suspended';
      notification_kind:
        | 'visit_credited'
        | 'reward_unlocked'
        | 'reward_redeemed'
        | 'almost_there'
        | 'system';
      program_status: 'draft' | 'active' | 'archived';
      transaction_kind: 'credit' | 'redeem' | 'adjust';
    };
    CompositeTypes: {
      join_result: {
        merchant_id: string | null;
        merchant_name: string | null;
        merchant_category: Database['public']['Enums']['merchant_category'] | null;
        merchant_city: string | null;
        merchant_logo_url: string | null;
        already_member: boolean | null;
        programs_enrolled: number | null;
      };
      scan_result: {
        transaction_id: string | null;
        merchant_id: string | null;
        program_id: string | null;
        program_name: string | null;
        stamps_after: number | null;
        threshold: number | null;
        reward_available: boolean | null;
        idempotent_replay: boolean | null;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      merchant_category: [
        'restaurant',
        'cafe',
        'fast_food',
        'bakery',
        'beauty',
        'retail',
        'other',
      ],
      merchant_status: ['active', 'suspended'],
      notification_kind: [
        'visit_credited',
        'reward_unlocked',
        'reward_redeemed',
        'almost_there',
        'system',
      ],
      program_status: ['draft', 'active', 'archived'],
      transaction_kind: ['credit', 'redeem', 'adjust'],
    },
  },
} as const;
