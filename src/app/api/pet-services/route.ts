/**
 * 牧心堂 · 爱宠屋 · 服务登记 API
 *
 * POST /api/pet-services             — 提交请奉（任何用户，含匿名）
 *   body: {
 *     user_name?: string,           // 登记人称呼（默认「善信」）
 *     pet_name: string,             // 必填，1-32
 *     pet_type: string,             // 必填，1-16
 *     passed_at?: string (ISO),     // 宠物去世日期（ISO date 字符串）
 *     blessing_note?: string,       // 主人家属留言（≤500）
 *     service_type?: 'liberation' | 'accessories' | 'diet' | 'naming',  // 默认 liberation
 *   }
 *
 *   响应：
 *     201 { ok: true, id, service }
 *     200 { ok: true, mock: true, service }  ← 本地无 Supabase 时的 mock 兜底
 *     400 { ok: false, error: 'invalid_input', detail }
 *     429 { ok: false, error: 'rate_limited' }
 *
 * GET /api/pet-services              — 阿阇梨后台拉取
 *   query:
 *     ?status=pending                // 默认 pending
 *     ?service_type=liberation       // 可选过滤
 *     ?mine=true                     // 只看自己的（普通用户）
 *
 *   响应：
 *     200 { ok: true, services: [...], mock?: boolean }
 *     401 { ok: false, error: 'unauthorized' }  ← 非 acharya 且未带 ?mine=true
 *
 * 设计原则：
 *   - 与 /api/auspicious/order / /api/study/posts 同思路
 *   - 内存级节流（同 IP 5 分钟 3 次，防滥用）
 *   - 未配置 Supabase 时走 mock 兜底（用全局 Map 持久化到内存，开发期可看）
 *   - 鉴权：仅 role='acharya' / 'admin' 可看全量；普通用户只能看自己（auth.uid()=user_id）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase-server';
import { getCurrentSession, isSupabaseAuthConfigured } from '@/lib/session';
import type { PetService } from '@/types/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ============ 类型守卫 ============ */

const VALID_SERVICE_TYPES = ['liberation', 'accessories', 'diet', 'naming'] as const;
type ServiceType = (typeof VALID_SERVICE_TYPES)[number];

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
type ServiceStatus = (typeof VALID_STATUSES)[number];

interface PostBody {
  user_name?: unknown;
  pet_name?: unknown;
  pet_type?: unknown;
  passed_at?: unknown;
  blessing_note?: unknown;
  service_type?: unknown;
}

interface ServiceResponse {
  ok: boolean;
  id?: string;
  service?: PetService;
  services?: PetService[];
  mock?: boolean;
  error?: string;
  detail?: string;
  message?: string;
}

/* ============ 内存级 Mock 兜底（开发期持久化） ============ */

const MOCK_STORE: PetService[] = [];
let mockSeq = 1;

function makeMockService(input: Omit<PetService, 'id' | 'created_at' | 'status'>): PetService {
  const now = new Date().toISOString();
  const s: PetService = {
    id: `mock-pet-${mockSeq++}`,
    user_id: input.user_id,
    user_name: input.user_name,
    pet_name: input.pet_name,
    pet_type: input.pet_type,
    passed_at: input.passed_at,
    blessing_note: input.blessing_note,
    service_type: input.service_type,
    status: 'pending',
    created_at: now,
  };
  MOCK_STORE.unshift(s);
  return s;
}

/* ============ 简易内存节流（同 IP 5 分钟 3 次） ============ */

const RATE_BUCKET = new Map<string, number[]>();
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 3;

