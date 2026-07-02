import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { LoginForm } from '@/components/LoginForm';

export const metadata = {
  title: '注册 · 牧心堂',
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-8 py-6 md:py-16">
      <PageHeader
        eyebrow="SIGN UP"
        title="注册"
        subtitle="踏入这片安静、真实、互相照见的园地"
      />

      <LoginForm mode="register" />

      <p className="text-center text-sm text-foreground/60">
        已有账号？{' '}
        <Link
          href="/login"
          className="text-primary transition hover:text-primary/80"
        >
          返回登录
        </Link>
      </p>
    </div>
  );
}
