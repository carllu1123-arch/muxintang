/**
 * 牧心堂 · Supabase Database 类型定义
 *
 * 与 src/lib/supabase-migrations.sql 严格对应。
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
      user_profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          tier: 'free' | 'monthly' | 'yearly' | 'lifetime';
          tier_expires_at: string | null;
          credits: number;
          practice_days: number;
          birth_date: string | null;
          birth_hour: number | null;
          gender: '男' | '女' | null;
          /** 用户角色：reader=普通读者 / acharya=阿阇梨 / admin=管理员 */
          role: 'reader' | 'acharya' | 'admin';
          /** 当月壁纸免费额度所属月份（'YYYY-MM'），null 表示从未用过 */
          wallpaper_month: string | null;
          /** 当月已用免费壁纸次数 */
          wallpaper_used: number;
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
          birth_date?: string | null;
          birth_hour?: number | null;
          gender?: '男' | '女' | null;
          role?: 'reader' | 'acharya' | 'admin';
          wallpaper_month?: string | null;
          wallpaper_used?: number;
        };
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
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
          avatar_url: string | null;
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
          cover_url: string | null;
          is_free: boolean;
          tier_required: 'free' | 'monthly' | 'yearly';
          author_id: string | null;
          published_at: string;
          reading_minutes: number;
          view_count: number;
          like_count: number;
          /** 升维三：AI 引擎摘要（豆包 / Kimi 等大模型抓取用，150-200 字） */
          ai_summary: string | null;
          /** 升维三：结构化标签（3-5 个，写入 JSON-LD keywords） */
          ai_tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['articles']['Row'],
          'id' | 'created_at' | 'updated_at' | 'view_count' | 'like_count' | 'cover_glyph' | 'cover_url'
        > & {
          id?: string;
          cover_glyph?: string;
          cover_url?: string | null;
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
          cover_url: string | null;
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
          'id' | 'created_at' | 'updated_at' | 'view_count' | 'cover_glyph' | 'cover_url'
        > & {
          id?: string;
          cover_glyph?: string;
          cover_url?: string | null;
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
      study_posts: {
        Row: {
          id: string;
          user_id: string | null;
          author_name: string;
          title: string | null;
          category: '打卡' | '感悟' | '问答' | '分享';
          body: string;
          like_count: number;
          comment_count: number;
          is_published: boolean;
          published_at: string;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['study_posts']['Row'],
          'id' | 'created_at' | 'is_published' | 'like_count' | 'comment_count' | 'published_at'
        > & {
          id?: string;
          is_published?: boolean;
          like_count?: number;
          comment_count?: number;
          published_at?: string;
        };
        Update: Partial<Database['public']['Tables']['study_posts']['Insert']>;
        Relationships: [];
      };
      user_subscriptions: {
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
          Database['public']['Tables']['user_subscriptions']['Row'],
          'id' | 'created_at' | 'updated_at' | 'currency' | 'started_at'
        > & {
          id?: string;
          currency?: string;
          started_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_subscriptions']['Insert']>;
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
      calendar_dates: {
        Row: {
          id: number;
          date: string;
          lunar_day: string | null;
          ganzhi_day: string | null;
          clash: string | null;
          xing: '金' | '木' | '水' | '火' | '土' | null;
          suitable: string[];
          unsuitable: string[];
          hours: Json;
          source: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['calendar_dates']['Row'],
          'id' | 'created_at' | 'updated_at' | 'suitable' | 'unsuitable' | 'hours' | 'source'
        > & {
          id?: number;
          suitable?: string[];
          unsuitable?: string[];
          hours?: Json;
          source?: string;
        };
        Update: Partial<Database['public']['Tables']['calendar_dates']['Insert']>;
        Relationships: [];
      };
      auspicious_orders: {
        Row: {
          id: string;
          user_id: string | null;
          product_type: 'scroll' | 'bracelet' | 'sachet';
          recipient: string;
          address: string;
          blessing_message: string | null;
          status:
            | 'pending'
            | 'blessing'
            | 'blessed'
            | 'shipped'
            | 'completed'
            | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          product_type: 'scroll' | 'bracelet' | 'sachet';
          recipient: string;
          address: string;
          blessing_message?: string | null;
          status?:
            | 'pending'
            | 'blessing'
            | 'blessed'
            | 'shipped'
            | 'completed'
            | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['auspicious_orders']['Insert']>;
        Relationships: [];
      };
      user_memories: {
        Row: {
          id: string;
          user_id: string;
          /** 记忆类型键，如 'bazi_profile' / 'match_profile' / 'prefs' */
          key: string;
          /** 结构化记忆内容（JSONB） */
          content: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          key: string;
          content?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_memories']['Insert']>;
        Relationships: [];
      };
      pet_services: {
        Row: {
          id: string;
          user_id: string | null;
          user_name: string;
          pet_name: string;
          pet_type: string;
          passed_at: string | null;
          blessing_note: string | null;
          service_type: 'liberation' | 'accessories' | 'diet' | 'naming';
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['pet_services']['Row'],
          'id' | 'created_at' | 'status' | 'user_name' | 'service_type'
        > & {
          id?: string;
          user_name?: string;
          service_type?: 'liberation' | 'accessories' | 'diet' | 'naming';
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pet_services']['Insert']>;
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
          cover_url: string | null;
          is_free: boolean;
          tier_required: 'free' | 'monthly' | 'yearly';
          author_id: string | null;
          author_name: string | null;
          author_honor: string | null;
          author_glyph: string | null;
          author_avatar_url: string | null;
          published_at: string;
          reading_minutes: number;
          view_count: number;
          like_count: number;
          /** 升维三：AI 引擎摘要（来自 articles.ai_summary） */
          ai_summary: string | null;
          /** 升维三：结构化标签（来自 articles.ai_tags） */
          ai_tags: string[] | null;
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
          cover_glyph: string;
          cover_url: string | null;
          author_id: string | null;
          author_name: string | null;
          author_honor: string | null;
          author_glyph: string | null;
          author_avatar_url: string | null;
          published_at: string;
          reading_minutes: number;
          view_count: number;
          /** 故事类型：serial=长篇连载 / short=短篇精选 */
          story_type: 'serial' | 'short';
        };
      };
    };
    Functions: {
      handle_new_user: { Args: never; Returns: unknown };
      sync_user_profile_tier: { Args: never; Returns: unknown };
      touch_updated_at: { Args: never; Returns: unknown };
      touch_user_memories_updated_at: { Args: never; Returns: unknown };
      increment_credits: { Args: { p_user_id: string; p_delta: number }; Returns: number };
    };
    Enums: Record<string, never>;
  };
}

/* ============ 便捷别名 ============ */

export type Profile = Database['public']['Tables']['user_profiles']['Row'];
export type Creator = Database['public']['Tables']['creators']['Row'];
export type Article = Database['public']['Tables']['articles']['Row'];
export type Novel = Database['public']['Tables']['novels']['Row'];
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row'];
export type StudyPost = Database['public']['Tables']['study_posts']['Row'];
export type Subscription = Database['public']['Tables']['user_subscriptions']['Row'];
export type BaziReading = Database['public']['Tables']['bazi_readings']['Row'];
export type AuspiciousOrder = Database['public']['Tables']['auspicious_orders']['Row'];
export type UserMemory = Database['public']['Tables']['user_memories']['Row'];
export type PetService = Database['public']['Tables']['pet_services']['Row'];

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
