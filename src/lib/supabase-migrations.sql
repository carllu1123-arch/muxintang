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

  -- 用户生辰（生命代码/情缘合盘互通用）
  birth_date      date,
  birth_hour      integer check (birth_hour is null or (birth_hour between 0 and 23)),
  gender          text check (gender is null or gender in ('男', '女')),

  -- 时间戳
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 向后兼容：老库升级时补齐生辰字段（IF NOT EXISTS 仅 9.6+ 支持，用 information_schema 兜底）
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'user_profiles' and column_name = 'birth_date') then
    alter table public.user_profiles add column birth_date date;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'user_profiles' and column_name = 'birth_hour') then
    alter table public.user_profiles add column birth_hour integer;
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'user_profiles' and column_name = 'gender') then
    alter table public.user_profiles add column gender text;
  end if;
end $$;

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
-- 3. articles · 密解专栏文章
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

comment on table public.articles is '密解专栏文章（lifecode / habitat / name / teacher）';

-- =====================================================
-- 4. novels · 行者故事（小说章节）
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

comment on table public.novels is '行者故事·小说章节';

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
-- 7.5 calendar_dates · 择日黄历
--   - 数据来源：老黄历数据库（可批量导入 / cron 任务 / 手填）
--   - 前端查询：lib/almanac.ts → lookupAlmanac(dateISO)
--   - 数据空时自动回落 lib/almanac.ts 的 hash 占位实现
-- =====================================================
create table if not exists public.calendar_dates (
  id           bigserial primary key,
  date         date not null unique,         -- YYYY-MM-DD（公历）
  lunar_day    text,                          -- 农历日（"廿三" / "初一"）
  ganzhi_day   text,                          -- 干支日（"甲子"）
  clash        text,                          -- 冲煞（"冲鼠煞北"）
  xing         text check (xing is null or xing in ('金', '木', '水', '火', '土')),
  suitable     text[] not null default '{}',  -- 宜
  unsuitable   text[] not null default '{}',  -- 忌
  hours        jsonb not null default '[]'::jsonb,  -- 12 时辰 [{zhi,name,range,yi,ji,fortune}]
  source       text not null default 'manual',       -- manual / api / imported
  note         text,                          -- 备注
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_calendar_dates_date on public.calendar_dates(date);
create index if not exists idx_calendar_dates_xing on public.calendar_dates(xing);

comment on table public.calendar_dates is
  '择日智选·每日黄历数据；空表时前端自动回落到 hash 占位实现';
comment on column public.calendar_dates.hours is
  '12 时辰：[{zhi,name,range,yi,ji,fortune}] fortune ∈ {吉,平,凶}';

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
    'user_subscriptions',
    'calendar_dates'
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

-- 9.5 calendar_dates：所有人可读，写入仅 service_role（管理员）
alter table public.calendar_dates enable row level security;

create policy "Calendar dates are publicly readable"
  on public.calendar_dates for select using (true);
-- 写入不开放给 anon/authenticated，只能由 service_role 写入
-- （Dify 同步任务 / 管理员后台 / 批量导入脚本）

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

-- =====================================================
-- 13. consultations · 创作者预约（动态主页表单）
--     用户在 /creators/[slug] 提交预约 → 写入此表
--     阿阇梨后台（acharya）查看所有记录，普通用户只看自己的
-- =====================================================
create table if not exists public.consultations (
  id              uuid primary key default uuid_generate_v4(),
  creator_slug    text not null,                 -- 创作者 slug（关联 creators.slug，非外键以免 schema 双向耦合）
  user_id         uuid references auth.users(id) on delete set null,  -- 预约人（可空，允许匿名/未登录）
  user_name       text not null check (length(user_name) between 1 and 64),
  user_contact    text not null check (length(user_contact) between 3 and 128),
  preferred_date  date,
  notes           text check (notes is null or length(notes) <= 500),
  status          text not null default 'pending'
                  check (status in ('pending', 'contacted', 'confirmed', 'completed', 'cancelled')),
  created_at      timestamptz not null default now()
);

-- 索引：按创作者 + 时间倒序查（阿阇梨后台列表）
create index if not exists idx_consultations_creator_created
  on public.consultations (creator_slug, created_at desc);

-- 索引：按预约人 + 时间倒序查（用户个人中心后续可扩展）
create index if not exists idx_consultations_user_created
  on public.consultations (user_id, created_at desc);

-- 索引：按 status 过滤（pending / contacted 看板）
create index if not exists idx_consultations_status
  on public.consultations (status);

-- =====================================================
-- 13.1 RLS 策略
--  a) 任何人（含未登录）可插入（开放预约）
--  b) 用户只能 select 自己的记录（user_id = auth.uid()）
--  c) acharya / admin 角色可查看所有记录
--  d) 状态更新仅 acharya / admin 可操作
-- =====================================================
alter table public.consultations enable row level security;

