'use client';

/**
 * 牧心堂 · 阿阇梨入定指示器
 *
 * 三个跳动小圆点 + 一句入定语。放在 AI 消息气泡上方/下方，
 * 表示"正在思考"，与流式 chunk 切换显隐。
 *
 * 黑金主题：点用 primary（金），容器用 muted/30 + 金边。
 */

interface TypingIndicatorProps {
  /** 自定义提示语，默认"阿阇梨正在入定…" */
  label?: string;
  /** 自定义容器 className */
  className?: string;
}

export function TypingIndicator({
  label = '阿阇梨正在入定…',
  className = '',
}: TypingIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-muted/40 px-4 py-2.5 text-sm text-foreground/70 backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center gap-1" aria-hidden>
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80"
          style={{ animationDelay: '-0.3s' }}
        />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80"
          style={{ animationDelay: '-0.15s' }}
        />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/80"
        />
      </div>
      <span className="text-xs tracking-wider text-foreground/50">
        {label}
      </span>
    </div>
  );
}
