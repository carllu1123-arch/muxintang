'use client';

/**
 * 牧心堂 · 创作者预约表单
 *
 * 位置：/creators/[slug] 页面底部
 *
 * 行为：
 *   1. 收集 姓名 / 联系方式 / 期望日期 / 留言备注
 *   2. 提交时 POST /api/consultations
 *   3. 成功后弹出黑金提示弹窗：
 *      "预约已提交，阿阇梨将在 24 小时内通过您预留的联系方式与您取得联系。"
 *   4. 失败时显示错误提示，不阻塞重试
 *
 * 鉴权：
 *   - 不要求登录（API 端会同时兼容登录/匿名）
 *
 * 节流：
 *   - 后端 5 分钟 3 次（同 IP）；前端提交期间禁用按钮防连点
 *
 * 视觉：
 *   - 移动优先；单列；大圆角输入框；金色 focus
 *   - 弹窗黑金磨砂，与现有 BaziModal 风格统一
 */

import { useEffect, useRef, useState } from 'react';

interface ConsultationFormProps {
  creatorSlug: string;
  creatorName: string;
}

interface ApiResponse {
  ok?: boolean;
  mock?: boolean;
  error?: string;
  detail?: string;
  createdAt?: string;
  id?: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: '信息填写不完整，请检查后再试。',
  invalid_json: '请求格式异常，请刷新页面后重试。',
  creator_not_found: '未找到该创作者，请刷新页面后重试。',
  rate_limited: '提交过于频繁，请 5 分钟后再试。',
  network: '网络异常，请稍后重试。',
};

function errorText(code?: string): string {
  if (!code) return '提交失败，请稍后重试。';
  return ERROR_MESSAGES[code] ?? `提交失败：${code}`;
}

export function ConsultationForm({ creatorSlug, creatorName }: ConsultationFormProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  // ESC 关闭弹窗
  useEffect(() => {
    if (!successOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSuccessOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [successOpen]);

  // 弹窗打开时锁滚动
  useEffect(() => {
    if (!successOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [successOpen]);

  const formRef = useRef<HTMLFormElement>(null);

  function validate(): string | null {
    const n = name.trim();
    const c = contact.trim();
    if (n.length < 1) return '请输入您的姓名。';
    if (n.length > 64) return '姓名长度不能超过 64 字。';
    if (c.length < 3) return '联系方式至少 3 个字符（手机/微信/邮箱）。';
    if (c.length > 128) return '联系方式过长，请检查。';
    if (notes.length > 500) return '留言备注不能超过 500 字。';
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return '日期格式不正确。';
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
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          creatorSlug,
          name: name.trim(),
          contact: contact.trim(),
          date: date || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok || !data.ok) {
        setError(errorText(data.error));
        return;
      }

      setSubmittedAt(data.createdAt ?? new Date().toISOString());
      setSuccessOpen(true);
      // 清空表单
      formRef.current?.reset();
      setName('');
      setContact('');
      setDate('');
      setNotes('');
    } catch (e) {
      setError(errorText('network'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        aria-label={`预约 ${creatorName} 一对一咨询`}
        className="flex flex-col gap-4"
      >
        <Field
          label="姓名"
          required
          value={name}
          onChange={setName}
          placeholder="请输入您的真实姓名"
          maxLength={64}
          disabled={submitting}
        />
        <Field
          label="联系方式"
          required
          value={contact}
          onChange={setContact}
          placeholder="手机号 / 微信 / 邮箱"
          maxLength={128}
          disabled={submitting}
        />
        <Field
          label="期望日期"
          type="date"
          value={date}
          onChange={setDate}
          disabled={submitting}
          hint="可选：希望被联系的大致日期"
        />
        <TextareaField
          label="留言备注"
          value={notes}
          onChange={setNotes}
          placeholder="简单说明您希望咨询的方向（可选）"
          maxLength={500}
          disabled={submitting}
        />

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex items-center justify-center gap-2
                     rounded-lg border border-primary/50 bg-primary
                     px-4 py-3 font-serif text-base text-background
                     shadow-[0_0_30px_-12px_rgba(212,175,55,0.7)]
                     transition hover:bg-primary/90
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Spinner /> 提交中…
            </>
          ) : (
            <>✦ 提交预约</>
          )}
        </button>

        <p className="text-center text-[10px] tracking-wider text-foreground/40">
          · 仅 {creatorName} 及同修团队可见 · 24 小时内回复 ·
        </p>
      </form>

      {/* 黑金成功弹窗 */}
      {successOpen && (
        <SuccessDialog
          creatorName={creatorName}
          submittedAt={submittedAt}
          onClose={() => setSuccessOpen(false)}
        />
      )}
    </>
  );
}

/* ============ 子组件 ============ */

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  maxLength,
  disabled,
  hint,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs tracking-wider text-foreground/60">
        <span>
          {label}
          {required && <span className="ml-1 text-primary">*</span>}
        </span>
        {maxLength && (
          <span className="text-[10px] text-foreground/30">
            {value.length}/{maxLength}
          </span>
        )}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        required={required}
        className="mt-2 w-full rounded-lg border border-primary/25
                   bg-background/60 px-3 py-2.5 text-base text-foreground
                   placeholder:text-foreground/30
                   focus:border-primary focus:outline-none
                   focus:ring-1 focus:ring-primary/40
                   disabled:cursor-not-allowed disabled:opacity-60"
      />
      {hint && (
        <span className="mt-1 block text-[10px] text-foreground/35">
          {hint}
        </span>
      )}
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs tracking-wider text-foreground/60">
        <span>{label}</span>
        {maxLength && (
          <span className="text-[10px] text-foreground/30">
            {value.length}/{maxLength}
          </span>
        )}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        rows={3}
        className="mt-2 w-full resize-none rounded-lg border border-primary/25
                   bg-background/60 px-3 py-2.5 text-base text-foreground
                   placeholder:text-foreground/30
                   focus:border-primary focus:outline-none
                   focus:ring-1 focus:ring-primary/40
                   disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 animate-spin rounded-full
                 border-2 border-background/40 border-t-background"
    />
  );
}

function SuccessDialog({
  creatorName,
  submittedAt,
  onClose,
}: {
  creatorName: string;
  submittedAt: string | null;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="预约提交成功"
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
    >
      {/* 遮罩 */}
      <button
        type="button"
        aria-label="关闭弹窗"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      {/* 弹窗体 */}
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
            ✦
          </span>
          <h2 className="mt-4 font-serif text-xl text-foreground md:text-2xl">
            预约已提交
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/80 md:text-base">
            预约已提交，{creatorName}（或其同修团队）将在
            <span className="mx-1 text-primary">24 小时</span>
            内通过您预留的联系方式与您取得联系。
          </p>
          {submittedAt && (
            <p className="mt-2 text-[10px] tracking-wider text-foreground/40">
              · 提交时间：{new Date(submittedAt).toLocaleString('zh-CN', { hour12: false })} ·
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-lg border border-primary/50
                       bg-primary px-4 py-2.5 font-serif text-sm
                       text-background transition hover:bg-primary/90"
          >
            明白，安心等待
          </button>
        </div>
      </div>
    </div>
  );
}
