-- =====================================================
-- 牧心堂 · Supabase 完整建表 SQL（生产环境）
-- 适用：M1-M3 上线部署
-- =====================================================
--
-- 使用方法：
--   1. 在 supabase.com 新建独立项目（建议命名 muxintang-prod）
--   2. 进入 SQL Editor，把本文件全部内容粘贴进去执行
--   3. Project Settings → API 复制：
--        - URL              → NEXT_PUBLIC_SUPABASE_URL
--        - anon key         → NEXT_PUBLIC_SUPABASE_ANON_KEY
--        - service_role key → SUPABASE_SERVICE_ROLE_KEY
--   4. 填入 muxintang/.env.local
--   5. 启用 Email / OAuth 登录（auth.users 会自动建表，无需手动建）
--
-- 命名约定：
--   - 用户域表统一 user_* 前缀（user_profiles / user_subscriptions）
--   - 内容域表保持单数（articles / novels / creators / journal_entries）
--   - 与 src/types/supabase.ts 中的 Database 类型严格对应
-- =====================================================

-- =====================================================
-- 0. 扩展
-- =====================================================
create extension if not exists "uuid-ossp";   -- uuid_generate_v4()
create extension if not exists "pg_trgm";     -- 模糊搜索（如需）

-- =====================================================
-- 1. user_profiles · 用户档案
--    与 auth.users 1:1 绑定，注册时自动建档
-- =====================================================
create table if not exists public.user_profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null default '清和同修',
  avatar_url      text,
  bio             text,

  -- 会员状态
  tier            text not null default 'free'
                  check (tier in ('free', 'monthly', 'yearly', 'lifetime')),
  tier_expires_at timestamptz,

  -- 积分 / 修行记录
  credits         integer not null default 0 check (credits >= 0),
  practice_days   integer not null default 0 check (practice_days >= 0),

  -- 时间戳
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_user_profiles_tier on public.user_profiles(tier);

comment on table public.user_profiles is
  '牧心堂用户档案（1:1 扩展 Supabase auth.users，注册时由 trigger 自动建）';

