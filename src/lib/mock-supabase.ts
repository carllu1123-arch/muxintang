/**
 * 本地 Mock Supabase 客户端
 *
 * 用途：在不连真实 Supabase 项目的情况下，让「对话持久化」/「用户角色」等
 *       客户端代码走完 mock 流程，方便在本地联调。
 *
 * 启用方式（.env.local）：
 *   NEXT_PUBLIC_USE_MOCK_SUPABASE=true
 *
 * 浏览器 Console 调试工具：
 *   window.mockSupabase.seedDemo()        // 注入 3 条 mock 消息
 *   window.mockSupabase.clear()           // 清空 mock 数据
 *   window.mockSupabase.whoAmI()          // 打印 mock 用户
 *   window.mockSupabase.listMessages()    // 打印所有 mock 消息
 *   window.mockSupabase.pushMessage({...})// 手动注入一条
 */

export const MOCK_USER_ID = 'mock-user-001';
export const MOCK_USER_EMAIL = 'tester@lingjingge.local';
const LS_MESSAGES_KEY = 'mock_chat_messages_v1';
const LS_TOPICS_KEY = 'mock_topics_v1';

export interface MockMessage {
  id: string;
  user_id: string;
  conversation_id: string;
  chat_type: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface MockTopic {
  id: number;
  user_id: string | null;
  title: string;
  content: string;
  tag: string | null;
  is_pinned: boolean | null;
  is_daily: boolean | null;
  is_weekly: boolean | null;
  is_guide: boolean | null;
  parent_topic_id: number | null;
  is_ai_reply: boolean | null;
  created_at: string;
}

function readStore(): MockMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_MESSAGES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeStore(items: MockMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_MESSAGES_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

/* ============ topics store (mock 模式) ============ */

function readTopics(): MockTopic[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_TOPICS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeTopics(items: MockTopic[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_TOPICS_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

/**
 * 一键植入 3 条置顶帖（与 /api/community/seed 的 SEED_POSTS 对齐）
 *  - 幂等：已存在则跳过（按 title 唯一识别）
 *  - 返回植入结果
 */
export function seedTopics(): { inserted: number; skipped: number; topics: MockTopic[] } {
  const now = Date.now();
  const DAILY_ZEN = '心若止水，波澜不惊。';
  const POSTS: Array<Omit<MockTopic, 'id' | 'created_at'>> = [
    {
      user_id: null,
      title: '【每日参究】今日禅机',
      content: `今日禅机：\n\n${DAILY_ZEN}\n\n---\n愿大家在这一句禅机中，遇见今日的自己。`,
      tag: '心得',
      is_pinned: true,
      is_daily: true,
      is_weekly: false,
      is_guide: false,
      parent_topic_id: null,
      is_ai_reply: false,
    },
    {
      user_id: null,
      title: '【每周话题】聊聊你最近读道德经的感悟',
      content: `各位同修：

本周话题想邀请大家聊聊——你最近在读道德经吗？哪一章让你印象最深？

可以聊聊：
- 哪一句话击中了当下的你？
- 在工作、生活、家庭中如何去行它？
- 有没有想推荐给同修的章节？

格式不限，长短皆可。我们彼此映照，便是最好的共修。

愿大家在分享中相互启发。`,
      tag: '分享',
      is_pinned: true,
      is_daily: false,
      is_weekly: true,
      is_guide: false,
      parent_topic_id: null,
      is_ai_reply: false,
    },
    {
      user_id: null,
      title: '【新手必读】同修社区发帖规则与精华帖评选机制',
      content: `欢迎来到同修社区。这里是一片安静、真实、互相照见的园地。

━━━━━━━━━━━━━━━━━━━━
一、发帖规则
━━━━━━━━━━━━━━━━━━━━
1. 真诚为本：记录真实的修行体会、生活感悟、读书心得。
2. 主题清晰：标题写明主题；内容尽量具体、可读。
3. 分类准确：发布前可让 AI 助手自动识别分类（心得 / 分享 / 求助 / 问卦）。
4. 友善表达：不攻击、不评判；不传播未经证实的"神异"。
5. 隐私自护：避免公开真实姓名、电话、住址等敏感信息。

━━━━━━━━━━━━━━━━━━━━
二、精华帖评选机制
━━━━━━━━━━━━━━━━━━━━
符合以下条件的帖子将有机会被评为"精华"：

- 内容深度：200 字以上，且有独到见解或真实体验
- 体悟结合：把经典语句、修学方法、真实生活三者结合起来
- 引发共鸣：能引起同修们的回应与思考（回复数、喜欢数）
- 形式整洁：段落清晰，无大段无意义重复

精华帖将获得：
- 在精华标签页长期置顶展示
- 作者获得精华徽章（社区身份标签）
- 优先出现在同修助手的推荐位

━━━━━━━━━━━━━━━━━━━━
三、关于 AI 自动回帖
━━━━━━━━━━━━━━━━━━━━
新帖发布后，同修助手会先来一条简短的鼓励性回复，
希望能给作者一点暖意。AI 不会代替同修之间的真实交流，
如果愿意，也欢迎在 AI 回复之外继续和真人同修对话。

━━━━━━━━━━━━━━━━━━━━
四、温馨提示
━━━━━━━━━━━━━━━━━━━━
- 每日参究 每日更新一次
- 每周话题 每周五发布，欢迎提前准备
- 任何问题可在求助分类下发帖
- 看见喜欢的帖子可以点赞 —— 这是最温柔的鼓励

愿你我于此同修路上，互为灯烛。`,
      tag: '心得',
      is_pinned: true,
      is_daily: false,
      is_weekly: false,
      is_guide: true,
      parent_topic_id: null,
      is_ai_reply: false,
    },
  ];

  const existing = readTopics();
  const existingTitles = new Set(existing.map((t) => t.title));
  const next: MockTopic[] = [...existing];
  let inserted = 0;
  let skipped = 0;
  let nextId = existing.reduce((m, t) => Math.max(m, t.id), 0) + 1;

  for (const p of POSTS) {
    if (existingTitles.has(p.title)) {
      skipped++;
      continue;
    }
    next.push({
      ...p,
      id: nextId++,
      created_at: new Date(now).toISOString(),
    });
    inserted++;
  }
  writeTopics(next);
  return { inserted, skipped, topics: next };
}

export function clearTopics(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LS_TOPICS_KEY);
}

export function isMockSupabaseEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const flag = (process as any)?.env?.NEXT_PUBLIC_USE_MOCK_SUPABASE;
  return flag === 'true' || flag === '1';
}

export function getMockUser() {
  return {
    id: MOCK_USER_ID,
    email: MOCK_USER_EMAIL,
    user_metadata: { name: '本地测试用户' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };
}

/**
 * Mock 登出状态：放在 localStorage,跨刷新保持。
 *  - 'signed-in'  → getUser/getSession 返回 mock 用户
 *  - 'signed-out' → 返回 null
 *  - 缺失/损坏   → 默认视为 'signed-in' (向后兼容,避免误清空老用户)
 */
const LS_MOCK_AUTH_KEY = 'mock_supabase_auth_state_v1';

function readMockAuthState(): 'signed-in' | 'signed-out' {
  if (typeof window === 'undefined') return 'signed-in';
  try {
    const v = window.localStorage.getItem(LS_MOCK_AUTH_KEY);
    if (v === 'signed-out') return 'signed-out';
    return 'signed-in';
  } catch {
    return 'signed-in';
  }
}

function writeMockAuthState(s: 'signed-in' | 'signed-out'): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_MOCK_AUTH_KEY, s);
  } catch {
    /* ignore quota */
  }
}

export function mockSignOut(): void {
  writeMockAuthState('signed-out');
}

export function mockSignIn(): void {
  writeMockAuthState('signed-in');
}

export function isMockSignedOut(): boolean {
  return readMockAuthState() === 'signed-out';
}

/**
 * 构造一个最小可用的 queryBuilder mock，覆盖 useAIChat 实际用到的链式调用：
 *   .from('chat_messages').select('id, role, content, created_at')
 *   .eq('user_id', x).eq('conversation_id', x).eq('chat_type', x)
 *   .order('created_at', { ascending: true })
 *   .from('chat_messages').insert({...})
 */
function buildMessagesQuery() {
  const filters: Array<(m: MockMessage) => boolean> = [];
  let order: { col: string; asc: boolean } | null = null;

  const exec = async () => {
    const all = readStore();
    let rows = all.filter((m) => filters.every((f) => f(m)));
    if (order) {
      rows = [...rows].sort((a, b) => {
        const av = (a as any)[order!.col];
        const bv = (b as any)[order!.col];
        if (av < bv) return order!.asc ? -1 : 1;
        if (av > bv) return order!.asc ? 1 : -1;
        return 0;
      });
    }
    return { data: rows, error: null };
  };

  const builder: any = {
    select() {
      return builder;
    },
    eq(col: string, val: any) {
      filters.push((m) => (m as any)[col] === val);
      return builder;
    },
    order(col: string, opts: { ascending?: boolean } = {}) {
      order = { col, asc: opts.ascending !== false };
      return builder;
    },
    single: async () => {
      const { data } = await exec();
      return { data: data?.[0] ?? null, error: null };
    },
    then: (resolve: any, reject: any) => exec().then(resolve, reject),
  };
  return builder;
}

function buildProfilesQuery() {
  // mock: 默认用户为免费用户（测试付费墙用）
  return {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    single: async () => ({
      data: { id: MOCK_USER_ID, role: 'free', email: MOCK_USER_EMAIL },
      error: null,
    }),
  } as any;
}

/**
 * 通用 chainable query builder
 * 覆盖：select / eq / neq / gt / gte / lt / lte / in / is / like / ilike / match / contains / range
 *       order / limit / range-limit / single / maybeSingle
 *       insert / update / delete / upsert
 *       then (thenable，便于 await)
 *
 * 全部最终返回 { data, error }，并按 filters + order 过滤/排序。
 * 注：mock 模式只读 chat_messages（其它表默认空数组）。
 */
function buildGenericTableQuery(table: string) {
  const filters: Array<(row: any) => boolean> = [];
  let orderClause: { col: string; asc: boolean } | null = null;
  let limitN: number | null = null;
  let mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  let pendingPayload: any = null;

  const isMessagesTable = table === 'chat_messages';
  const isTopicsTable = table === 'topics';
  const baseRows = (): any[] => {
    if (isMessagesTable) return readStore();
    if (isTopicsTable) return readTopics();
    return [];
  };

  const persist = (rows: any[]) => {
    if (isMessagesTable) writeStore(rows);
    else if (isTopicsTable) writeTopics(rows as any);
  };

  const execSelect = async () => {
    const base = baseRows();
    let rows = (base as any[]).filter((r) => filters.every((f) => f(r)));
    if (orderClause) {
      const { col, asc } = orderClause;
      rows = [...rows].sort((a, b) => {
        const av = a?.[col];
        const bv = b?.[col];
        if (av == null && bv == null) return 0;
        if (av == null) return asc ? 1 : -1;
        if (bv == null) return asc ? -1 : 1;
        if (av < bv) return asc ? -1 : 1;
        if (av > bv) return asc ? 1 : -1;
        return 0;
      });
    }
    if (limitN != null) rows = rows.slice(0, limitN);
    return { data: rows, error: null };
  };

  const makeChain = (): any => {
    const chain: any = {
      // —— filters ——
      select(_cols?: any) {
        mode = 'select';
        return chain;
      },
      eq(col: string, val: any) {
        filters.push((r) => r?.[col] === val);
        return chain;
      },
      neq(col: string, val: any) {
        filters.push((r) => r?.[col] !== val);
        return chain;
      },
      gt(col: string, val: any) {
        filters.push((r) => r?.[col] != null && r[col] > val);
        return chain;
      },
      gte(col: string, val: any) {
        filters.push((r) => r?.[col] != null && r[col] >= val);
        return chain;
      },
      lt(col: string, val: any) {
        filters.push((r) => r?.[col] != null && r[col] < val);
        return chain;
      },
      lte(col: string, val: any) {
        filters.push((r) => r?.[col] != null && r[col] <= val);
        return chain;
      },
      in(col: string, vals: any[]) {
        const set = new Set(Array.isArray(vals) ? vals : []);
        filters.push((r) => set.has(r?.[col]));
        return chain;
      },
      is(col: string, val: any) {
        // val 通常是 null
        filters.push((r) => r?.[col] === val);
        return chain;
      },
      like(col: string, pattern: string) {
        const re = new RegExp('^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$');
        filters.push((r) => re.test(String(r?.[col] ?? '')));
        return chain;
      },
      ilike(col: string, pattern: string) {
        const re = new RegExp('^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
        filters.push((r) => re.test(String(r?.[col] ?? '')));
        return chain;
      },
      match(obj: Record<string, any>) {
        for (const [k, v] of Object.entries(obj)) {
          filters.push((r) => r?.[k] === v);
        }
        return chain;
      },
      contains(col: string, val: any) {
        filters.push((r) => {
          const v = r?.[col];
          if (Array.isArray(val)) return Array.isArray(v) && val.every((x) => v.includes(x));
          if (typeof val === 'object' && val !== null) {
            return v && Object.entries(val).every(([k, vv]) => v[k] === vv);
          }
          return false;
        });
        return chain;
      },
      range(_from: number, _to: number) {
        // mock 简化：忽略范围
        return chain;
      },

      // —— modifiers ——
      order(col: string, opts: { ascending?: boolean } = {}) {
        orderClause = { col, asc: opts.ascending !== false };
        return chain;
      },
      limit(n: number) {
        limitN = n;
        return chain;
      },

      // —— terminal ——
      single: async () => {
        const { data } = await execSelect();
        return { data: data?.[0] ?? null, error: null };
      },
      maybeSingle: async () => {
        const { data } = await execSelect();
        return { data: data?.[0] ?? null, error: null };
      },

      // —— mutations（mock：chat_messages / topics 持久化；其它表返空） ——
      insert(row: any) {
        mode = 'insert';
        pendingPayload = row;
        if (isMessagesTable) {
          const all = readStore();
          const newRow: MockMessage = {
            id: row?.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            user_id: row?.user_id,
            conversation_id: row?.conversation_id,
            chat_type: row?.chat_type,
            role: row?.role,
            content: row?.content,
            created_at: row?.created_at ?? new Date().toISOString(),
          };
          all.push(newRow);
          writeStore(all);
          return Promise.resolve({ data: [newRow], error: null });
        }
        if (isTopicsTable) {
          const all = readTopics();
          const nextId = all.reduce((m, t) => Math.max(m, t.id), 0) + 1;
          const newRow: MockTopic = {
            id: row?.id ?? nextId,
            user_id: row?.user_id ?? null,
            title: row?.title ?? '',
            content: row?.content ?? '',
            tag: row?.tag ?? '心得',
            is_pinned: row?.is_pinned ?? false,
            is_daily: row?.is_daily ?? false,
            is_weekly: row?.is_weekly ?? false,
            is_guide: row?.is_guide ?? false,
            parent_topic_id: row?.parent_topic_id ?? null,
            is_ai_reply: row?.is_ai_reply ?? false,
            created_at: row?.created_at ?? new Date().toISOString(),
          };
          all.push(newRow);
          writeTopics(all);
          return Promise.resolve({ data: [newRow], error: null });
        }
        return Promise.resolve({ data: row ? [row] : [], error: null });
      },
      update(patch: any) {
        mode = 'update';
        pendingPayload = patch;
        // mock：链式 update 不支持 wait thenable；显式 then 时再 apply
        if (isTopicsTable) {
          const all = readTopics();
          const updated = all.map((r) => {
            if (!filters.every((f) => f(r))) return r;
            return { ...r, ...patch };
          });
          writeTopics(updated);
          return Promise.resolve({ data: updated, error: null });
        }
        return chain;
      },
      upsert(row: any) {
        mode = 'upsert';
        pendingPayload = row;
        if (isTopicsTable) {
          const all = readTopics();
          const idx = all.findIndex((r) => r.id === row?.id);
          if (idx >= 0) {
            all[idx] = { ...all[idx], ...row };
          } else {
            const nextId = all.reduce((m, t) => Math.max(m, t.id), 0) + 1;
            all.push({
              id: row?.id ?? nextId,
              user_id: row?.user_id ?? null,
              title: row?.title ?? '',
              content: row?.content ?? '',
              tag: row?.tag ?? '心得',
              is_pinned: row?.is_pinned ?? false,
              is_daily: row?.is_daily ?? false,
              is_weekly: row?.is_weekly ?? false,
              is_guide: row?.is_guide ?? false,
              parent_topic_id: row?.parent_topic_id ?? null,
              is_ai_reply: row?.is_ai_reply ?? false,
              created_at: row?.created_at ?? new Date().toISOString(),
            });
          }
          writeTopics(all);
          return Promise.resolve({ data: all, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      delete() {
        mode = 'delete';
        if (isTopicsTable) {
          const all = readTopics();
          const kept = all.filter((r) => !filters.every((f) => f(r)));
          writeTopics(kept);
          return Promise.resolve({ data: kept, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },

      // —— thenable：await query 即可得到结果 ——
      then(resolve: any, reject: any) {
        if (mode === 'insert' || mode === 'update' || mode === 'delete' || mode === 'upsert') {
          // 变更类操作已经通过 insert()/update() 链返回了 Promise
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        }
        return execSelect().then(resolve, reject);
      },
    };
    return chain;
  };

  return makeChain();
}

// onAuthStateChange 订阅者集合(mock 模式下手动派发 SIGNED_OUT 事件)
const mockAuthListeners: Set<(event: string, session: any) => void> = new Set();

export const mockSupabaseClient: any = {
  auth: {
    getUser: async () => {
      if (isMockSignedOut()) return { data: { user: null }, error: null };
      return { data: { user: getMockUser() }, error: null };
    },
    getSession: async () => {
      if (isMockSignedOut()) return { data: { session: null }, error: null };
      return {
        data: { session: { user: getMockUser(), access_token: 'mock-token' } },
        error: null,
      };
    },
    signInWithPassword: async () => {
      mockSignIn();
      return {
        data: { user: getMockUser(), session: { access_token: 'mock-token' } },
        error: null,
      };
    },
    signUp: async ({ email }: { email?: string } = {}) => {
      mockSignIn();
      return {
        data: {
          user: { ...getMockUser(), email: email ?? MOCK_USER_EMAIL },
          session: { user: getMockUser(), access_token: 'mock-token' },
        },
        error: null,
      };
    },
    signInWithOAuth: async () => ({
      data: { provider: null, url: null },
      error: null,
    }),
    resend: async () => ({ data: null, error: null }),
    resetPasswordForEmail: async () => ({ data: null, error: null }),
    updateUser: async () => ({ data: { user: getMockUser() }, error: null }),
    signOut: async () => {
      // 真正清空 mock 登录态(写 localStorage 持久化)
      mockSignOut();
      // 手动派发事件,通知所有 onAuthStateChange 订阅者
      try {
        for (const cb of Array.from(mockAuthListeners)) {
          cb('SIGNED_OUT', null);
        }
      } catch {}
      return { error: null };
    },
    onAuthStateChange: (cb: any) => {
      mockAuthListeners.add(cb);
      return {
        data: {
          subscription: {
            unsubscribe: () => mockAuthListeners.delete(cb),
          },
        },
      };
    },
  },
  from(table: string) {
    if (table === 'chat_messages') {
      const q = buildMessagesQuery();
      // 暴露 insert —— useAIChat 调的是 supabase.from('chat_messages').insert(row)
      (q as any).insert = async (row: any) => {
        const all = readStore();
        const newRow: MockMessage = {
          id: row.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          user_id: row.user_id,
          conversation_id: row.conversation_id,
          chat_type: row.chat_type,
          role: row.role,
          content: row.content,
          created_at: row.created_at ?? new Date().toISOString(),
        };
        all.push(newRow);
        writeStore(all);
        return { data: [newRow], error: null };
      };
      return q;
    }
    if (table === 'profiles') {
      return buildProfilesQuery();
    }
    // 其他表（topics / articles / ...）：统一 chainable query builder
    return buildGenericTableQuery(table);
  },
};

/* ============ 浏览器 Console 调试工具 ============ */

export function installMockDevTools(): void {
  if (typeof window === 'undefined') return;
  if (!isMockSupabaseEnabled()) return;
  if ((window as any).__mockInstalled) return;
  (window as any).__mockInstalled = true;

  const api = {
    whoAmI: () => getMockUser(),
    listMessages: () => readStore(),
    clear: () => writeStore([]),
    seedDemo: () => {
      const now = Date.now();
      const demo: MockMessage[] = [
        {
          id: `seed-1`,
          user_id: MOCK_USER_ID,
          conversation_id: 'conv-demo-001',
          chat_type: 'neiguan',
          role: 'user',
          content: '我最近很焦虑，晚上经常失眠。',
          created_at: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
        },
        {
          id: `seed-2`,
          user_id: MOCK_USER_ID,
          conversation_id: 'conv-demo-001',
          chat_type: 'neiguan',
          role: 'assistant',
          content: '焦虑常由心念攀缘而起。建议先观呼吸 108 息，让气沉丹田。',
          created_at: new Date(now - 1000 * 60 * 60 * 24 * 2 + 30000).toISOString(),
        },
        {
          id: `seed-3`,
          user_id: MOCK_USER_ID,
          conversation_id: 'conv-demo-001',
          chat_type: 'neiguan',
          role: 'user',
          content: '好的，我试试。',
          created_at: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
        },
      ];
      writeStore(demo);
      return demo;
    },
    pushMessage: (m: Partial<MockMessage>) => {
      const all = readStore();
      const row: MockMessage = {
        id: m.id ?? `manual-${Date.now()}`,
        user_id: m.user_id ?? MOCK_USER_ID,
        conversation_id: m.conversation_id ?? 'conv-manual',
        chat_type: m.chat_type ?? 'neiguan',
        role: m.role ?? 'user',
        content: m.content ?? '',
        created_at: m.created_at ?? new Date().toISOString(),
      };
      all.push(row);
      writeStore(all);
      return row;
    },
    listTopics: () => readTopics(),
    seedTopics: () => seedTopics(),
    clearTopics: () => clearTopics(),
  };
  (window as any).mockSupabase = api;
}
