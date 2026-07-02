import { BaziToolClient } from '@/components/BaziToolClient';
import { PageHeader } from '@/components/PageHeader';

export const metadata = {
  title: '生命代码 · 牧心堂',
  description: '按生辰解码你的人生注脚',
};

export default function BaziToolPage() {
  return (
    <div className="flex flex-col gap-8 py-6 md:gap-12 md:py-12">
      <PageHeader
        eyebrow="TOOL · BAZI"
        title="生命代码"
        subtitle="按生辰解码你的人生注脚。阿阇梨在屏息聆听。"
        back={{ href: '/tools', label: '智测工具' }}
      />

      <BaziToolClient />
    </div>
  );
}