-- a) INSERT 公开
drop policy if exists consultations_insert_anyone on public.consultations;
create policy consultations_insert_anyone on public.consultations
  for insert
  with check (true);

-- b) SELECT 普通用户仅看自己
drop policy if exists consultations_select_own on public.consultations;
create policy consultations_select_own on public.consultations
  for select
  using (auth.uid() = user_id);

-- c) SELECT acharya / admin 全部可见
drop policy if exists consultations_select_acharya on public.consultations;
create policy consultations_select_acharya on public.consultations
  for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('acharya', 'admin')
    )
  );

-- d) UPDATE 仅 acharya / admin（更新 status）
drop policy if exists consultations_update_acharya on public.consultations;
create policy consultations_update_acharya on public.consultations
  for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('acharya', 'admin')
    )
  );

-- DELETE 全部禁止（数据留痕）
-- （不创建任何 DELETE policy → 默认拒绝）

-- =====================================================
-- 14. analytics_events · 运营埋点（指令二 stats 接口依赖）
--     此表可能已在生产中独立创建；为保证可移植性，这里给出推荐 schema
--     若已存在，请跳过 CREATE 部分，仅补 RLS
-- =====================================================
create table if not exists public.analytics_events (
  id          uuid primary key default uuid_generate_v4(),
  event       text not null,                      -- e.g. 'paywall_triggered'
  source      text,                                -- e.g. 'tools/name'
  user_id     uuid references auth.users(id) on delete set null,
  props       jsonb,                               -- 任意附加维度
  ts          timestamptz not null default now()
);

create index if not exists idx_analytics_events_event
  on public.analytics_events (event);
create index if not exists idx_analytics_events_user
  on public.analytics_events (user_id);
create index if not exists idx_analytics_events_ts
  on public.analytics_events (ts desc);

-- RLS：只允许 service_role 写入（前端只调 POST /api/analytics/event，由后端落库）
alter table public.analytics_events enable row level security;

drop policy if exists analytics_events_no_read on public.analytics_events;
-- 普通用户 / 未登录 不可读（防止数据泄露）
-- 读操作只能通过 service_role key 在后端执行
create policy analytics_events_no_read on public.analytics_events
  for select
  using (false);

drop policy if exists analytics_events_no_write_anon on public.analytics_events;
create policy analytics_events_no_write_anon on public.analytics_events
  for insert
  with check (false);  -- 直连 DB 禁止写入，必须经 API route 转发（带白名单过滤）

-- =====================================================
-- 15. study_posts · 灵性研学发帖（指令四 升级 /study 用）
--     用户通过 /study 上的"记录修行"按钮 → POST /api/study/posts 写入此表
--     与 journal_entries 的区别：
--       - journal_entries 偏"已发布精选"，由后端 / 编辑挑选
--       - study_posts 偏"UGC 实时流"，任何登录/匿名用户都能发
--     字段保持宽松，让前端 mock 兜底也能跑通
-- =====================================================
create table if not exists public.study_posts (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete set null,  -- 发帖人（允许匿名 → null）
  author_name   text not null default '道友' check (length(author_name) between 1 and 32),
  title         text check (title is null or length(title) <= 80),  -- 标题可选
  category      text not null check (category in ('打卡', '感悟', '问答', '分享')),
  body          text not null check (length(body) between 1 and 2000),  -- 正文必填
  like_count    int not null default 0,
  comment_count int not null default 0,
  is_published  boolean not null default true,
  published_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- 索引：按发布时间倒序查（/study 列表流）
create index if not exists idx_study_posts_published
  on public.study_posts (published_at desc);

-- 索引：按分类过滤（打卡 / 感悟 / 问答 / 分享 Tab）
create index if not exists idx_study_posts_category_published
  on public.study_posts (category, published_at desc);

-- 索引：按发贴人查（个人中心后续可扩展"我的发帖"）
create index if not exists idx_study_posts_user
  on public.study_posts (user_id, published_at desc);

-- =====================================================
-- 15.1 RLS 策略
--   a) 任何人（含未登录）可插入（开放发帖）
--   b) 任何人可读 is_published=true 的帖子
--   c) 发帖人本人或 acharya/admin 可 update / delete
-- =====================================================
alter table public.study_posts enable row level security;

