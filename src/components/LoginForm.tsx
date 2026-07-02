'use client';

import { useState } from 'react';

interface LoginFormProps {
  mode: 'login' | 'register';
}

/**
 * 牧心堂 · 登录 / 注册 共用表单
 * - 纯前端占位，提交后不连接后端
 * - 移动优先；PC 端单列最大 384px
 */
export function LoginForm({ mode }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('请输入邮箱与密码。');
      return;
    }
    if (mode === 'register' && !agreed) {
      setError('请先同意《用户协议》与《隐私政策》。');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位。');
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        className="rounded-2xl border border-primary/30 bg-muted/40 p-8
                   text-center backdrop-blur-md"
      >
        <p
          aria-hidden
          className="font-serif text-4xl text-primary"
        >
          ☉
        </p>
        <h2 className="mt-4 font-serif text-xl text-foreground md:text-2xl">
          {mode === 'login' ? '已收到登录请求' : '已收到注册申请'}
        </h2>
        <p className="mt-2 text-sm text-foreground/70 md:text-base">
          {mode === 'login'
            ? '请到邮箱点击登录邮件完成验证。'
            : '请到邮箱点击验证链接完成注册。'}
        </p>
        <p className="mt-6 text-[10px] tracking-wider text-foreground/40">
          · 当前为占位流程，邮件功能待 Supabase 接入后实装 ·
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-4
                 rounded-2xl border border-primary/30 bg-black/60
                 p-5 backdrop-blur-md md:p-8"
    >
      <Field
        label="邮箱"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
      />
      <Field
        label="密码"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="至少 6 位"
      />

      {mode === 'register' && (
        <label className="flex items-start gap-2 text-xs text-foreground/70">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-primary/40 bg-background
                       text-primary accent-primary"
          />
          <span>
            我已阅读并同意
            <a className="text-primary hover:underline" href="#">
              《用户协议》
            </a>
            与
            <a className="text-primary hover:underline" href="#">
              《隐私政策》
            </a>
          </span>
        </label>
      )}

      {error && (
        <p className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-2 rounded-lg bg-primary px-4 py-3
                   font-serif text-base text-background transition
                   hover:bg-primary/90"
      >
        {mode === 'login' ? '登 录' : '注 册'}
      </button>

      <p className="text-center text-[10px] tracking-wider text-foreground/40">
        · 占位 UI，后端接入后即可生效 ·
      </p>
    </form>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs tracking-wider text-foreground/60">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-primary/25
                   bg-background/60 px-3 py-2.5 text-base text-foreground
                   placeholder:text-foreground/30
                   focus:border-primary focus:outline-none"
      />
    </label>
  );
}
