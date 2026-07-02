'use client';

/**
 * 牧心堂 · 吉祥馆 · 第二区块：阿阇梨定制请奉表
 *
 * 交互：
 *   1. 表单：品类下拉 + 收件人 + 地址 + 善信留言
 *   2. 提交 → POST /api/auspicious/order
 *   3. 成功 → 弹窗"您的请奉已记录。阿阇梨将在本月护摩法会上为您及家人统一回向加持。"
 *
 * 零库存：所有品类均为"预订登记"，阿阇梨在法会上统一加持后寄出
 */

import { useState } from 'react';

type ProductType = 'scroll' | 'bracelet' | 'sachet';

interface ProductOption {
  value: ProductType;
  label: string;
  desc: string;
}

const PRODUCTS: ProductOption[] = [
  { value: 'scroll', label: '手书挂画', desc: '阿阇梨亲笔手书经文挂画' },
  { value: 'bracelet', label: '朱砂手串', desc: '朱砂手串，已加持' },
  { value: 'sachet', label: '定制香包', desc: '依五行配比的香药香包' },
];

interface FormState {
  productType: ProductType;
  recipient: string;
  address: string;
  blessingMessage: string;
}

const INITIAL: FormState = {
  productType: 'scroll',
  recipient: '',
  address: '',
  blessingMessage: '',
};

export function OrderSection() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // 前端基础校验
    if (!form.recipient.trim()) {
      setError('请填写收件人姓名');
      return;
    }
    if (!form.address.trim()) {
      setError('请填写收件地址');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const r = await fetch('/api/auspicious/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_type: form.productType,
          recipient: form.recipient.trim(),
          address: form.address.trim(),
          blessing_message: form.blessingMessage.trim(),
        }),
      });
      if (!r.ok) {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      setSuccess(true);
      setForm(INITIAL);
    } catch (e) {
      setError((e as { message?: string })?.message || '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseModal() {
    setSuccess(false);
  }

  return (
    <div>
      <header className="mb-5">
        <p className="text-[10px] tracking-[0.3em] text-primary/60">
          AUSPICIOUS · CUSTOM
        </p>
        <h2 className="mt-1 font-serif text-xl text-foreground md:text-2xl">
          阿阇梨定制 · 请奉登记
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/60">
          零库存预订。阿阇梨将在本月护摩法会上为您及家人统一回向加持后寄出。
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 品类选择 */}
        <div>
          <label className="mb-1.5 block text-xs tracking-wider text-foreground/60">
            请奉品类
          </label>
          <select
            value={form.productType}
            onChange={(e) => setField('productType', e.target.value as ProductType)}
            className="w-full rounded-lg border border-primary/25
                       bg-background/70 px-3 py-2.5 text-sm text-foreground
                       focus:border-primary focus:outline-none"
          >
            {PRODUCTS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label} · {p.desc}
              </option>
            ))}
          </select>
        </div>

        {/* 收件人 */}
        <div>
          <label className="mb-1.5 block text-xs tracking-wider text-foreground/60">
            收件人 <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            value={form.recipient}
            onChange={(e) => setField('recipient', e.target.value)}
            placeholder="如：张道友"
            maxLength={30}
            className="w-full rounded-lg border border-primary/25
                       bg-background/70 px-3 py-2.5 text-sm text-foreground
                       placeholder:text-foreground/30
                       focus:border-primary focus:outline-none"
          />
        </div>

        {/* 地址 */}
        <div>
          <label className="mb-1.5 block text-xs tracking-wider text-foreground/60">
            联系地址 <span className="text-accent">*</span>
          </label>
          <textarea
            value={form.address}
            onChange={(e) => setField('address', e.target.value)}
            placeholder="详细收件地址（省市区 + 门牌号）"
            rows={2}
            maxLength={200}
            className="w-full resize-none rounded-lg border border-primary/25
                       bg-background/70 px-3 py-2.5 text-sm text-foreground
                       placeholder:text-foreground/30
                       focus:border-primary focus:outline-none"
          />
        </div>

        {/* 善信留言 */}
        <div>
          <label className="mb-1.5 block text-xs tracking-wider text-foreground/60">
            善信留言
          </label>
          <textarea
            value={form.blessingMessage}
            onChange={(e) => setField('blessingMessage', e.target.value)}
            placeholder="请阿阇梨为您特别加持些什么？（如：为家人健康、为事业顺缘…）"
            rows={3}
            maxLength={300}
            className="w-full resize-none rounded-lg border border-primary/25
                       bg-background/70 px-3 py-2.5 text-sm text-foreground
                       placeholder:text-foreground/30
                       focus:border-primary focus:outline-none"
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <p className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
            ※ {error}
          </p>
        )}

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-lg bg-primary px-6 py-3
                     font-serif text-sm text-background transition
                     hover:bg-primary/90
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? '登记中…' : '提交请奉登记'}
        </button>
      </form>

      <p className="mt-4 text-[10px] tracking-wider text-foreground/40">
        · 实物将在护摩法会后 7-14 天内寄出 · 法本流通免费结缘，仅收工本 ·
      </p>

      {/* 成功弹窗 */}
      {success && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-black/70 p-4 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-md rounded-2xl
                       border border-primary/40 bg-background p-6
                       shadow-[0_0_60px_-20px_rgba(212,175,55,0.6)] md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              aria-hidden
              className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center
                         rounded-full border border-primary/40 bg-background
                         font-serif text-lg text-primary"
            >
              ☯
            </span>
            <h3 className="font-serif text-lg text-foreground md:text-xl">
              请奉已记录
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-foreground/80">
              您的请奉已记录。阿阇梨将在本月护摩法会上为您及家人统一回向加持。
            </p>
            <p className="mt-2 text-xs text-foreground/50">
              法会圆满后，我们将于 7-14 天内寄出实物。
            </p>
            <button
              type="button"
              onClick={handleCloseModal}
              className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5
                         font-serif text-sm text-background transition
                         hover:bg-primary/90"
            >
              随喜赞叹
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderSection;
