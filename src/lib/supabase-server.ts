// 服务端 Supabase 客户端（无 'use client' 指令）
// 仅供 API route / server components / middleware 使用

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

let serviceInstance: SupabaseClient<Database> | null = null;
let anonInstance: SupabaseClient<Database> | null = null;

function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function getSupabaseServiceKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && (getSupabaseAnonKey() || getSupabaseServiceKey()));
}

export function createClient(): SupabaseClient<Database> {
  // 优先用 service_role（可以绕过 RLS），没有则用 anon key
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();
  const anonKey = getSupabaseAnonKey();

  if (!url) {
    throw new Error('Supabase URL 未配置（NEXT_PUBLIC_SUPABASE_URL）');
  }
  if (serviceKey) {
    if (!serviceInstance) {
      serviceInstance = createSupabaseClient<Database>(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    return serviceInstance;
  }
  if (!anonKey) {
    throw new Error('Supabase ANON KEY 未配置（NEXT_PUBLIC_SUPABASE_ANON_KEY）');
  }
  if (!anonInstance) {
    anonInstance = createSupabaseClient<Database>(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return anonInstance;
}