function checkRate(ip: string): boolean {
  const now = Date.now();
  const arr = (RATE_BUCKET.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) {
    RATE_BUCKET.set(ip, arr);
    return false;
  }
  arr.push(now);
  RATE_BUCKET.set(ip, arr);
  return true;
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/* ============ POST · 用户提交请奉 ============ */

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // 1) 节流
  if (!checkRate(ip)) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: '请稍候再发（5 分钟内最多 3 次）' },
      { status: 429 },
    );
  }

  // 2) 解析
  let raw: PostBody;
  try {
    raw = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  // 3) 字段校验
  const userName = typeof raw.user_name === 'string' ? raw.user_name.trim() : '';
  const petName = typeof raw.pet_name === 'string' ? raw.pet_name.trim() : '';
  const petType = typeof raw.pet_type === 'string' ? raw.pet_type.trim() : '';
  const passedAtRaw = typeof raw.passed_at === 'string' ? raw.passed_at.trim() : '';
  const blessingNote = typeof raw.blessing_note === 'string' ? raw.blessing_note.trim() : '';
  const serviceTypeRaw = typeof raw.service_type === 'string' ? raw.service_type.trim() : '';

  if (!petName) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: '请填写宠物名。' },
      { status: 400 },
    );
  }
  if (petName.length > 32) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: '宠物名不能超过 32 字。' },
      { status: 400 },
    );
  }
  if (!petType) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: '请填写宠物种类。' },
      { status: 400 },
    );
  }
  if (petType.length > 16) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: '宠物种类不能超过 16 字。' },
      { status: 400 },
    );
  }
  if (userName && userName.length > 32) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: '登记人称呼不能超过 32 字。' },
      { status: 400 },
    );
  }
  if (blessingNote.length > 500) {
    return NextResponse.json(
      { ok: false, error: 'invalid_input', detail: '留言不能超过 500 字。' },
      { status: 400 },
    );
  }

  // passed_at：可空；非空时校验 ISO date 格式
  let passedAt: string | null = null;
  if (passedAtRaw) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(passedAtRaw)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_input', detail: '日期格式不正确（YYYY-MM-DD）。' },
        { status: 400 },
      );
    }
    passedAt = passedAtRaw.slice(0, 10);
  }

  // service_type 白名单
  const serviceType: ServiceType = (
    VALID_SERVICE_TYPES.includes(serviceTypeRaw as ServiceType)
      ? (serviceTypeRaw as ServiceType)
      : 'liberation'
  );

  // 4) 取当前 user_id（如已登录）
  let userId: string | null = null;
  if (isSupabaseAuthConfigured()) {
    try {
      const session = await getCurrentSession();
      userId = session?.userId ?? null;
    } catch {
      userId = null;
    }
  }

  // 5) mock 兜底
  if (!isSupabaseConfigured()) {
    const mock = makeMockService({
      user_id: userId,
      user_name: userName || '善信',
      pet_name: petName,
      pet_type: petType,
      passed_at: passedAt,
      blessing_note: blessingNote || null,
      service_type: serviceType,
    });
    return NextResponse.json(
      { ok: true, mock: true, id: mock.id, service: mock } as ServiceResponse,
      { status: 200 },
    );
  }

  // 6) 写 Supabase
  try {
    const sb = createClient();
    const { data, error } = await sb
      .from('pet_services')
      .insert({
        user_id: userId,
        user_name: userName || '善信',
        pet_name: petName,
        pet_type: petType,
        passed_at: passedAt,
        blessing_note: blessingNote || null,
        service_type: serviceType,
        status: 'pending',
      } as never)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[api/pet-services] insert error:', error);
      return NextResponse.json(
        { ok: false, error: 'db_error', detail: error.message },
        { status: 500 },
      );
    }

    const row = data as PetService | null;
    if (!row) {
      return NextResponse.json(
        { ok: false, error: 'db_error', detail: '写入后未返回记录' },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { ok: true, id: row.id, service: row } as ServiceResponse,
      { status: 201 },
    );
  } catch (e) {
    console.error('[api/pet-services] unexpected:', e);
    return NextResponse.json(
      { ok: false, error: 'server_error', detail: (e as Error).message },
      { status: 500 },
    );
  }
}

/* ============ GET · 阿阇梨后台拉取 ============ */

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const statusParam = sp.get('status') || 'pending';
  const serviceType = sp.get('service_type') || null;
  const mine = sp.get('mine') === 'true';

  if (!VALID_STATUSES.includes(statusParam as ServiceStatus)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_status', detail: 'status 取值不合法' },
      { status: 400 },
    );
  }
  if (serviceType && !VALID_SERVICE_TYPES.includes(serviceType as ServiceType)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_service_type' },
      { status: 400 },
    );
  }

  // 鉴权：非 mine 模式要求 acharya / admin
  let currentUserId: string | null = null;
  let isAcharya = false;
  if (isSupabaseAuthConfigured()) {
    try {
      const session = await getCurrentSession();
      currentUserId = session?.userId ?? null;
      isAcharya = session?.tier === 'lifetime'; // tier=lifetime 视作高级会员（占位）
      // 真正的角色检查走 user_profiles.role
      if (currentUserId && isSupabaseConfigured()) {
        try {
          const sb = createClient();
          const { data: profile } = await (sb.from('user_profiles') as any)
            .select('role')
            .eq('id', currentUserId)
            .maybeSingle();
          const role = (profile as { role?: string } | null)?.role;
          isAcharya = role === 'acharya' || role === 'admin';
        } catch {
          // 查不到就当普通用户
        }
      }
    } catch {
      currentUserId = null;
    }
  }

  if (!mine && !isAcharya) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized', detail: '需要 acharya / admin 角色' },
      { status: 401 },
    );
  }

  // mock 兜底
  if (!isSupabaseConfigured()) {
    let rows = [...MOCK_STORE];
    if (mine && currentUserId) {
      rows = rows.filter((r) => r.user_id === currentUserId);
    }
    rows = rows.filter((r) => r.status === statusParam);
    if (serviceType) {
      rows = rows.filter((r) => r.service_type === serviceType);
    }
    return NextResponse.json({
      ok: true,
      mock: true,
      services: rows,
    } as ServiceResponse);
  }

  // 真 DB 查询
  try {
    const sb = createClient();
    let q = sb
      .from('pet_services')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    q = q.eq('status', statusParam);
    if (serviceType) q = q.eq('service_type', serviceType);
    if (mine && currentUserId) q = q.eq('user_id', currentUserId);

    const { data, error } = await q;
    if (error) {
      console.error('[api/pet-services] get error:', error);
      return NextResponse.json(
        { ok: false, error: 'db_error', detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      services: (data as PetService[]) ?? [],
    } as ServiceResponse);
  } catch (e) {
    console.error('[api/pet-services] get unexpected:', e);
    return NextResponse.json(
      { ok: false, error: 'server_error', detail: (e as Error).message },
      { status: 500 },
    );
  }
}
