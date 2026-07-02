/**
 * Database 类型 — 与 supabase/migrations 严格对齐
 *
 * 字段 / 类型 / 可空性 / 默认值以最新一次 migrations 为准。
 * 同步机制：每次新增 / 修改 migrations 时同步修改本文件，避免 supabase-js
 * 生成错误的 Insert / Update 类型。
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          role: string;
          created_at: string;
          updated_at: string | null;
          subscription_status: string | null;
          subscription_start: string | null;
          subscription_end: string | null;
          subscription_type: string | null;
          polar_customer_id: string | null;
          invited_by: string | null;
          reward_claimed: boolean | null;
          consent_given_at: string | null;
          consent_version: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string | null;
          subscription_status?: string | null;
          subscription_start?: string | null;
          subscription_end?: string | null;
          subscription_type?: string | null;
          polar_customer_id?: string | null;
          invited_by?: string | null;
          reward_claimed?: boolean | null;
          consent_given_at?: string | null;
          consent_version?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string | null;
          subscription_status?: string | null;
          subscription_start?: string | null;
          subscription_end?: string | null;
          subscription_type?: string | null;
          polar_customer_id?: string | null;
          invited_by?: string | null;
          reward_claimed?: boolean | null;
          consent_given_at?: string | null;
          consent_version?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: string;
          status: string;
          polar_subscription_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan: string;
          status: string;
          polar_subscription_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan?: string;
          status?: string;
          polar_subscription_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          slug: string;
          title: string;
          content: string;
          source: string | null;
          category: 'classics' | 'treasure' | 'essay' | null;
          translation: string | null;
          translated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          content: string;
          source?: string | null;
          category?: 'classics' | 'treasure' | 'essay' | null;
          translation?: string | null;
          translated_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          content?: string;
          source?: string | null;
          category?: 'classics' | 'treasure' | 'essay' | null;
          translation?: string | null;
          translated_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          id: number;
          user_id: string | null;
          title: string;
          content: string;
          created_at: string;
          tag: string | null;
          is_pinned: boolean | null;
          is_daily: boolean | null;
          is_weekly: boolean | null;
          is_guide: boolean | null;
          parent_topic_id: number | null;
          is_ai_reply: boolean | null;
        };
        Insert: {
          id?: number;
          user_id?: string | null;
          title: string;
          content: string;
          created_at?: string;
          tag?: string | null;
          is_pinned?: boolean | null;
          is_daily?: boolean | null;
          is_weekly?: boolean | null;
          is_guide?: boolean | null;
          parent_topic_id?: number | null;
          is_ai_reply?: boolean | null;
        };
        Update: {
          id?: number;
          user_id?: string | null;
          title?: string;
          content?: string;
          created_at?: string;
          tag?: string | null;
          is_pinned?: boolean | null;
          is_daily?: boolean | null;
          is_weekly?: boolean | null;
          is_guide?: boolean | null;
          parent_topic_id?: number | null;
          is_ai_reply?: boolean | null;
        };
        Relationships: [];
      };
      checkins: {
        Row: {
          id: number;
          user_id: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          type: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_points: {
        Row: {
          id: string;
          user_id: string;
          points: number | null;
          sign_in_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          points?: number | null;
          sign_in_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          points?: number | null;
          sign_in_date?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_coins: {
        Row: {
          id: string;
          user_id: string;
          balance: number;
          last_sign_in_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          balance?: number;
          last_sign_in_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          balance?: number;
          last_sign_in_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      report_purchases: {
        Row: {
          id: string;
          user_id: string;
          report_type: string;
          price: number | null;
          purchased_at: string;
          report_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_type: string;
          price?: number | null;
          purchased_at?: string;
          report_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          report_type?: string;
          price?: number | null;
          purchased_at?: string;
          report_id?: string | null;
        };
        Relationships: [];
      };
      promotion_configs: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          discount_type: string;
          discount_value: number;
          start_date: string | null;
          end_date: string | null;
          product_id: string | null;
          max_uses: number | null;
          current_uses: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          discount_type: string;
          discount_value: number;
          start_date?: string | null;
          end_date?: string | null;
          product_id?: string | null;
          max_uses?: number | null;
          current_uses?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          discount_type?: string;
          discount_value?: number;
          start_date?: string | null;
          end_date?: string | null;
          product_id?: string | null;
          max_uses?: number | null;
          current_uses?: number | null;
        };
        Relationships: [];
      };
      free_turns: {
        Row: {
          id: string;
          user_id: string;
          turns: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          turns?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          turns?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          chat_type: string;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id: string;
          chat_type: string;
          role: 'user' | 'assistant';
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string;
          chat_type?: string;
          role?: 'user' | 'assistant';
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_activities: {
        Row: {
          id: string;
          user_id: string;
          activity_type: string;
          activity_date: string;
          metadata: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_type: string;
          activity_date?: string;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_type?: string;
          activity_date?: string;
          metadata?: Record<string, any> | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
