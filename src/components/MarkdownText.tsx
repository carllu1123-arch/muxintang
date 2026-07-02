/**
 * 牧心堂 · 极简 Markdown 渲染器
 *
 * 设计目的：
 *   - 不引第三方（react-markdown 体积太大，且会与我们的黑金主题冲撞）
 *   - 覆盖 Dify / 本地模板常见的语法：## / ### 标题、** 粗体、`行内代码`、列表、> 引用、``` 围栏代码块
 *   - 风格契合黑金主题，serif 标题、primary 强调色
 *
 * 用法：
 *   <MarkdownText text={interpretation} />
 *
 * 限制：
 *   - 不支持嵌套列表
 *   - 不支持链接（玄学文本里几乎不会出现）
 *   - 不支持表格
 *   - 不支持 HTML 转义（用 React text 节点自动防注入）
 */

interface MarkdownTextProps {
  text: string;
  /** 自定义 className 覆盖外层 */
  className?: string;
}

export function MarkdownText({ text, className = '' }: MarkdownTextProps) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // 跳过结束的 ```
      out.push(
        <pre
          key={`code-${key++}`}
          className="my-3 overflow-x-auto rounded-lg border border-primary/20 bg-black/60 p-3 text-xs leading-relaxed text-foreground/85"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // 标题
    const h3 = /^###\s+(.+)$/.exec(line);
    if (h3) {
      out.push(
        <h3
          key={`h3-${key++}`}
          className="mt-4 font-serif text-lg text-primary md:text-xl"
        >
          {renderInline(h3[1])}
        </h3>,
      );
      i++;
      continue;
    }
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) {
      out.push(
        <h2
          key={`h2-${key++}`}
          className="mt-6 font-serif text-xl text-primary md:text-2xl"
        >
          {renderInline(h2[1])}
        </h2>,
      );
      i++;
      continue;
    }

    // 引用
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(
        <blockquote
          key={`q-${key++}`}
          className="my-3 border-l-2 border-primary/40 pl-4 italic text-foreground/70"
        >
          {quoteLines.map((q, idx) => (
            <p key={idx} className="text-sm md:text-base">
              {renderInline(q)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // 列表
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      out.push(
        <ul
          key={`ul-${key++}`}
          className="my-2 list-disc space-y-1 pl-6 text-sm md:text-base"
        >
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // 空行
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 普通段落（聚合连续非空行）
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^[-*]\s+/.test(lines[i]) &&
      !lines[i].startsWith('>') &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('```')
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(
      <p
        key={`p-${key++}`}
        className="my-2 text-sm leading-relaxed md:text-base"
      >
        {renderInline(para.join(' '))}
      </p>,
    );
  }

  return <div className={className}>{out}</div>;
}

/* ============ 行内渲染 ============ */

function renderInline(s: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let m: RegExpExecArray | null;
  let last = 0;
  let k = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={k++} className="text-primary">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={k++}
          className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-sm text-primary"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}
