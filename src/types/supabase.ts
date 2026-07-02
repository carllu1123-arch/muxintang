/**
 * 牧心堂 · Supabase Database 类型定义
 *
 * 与 supabase/migrations/0001_init.sql 严格对应。
 * 如改了 schema，请同步更新本文件。
 *
 * 使用方法：
 *   import type { Database } from '@/types/supabase'
 *   const supabase = createClient<Database>(url, key)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          tier: 'free' | 'monthly' | 'yearly' | 'lifetime';
          tier_expires_at: string | null;
          credits: number;
          practice_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          tier?: 'free' | 'monthly' | 'yearly' | 'lifetime';
          tier_expires_at?: string | null;
          credits?: number;
          practice_days?: number;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      creators: {
        Row: {
          id: string;
          slug: string;
          name: string;
          honor: string | null;
          lineage: string | null;
          bio: string;
          avatar_glyph: string;
          specialties: string[];
          pricing: Json | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['creators']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['creators']['Insert']>;
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          category: 'lifecode' | 'habitat' | 'name' | 'teacher';
          slug: string;
          title: string;
          subtitle: string | null;
          body: string;
          cover_glyph: string;
          is_free: boolean;
          tier_required: 'free' | 'monthly' | 'yearly';
          author_id: string | null;
          published_at: string;
          reading_minutes: number;
          view_count: number;
          like_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['articles']['Row'],
          'id' | 'created_at' | 'updated_at' | 'view_count' | 'like_count' | 'cover_glyph'
        > & {
          id?: string;
          cover_glyph?: string;
          view_count?: number;
          like_count?: number;
        };
        Update: Partial<Database['public']['Tables']['articles']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'articles_author_id_fkey';
            columns: ['author_id'];
            referencedRelation: 'creators';
            referencedColumns: ['id'];
          },
        ];
      };
      novels: {
        Row: {
          id: string;
          slug: string;
          title: string;
          subtitle: string | null;
          body: string;
          chapter_index: number;
          cover_glyph: string;
          is_free: boolean;
          tier_required: 'free' | 'monthly' | 'yearly';
          author_id: string | null;
          published_at: string;
          reading_minutes: number;
          view_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['novels']['Row'],
          'id' | 'created_at' | 'updated_at' | 'view_count' | 'cover_glyph'
        > & {
          id?: string;
          cover_glyph?: string;
          view_count?: number;
        };
        Update: Partial<Database['public']['Tables']['novels']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'novels_author_id_fkey';
            columns: ['author_id'];
            referencedRelation: 'creators';
            referencedColumns: ['id'];
          },
        ];
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string | null;
          author_name: string;
          type: '打卡' | '随笔' | '问答' | '分享';
          title: string;
          excerpt: string;
          body: string | null;
          like_count: number;
          comment_count: number;
          is_published: boolean;
          published_at: string;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['journal_entries']['Row'],
          'id' | 'created_at' | 'is_published' | 'like_count' | 'comment_count' | 'published_at'
        > & {
          id?: string;
          is_published?: boolean;
          like_count?: number;
          comment_count?: number;
          published_at?: string;
        };
        Update: Partial<Database['public']['Tables']['journal_entries']['Insert']>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          polar_id: string | null;
          polar_customer: string | null;
          polar_product: string | null;
          tier: 'monthly' | 'yearly' | 'lifetime';
          status: 'active' | 'past_due' | 'canceled' | 'expired';
          amount_cents: number | null;
          currency: string;
          started_at: string;
          current_period_start: string;
          current_period_end: string;
          canceled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['subscriptions']['Row'],
          'id' | 'created_at' | 'updated_at' | 'currency' | 'started_at'
        > & {
          id?: string;
          currency?: string;
          started_at?: string;
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
        Relationships: [];
      };
      bazi_readings: {
        Row: {
          id: string;
          user_id: string | null;
          birth_year: number;
          birth_month: number;
          birth_day: number;
          birth_hour: number;
          gender: '男' | '女' | null;
          year_pillar: string;
          month_pillar: string;
          day_pillar: string;
          hour_pillar: string;
          day_master: string;
          five_elements: Json;
          ten_gods: Json;
          deity: string | null;
          ai_interpretation: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['bazi_readings']['Row'],
          'id' | 'created_at'
        > & { id?: string };
        Update: Partial<Database['public']['Tables']['bazi_readings']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      v_articles_with_author: {
        Row: {
          id: string;
          category: 'lifecode' | 'habitat' | 'name' | 'teacher';
          slug: string;
          title: string;
          subtitle: string | null;
          body: string;
          cover_glyph: string;
          is_free: boolean;
          tier_required: 'free' | 'monthly' | 'yearly';
          author_id: string | null;
          author_name: string | null;
          author_honor: string | null;
          author_glyph: string | null;
          published_at: string;
          reading_minutes: number;
          view_count: number;
          like_count: number;
        };
      };
      v_novels_with_author: {
        Row: {
          id: string;
          slug: string;
          title: string;
          subtitle: string | null;
          body: string;
          chapter_index: number;
          author_id: string | null;
          author_name: string | null;
          author_honor: string | null;
          author_glyph: string | null;
          published_at: string;
          reading_minutes: number;
          view_count: number;
        };
      };
    };
    Functions: {
      handle_new_user: { Args: never; Returns: unknown };
      sync_profile_tier: { Args: never; Returns: unknown };
      touch_updated_at: { Args: never; Returns: unknown };
      increment_credits: { Args: { p_user_id: string; p_delta: number }; Returns: number };
    };
    Enums: Record<string, never>;
  };
}

/* ============ 便捷别名 ============ */

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Creator = Database['public']['Tables']['creators']['Row'];
export type Article = Database['public']['Tables']['articles']['Row'];
export type Novel = Database['public']['Tables']['novels']['Row'];
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type BaziReading = Database['public']['Tables']['bazi_readings']['Row'];

export type UserTier = Profile['tier'];
export type LearnCategory = Article['category'];

/** 带作者信息的文章（来自 v_articles_with_author） */
export type ArticleWithAuthor =
  Database['public']['Views']['v_articles_with_author']['Row'];

/** 带作者信息的小说章节 */
export type NovelWithAuthor =
  Database['public']['Views']['v_novels_with_author']['Row'];

/** 唐密本尊映射（bazi_readings.deity 用） */
export const DEITY_MAP: Record<string, string> = {
  甲: '虚空藏菩萨',
  乙: '文殊菩萨',
  丙: '大日如来',
  丁: '宝生佛',
  戊: '阿弥陀佛',
  己: '观自在菩萨',
  庚: '不动明王',
  辛: '文殊菩萨',
  壬: '普贤菩萨',
  癸: '地藏菩萨',
};

/** 判断用户 tier 是否能访问某 tier_required */
export function canAccessTier(
  userTier: UserTier,
  required: 'free' | 'monthly' | 'yearly',
): boolean {
  if (required === 'free') return true;
  if (userTier === 'lifetime') return true;
  if (userTier === 'yearly') return true;
  if (userTier === 'monthly' && required === 'monthly') return true;
  return false;
}
