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

-- ============ 5. user_memories · AI 长期记忆 ============
-- 阿阇梨"记得你"的物理存储：把每次排盘 / 合盘后抽出的核心特征
-- 写入这张表，下次 AI 解读前读取并注入 system_prompt。
--
-- 设计要点：
--   - 1:N（一个 user 可有多种 key 的记忆，如 bazi_profile / match_profile / prefs）
--   - 唯一约束 (user_id, key) → upsert 语义天然正确
--   - content 字段是 JSONB，前端/后端按需取字段
--   - 不写敏感信息（生辰存到 user_profiles，这里只存命盘特征）
create table if not exists public.user_memories (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references auth.users(id) on delete cascade,
  key        text not null,                          -- 如 'bazi_profile' / 'match_profile'
  content    jsonb not null default '{}'::jsonb,     -- 结构化特征数据
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create index if not exists idx_user_memories_user
  on public.user_memories(user_id, updated_at desc);

create index if not exists idx_user_memories_user_key
  on public.user_memories(user_id, key, updated_at desc);

comment on table public.user_memories is
  'AI 长期记忆：阿阇梨的跨会话记忆（命盘特征 / 用户偏好 / 关键事实）';

-- updated_at 自动维护
create or replace function public.touch_user_memories_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_memories_touch on public.user_memories;
create trigger trg_user_memories_touch
  before update on public.user_memories
  for each row execute procedure public.touch_user_memories_updated_at();

-- RLS
alter table public.user_memories enable row level security;

-- 用户只读自己的记忆
create policy "users_select_own_memories"
  on public.user_memories for select
  using (auth.uid()::text = user_id);

-- 用户可插入 / 更新自己的记忆（前端或服务端代理均可）
create policy "users_upsert_own_memories"
  on public.user_memories for insert
  with check (auth.uid()::text = user_id);

create policy "users_update_own_memories"
  on public.user_memories for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- 用户可删除自己的记忆（GDPR / 隐私需要）
create policy "users_delete_own_memories"
  on public.user_memories for delete
  using (auth.uid()::text = user_id);
