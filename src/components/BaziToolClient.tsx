'use client';

/**
 * 牧心堂 · 生命代码 · 客户端容器
 *
 * 职责：
 *   1. 持有结果区 ref（指向 BaziChat 的消息容器）
 *   2. 监听 BaziChat 的排盘结果（onBaziChange）
 *   3. 监听最后一条 AI 解读（onLastAssistantChange）→ 传给分享海报
 *   4. 渲染「📜 生成修行画册」+「🪷 生成分享海报」按钮
 *
 * 这样 BaziChat 自身不必关心 PDF / 海报，保持单一职责。
 */

import { useRef, useState } from 'react';
import { BaziChat } from './BaziChat';
import { ExportPdfButton } from './ExportPdfButton';
import type { BaziOutput } from '@/lib/bazi-engine';

export function BaziToolClient() {
  const resultRef = useRef<HTMLDivElement | null>(null);
  const [bazi, setBazi] = useState<BaziOutput | null>(null);
  /** 最后一条 AI 解读（用于分享海报金句） */
  const [shareQuote, setShareQuote] = useState<string | undefined>(undefined);

  // 排盘结果作为画册文件名前缀
  const filename = bazi
    ? `生命代码修行手册_${bazi.dayMaster}-${bazi.dayMasterElement}`
    : '生命代码修行手册';

  /**
   * 把 AI 解读的第一段（"## 解读" 之后、"## 建议" 之前）作为海报金句
   * 失败则用原始前 80 字
   */
  function extractQuote(text: string | null): string | undefined {
    if (!text) return undefined;
    // 1) 找 ## 段落，按 markdown 标题切分
    const sections = text.split(/^##\s+/m);
    for (const s of sections) {
      // 跳过标题本身
      const body = s.replace(/^[^\n]*\n/, '').trim();
      if (!body) continue;
      // 优先取「解读 / 概述 / 概览 / 命格 / 性格 / 总结」类首段
      if (
        /解读|概览|命格|性格|总结|开示|总论/.test(s.split('\n')[0] ?? '')
      ) {
        const firstPara = body.split(/\n\s*\n/)[0]?.trim() ?? '';
        if (firstPara) return firstPara.slice(0, 100);
      }
    }
    // 2) fallback：去掉 markdown 标记，取首段
    const cleaned = text
      .replace(/^#+\s+.*$/gm, '') // 去标题
      .replace(/\*\*/g, '') // 去加粗
      .replace(/`/g, '')
      .trim();
    const firstPara = cleaned.split(/\n\s*\n/)[0]?.trim() ?? '';
    return firstPara ? firstPara.slice(0, 100) : undefined;
  }

  return (
    <div className="flex flex-col gap-6">
      <BaziChat
        resultRef={resultRef}
        onBaziChange={setBazi}
        onLastAssistantChange={(text) => setShareQuote(extractQuote(text))}
      />

      {/* 导出按钮：仅在有排盘结果时启用 */}
      <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-foreground/50">
          {bazi
            ? `日主 ${bazi.dayMaster}（${bazi.dayMasterElement}）·  即可导出本段对话为修行画册`
            : '完成排盘后可生成 PDF 修行手册'}
        </div>
        <ExportPdfButton
          resultRef={resultRef}
          filename={filename}
          recipient={bazi ? `${bazi.dayMaster}日主道友` : '道友'}
          disabled={!bazi}
          disabledHint="请先在对话中提供生辰，完成排盘。"
          shareQuote={shareQuote}
          shareAttribution="—— 牧心堂 · 密解专栏"
        />
      </div>
    </div>
  );
}
