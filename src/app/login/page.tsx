import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { LoginForm } from '@/components/LoginForm';

export const metadata = {
  title: '登录 · 牧心堂',
};

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8 py-6 md:py-16">
      <PageHeader eyebrow="SIGN IN" title="登录" subtitle="回到你的修行位" />

      <LoginForm mode="login" />

      <p className="text-center text-sm text-foreground/60">
        还没有账号？{' '}
        <Link
          href="/register"
          className="text-primary transition hover:text-primary/80"
        >
          立即注册
        </Link>
      </p>
    </div>
  );
}
