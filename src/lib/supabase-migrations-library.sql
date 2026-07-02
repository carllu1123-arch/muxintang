-- ============================================================
-- 牧心堂 · 行者故事 评论与批注系统迁移
--
-- 两张表：
--   1. chapter_comments    — 底部"读后感"留言区
--   2. chapter_annotations — 段落划线批注
--
-- 运行方式：在 Supabase Studio SQL Editor 执行
-- ============================================================

-- ============ 1. chapter_comments ============
CREATE TABLE IF NOT EXISTS public.chapter_comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_slug  text NOT NULL,
  user_id       text REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name   text NOT NULL DEFAULT '匿名道友',
  author_role   text NOT NULL DEFAULT 'reader',  -- reader | acharya
  body          text NOT NULL,
  reading_tag   text,  -- 选填："读到第X段产生此感"
  is_featured   boolean NOT NULL DEFAULT false,  -- 阿阇梨精选置顶
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chapter_comments_slug
  ON public.chapter_comments(chapter_slug);
CREATE INDEX IF NOT EXISTS idx_chapter_comments_featured
  ON public.chapter_comments(chapter_slug, is_featured);
CREATE INDEX IF NOT EXISTS idx_chapter_comments_created_at
  ON public.chapter_comments(chapter_slug, created_at DESC);

-- RLS
ALTER TABLE public.chapter_comments ENABLE ROW LEVEL SECURITY;

-- 所有人可读（公开评论区）
CREATE POLICY "anyone_select_comments"
  ON public.chapter_comments FOR SELECT
  USING (true);

-- 登录用户可留言（user_id 必须等于 auth.uid() 或为 null）
CREATE POLICY "users_insert_comments"
  ON public.chapter_comments FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid()::text = user_id);

-- 用户只能更新自己的留言
CREATE POLICY "users_update_own_comments"
  ON public.chapter_comments FOR UPDATE
  USING (auth.uid()::text = user_id);

-- ============ 2. chapter_annotations ============
CREATE TABLE IF NOT EXISTS public.chapter_annotations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_slug  text NOT NULL,
  paragraph_idx integer NOT NULL,  -- 段落索引（从 0 开始）
  selected_text text NOT NULL,     -- 被选中的原文
  note          text NOT NULL,     -- 读者的批注
  user_id       text REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name   text NOT NULL DEFAULT '匿名道友',
  author_role   text NOT NULL DEFAULT 'reader',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chapter_annotations_slug
  ON public.chapter_annotations(chapter_slug);
CREATE INDEX IF NOT EXISTS idx_chapter_annotations_para
  ON public.chapter_annotations(chapter_slug, paragraph_idx);

-- RLS
ALTER TABLE public.chapter_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_select_annotations"
  ON public.chapter_annotations FOR SELECT
  USING (true);

CREATE POLICY "users_insert_annotations"
  ON public.chapter_annotations FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid()::text = user_id);

-- ============ 3. user_profiles 加 role 字段 ============
-- 如果已存在则跳过
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN role text NOT NULL DEFAULT 'reader';
    -- role: reader | acharya | admin
  END IF;
END $$;

-- ============ 4. user_profiles 加壁纸额度字段 ============
-- 用于吉祥馆壁纸下载的"每月免费额度 + 积分兑换"机制
-- wallpaper_month: 'YYYY-MM' 格式，记录上次免费下载所属月份
-- wallpaper_used:  当月已用免费次数（free 用户每月 1 次免费）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'wallpaper_month'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN wallpaper_month text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'wallpaper_used'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN wallpaper_used integer NOT NULL DEFAULT 0;
  END IF;
END $$;
