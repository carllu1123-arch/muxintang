/**
 * 牧心堂 · 创作者个人主页（动态路由）
 *
 * 路由：/creators/[slug]
 *
 * 渲染：
 *   1. 创作者卡片：头像 + 头衔 + 简介 + 擅长领域
 *   2. 预约表单：姓名 / 联系方式 / 期望日期 / 留言备注
 *   3. 提交后弹黑金提示："预约已提交，阿阇梨将在 24 小时内通过您预留的联系方式与您取得联系。"
 *
 * 数据流：
 *   - 服务端预渲染：getCreatorBySlug(slug) → 404 if null
 *   - generateStaticParams 预生成所有 slug（与创作者矩阵联动）
 *   - 客户端表单：fetch POST /api/consultations
 *
 * 静态参数 vs 动态渲染：
 *   - generateStaticParams 已配 → 路由是 SSG（build 时生成）
 *   - 但如果 DB 中新增创作者（未在 build 时拉取），首次访问会按需渲染
 *   - 故保留 export const dynamic = 'force-static' 由 build 决定，避免每次访问打 DB
 */

import { notFound } from 'next/navigation';
import {
  getCreatorBySlug,
  getAllCreatorPaths,
} from '@/lib/data';
import { PageHeader } from '@/components/PageHeader';
import { ConsultationForm } from './ConsultationForm';

export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = 3600; // 1 小时增量重生成

export async function generateStaticParams() {
  const paths = await getAllCreatorPaths();
  return paths.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getCreatorBySlug(slug);
  if (!c) return { title: '创作者未找到 · 牧心堂' };
  return {
    title: `${c.name} · 牧心堂`,
    description: c.bio ?? `${c.name}的创作者主页`,
  };
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const creator = await getCreatorBySlug(slug);
  if (!creator) notFound();

  return (
    <div className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow={`CREATOR · ${(creator.honor ?? '').toUpperCase() || 'TEACHER'}`}
        title={creator.name}
        subtitle={creator.lineage ?? '牧心堂 · 创作者主页'}
      />

      {/* 创作者详情卡 */}
      <section
        className="rounded-2xl border border-primary/30 bg-black/60 p-6
                   shadow-[0_0_60px_-30px_rgba(212,175,55,0.45)]
                   backdrop-blur-md md:p-8"
      >
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <span
            aria-hidden
            className="grid h-24 w-24 shrink-0 place-items-center rounded-full
                       border-2 border-primary/40 bg-background
                       font-serif text-5xl text-primary shadow-[0_0_30px_-10px_rgba(212,175,55,0.4)]
                       md:h-28 md:w-28"
          >
            {creator.avatar_glyph ?? '☸'}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl tracking-wider text-foreground md:text-3xl">
              {creator.name}
            </h1>
            {(creator.honor || creator.lineage) && (
              <p className="mt-1 text-xs tracking-[0.3em] text-primary/70">
                {[creator.honor, creator.lineage].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>

        {creator.bio && (
          <p className="mt-6 text-sm leading-relaxed text-foreground/80 md:text-base">
            {creator.bio}
          </p>
        )}

        {creator.specialties && creator.specialties.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {creator.specialties.map((s) => (
              <li
                key={s}
                className="rounded-full border border-primary/30 bg-primary/5
                           px-3 py-0.5 text-xs text-primary/85"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 预约表单 */}
      <section
        id="consultation"
        aria-label="预约咨询"
        className="rounded-2xl border border-primary/30 bg-black/60 p-6
                   shadow-[0_0_60px_-30px_rgba(212,175,55,0.45)]
                   backdrop-blur-md md:p-8"
      >
        <header className="mb-4">
          <p className="text-[10px] tracking-[0.3em] text-foreground/40">
            CONSULTATION · REQUEST
          </p>
          <h2 className="mt-1 font-serif text-xl text-foreground md:text-2xl">
            预约一对一咨询
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-foreground/60">
            填写下方信息后，{creator.name}（或其同修团队）将在 24 小时内
            通过您预留的联系方式与您取得联系。所有信息仅用于本次咨询，不作他用。
          </p>
        </header>

        <ConsultationForm creatorSlug={slug} creatorName={creator.name} />
      </section>

      <p className="text-xs text-foreground/40">
        · 预约即同意《牧心堂隐私协议》· 不接受任何形式的费用请求 ·
      </p>
    </div>
  );
}
