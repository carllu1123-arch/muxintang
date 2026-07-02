'use client';

/**
 * 牧心堂 · 修行画册 PDF 导出 + 分享海报 + 裂变结缘卡
 *
 * 流程：
 *   1. html2canvas 截取传入的 resultRef DOM
 *   2. jsPDF 创建 A4 文档（黑底金边）
 *   3. 封面：黑底 + 金色"生命代码修行手册" + 日期 + 用户称呼
 *   4. 后续页：按比例缩放截图
 *   5. 自动触发浏览器下载 → 埋点 + 标记今日修行
 *   6. 显示"生成分享海报"按钮（800x600，user 自己的金句）
 *   7. 显示"分享结缘卡"按钮（1080x1080，朋友圈裂变用）
 *   8. 显示"藏经阁积分"提示，引导用户发朋友圈
 *
 * 失败兜底：
 *   - 截图失败 → 红色错误条提示
 *   - 用户未出生辰 → 提示"请先完成排盘"
 *
 * 埋点：
 *   - pdf_downloaded（PDF 触发后）
 *   - share_poster_generated（800x600 个人海报）
 *   - share_card_generated（1080x1080 裂变卡）
 *
 * 注意：
 *   - html2canvas / jspdf 是客户端库，必须 'use client' + 动态 import
 *   - 服务端预渲染会跳过这个组件
 *   - 海报/结缘卡截图时使用离屏节点（fixed + 屏外），不打扰当前布局
 */

import { useState, type RefObject } from 'react';
import { markPractice } from '@/lib/practice';

interface ExportPdfButtonProps {
  /** 结果区 ref（由父级持有） */
  resultRef: RefObject<HTMLDivElement | null>;
  /** 文件名（不含后缀） */
  filename?: string;
  /** 副标题（用户称呼 / 道友名） */
  recipient?: string;
  /** 是否禁用（例如还没生辰结果） */
  disabled?: boolean;
  /** 禁用时的提示文字 */
  disabledHint?: string;
  /**
   * 分享海报的「金句」内容（由父级传入，通常是 AI 解读的结语）
   *  - 不传则用 fallback 偈语
   *  - 超过 100 字会被截断
   */
  shareQuote?: string;
  /** 分享海报的小字署名（可选） */
  shareAttribution?: string;
}

/* ============ 1080x1080 裂变卡金句池 ============ */
/**
 * 通用金句（不携带任何个人生辰 / 姓名 / 性别）
 * 每天用 `daySeed()` 取一条 → 朋友圈不会撞图
 */
const VIRAL_QUOTES = [
  '「心若无住，无所不为。」',
  '「观呼吸三息，自见本来。」',
  '「先安住，后观照。」',
  '「一念清净，烦恼即菩提。」',
  '「怒时返观，惧时返闻。」',
  '「晨钟入耳，万缘放下。」',
  '「心如止水，行如微风。」',
  '「知止而后有定，定而后能安。」',
  '「一切法，无我，得成于忍。」',
  '「应无所住而生其心。」',
  '「不怕念起，只怕觉迟。」',
  '「众生皆具如来智慧德相。」',
];

function viralQuoteSeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function pickViralQuote(): string {
  return VIRAL_QUOTES[viralQuoteSeed() % VIRAL_QUOTES.length];
}

