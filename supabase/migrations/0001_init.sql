-- =====================================================
-- 牧心堂 · Supabase 初始化 schema
-- 里程碑一：核心内容表 + 用户档案 + 订阅记录
-- =====================================================
-- 使用方法：
--   1. 在 supabase.com 新建独立项目（命名建议 muxintang-prod）
--   2. 进入 SQL Editor，复制本文本执行
--   3. 在 Project Settings → API 复制 URL / anon key / service_role key
--   4. 填入 muxintang/.env.local
-- =====================================================

-- 启用必要的扩展
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";   -- 全文搜索

-- =====================================================
-- 1. profiles · 用户档案（1:1 扩展 auth.users）
-- =====================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default '清和同修',
  avatar_url    text,
  bio           text,
  -- 会员状态
  tier          text not null default 'free'   -- free / monthly / yearly / lifetime
                check (tier in ('free', 'monthly', 'yearly', 'lifetime')),
  tier_expires_at timestamptz,
  -- 积分 / 修行记录
  credits       integer not null default 0,
  practice_days integer not null default 0,
  -- 时间戳
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is '牧心堂用户档案（扩展 Supabase auth.users）';

-- 注册时自动创建 profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', '清和同修'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- 2. creators · 创作者（阿阇梨 / 居士）
-- =====================================================
create table if not exists public.creators (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,         -- URL 友好的 id，如 jiguang
  name          text not null,                -- 显示名
  honor         text,                         -- 称号
  lineage       text,                         -- 法脉
  bio           text not null,
  avatar_glyph  text default '☉',             -- 头像占位字符（用文字作为玄学头像）
  specialties   text[] not null default '{}',
  -- 1v1 咨询定价
  pricing       jsonb default '{"oneOnOne": null}'::jsonb,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_creators_slug on public.creators(slug);
create index if not exists idx_creators_published on public.creators(is_published);

comment on table public.creators is '创作者档案（阿阇梨/居士/研究员）';

-- =====================================================
-- 3. articles · 四学专栏文章
-- =====================================================
create table if not exists public.articles (
  id            uuid primary key default uuid_generate_v4(),
  category      text not null                 -- lifecode / habitat / name / teacher
                check (category in ('lifecode', 'habitat', 'name', 'teacher')),
  slug          text not null,
  title         text not null,
  subtitle      text,
  body          text not null,                -- 段落用 \n\n 分隔
  cover_glyph   text default '✦',
  -- 付费控制
  is_free       boolean not null default true,
  tier_required text not null default 'free'  -- free / monthly / yearly
                check (tier_required in ('free', 'monthly', 'yearly')),
  -- 关联
  author_id     uuid references public.creators(id) on delete set null,
  published_at  timestamptz not null default now(),
  reading_minutes integer not null default 5,
  -- 统计
  view_count    integer not null default 0,
  like_count    integer not null default 0,
  -- 元
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (category, slug)
);

create index if not exists idx_articles_category on public.articles(category);
create index if not exists idx_articles_published on public.articles(published_at desc);
create index if not exists idx_articles_search on public.articles
  using gin (to_tsvector('simple', title || ' ' || coalesce(subtitle, '') || ' ' || body));

comment on table public.articles is '四学专栏文章';

-- =====================================================
-- 4. novels · 文丛（小说 + 章节）
-- =====================================================
create table if not exists public.novels (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,         -- ch1-the-call
  title         text not null,                -- 第一卷 · 山门
  subtitle      text,
  body          text not null,
  chapter_index integer not null,             -- 章节序号
  cover_glyph   text default '❡',
  -- 付费
  is_free       boolean not null default true,
  tier_required text not null default 'free',
  author_id     uuid references public.creators(id) on delete set null,
  published_at  timestamptz not null default now(),
  reading_minutes integer not null default 8,
  view_count    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (chapter_index)
);

create index if not exists idx_novels_chapter on public.novels(chapter_index);
create index if not exists idx_novels_published on public.novels(published_at desc);

comment on table public.novels is '行者文丛·小说章节';

-- =====================================================
-- 5. journal_entries · 灵性研学随笔
-- =====================================================
create table if not exists public.journal_entries (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade,
  author_name   text not null,                -- 脱敏后的显示名（避免直接暴露 auth.users.email）
  type          text not null default '随笔'
                check (type in ('打卡', '随笔', '问答', '分享')),
  title         text not null,
  excerpt       text not null,
  body          text,                         -- 完整内容（详情页用）
  like_count    integer not null default 0,
  comment_count integer not null default 0,
  is_published  boolean not null default true,
  published_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists idx_journal_published on public.journal_entries(published_at desc);
create index if not exists idx_journal_user on public.journal_entries(user_id);

comment on table public.journal_entries is '灵性研学·用户随笔与打卡';

-- =====================================================
-- 6. subscriptions · 订阅记录（来自 Polar webhook）
-- =====================================================
create table if not exists public.subscriptions (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  -- Polar 字段
  polar_id        text unique,                -- Polar 订阅 ID
  polar_customer  text,                       -- Polar 客户 ID
  polar_product   text,                       -- Polar 产品 ID
  -- 状态
  tier            text not null
                  check (tier in ('monthly', 'yearly', 'lifetime')),
  status          text not null default 'active'
                  check (status in ('active', 'past_due', 'canceled', 'expired')),
  amount_cents    integer,                    -- 实际支付（分）
  currency        text default 'CNY',
  -- 时间
  started_at      timestamptz not null default now(),
  current_period_start timestamptz not null,
  current_period_end   timestamptz not null,
  canceled_at     timestamptz,
  -- 元
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

comment on table public.subscriptions is '会员订阅记录（来自 Polar 支付）';

-- 自动更新 profiles.tier
create or replace function public.sync_profile_tier()
returns trigger as $$
begin
  if new.status = 'active' and new.current_period_end > now() then
    update public.profiles
       set tier = new.tier,
           tier_expires_at = new.current_period_end,
           updated_at = now()
     where id = new.user_id;
  elsif new.status in ('canceled', 'expired', 'past_due') then
    update public.profiles
       set tier = 'free',
           tier_expires_at = null,
           updated_at = now()
     where id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_subscription_change on public.subscriptions;
create trigger on_subscription_change
  after insert or update on public.subscriptions
  for each row execute procedure public.sync_profile_tier();

-- =====================================================
-- 7. bazi_readings · 八字排盘记录
-- =====================================================
create table if not exists public.bazi_readings (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade,
  -- 输入
  birth_year      integer not null,
  birth_month     integer not null,
  birth_day       integer not null,
  birth_hour      integer not null,
  gender          text check (gender in ('男', '女')),
  -- 输出
  year_pillar     text not null,
  month_pillar    text not null,
  day_pillar      text not null,
  hour_pillar     text not null,
  day_master      text not null,
  five_elements  jsonb not null,              -- {金: 0.3, 木: 0.2, ...}
  ten_gods       jsonb not null,
  deity          text,                         -- 唐密本尊
  ai_interpretation text,                      -- Dify 润色后的解读
  -- 元
  created_at      timestamptz not null default now()
);

create index if not exists idx_bazi_user on public.bazi_readings(user_id, created_at desc);

comment on table public.bazi_readings is '生命代码排盘记录（含 AI 解读）';

-- =====================================================
-- 8. updated_at 自动维护
-- =====================================================
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array['profiles','creators','articles','novels','subscriptions'])
  loop
    execute format('drop trigger if exists trg_touch_%I on public.%I', t, t);
    execute format('create trigger trg_touch_%I before update on public.%I
                    for each row execute procedure public.touch_updated_at()', t, t);
  end loop;
end $$;

-- =====================================================
-- 9. RLS · 行级安全策略
-- =====================================================

-- profiles：自己可读写，别人只读
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- creators / articles / novels / journal：所有人可读 published 内容
alter table public.creators enable row level security;
alter table public.articles enable row level security;
alter table public.novels enable row level security;
alter table public.journal_entries enable row level security;

create policy "Published creators readable" on public.creators
  for select using (is_published = true);
create policy "Published articles readable" on public.articles
  for select using (true);
create policy "Published novels readable" on public.novels
  for select using (true);
create policy "Published journal entries readable" on public.journal_entries
  for select using (is_published = true);

-- journal_entries：登录用户可发自己的
create policy "Users can post their own journal" on public.journal_entries
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own journal" on public.journal_entries
  for update using (auth.uid() = user_id);

-- subscriptions / bazi_readings：只能看自己
alter table public.subscriptions enable row level security;
alter table public.bazi_readings enable row level security;

create policy "Users see their own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "Users see their own bazi readings" on public.bazi_readings
  for select using (auth.uid() = user_id);

-- =====================================================
-- 10. 实用视图：article 详情（带作者信息）
-- =====================================================
create or replace view public.v_articles_with_author as
  select
    a.*,
    c.name as author_name,
    c.honor as author_honor,
    c.avatar_glyph as author_glyph
  from public.articles a
  left join public.creators c on c.id = a.author_id;

create or replace view public.v_novels_with_author as
  select
    n.*,
    c.name as author_name,
    c.honor as author_honor,
    c.avatar_glyph as author_glyph
  from public.novels n
  left join public.creators c on c.id = n.author_id;

-- =====================================================
-- 11. 服务端管理权限（service_role 绕过 RLS 已默认开启）
-- 写操作的 RLS：仅 service_role（用于 webhook 写入 subscriptions）
-- =====================================================

-- =====================================================
-- 完成
-- =====================================================
-- 接下来：
-- 1. 在 supabase.com 创建 muxintang 项目
-- 2. 在 SQL Editor 粘贴本文件执行
-- 3. 拿到 URL / anon key / service_role key
-- 4. 填入 muxintang/.env.local
-- 5. 启用 auth.users trigger（上面已包含）
-- =====================================================
