/**
 * 牧心堂 · Dify 客户端（服务端专用）
 *
 * 设计原则：
 * 1. 永远不阻塞主流程：Dify 失败 → 返回 null，上层走本地模板兜底
 * 2. 支持工作流（workflows/run）和 Chat（chat-messages）两种模式
 * 3. API base + key 全部从 .env.local 读取
 *
 * 环境变量：
 *   DIFY_API_KEY         Dify 应用的 API key（必填）
 *   DIFY_BASE_URL        Dify 服务地址（默认 https://api.dify.ai/v1）
 *   DIFY_BAZI_APP_ID     排盘专用 Chat App 的 app_id（用于 chat-messages 路径）
 *   DIFY_BAZI_WORKFLOW   排盘专用 Workflow App 的 app_id（用于 workflows/run 路径）
 *
 * 选哪个？
 *   - 如果你用 Dify 的「Chatflow / Workflow」做 AI 解读，用前者（DIFY_BAZI_WORKFLOW）
 *   - 如果你用 Dify 的「Chatbot」做对话式解读，用后者（DIFY_BAZI_APP_ID）
 *   - 两个都填时，优先 Workflow
 */

export interface DifyRunInput {
  /** 用户输入（生辰 + 性别） */
  query: string;
  /** 用于排盘解读的结构化上下文（机读，方便 Workflow 变量绑定） */
  context: Record<string, unknown>;
  /** 透传用户 ID，便于 Dify 端做会话/配额 */
  user?: string;
  /** 是否流式（SSE） */
  stream?: boolean;
}

export interface DifyRunResult {
  /** 解读文本（Markdown） */
  text: string;
  /** Dify 返回的 conversation_id，便于后续多轮 */
  conversationId?: string;
  /** Dify 端 message_id */
  messageId?: string;
  /** 用了多少 token */
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

const TIMEOUT_MS = 25_000; // 25s 上限，避免阻塞用户太久

function getBaseUrl(): string {
  return (process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1').replace(/\/+$/, '');
}

function getApiKey(): string | undefined {
  return process.env.DIFY_API_KEY;
}

function getWorkflowId(): string | undefined {
  return process.env.DIFY_BAZI_WORKFLOW;
}

function getChatAppId(): string | undefined {
  return process.env.DIFY_BAZI_APP_ID;
}

export function isDifyConfigured(): boolean {
  return Boolean(getApiKey() && (getWorkflowId() || getChatAppId()));
}

/* ============ Workflow 模式 ============ */

async function runWorkflow(input: DifyRunInput): Promise<DifyRunResult> {
  const url = `${getBaseUrl()}/workflows/run`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        inputs: {
          query: input.query,
          ...input.context,
        },
        response_mode: input.stream ? 'streaming' : 'blocking',
        user: input.user || 'muxintang-anonymous',
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`Dify workflow ${r.status}: ${body.slice(0, 200)}`);
    }
    const data = await r.json();
    return {
      text: data.data?.outputs?.text || data.data?.outputs?.result || JSON.stringify(data.data?.outputs || {}),
      conversationId: data.conversation_id,
      messageId: data.message_id,
      usage: data.data?.usage,
    };
  } finally {
    clearTimeout(t);
  }
}

/* ============ Chat 模式 ============ */

async function runChat(input: DifyRunInput): Promise<DifyRunResult> {
  const url = `${getBaseUrl()}/chat-messages`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        inputs: input.context,
        query: input.query,
        response_mode: input.stream ? 'streaming' : 'blocking',
        user: input.user || 'muxintang-anonymous',
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      throw new Error(`Dify chat ${r.status}: ${body.slice(0, 200)}`);
    }
    const data = await r.json();
    return {
      text: data.answer || '',
      conversationId: data.conversation_id,
      messageId: data.message_id,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  } finally {
    clearTimeout(t);
  }
}

/* ============ 公共入口 ============ */

/**
 * 调用 Dify 解读排盘结果。
 * - 未配置 → 返回 null（让上层走本地模板）
 * - 配置了但调用失败 → 返回 null（不阻塞主流程）
 */
export async function callDify(input: DifyRunInput): Promise<DifyRunResult | null> {
  if (!isDifyConfigured()) return null;
  try {
    if (getWorkflowId()) {
      return await runWorkflow(input);
    }
    return await runChat(input);
  } catch (e) {
    console.warn('[dify] call failed, fallback to local template:', e);
    return null;
  }
}