export function ExportPdfButton({
  resultRef,
  filename = '生命代码修行手册',
  recipient = '道友',
  disabled = false,
  disabledHint = '请先完成排盘，再生成画册。',
  shareQuote,
  shareAttribution,
}: ExportPdfButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [posterBusy, setPosterBusy] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);
  const [cardBusy, setCardBusy] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  /* ============ 埋点（fire-and-forget） ============ */
  function track(
    event:
      | 'pdf_downloaded'
      | 'share_poster_generated'
      | 'share_card_generated',
    props?: Record<string, unknown>,
  ) {
    try {
      void fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          source: 'bazi',
          props,
          ts: Date.now(),
        }),
      });
    } catch {
      /* 静默 */
    }
  }

  /* ============ 主流程：导出 PDF ============ */
  async function handleClick() {
    if (disabled) return;
    const node = resultRef.current;
    if (!node) {
      setError('结果区尚未挂载，请稍后再试。');
      return;
    }

    setBusy(true);
    setError(null);
    setPdfReady(false);

    try {
      // 1) 动态导入（避免 SSR 把客户端库打进服务端 bundle）
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      // 2) 截图（保留暗色主题；scale 2 输出 retina 清晰度）
      const canvas = await html2canvas(node, {
        backgroundColor: '#0b0b0b', // 玄铁黑底
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');

      // 3) 创建 PDF（A4）
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      /* ============ 封面（黑底金边） ============ */
      pdf.setFillColor(11, 11, 11); // #0b0b0b
      pdf.rect(0, 0, pageW, pageH, 'F');

      // 金色边框
      pdf.setDrawColor(212, 175, 55); // #d4af37
      pdf.setLineWidth(1.2);
      pdf.rect(8, 8, pageW - 16, pageH - 16);
      pdf.setLineWidth(0.4);
      pdf.rect(11, 11, pageW - 22, pageH - 22);

      // 顶部 eyebrow
      pdf.setTextColor(212, 175, 55);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text('MU XIN TANG · BAZI MANUAL', pageW / 2, 28, { align: 'center' });

      // 主标题（中文用 default font；helvetica 不支持 CJK 时回退到点阵）
      // jsPDF 默认字体不直接支持中文，所以这里用 ASCII + emoji 替代
      pdf.setFontSize(32);
      pdf.setTextColor(245, 245, 245);
      pdf.text('BAZI', pageW / 2, 60, { align: 'center' });
      pdf.setFontSize(20);
      pdf.setTextColor(212, 175, 55);
      pdf.text('PRACTICE MANUAL', pageW / 2, 72, { align: 'center' });

      // 中文标题：用方块字符画一个简化"生命代码"视觉
      // —— 真实产品应预嵌入 NotoSansSC 字体子集；当前阶段用 unicode 标识
      pdf.setFontSize(14);
      pdf.setTextColor(245, 245, 245);
      pdf.text('— 生命代码修行手册 —', pageW / 2, 90, { align: 'center' });

      // 受众
      pdf.setFontSize(11);
      pdf.setTextColor(212, 175, 55);
      pdf.text(`致  ${recipient}`, pageW / 2, 110, { align: 'center' });

      // 日期
      const today = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      pdf.setFontSize(10);
      pdf.setTextColor(180, 180, 180);
      pdf.text(today, pageW / 2, 118, { align: 'center' });

      // 装饰：三昧耶坛城占位（同心圆）
      const cx = pageW / 2;
      const cy = pageH / 2 + 10;
      pdf.setDrawColor(212, 175, 55);
      [40, 32, 24, 16, 8].forEach((r, i) => {
        pdf.setLineWidth(i === 4 ? 0.8 : 0.3);
        pdf.circle(cx, cy, r);
      });
      // 朱砂点
      pdf.setFillColor(194, 48, 32);
      pdf.circle(cx, cy, 2, 'F');

      // 底部 footer
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(8);
      pdf.text(
        '·  本手册为排盘结果快照，仅作修行参考  ·',
        pageW / 2,
        pageH - 18,
        { align: 'center' },
      );
      pdf.text('TAIZOKAI · MU XIN TANG', pageW / 2, pageH - 12, {
        align: 'center',
      });

      /* ============ 内容页（截图） ============ */
      pdf.addPage();
      pdf.setFillColor(11, 11, 11);
      pdf.rect(0, 0, pageW, pageH, 'F');

      // 计算图片缩放（保持比例，留 8mm 边距）
      const margin = 10;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;

      pdf.addImage(imgData, 'PNG', x, y, w, h, undefined, 'FAST');

      // 边框 + 页码
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(0.5);
      pdf.rect(margin - 2, margin - 2, w + 4, h + 4);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('P.02 · BAZI READING', margin, pageH - 5);

      /* ============ 收尾页（结语） ============ */
      pdf.addPage();
      pdf.setFillColor(11, 11, 11);
      pdf.rect(0, 0, pageW, pageH, 'F');
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(1.2);
      pdf.rect(8, 8, pageW - 16, pageH - 16);
      pdf.setLineWidth(0.4);
      pdf.rect(11, 11, pageW - 22, pageH - 22);

      pdf.setTextColor(212, 175, 55);
      pdf.setFontSize(10);
      pdf.text('— CLOSING —', pageW / 2, 50, { align: 'center' });

      pdf.setFontSize(13);
      pdf.setTextColor(245, 245, 245);
      const closing = [
        '愿此生有所安住。',
        '愿所求皆得吉祥。',
        '愿修行不退初心。',
      ];
      closing.forEach((line, i) => {
        pdf.text(line, pageW / 2, 80 + i * 12, { align: 'center' });
      });

      pdf.setFontSize(9);
      pdf.setTextColor(150, 150, 150);
      pdf.text('「心若无住，无所不为。」', pageW / 2, 140, {
        align: 'center',
      });
      pdf.text('—— 牧心堂', pageW / 2, 150, { align: 'center' });

      // 4) 触发下载
      pdf.save(`${filename}.pdf`);

      // 5) 埋点（fire-and-forget）
      track('pdf_downloaded', {
        filename,
        pages: 3,
        sizeKB: Math.round(canvas.toDataURL('image/png').length / 1024),
      });

      // 6) 写入今日修行打卡（供 /me 页面"今日精进"徽章）
      markPractice('pdfDownloaded');

      setPdfReady(true);
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? '未知错误';
      setError(`画册生成失败：${msg}`);
    } finally {
      setBusy(false);
    }
  }

  /* ============ 二级动作：生成分享海报（800x600，user 个人金句） ============ */
  async function handleSharePoster() {
    setPosterBusy(true);
    setPosterError(null);

    const rawQuote =
      shareQuote && shareQuote.trim()
        ? shareQuote.trim()
        : '心如止水，行如微风。';
    const quote =
      rawQuote.length > 100 ? `${rawQuote.slice(0, 100)}…` : rawQuote;

    const attribution =
      shareAttribution && shareAttribution.trim()
        ? shareAttribution.trim()
        : '—— 牧心堂';

    try {
      const [{ default: html2canvas }] = await Promise.all([
        import('html2canvas'),
      ]);

      // 渲染离屏海报节点（fixed 屏幕外，render 后移除）
      const node = document.createElement('div');
      node.setAttribute('data-share-poster', '');
      Object.assign(node.style, {
        position: 'fixed',
        left: '-99999px',
        top: '0',
        width: '800px',
        height: '600px',
        padding: '48px',
        background: '#0b0b0b',
        backgroundImage:
          'radial-gradient(circle at 50% 35%, rgba(212,175,55,0.18) 0%, rgba(11,11,11,0) 55%)',
        color: '#f5f5f5',
        fontFamily:
          '"Noto Serif SC", "Source Han Serif", "Songti SC", "STSong", serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        zIndex: '-1',
        pointerEvents: 'none',
      });

      const inner = document.createElement('div');
      Object.assign(inner.style, {
        position: 'relative',
        width: '100%',
        height: '100%',
        border: '1.5px solid #d4af37',
        boxShadow: 'inset 0 0 0 6px #0b0b0b, inset 0 0 0 7.5px #d4af37',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 64px',
        boxSizing: 'border-box',
        textAlign: 'center',
        gap: '28px',
      });

      const eyebrow = document.createElement('p');
      Object.assign(eyebrow.style, {
        margin: '0',
        color: '#d4af37',
        fontSize: '14px',
        letterSpacing: '0.4em',
        fontWeight: '400',
      });
      eyebrow.textContent = 'MU XIN TANG · BAZI POSTER';
      inner.appendChild(eyebrow);

      const body = document.createElement('p');
      Object.assign(body.style, {
        margin: '0',
        color: '#f5f5f5',
        fontSize: '36px',
        lineHeight: '1.7',
        fontWeight: '500',
        letterSpacing: '0.06em',
        textShadow: '0 0 18px rgba(212,175,55,0.25)',
      });
      body.textContent = `「${quote}」`;
      inner.appendChild(body);

      const deco = document.createElement('div');
      Object.assign(deco.style, {
        width: '96px',
        height: '96px',
        position: 'relative',
      });
      deco.innerHTML = `
        <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#d4af37" stroke-width="0.6"/>
          <circle cx="50" cy="50" r="34" fill="none" stroke="#d4af37" stroke-width="0.6"/>
          <circle cx="50" cy="50" r="22" fill="none" stroke="#d4af37" stroke-width="0.8"/>
          <circle cx="50" cy="50" r="10" fill="none" stroke="#d4af37" stroke-width="1"/>
          <circle cx="50" cy="50" r="3" fill="#c23020"/>
        </svg>
      `;
      inner.appendChild(deco);

      const sig = document.createElement('p');
      Object.assign(sig.style, {
        margin: '0',
        color: '#969696',
        fontSize: '14px',
        letterSpacing: '0.2em',
      });
      sig.textContent = attribution;
      inner.appendChild(sig);

      const cta = document.createElement('p');
      Object.assign(cta.style, {
        margin: '0',
        color: '#d4af37',
        fontSize: '11px',
        letterSpacing: '0.5em',
        opacity: '0.7',
      });
      cta.textContent = '— 扫码同修 · 牧心堂 —';
      inner.appendChild(cta);

      node.appendChild(inner);
      document.body.appendChild(node);

      const canvas = await html2canvas(node, {
        backgroundColor: '#0b0b0b',
        scale: 2,
        useCORS: true,
        logging: false,
        width: 800,
        height: 600,
      });

      document.body.removeChild(node);

      canvas.toBlob((blob) => {
        if (!blob) {
          setPosterError('海报生成失败：toBlob 返回空。');
          setPosterBusy(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-海报.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 0);

        track('share_poster_generated', {
          filename,
          sizeKB: Math.round(blob.size / 1024),
          width: canvas.width,
          height: canvas.height,
        });
        setPosterBusy(false);
      }, 'image/png');
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? '未知错误';
      setPosterError(`海报生成失败：${msg}`);
      setPosterBusy(false);
    }
  }

  /* ============ 三级动作：分享裂变结缘卡（1080x1080，朋友圈，无 PII） ============ */
  async function handleShareCard() {
    setCardBusy(true);
    setCardError(null);

    // 关键：使用通用金句池，绝不带入用户姓名 / 生辰 / 性别
    const quote = pickViralQuote();
    const today = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    try {
      const [{ default: html2canvas }] = await Promise.all([
        import('html2canvas'),
      ]);

      // 1080x1080 设计稿（2x retina = 2160x2160）
      const node = document.createElement('div');
      node.setAttribute('data-share-card', '');
      Object.assign(node.style, {
        position: 'fixed',
        left: '-99999px',
        top: '0',
        width: '1080px',
        height: '1080px',
        padding: '64px',
        background: '#0b0b0b',
        backgroundImage:
          'radial-gradient(circle at 50% 30%, rgba(212,175,55,0.20) 0%, rgba(11,11,11,0) 60%)',
        color: '#f5f5f5',
        fontFamily:
          '"Noto Serif SC", "Source Han Serif", "Songti SC", "STSong", serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        zIndex: '-1',
        pointerEvents: 'none',
      });

      // 内层（双金边 + 内容）
      const inner = document.createElement('div');
      Object.assign(inner.style, {
        position: 'relative',
        width: '100%',
        height: '100%',
        border: '2px solid #d4af37',
        boxShadow: 'inset 0 0 0 12px #0b0b0b, inset 0 0 0 14px #d4af37',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 96px',
        boxSizing: 'border-box',
        textAlign: 'center',
        gap: '48px',
      });

      // 顶部 eyebrow
      const eyebrow = document.createElement('p');
      Object.assign(eyebrow.style, {
        margin: '0',
        color: '#d4af37',
        fontSize: '20px',
        letterSpacing: '0.5em',
        fontWeight: '400',
      });
      eyebrow.textContent = 'MU XIN TANG · 牧心堂';
      inner.appendChild(eyebrow);

      // 金句主体（大字）
      const body = document.createElement('p');
      Object.assign(body.style, {
        margin: '0',
        color: '#f5f5f5',
        fontSize: '60px',
        lineHeight: '1.6',
        fontWeight: '500',
        letterSpacing: '0.06em',
        textShadow: '0 0 24px rgba(212,175,55,0.3)',
      });
      body.textContent = quote;
      inner.appendChild(body);

      // 装饰曼荼罗（放大版）
      const deco = document.createElement('div');
      Object.assign(deco.style, {
        width: '180px',
        height: '180px',
        position: 'relative',
      });
      deco.innerHTML = `
        <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(212,175,55,0.35)" />
              <stop offset="100%" stop-color="rgba(212,175,55,0)" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="url(#halo)" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="#d4af37" stroke-width="0.6"/>
          <circle cx="50" cy="50" r="34" fill="none" stroke="#d4af37" stroke-width="0.6"/>
          <circle cx="50" cy="50" r="22" fill="none" stroke="#d4af37" stroke-width="0.8"/>
          <circle cx="50" cy="50" r="10" fill="none" stroke="#d4af37" stroke-width="1"/>
          <circle cx="50" cy="50" r="3" fill="#c23020"/>
          <!-- 八方位刻度 -->
          <g stroke="#d4af37" stroke-width="0.4" opacity="0.7">
            <line x1="50" y1="2"  x2="50" y2="8"  />
            <line x1="50" y1="92" x2="50" y2="98" />
            <line x1="2"  y1="50" x2="8"  y2="50" />
            <line x1="92" y1="50" x2="98" y2="50" />
          </g>
        </svg>
      `;
      inner.appendChild(deco);

      // 底部签名 + 邀请
      const sig = document.createElement('p');
      Object.assign(sig.style, {
        margin: '0',
        color: '#d4af37',
        fontSize: '18px',
        letterSpacing: '0.3em',
      });
      sig.textContent = '— 长按图片 · 保存至相册 —';
      inner.appendChild(sig);

      const dateLabel = document.createElement('p');
      Object.assign(dateLabel.style, {
        margin: '0',
        color: '#666',
        fontSize: '13px',
        letterSpacing: '0.4em',
      });
      dateLabel.textContent = `· ${today} · 牧心堂 · 密解专栏 ·`;
      inner.appendChild(dateLabel);

      node.appendChild(inner);
      document.body.appendChild(node);

      const canvas = await html2canvas(node, {
        backgroundColor: '#0b0b0b',
        scale: 2, // 2160x2160 retina 清晰度
        useCORS: true,
        logging: false,
        width: 1080,
        height: 1080,
      });

      document.body.removeChild(node);

      canvas.toBlob((blob) => {
        if (!blob) {
          setCardError('结缘卡生成失败：toBlob 返回空。');
          setCardBusy(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shareCard.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 0);

        track('share_card_generated', {
          filename: 'shareCard',
          sizeKB: Math.round(blob.size / 1024),
          width: canvas.width,
          height: canvas.height,
          quote: quote.slice(0, 30),
        });
        setCardBusy(false);
      }, 'image/png');
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? '未知错误';
      setCardError(`结缘卡生成失败：${msg}`);
      setCardBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || busy}
        title={disabled ? disabledHint : '生成 PDF 修行手册'}
        className="group inline-flex items-center justify-center gap-2
                   rounded-lg border border-primary/40 bg-primary/5
                   px-5 py-2.5 text-sm font-serif text-primary
                   transition hover:border-primary hover:bg-primary/10
                   disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden className="text-base">
          📜
        </span>
        {busy ? '画册生成中…' : '生成修行画册'}
      </button>

      {/* 二级动作：个人金句海报（800x600） */}
      {pdfReady && !busy && (
        <button
          type="button"
          onClick={() => void handleSharePoster()}
          disabled={posterBusy}
          className="group inline-flex items-center justify-center gap-2
                     rounded-lg border border-primary/30 bg-primary/5
                     px-5 py-2.5 text-sm font-serif text-primary
                     transition hover:border-primary hover:bg-primary/10
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden className="text-base">
            🖼
          </span>
          {posterBusy ? '海报生成中…' : '生成分享海报'}
        </button>
      )}

      {/* 三级动作：朋友圈裂变结缘卡（1080x1080，无 PII） */}
      {pdfReady && !busy && (
        <button
          type="button"
          onClick={() => void handleShareCard()}
          disabled={cardBusy}
          className="group inline-flex items-center justify-center gap-2
                     rounded-lg border border-accent/40 bg-accent/5
                     px-5 py-2.5 text-sm font-serif text-accent
                     transition hover:border-accent hover:bg-accent/10
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden className="text-base">
            🪷
          </span>
          {cardBusy ? '结缘卡生成中…' : '分享结缘卡（朋友圈）'}
        </button>
      )}

      {disabled && !busy && (
        <p className="text-[11px] tracking-wider text-foreground/40">
          · {disabledHint} ·
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent"
        >
          {error}
        </p>
      )}

      {posterError && (
        <p
          role="alert"
          className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent"
        >
          {posterError}
        </p>
      )}

      {cardError && (
        <p
          role="alert"
          className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent"
        >
          {cardError}
        </p>
      )}

      {/* 藏经阁积分提示（任务 2 要求） */}
      {pdfReady && !cardError && (
        <p className="mt-1 text-[10px] leading-relaxed tracking-wider text-primary/70">
          ⓘ 将结缘卡分享至朋友圈，可获得额外
          <span className="font-serif text-primary">「藏经阁」</span>
          积分。
        </p>
      )}
    </div>
  );
}
