'use client';

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { isMockSupabaseEnabled, mockSupabaseClient } from './mock-supabase';

// 获取环境变量
function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

// 延迟初始化 Supabase 客户端
let supabaseInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function getSupabaseClient(): ReturnType<typeof createSupabaseClient<Database>> | null {
  if (typeof window === 'undefined') {
    // 服务端渲染时返回 null，避免在构建时初始化
    return null;
  }
  
  if (!supabaseInstance) {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    
    if (!url || !key) {
      console.warn('Supabase 环境变量未配置');
      return null;
    }
    
    supabaseInstance = createSupabaseClient<Database>(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  }
  
  return supabaseInstance;
}

// 为了向后兼容，导出一个代理对象
// 注：代理的 get 必须返回"可链式调用的对象"（即 from() 返回的对象有 select/eq/... 等方法）
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient<Database>>, {
  get(_target, prop) {
    // 优先使用 mock 客户端（本地无 Supabase 项目时）
    if (isMockSupabaseEnabled()) {
      return (mockSupabaseClient as any)[prop];
    }
    const client = getSupabaseClient();
    if (!client) {
      return makeUnconfiguredProxy();
    }
    return (client as any)[prop];
  },
});

/**
 * 构造一个"未配置"占位 client：
 *  - 任何方法调用都返回可链式 query / auth stub，避免上游 .from(x).select(...).is(...) 链式崩
 *  - 终端方法（single / thenable）返回 { data: null, error }
 */
function makeUnconfiguredProxy(): any {
  const chain = (): any => {
    const fn: any = () => chain();
    Object.assign(fn, {
      select: () => chain(),
      eq: () => chain(),
      neq: () => chain(),
      gt: () => chain(),
      gte: () => chain(),
      lt: () => chain(),
      lte: () => chain(),
      in: () => chain(),
      is: () => chain(),
      like: () => chain(),
      ilike: () => chain(),
      match: () => chain(),
      contains: () => chain(),
      range: () => chain(),
      order: () => chain(),
      limit: () => chain(),
      single: async () => ({ data: null, error: new Error('Supabase 未配置') }),
      maybeSingle: async () => ({ data: null, error: new Error('Supabase 未配置') }),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
      insert: async () => ({ data: null, error: new Error('Supabase 未配置') }),
      update: () => chain(),
      upsert: async () => ({ data: null, error: new Error('Supabase 未配置') }),
      delete: () => chain(),
    });
    return fn;
  };
  return {
    from: chain,
    auth: {
      getUser: async () => ({ data: { user: null }, error: new Error('Supabase 未配置') }),
      getSession: async () => ({ data: { session: null }, error: new Error('Supabase 未配置') }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase 未配置') }),
      signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase 未配置') }),
      signInWithOAuth: async () => ({ data: { provider: null, url: null }, error: new Error('Supabase 未配置') }),
      resend: async () => ({ data: null, error: new Error('Supabase 未配置') }),
      resetPasswordForEmail: async () => ({ data: null, error: new Error('Supabase 未配置') }),
      updateUser: async () => ({ data: { user: null }, error: new Error('Supabase 未配置') }),
      signOut: async () => ({ error: new Error('Supabase 未配置') }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    storage: { from: () => chain() },
    rpc: async () => ({ data: null, error: new Error('Supabase 未配置') }),
  };
}

export function createClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  
  if (!url || !key) {
    throw new Error('Supabase 环境变量未配置');
  }
  
  return createSupabaseClient<Database>(url, key);
}

export function isSupabaseConfigured(): boolean {
  // mock 模式视为「已配置」，让上层逻辑走完持久化流程
  if (typeof window !== 'undefined') {
    const { isMockSupabaseEnabled } = require('./mock-supabase') as typeof import('./mock-supabase');
    if (isMockSupabaseEnabled()) return true;
  }
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/**
 * 测试数据库连接是否可用
 * @returns true 如果连接成功，false 否则
 */
export async function testSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const timeoutPromise = new Promise<boolean>((_, reject) => {
    setTimeout(() => reject(new Error('连接超时')), 5000);
  });

  const testPromise = (async () => {
    try {
      const client = getSupabaseClient();
      if (!client) return false;
      
      await client
        .from('articles')
        .select('id')
        .limit(1);
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await Promise.race([testPromise, timeoutPromise]);
  } catch {
    return false;
  }
}
