import { BaziForm } from '@/components/BaziForm';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: '生命代码 · 牧心堂',
  description: '按生辰解码你的人生注脚',
};

export default function BaziToolPage() {
  return (
    <div className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow="TOOL · BAZI"
        title="生命代码"
        subtitle="输入生辰，看见你的本然频率。"
        back={{ href: '/tools', label: '智测工具' }}
      />

      <BaziForm />
    </div>
  );
}
