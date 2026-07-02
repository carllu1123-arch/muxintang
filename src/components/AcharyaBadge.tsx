/**
 * 牧心堂 · 阿阇梨认证徽章
 *
 * 当评论者 role 为 'acharya' 或 'admin' 时显示金色 🪷 徽章
 */

interface AcharyaBadgeProps {
  role: string;
}

export function AcharyaBadge({ role }: AcharyaBadgeProps) {
  if (role !== 'acharya' && role !== 'admin') return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full
                 border border-accent/50 bg-accent/10
                 px-2 py-0.5 text-[10px] tracking-wider text-accent"
      title="阿阇梨认证回复"
    >
      <span aria-hidden>🪷</span>
      {role === 'acharya' ? '阿阇梨' : '管理员'}
    </span>
  );
}

export default AcharyaBadge;