drop policy if exists study_posts_insert_anyone on public.study_posts;
create policy study_posts_insert_anyone on public.study_posts
  for insert
  with check (true);

drop policy if exists study_posts_select_published on public.study_posts;
create policy study_posts_select_published on public.study_posts
  for select
  using (is_published = true);

drop policy if exists study_posts_update_owner on public.study_posts;
create policy study_posts_update_owner on public.study_posts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists study_posts_update_acharya on public.study_posts;
create policy study_posts_update_acharya on public.study_posts
  for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('acharya', 'admin')
    )
  );

drop policy if exists study_posts_delete_owner on public.study_posts;
create policy study_posts_delete_owner on public.study_posts
  for delete
  using (auth.uid() = user_id);

drop policy if exists study_posts_delete_acharya on public.study_posts;
create policy study_posts_delete_acharya on public.study_posts
  for delete
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('acharya', 'admin')
    )
  );

-- =====================================================
-- 16. pet_services · 爱宠屋服务登记
--     来源：/pet/liberation（宠物超度）及其他未来服务线
--     字段：
--       id            uuid 主键
--       user_id       uuid 发请奉的 auth 用户（允许匿名 → null）
--       user_name     text 登记人称呼（如「棉棉主人」）
--       pet_name      text 宠物名
--       pet_type      text 宠物种类（猫/狗/兔/...）
--       passed_at     date 宠物去世日期（超度场景用；其他服务可空）
--       blessing_note text 主人家属留言 / 阿阇梨额外回向语
--       service_type  text 服务类型：'liberation' | 'accessories' | 'diet' | 'naming'
--       status        text 处理状态：'pending' | 'in_progress' | 'completed'
--       created_at    timestamptz 提交时间
--     设计原则：
--       - 与 auspicious_orders 同思路：写多读少、状态机推进
--       - 普通用户可插入和查看自己的记录
--       - acharya / admin 可查看所有并修改状态
-- =====================================================
create table if not exists public.pet_services (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete set null,
  user_name     text not null default '善信' check (length(user_name) between 1 and 32),
  pet_name      text not null check (length(pet_name) between 1 and 32),
  pet_type      text not null check (length(pet_type) between 1 and 16),
  passed_at     date,
  blessing_note text check (blessing_note is null or length(blessing_note) <= 500),
  service_type  text not null default 'liberation'
                check (service_type in ('liberation', 'accessories', 'diet', 'naming')),
  status        text not null default 'pending'
                check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at    timestamptz not null default now()
);

-- 索引：按提交时间倒序（后台列表流）
create index if not exists idx_pet_services_created
  on public.pet_services (created_at desc);

-- 索引：按 service_type 过滤（不同服务线统计）
create index if not exists idx_pet_services_type_created
  on public.pet_services (service_type, created_at desc);

-- 索引：按 status 过滤（阿阇梨拉取 pending 数据）
create index if not exists idx_pet_services_status
  on public.pet_services (status, created_at desc);

-- 索引：按 user_id 查（个人中心后续可扩展"我的请奉"）
create index if not exists idx_pet_services_user
  on public.pet_services (user_id, created_at desc);

comment on table public.pet_services is
  '爱宠屋服务登记（宠物超度 / 配饰 / 饮食 / 取名）';

-- =====================================================
-- 16.1 RLS 策略
--   a) 任何人（含未登录）可插入（开放请奉）
--   b) 发请奉人可查看自己的记录
--   c) acharya / admin 可查看所有 + 修改状态
--   d) 发请奉人可取消（update status='cancelled'）自己的记录
-- =====================================================
alter table public.pet_services enable row level security;

drop policy if exists pet_services_insert_anyone on public.pet_services;
create policy pet_services_insert_anyone on public.pet_services
  for insert
  with check (true);

drop policy if exists pet_services_select_own on public.pet_services;
create policy pet_services_select_own on public.pet_services
  for select
  using (auth.uid() = user_id);

drop policy if exists pet_services_select_acharya on public.pet_services;
create policy pet_services_select_acharya on public.pet_services
  for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('acharya', 'admin')
    )
  );

drop policy if exists pet_services_update_acharya on public.pet_services;
create policy pet_services_update_acharya on public.pet_services
  for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('acharya', 'admin')
    )
  );

drop policy if exists pet_services_cancel_own on public.pet_services;
create policy pet_services_cancel_own on public.pet_services
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
