'use client';

/**
 * 牧心堂 · 吉祥馆 · 法本流通
 *
 * 数据源：ARTICLES 中 category 为 'teacher'（阿阇梨开示）或 'lifecode'（经典通论）
 * 展示：grid-cols-1 md:grid-cols-2 网格
 * 交互：点击「📖 免费结缘」→ 直接生成 PDF 下载（不跳转）
 *
 * PDF 生成：jsPDF 黑底金边，A4 纵向，封面 + 正文
 */

import { useState } from 'react';
import { ARTICLES, type Article } from '@/lib/mock-data';

/** 筛选法本：teacher（阿阇梨开示）+ lifecode（经典通论） */
const SCRIPTURES: Article[] = ARTICLES.filter(
  (a) => a.category === 'teacher' || a.category === 'lifecode',
);

const CATEGORY_LABEL: Record<string, string> = {
  teacher: '阿阇梨开示',
  lifecode: '经典通论',
};

interface ScriptureSectionProps {}

export function ScriptureSection(_: ScriptureSectionProps) {
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleDownload(article: Article) {
    if (busySlug) return;
    setBusySlug(article.slug);
    setError(null);
    setDone(null);
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW = 210;
      const pageH = 297;
      const margin = 20;
      const contentW = pageW - margin * 2;

      // ===== 封面：黑底金边 =====
      pdf.setFillColor(10, 10, 10);
      pdf.rect(0, 0, pageW, pageH, 'F');
      // 金色边框
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(0.8);
      pdf.rect(8, 8, pageW - 16, pageH - 16);
      pdf.setLineWidth(0.3);
      pdf.rect(12, 12, pageW - 24, pageH - 24);

      // 封面标题
      pdf.setTextColor(212, 175, 55);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      pdf.text('MUXINTANG', pageW / 2, 60, { align: 'center' });

      pdf.setFontSize(14);
      pdf.setTextColor(245, 230, 200);
      pdf.text(CATEGORY_LABEL[article.category] ?? '法本', pageW / 2, 75, {
        align: 'center',
      });

      // 分隔线
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(0.3);
      pdf.line(margin + 40, 85, pageW - margin - 40, 85);

      // 文章标题（中文用 helvetica 会乱码，这里用拼音/英文兜底，实际项目中应加载中文字体）
      // 由于 jsPDF 默认不含中文字体，我们用 body 的英文部分 + 标题占位
      pdf.setFontSize(20);
      pdf.setTextColor(245, 230, 200);
      const titleLines = pdf.splitTextToSize(article.title, contentW - 40);
      pdf.text(titleLines, pageW / 2, 110, { align: 'center' });

      // 副标题
      if (article.subtitle) {
        pdf.setFontSize(12);
        pdf.setTextColor(180, 160, 130);
        const subLines = pdf.splitTextToSize(article.subtitle, contentW - 60);
        pdf.text(subLines, pageW / 2, 110 + titleLines.length * 10 + 8, {
          align: 'center',
        });
      }

      // 底部水印
      pdf.setFontSize(10);
      pdf.setTextColor(120, 110, 90);
      pdf.text('牧心堂 · 法本流通 · 免费结缘', pageW / 2, pageH - 25, {
        align: 'center',
      });
      pdf.text(`Downloaded: ${new Date().toLocaleDateString('zh-CN')}`, pageW / 2, pageH - 20, {
        align: 'center',
      });

      // ===== 正文页 =====
      pdf.addPage();
      pdf.setFillColor(10, 10, 10);
      pdf.rect(0, 0, pageW, pageH, 'F');
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(0.3);
      pdf.rect(8, 8, pageW - 16, pageH - 16);

      pdf.setTextColor(245, 230, 200);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');

      // 正文（按段落分割）
      const body = article.body.join('\n\n');
      const lines = pdf.splitTextToSize(body, contentW - 10);
      let y = margin + 10;
      const lineH = 7;
      for (const line of lines) {
        if (y > pageH - margin - 10) {
          pdf.addPage();
          pdf.setFillColor(10, 10, 10);
          pdf.rect(0, 0, pageW, pageH, 'F');
          pdf.setDrawColor(212, 175, 55);
          pdf.setLineWidth(0.3);
          pdf.rect(8, 8, pageW - 16, pageH - 16);
          pdf.setTextColor(245, 230, 200);
          pdf.setFontSize(11);
          y = margin + 10;
        }
        pdf.text(line, margin + 5, y);
        y += lineH;
      }

      // 页脚
      pdf.setFontSize(8);
      pdf.setTextColor(100, 90, 70);
      pdf.text('牧心堂 · 法本流通', pageW / 2, pageH - 12, { align: 'center' });

      pdf.save(`${article.title}.pdf`);
      setDone(article.title);
    } catch (e) {
      setError((e as { message?: string })?.message || 'PDF 生成失败');
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <>
      <header className="mb-5">
        <p className="text-[10px] tracking-[0.3em] text-primary/60">
          AUSPICIOUS · SUTRA
        </p>
        <h2 className="mt-1 font-serif text-xl text-foreground md:text-2xl">
          法本流通 · 免费结缘
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/60">
          经书、法本、咒轮，随缘奉送。点击即可下载 PDF 法本。
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-lg border border-accent/40 bg-accent/10 p-2.5 text-xs text-accent">
          ※ {error}
        </p>
      )}

      {done && (
        <p className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs text-primary">
          ✓ 「{done}」已下载，请查收。
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {SCRIPTURES.map((a) => (
          <article
            key={a.slug}
            className="group flex flex-col gap-3 rounded-xl
                       border border-primary/20 bg-black/40 p-5
                       transition hover:border-primary/50 hover:bg-primary/5"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="font-serif text-3xl text-primary/60 transition group-hover:text-primary"
              >
                {a.category === 'teacher' ? '☸' : '☯'}
              </span>
              <div className="flex-1">
                <span className="text-[10px] tracking-[0.2em] text-primary/50">
                  {CATEGORY_LABEL[a.category]}
                </span>
                <h3 className="font-serif text-base text-foreground transition group-hover:text-primary md:text-lg">
                  {a.title}
                </h3>
              </div>
            </div>

            {a.subtitle && (
              <p className="text-xs leading-relaxed text-foreground/60 md:text-sm">
                {a.subtitle}
              </p>
            )}

            <p className="text-[10px] tracking-wider text-foreground/40">
              {a.body.join('').length} 字 · 免费结缘
            </p>

            <button
              type="button"
              onClick={() => void handleDownload(a)}
              disabled={busySlug === a.slug}
              className="mt-auto self-start rounded-lg border border-primary/30
                         bg-primary/5 px-4 py-2 font-serif text-sm text-primary
                         transition hover:border-primary hover:bg-primary/10
                         disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busySlug === a.slug ? '生成中…' : '📖 免费结缘'}
            </button>
          </article>
        ))}
      </div>

      <p className="mt-4 text-[10px] tracking-wider text-foreground/40">
        · 法本随缘奉送 · 仅供个人修学使用 ·
      </p>
    </>
  );
}

export default ScriptureSection;
