/**
 * 牧心堂 · 吉祥馆 (/auspicious)
 *
 * 三个区块：
 *   1. 数字结缘   — AI 曼荼罗壁纸（WallpaperSection 客户端组件）
 *   2. 定制请奉   — 阿阇梨定制请奉表（OrderSection 客户端组件）
 *   3. 法本流通   — 经书法本免费结缘（ScriptureSection 客户端组件，PDF 下载）
 *
 * 风格：黑金磨砂玻璃，与全站一致
 */

import { PageHeader } from '@/components/PageHeader';
import { WallpaperSection } from './WallpaperSection';
import { OrderSection } from './OrderSection';
import { ScriptureSection } from './ScriptureSection';

export const metadata = {
  title: '吉祥馆 · 牧心堂',
  description: '结善缘 · 养心性 — 数字壁纸、阿阇梨定制、法本流通',
};

export default function AuspiciousPage() {
  return (
    <div className="flex flex-col gap-10 py-6 md:gap-16 md:py-12">
      <PageHeader
        eyebrow="AUSPICIOUS"
        title="吉祥馆"
        subtitle="结善缘 · 养心性"
      />

      {/* ============ 区块 1：数字结缘 ============ */}
      <section
        className="rounded-xl border border-primary/20
                   bg-gradient-to-br from-primary/5 via-transparent to-transparent
                   p-6 backdrop-blur-md md:p-8"
      >
        <WallpaperSection />
      </section>

      {/* ============ 区块 2：定制请奉 ============ */}
      <section
        className="rounded-xl border border-primary/20
                   bg-gradient-to-br from-primary/5 via-transparent to-transparent
                   p-6 backdrop-blur-md md:p-8"
      >
        <OrderSection />
      </section>

      {/* ============ 区块 3：法本流通 ============ */}
      <section
        className="rounded-xl border border-primary/20
                   bg-gradient-to-br from-primary/5 via-transparent to-transparent
                   p-6 backdrop-blur-md md:p-8"
      >
        <ScriptureSection />
      </section>
    </div>
  );
}
