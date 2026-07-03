'use client';

/**
 * 牧心堂 · 爱宠屋 · 宠物超度 · 请奉表单
 *
 * 流程：
 *   1. 表单：宠物名 / 品种 / 去世日期 / 主人家属留言
 *   2. 提交 → POST /api/pet-services
 *   3. 成功 → 弹窗：
 *      "您为爱宠的请奉已记录。阿阇梨将在下一个护摩日，为您的爱宠诵经回向。"
 *   4. 失败 / Supabase 未配置 → 走 mock 兜底（同样弹成功提示）
 *
 * 设计原则：
 *   - 与 /auspicious 的 OrderSection 模式一致
 *   - 移动优先；表单大圆角输入框；金色 focus
 *   - 弹窗黑金磨砂，与已有 BaziModal 风格统一
 */

import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';

/* ============ 类型 ============ */

interface FormState {
  petName: string;
  petType: string;
  passedAt: string;
  userName: string;
  blessingNote: string;
}

const INITIAL: FormState = {
  petName: '',
  petType: '',
  passedAt: '',
  userName: '',
  blessingNote: '',
};

const PET_TYPES = ['猫', '狗', '兔', '仓鼠', '乌龟', '鸟', '其他'];

/* ============ 主组件 ============ */

export default function PetLiberationPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMock, setSuccessMock] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  // ESC 关闭弹窗
  useEffect(() => {
    if (!successOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSuccessOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [successOpen]);

  // 锁滚动
  useEffect(() => {
    if (!successOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [successOpen]);

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function validate(): string | null {
    if (!form.petName.trim()) return '请填写宠物名。';
    if (form.petName.trim().length > 32) return '宠物名不能超过 32 字。';
    if (!form.petType.trim()) return '请选择 / 填写宠物品种。';
    if (form.petType.trim().length > 16) return '品种不能超过 16 字。';
    if (form.passedAt && !/^\d{4}-\d{2}-\d{2}/.test(form.passedAt)) {
      return '日期格式不正确。';
    }
    if (form.userName && form.userName.length > 32) return '登记人称呼不能超过 32 字。';
    if (form.blessingNote.length > 500) return '留言不能超过 500 字。';
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/pet-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: form.userName.trim() || undefined,
          pet_name: form.petName.trim(),
          pet_type: form.petType.trim(),
          passed_at: form.passedAt || undefined,
          blessing_note: form.blessingNote.trim() || undefined,
          service_type: 'liberation',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        mock?: boolean;
        error?: string;
        detail?: string;
        message?: string;
      };

      if (!res.ok || !data.ok) {
        if (data.error === 'rate_limited') {
          setError(data.message || '请稍候再发（5 分钟内最多 3 次）');
        } else {
          setError(data.detail || data.message || '提交失败，请稍后重试');
        }
        return;
      }

      setSuccessMock(!!data.mock);
      setSuccessOpen(true);
      formRef.current?.reset();
      setForm(INITIAL);
    } catch {
      setError('网络异常，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 py-6 md:gap-10 md:py-12">
      <PageHeader
        eyebrow="PET · LIBERATION"
        title="宠物超度"
        subtitle="诵经回向 · 送别有情"
        back={{ href: '/pet', label: '爱宠屋' }}
      />

      {/* 引导短句 */}
      <p className="max-w-2xl text-sm leading-relaxed text-foreground/65 md:text-base">
        牠曾用一生的陪伴，换你一程的安心。
        阿阇梨将在护摩法会上为牠诵经回向，助其离苦得乐。
        请填写以下信息，我们将代为登记。
      </p>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        aria-label="宠物超度请奉"
        className="rounded-2xl border border-primary/30 bg-black/60 p-5 backdrop-blur-md md:p-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* 宠物名 */}
          <label className="block">
            <span className="block text-[10px] tracking-wider text-foreground/60">
              宠物名
              <span className="ml-1 text-primary">*</span>
            </span>
            <input
              type="text"
              value={form.petName}
              maxLength={32}
              disabled={submitting}
              onChange={(e) => setField('petName', e.target.value)}
              placeholder="如：棉棉"
              className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </label>

          {/* 品种 */}
          <label className="block">
            <span className="block text-[10px] tracking-wider text-foreground/60">
              宠物品种
              <span className="ml-1 text-primary">*</span>
            </span>
            <input
              type="text"
              value={form.petType}
              maxLength={16}
              disabled={submitting}
              onChange={(e) => setField('petType', e.target.value)}
              placeholder="如：金毛 / 英短"
              list="pet-type-suggestions"
              className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <datalist id="pet-type-suggestions">
              {PET_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>

          {/* 去世日期 */}
          <label className="block">
            <span className="block text-[10px] tracking-wider text-foreground/60">
              去世日期
              <span className="ml-1 text-foreground/30">（可选）</span>
            </span>
            <input
              type="date"
              value={form.passedAt}
              disabled={submitting}
              onChange={(e) => setField('passedAt', e.target.value)}
              min="1990-01-01"
              max="2100-12-31"
              className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </label>

          {/* 登记人称呼 */}
          <label className="block">
            <span className="flex items-center justify-between text-[10px] tracking-wider text-foreground/60">
              <span>
                登记人称呼
                <span className="ml-1 text-foreground/30">（可选）</span>
              </span>
              <span className="text-[10px] text-foreground/30">
                {form.userName.length}/32
              </span>
            </span>
            <input
              type="text"
              value={form.userName}
              maxLength={32}
              disabled={submitting}
              onChange={(e) => setField('userName', e.target.value)}
              placeholder="如：棉棉主人 / 清和"
              className="mt-1 w-full rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </label>

          {/* 家属留言 */}
          <label className="block md:col-span-2">
            <span className="flex items-center justify-between text-[10px] tracking-wider text-foreground/60">
              <span>
                主人家属留言
                <span className="ml-1 text-foreground/30">（可选 · 愿阿阇梨在法会上额外回向的话语）</span>
              </span>
              <span className="text-[10px] text-foreground/30">
                {form.blessingNote.length}/500
              </span>
            </span>
            <textarea
              value={form.blessingNote}
              rows={4}
              maxLength={500}
              disabled={submitting}
              onChange={(e) => setField('blessingNote', e.target.value)}
              placeholder="如：愿牠来世得安乐，不再受病苦。若有缘，再做我家孩子。"
              className="mt-1 w-full resize-none rounded-lg border border-primary/25 bg-background/70 px-3 py-2.5 text-base text-foreground placeholder:text-foreground/30 focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 flex w-full items-center justify-center gap-2
                     rounded-2xl border border-primary/60 bg-gradient-to-br
                     from-primary via-primary/90 to-primary/70 px-4 py-3
                     font-serif text-base text-background
                     shadow-[0_0_30px_-10px_rgba(212,175,55,0.7)]
                     transition hover:shadow-[0_0_50px_-5px_rgba(212,175,55,0.85)]
                     disabled:cursor-not-allowed disabled:opacity-60
                     md:w-auto md:px-10"
        >
          {submitting ? (
            <>
              <span
                aria-hidden
                className="inline-block h-4 w-4 animate-spin rounded-full
                           border-2 border-background/40 border-t-background"
              />
              提交中…
            </>
          ) : (
            <>🙏 请奉登记 · 求阿阇梨回向</>
          )}
        </button>

        <p className="mt-3 text-center text-[10px] tracking-wider text-foreground/40">
          · 一切供养，以心诚为要；请奉信息仅供阿阇梨内部回向使用 ·
        </p>
      </form>

      {/* 黑金成功弹窗 */}
      {successOpen && (
        <SuccessDialog
          isMock={successMock}
          onClose={() => setSuccessOpen(false)}
        />
      )}
    </div>
  );
}

/* ============ 子组件：成功弹窗 ============ */

function SuccessDialog({
  isMock,
  onClose,
}: {
  isMock: boolean;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="请奉登记成功"
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
    >
      <button
        type="button"
        aria-label="关闭弹窗"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      <div
        className="relative z-10 mx-4 mb-4 w-full max-w-sm
                   rounded-2xl border border-primary/40
                   bg-gradient-to-br from-primary/15 via-black/85 to-black
                   p-6 shadow-[0_-20px_60px_-20px_rgba(212,175,55,0.5)]
                   backdrop-blur-xl md:mb-0"
      >
        {/* 装饰光晕 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 left-1/2 h-24 w-24
                     -translate-x-1/2 rounded-full bg-primary/30
                     blur-3xl"
        />

        <div className="relative flex flex-col items-center text-center">
          <span
            aria-hidden
            className="grid h-16 w-16 place-items-center rounded-full
                       border border-primary/50 bg-primary/15
                       font-serif text-3xl text-primary
                       shadow-[0_0_30px_-5px_rgba(212,175,55,0.5)]"
          >
            🙏
          </span>
          <h2 className="mt-4 font-serif text-xl text-foreground md:text-2xl">
            请奉已记录
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80 md:text-base">
            您为爱宠的请奉已记录。
            <span className="mx-1 text-primary">阿阇梨</span>
            将在下一个护摩日，为您的爱宠诵经回向。
          </p>
          {isMock && (
            <p className="mt-2 text-[10px] tracking-wider text-foreground/40">
              · 演示模式（未写入数据库）·
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-lg border border-primary/50
                       bg-primary px-4 py-2.5 font-serif text-sm
                       text-background transition hover:bg-primary/90"
          >
            🙏 愿牠安住光明
          </button>
        </div>
      </div>
    </div>
  );
}