-- 注册时自动创建 user_profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', '清和同修')
  )
  on conflict (id) do nothing;     -- 幂等
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- 2. creators · 创作者（阿阇梨 / 居士 / 研究员）
-- =====================================================
create table if not exists public.creators (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,                 -- URL 友好 id，如 jiguang
  name          text not null,                        -- 显示名
  honor         text,                                 -- 称号
  lineage       text,                                 -- 法脉
  bio           text not null,
  avatar_glyph  text default '☉',                     -- 玄学头像（用文字符号）
  avatar_url    text,                                 -- 真实头像（OSS 上传后填这里）
  specialties   text[] not null default '{}',
  pricing       jsonb default '{"oneOnOne": null}'::jsonb,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_creators_slug      on public.creators(slug);
create index if not exists idx_creators_published on public.creators(is_published);

comment on table public.creators is '创作者档案（阿阇梨 / 居士 / 研究员）';

-- =====================================================
-- 3. articles · 四学专栏文章
-- =====================================================
create table if not exists public.articles (
  id              uuid primary key default uuid_generate_v4(),
  category        text not null
                  check (category in ('lifecode', 'habitat', 'name', 'teacher')),
  slug            text not null,
  title           text not null,
  subtitle        text,
  body            text not null,                      -- 段落用 \n\n 分隔
  cover_glyph     text default '✦',
  cover_url       text,                               -- 真实封面图（OSS 路径）
  -- 付费控制
  is_free         boolean not null default true,
  tier_required   text not null default 'free'
                  check (tier_required in ('free', 'monthly', 'yearly')),
  -- 关联
  author_id       uuid references public.creators(id) on delete set null,
  published_at    timestamptz not null default now(),
  reading_minutes integer not null default 5,
  -- 统计
  view_count      integer not null default 0,
  like_count      integer not null default 0,
  -- 元
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (category, slug)
);

create index if not exists idx_articles_category  on public.articles(category);
create index if not exists idx_articles_published on public.articles(published_at desc);
create index if not exists idx_articles_tier      on public.articles(tier_required);
create index if not exists idx_articles_search on public.articles
  using gin (to_tsvector('simple',
    coalesce(title, '') || ' ' || coalesce(subtitle, '') || ' ' || coalesce(body, '')));

comment on table public.articles is '四学专栏文章（lifecode / habitat / name / teacher）';

-- =====================================================
-- 4. novels · 文丛（小说章节）
-- =====================================================
create table if not exists public.novels (
  id              uuid primary key default uuid_generate_v4(),
  slug            text unique not null,               -- ch1-the-call
  title           text not null,                      -- 第一卷 · 山门
  subtitle        text,
  body            text not null,
  chapter_index   integer not null unique,            -- 章节序号
  cover_glyph     text default '❡',
  cover_url       text,
  is_free         boolean not null default true,
  tier_required   text not null default 'free'
                  check (tier_required in ('free', 'monthly', 'yearly')),
  author_id       uuid references public.creators(id) on delete set null,
  published_at    timestamptz not null default now(),
  reading_minutes integer not null default 8,
  view_count      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_novels_chapter   on public.novels(chapter_index);
create index if not exists idx_novels_published on public.novels(published_at desc);

comment on table public.novels is '行者文丛·小说章节';

-- =====================================================
-- 5. user_subscriptions · 订阅记录（来自 Polar webhook）
--    前缀 user_ 与 user_profiles 保持命名一致
-- =====================================================
create table if not exists public.user_subscriptions (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid references auth.users(id) on delete cascade not null,

  -- Polar 字段
  polar_id              text unique,                    -- 订阅 ID（去重）
  polar_customer        text,
  polar_product         text,

  -- 状态
  tier                  text not null
                        check (tier in ('monthly', 'yearly', 'lifetime')),
  status                text not null default 'active'
                        check (status in ('active', 'past_due', 'canceled', 'expired')),
  amount_cents          integer,
  currency              text default 'CNY',

  -- 时间
  started_at            timestamptz not null default now(),
  current_period_start  timestamptz not null,
  current_period_end    timestamptz not null,
  canceled_at           timestamptz,

  -- 元
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_user_subs_user   on public.user_subscriptions(user_id);
create index if not exists idx_user_subs_status on public.user_subscriptions(status);

comment on table public.user_subscriptions is '会员订阅记录（来自 Polar 支付 webhook）';

-- 自动同步 user_profiles.tier
create or replace function public.sync_user_profile_tier()
returns trigger as $$
begin
  if new.status = 'active' and new.current_period_end > now() then
    update public.user_profiles
       set tier = new.tier,
           tier_expires_at = new.current_period_end,
           updated_at = now()
     where id = new.user_id;
  elsif new.status in ('canceled', 'expired', 'past_due') then
    update public.user_profiles
       set tier = 'free',
           tier_expires_at = null,
           updated_at = now()
     where id = new.user_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_user_subscription_change on public.user_subscriptions;
create trigger on_user_subscription_change
  after insert or update on public.user_subscriptions
  for each row execute procedure public.sync_user_profile_tier();

-- =====================================================
-- 6. bazi_readings · 八字排盘记录
-- =====================================================
create table if not exists public.bazi_readings (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references auth.users(id) on delete cascade,

  -- 输入
  birth_year        integer not null,
  birth_month       integer not null,
  birth_day         integer not null,
  birth_hour        integer not null,
  gender            text check (gender in ('男', '女')),

  -- 输出
  year_pillar       text not null,
  month_pillar      text not null,
  day_pillar        text not null,
  hour_pillar       text not null,
  day_master        text not null,
  five_elements     jsonb not null,                    -- {金: 0.3, 木: 0.2, ...}
  ten_gods          jsonb not null,
  deity             text,                              -- 唐密本尊
  ai_interpretation text,                              -- Dify 润色后的解读

  -- 元
  created_at        timestamptz not null default now()
);

create index if not exists idx_bazi_user on public.bazi_readings(user_id, created_at desc);

comment on table public.bazi_readings is '生命代码排盘记录（含 AI 解读）';

-- =====================================================
-- 7. journal_entries · 灵性研学随笔
-- =====================================================
create table if not exists public.journal_entries (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade,
  author_name   text not null,                        -- 脱敏后显示名
  type          text not null default '随笔'
                check (type in ('打卡', '随笔', '问答', '分享')),
  title         text not null,
  excerpt       text not null,
  body          text,
  like_count    integer not null default 0,
  comment_count integer not null default 0,
  is_published  boolean not null default true,
  published_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists idx_journal_published on public.journal_entries(published_at desc);
create index if not exists idx_journal_user      on public.journal_entries(user_id);

comment on table public.journal_entries is '灵性研学·用户随笔与打卡';

-- =====================================================
-- 8. 通用：updated_at 自动维护
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
  for t in select unnest(array[
    'user_profiles',
    'creators',
    'articles',
    'novels',
    'user_subscriptions'
  ])
  loop
    execute format('drop trigger if exists trg_touch_%I on public.%I', t, t);
    execute format(
      'create trigger trg_touch_%I before update on public.%I
       for each row execute procedure public.touch_updated_at()',
      t, t
    );
  end loop;
end $$;

-- =====================================================
-- 9. RLS · 行级安全策略
-- =====================================================

-- 9.1 user_profiles：所有人可读，自己可写
alter table public.user_profiles enable row level security;

create policy "User profiles are viewable by everyone"
  on public.user_profiles for select using (true);

create policy "Users can insert their own profile"
  on public.user_profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.user_profiles for update using (auth.uid() = id);

-- 9.2 creators / articles / novels：所有人可读 published 内容
alter table public.creators enable row level security;
alter table public.articles  enable row level security;
alter table public.novels    enable row level security;

create policy "Published creators readable" on public.creators
  for select using (is_published = true);
create policy "Articles readable" on public.articles
  for select using (true);
create policy "Novels readable" on public.novels
  for select using (true);

-- 9.3 journal_entries：所有人可读 published，登录用户可发自己的
alter table public.journal_entries enable row level security;

create policy "Published journal entries readable" on public.journal_entries
  for select using (is_published = true);
create policy "Users can post their own journal" on public.journal_entries
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own journal" on public.journal_entries
  for update using (auth.uid() = user_id);
create policy "Users can delete their own journal" on public.journal_entries
  for delete using (auth.uid() = user_id);

-- 9.4 user_subscriptions / bazi_readings：仅自己可见
alter table public.user_subscriptions enable row level security;
alter table public.bazi_readings      enable row level security;

create policy "Users see their own subscriptions" on public.user_subscriptions
  for select using (auth.uid() = user_id);

create policy "Users see their own bazi readings" on public.bazi_readings
  for select using (auth.uid() = user_id);
create policy "Users can save their own bazi reading" on public.bazi_readings
  for insert with check (auth.uid() = user_id);

-- 9.5 service_role 绕过 RLS 是默认行为
-- 上面写策略只限制 anon/authenticated 角色，service_role 不受限
-- Polar webhook 路由使用 service_role key → 可直接写 user_subscriptions / user_profiles

-- =====================================================
-- 10. 视图：带作者信息
-- =====================================================
create or replace view public.v_articles_with_author as
  select
    a.*,
    c.name         as author_name,
    c.honor        as author_honor,
    c.avatar_glyph as author_glyph,
    c.avatar_url   as author_avatar_url
  from public.articles a
  left join public.creators c on c.id = a.author_id;

create or replace view public.v_novels_with_author as
  select
    n.*,
    c.name         as author_name,
    c.honor        as author_honor,
    c.avatar_glyph as author_glyph,
    c.avatar_url   as author_avatar_url
  from public.novels n
  left join public.creators c on c.id = n.author_id;

-- =====================================================
-- 11. RPC：原子增加 credits（Polar order.paid 用）
-- =====================================================
create or replace function public.increment_credits(
  p_user_id uuid,
  p_delta   integer
) returns integer
language plpgsql
security definer
as $$
declare v_credits integer;
begin
  update public.user_profiles
     set credits = credits + p_delta,
         updated_at = now()
   where id = p_user_id
   returning credits into v_credits;

  return coalesce(v_credits, 0);
end;
$$;

-- =====================================================
-- 12. 完成
-- =====================================================
-- 接下来：
--   1. 在 Supabase Dashboard → Authentication → Providers
--      启用 Email / Google / GitHub OAuth（按需）
--   2. 在 Project Settings → API 拿到 URL + anon key + service_role key
--   3. 填入 muxintang/.env.local
--   4. 在 Polar Dashboard → Webhooks 添加：
--        URL:   https://your-domain.com/api/polar/webhook
--        Event: subscription.created / updated / canceled / revoked
--               order.paid / order.created
--   5. 跑 npm run build → npm run start:standalone
-- =====================================================
