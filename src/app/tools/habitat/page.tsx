'use client';

/**
 * 牧心堂 · 家居环境 AI 诊断（Habitat）
 *
 * 流程：
 *   1. 10 道是/否选择题，描述居家空间格局
 *   2. 提交 → 打包 JSON 发送到 /api/dify
 *   3. 流式打印 AI 给出的 3 条可执行建议 + 1 条密宗种子字调和法（基础 · 免费）
 *   4. 基础建议下方新增「🙏 阿阇梨能量调频」入口
 *      - 会员：调 /api/dify 拿更深度、更具体的风水调和 + 唐密观想建议
 *      - free：展示 ReportPaywall
 *
 * 风格：黑底金边 / 磨砂玻璃 / 与其他工具一致
 *
 * 设计要点：
 *   - 移动端单列、卡片化每道题（点击切换 是/否）
 *   - 提交前显示进度 N/10
 *   - 流式区域：复用 BaziChat 的「打字机」气泡观感
 *   - AI 失败 / Dify 未配置：直接回退到本地 default 解读
 */

import { useRef, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { MarkdownText } from '@/components/MarkdownText';
import { ReportPaywall } from '@/components/ReportPaywall';

/** 深度调频开关：true=积分模式（未订阅扣 30 积分）/ false=严格会员模式 */
const IS_CREDITS_MODE = false;

/** 积分模式下的每次深度调频扣减 */
const DEEP_ANALYZE_CREDIT_COST = 30;

interface Question {
  key: string;
  text: string;
  /** 五行 / 风水含义（仅作内部标识） */
  tag: '气' | '火' | '水' | '木' | '土' | '形';
}

const QUESTIONS: Question[] = [
  { key: 'q1', text: '入户门是否正对窗户（或阳台门）？', tag: '气' },
  { key: 'q2', text: '厨房是否位于房屋正中（或动线交叉处）？', tag: '火' },
  { key: 'q3', text: '卧室床头是否正对房门或镜子？', tag: '形' },
  { key: 'q4', text: '房屋是否存在明显的尖角、梁压床或 L 型缺角？', tag: '形' },
  { key: 'q5', text: '洗手间是否紧邻厨房或卧室？', tag: '水' },
  { key: 'q6', text: '家中是否长期无人打理绿植、缺少生气？', tag: '木' },
  { key: 'q7', text: '是否长期将鞋柜、杂物堆放在玄关或门口？', tag: '土' },
  { key: 'q8', text: '客厅或主卧是否长期不见阳光？', tag: '火' },
  { key: 'q9', text: '家中是否有持续漏水 / 潮湿的角落？', tag: '水' },
  { key: 'q10', text: '你是否经常感到在家中烦躁、疲倦、难以安眠？', tag: '气' },
];

const SYSTEM_PROMPT =
  '你是一位精通唐密和传统风水的环境能量顾问。' +
  '根据用户回答的 10 个居家环境问题（每个是/否），给出：' +
  '(1) 三条可立即执行的家居优化建议；' +
  '(2) 一条如何通过观想"种子字"调和五行的密宗建议。' +
  '语气慈悲、具体、可操作；不要空泛理论；不超过 400 字。';

/** 深度调频提示词：基于已分析的 10 题答案，给出更具体、更可执行的风水调和与唐密观想修行 */
const DEEP_SYSTEM_PROMPT =
  '你是一位精通唐密和传统风水的资深阿阇梨。' +
  '用户已经完成基础 10 题诊断，得到初步建议。' +
  '现在请你基于同样的 10 题回答，给出【深度能量调频】方案，涵盖：' +
  '(1) 至少 5 条更具体、更可操作的风水调和法（如具体方位、物品、时辰、密宗手印）；' +
  '(2) 不少于 3 段唐密观想修行（对应不同种子字 / 真言 / 持咒数）；' +
  '(3) 一年四季的调候节奏（春生、夏长、秋收、冬藏的能量平衡）。' +
  '语气慈悲、具体、可落地；可引用唐密经典名相但需白话翻译；不超过 1200 字。';

interface Answers {
  [k: string]: boolean | null;
}

const EMPTY_ANSWERS: Answers = QUESTIONS.reduce(
  (acc, q) => ({ ...acc, [q.key]: null }),
  {},
);

/** 深度调频的本地兜底（按"是"的题数 + 五行命中生成） */
function buildDeepFallback(answers: Answers): string {
  const yes = QUESTIONS.filter((q) => answers[q.key] === true);
  const tags = yes.map((q) => q.tag);
  const tagCount = tags.reduce<Record<string, number>>((acc, t) => {
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  const top = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);

  const lines: string[] = [];
  lines.push('【深度能量调频 · 五行调和】');
  lines.push('');

  const detailByTag: Record<string, string> = {
    气: '· 玄关正南挂一盏黄铜风铃（高 1.6m），每日清晨 7 点轻叩三声，引"生气"回旋。\n· 入门处铺 50cm 见方的深色地垫，留住财气不入直出。\n· 默念"嗡阿吽"（ॐ अ हूँ）三字明 21 遍，每字对应喉轮、心轮、顶轮。',
    火: '· 厨房灶台正东置一红玛瑙七星阵（直径 8cm），每周日正午阳光照晒 30 分钟。\n· 客厅南墙挂暖色盐灯一盏（瓦数 15W），日落前点燃至日落后一小时。\n· 持诵"阿"（अ）字真言 108 息，观想喉轮红色光轮旋转。',
    水: '· 卫生间门常闭，加挂深色棉麻门帘；地漏旁置一粗盐碗（直径 12cm，深 5cm）。\n· 主卧西北方放一碗清水（玻璃），每日清晨换新，吸纳阴浊。\n· 持诵"班"（ब，vaṃ）字真言 108 息，观想海底轮蓝光下沉。',
    木: '· 客厅东或东南角摆虎皮兰一盆（高度 40-60cm），每三日用湿布擦拭叶面。\n· 文昌位（书桌左上 45°）摆文竹或富贵竹，水养 3 支，象征三学。\n· 持诵"欠"（क, kaṃ）字真言 108 息，观想肝轮绿光舒展。',
    土: '· 玄关鞋柜上方置黄水晶洞或陶瓷聚宝盆，定期擦拭保持光泽。\n· 家中中央（明堂位）放一方形地毯（90×90cm），稳固中气。\n· 每月农历十五、三十断舍离旧物一次，土厚方能载物。',
    形: '· 尖角处挂葫芦（天然，未上漆）化解压梁；床头梁下挂六帝钱串 6 枚。\n· 镜子不正对床铺与房门，必要时加布帘遮蔽。\n· 持诵"嗡"（ॐ）字真言 108 息，每息观想中脉白光通透。',
  };

  for (const t of [...top, '气', '火', '水', '木', '土', '形']) {
    if (detailByTag[t] && lines.length < 12) {
      lines.push(detailByTag[t]);
      lines.push('');
    }
  }

  lines.push('【唐密观想 · 三阶修行】');
  lines.push('');
  lines.push('一、晨课（5:00-6:00）');
  lines.push('面东端坐，双手结"阿阇梨印"（二手合掌，二中指竖起相触）。');
  lines.push('观想自身化身为不动明王（蓝色身相），右手持剑斩断家中一切不净之气。');
  lines.push('持诵"吽"（हूँ）字 108 息，每息气沉海底轮。');
  lines.push('');
  lines.push('二、午课（11:00-13:00）');
  lines.push('面南站立，双脚与肩同宽，观想大日如来（白色身相）坐于心轮。');
  lines.push('持诵"阿"（अ）字 21 遍，每字出声如钟，回荡于家中四角。');
  lines.push('配合手印：二手金刚合掌（十指交叉，二拇指竖起相触）。');
  lines.push('');
  lines.push('三、暮课（19:00-21:00）');
  lines.push('面西静坐，点檀香一炷（无烟款为佳）。');
  lines.push('观想观自在菩萨（白色身相）甘露瓶倾下，净水遍洒家宅。');
  lines.push('持诵"嗡嘛呢叭咪吽"（ॐ मणि पद्मे हूँ）108 遍。');
  lines.push('');
  lines.push('【一年四时调候】');
  lines.push('春（2-4月）：木旺，宜东植绿植，多诵"欠"字。');
  lines.push('夏（5-7月）：火旺，宜南清火宅，多诵"阿"字。');
  lines.push('秋（8-10月）：金旺，宜西置金器，多诵"唵"字。');
  lines.push('冬（11-1月）：水旺，宜北温肾宅，多诵"班"字。');
  lines.push('四季交替（立春、立夏、立秋、立冬）日，加诵"嗡"字 108 息，调和五行归中。');

  return lines.join('\n');
}

/** 本地兜底：基于"是"的题目数与五行的命中数生成默认解读 */
function buildFallback(answers: Answers): string {
  const yes = QUESTIONS.filter((q) => answers[q.key] === true);
  const tags = yes.map((q) => q.tag);
  const tagCount = tags.reduce<Record<string, number>>((acc, t) => {
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  const top = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);

  const adviceByTag: Record<string, string> = {
    气: '玄关处加一盏暖光落地灯，让"气"回旋不入直出；入门时默念"嗡"一声，留住财气。',
    火: '厨房保持灶台洁净、灶口朝外采光；可在客厅南侧点一盏红色盐灯以振火德。',
    水: '卫生间常闭门，地面保持干燥；洗手台下方可置一粗盐小碗，吸纳阴浊。',
    木: '在客厅东或东南角摆一盆常青绿植（如虎皮兰），三天擦拭一次叶面以养木气。',
    土: '玄关鞋柜上方可置一黄水晶或陶瓷摆件，使浊气沉降；定期整理断舍离。',
    形: '尖角处可用绿植或布帘柔化；床头梁下挂一葫芦化解压梁。',
  };

  const lines: string[] = [];
  lines.push(`【五行倾向】命中最多：${top.join('、') || '无明显偏颇'}`);
  lines.push('');
  lines.push('【立即可执行 · 三条】');
  let n = 0;
  for (const t of [...top, '气', '木', '火', '水', '土', '形']) {
    if (adviceByTag[t] && n < 3) {
      lines.push(`${n + 1}. ${adviceByTag[t]}`);
      n++;
    }
  }
  lines.push('');
  lines.push('【密宗种子字调和】');
  if (top.includes('火') || top.includes('气')) {
    lines.push('每日清晨面东，端坐观想"阿"（अ，a）字放红色光，由喉轮升至顶轮约 5 分钟，平息家中燥气。');
  } else if (top.includes('水') || top.includes('木')) {
    lines.push('每日黄昏面西，端坐观想"班"（ब，vaṃ）字放蓝光，由心轮沉入海底轮约 5 分钟，化阴湿为清凉。');
  } else {
    lines.push('每日正午面南，观想"嗡"（ॐ，oṃ）字放白光绕中脉 108 息，使五行归中。');
  }

  return lines.join('\n');
}

export default function HabitatPage() {
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // 深度调频（会员专属）
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepText, setDeepText] = useState('');
  const [deepError, setDeepError] = useState<string | null>(null);
  const [deepVisible, setDeepVisible] = useState(false);
  const [deepPaywall, setDeepPaywall] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const deepAbortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const answeredCount = QUESTIONS.filter((q) => answers[q.key] !== null).length;
  const allAnswered = answeredCount === QUESTIONS.length;

  function setAnswer(key: string, val: boolean) {
    setAnswers((prev) => ({ ...prev, [key]: val }));
  }

  /** 简易 toast 提示（3 秒自动关闭） */
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSubmit() {
    setTouched(true);
    if (!allAnswered) return;

    // 取消上一次
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setSubmitted(true);
    setLoading(true);
    setAiError(null);
    setAiText('');

    const summary = QUESTIONS.map(
      (q, i) => `${i + 1}. ${q.text} → ${answers[q.key] ? '是' : '否'}`,
    ).join('\n');

    const query = `请根据以下 10 道居家环境诊断问题的回答，给出诊断与建议：\n${summary}`;

    const fallback = buildFallback(answers);

    try {
      const res = await fetch('/api/dify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: SYSTEM_PROMPT,
          query,
          context: { answers, mode: 'habitat' },
          fallback,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          let ev: { type: string; data?: string; error?: string };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === 'chunk' && typeof ev.data === 'string') {
            accumulated += ev.data;
            setAiText(accumulated);
          } else if (ev.type === 'error') {
            throw new Error(ev.error || '流式错误');
          }
        }
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return;
      const msg = (e as { message?: string })?.message || 'AI 暂未在线。';
      setAiError(msg);
      setAiText(fallback);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    abortRef.current?.abort();
    deepAbortRef.current?.abort();
    setAnswers(EMPTY_ANSWERS);
    setTouched(false);
    setLoading(false);
    setAiText('');
    setAiError(null);
    setSubmitted(false);
    setDeepLoading(false);
    setDeepText('');
    setDeepError(null);
    setDeepVisible(false);
    setDeepPaywall(false);
  }

  /**
   * 深度调频：会员调用 /api/dify 拿更深度建议；free 拦截展示 ReportPaywall。
   * IS_CREDITS_MODE=true 时，未订阅用户先扣 30 积分，余额不足弹 Toast。
   */
  async function handleDeepAnalyze() {
    setDeepPaywall(false);
    setDeepError(null);

    // 1) 调 /api/user 读 tier
    let tier: string | null = null;
    try {
      const r = await fetch('/api/user', { cache: 'no-store' });
      const data = (await r.json().catch(() => ({}))) as {
        user?: { tier?: string } | null;
      };
      tier = data.user?.tier ?? null;
    } catch {
      // 网络异常：保守按 free 处理（不允许误扣）
      tier = null;
    }

    const isMember = tier === 'monthly' || tier === 'yearly';

    // 2) 非会员 + 严格会员模式：拦截
    if (!isMember && !IS_CREDITS_MODE) {
      setDeepVisible(true);
      setDeepPaywall(true);
      return;
    }

    // 3) 非会员 + 积分模式：尝试扣积分
    if (!isMember && IS_CREDITS_MODE) {
      try {
        const r = await fetch('/api/user/spend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: DEEP_ANALYZE_CREDIT_COST,
            reason: 'habitat_deep_analyze',
          }),
        });
        const data = (await r.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          balance?: number;
        };
        if (!r.ok || !data.ok) {
          if (data.error === 'insufficient_credits') {
            showToast(
              `🙏 深度调频需 ${DEEP_ANALYZE_CREDIT_COST} 积分，当前余额 ${data.balance ?? 0}。请先到「我的」补充积分。`,
            );
            return;
          }
          if (data.error === 'unauthenticated') {
            setDeepVisible(true);
            setDeepPaywall(true);
            return;
          }
          // 其他错误：保守拦截
          setDeepVisible(true);
          setDeepPaywall(true);
          return;
        }
        showToast(`✓ 已扣除 ${DEEP_ANALYZE_CREDIT_COST} 积分（余额 ${data.balance ?? '?'}）`);
      } catch {
        showToast('🙏 积分扣除失败，请稍后再试。');
        return;
      }
    }

    // 4) 准备请求
    deepAbortRef.current?.abort();
    const ctrl = new AbortController();
    deepAbortRef.current = ctrl;

    setDeepVisible(true);
    setDeepLoading(true);
    setDeepText('');
    setDeepError(null);

    const summary = QUESTIONS.map(
      (q, i) => `${i + 1}. ${q.text} → ${answers[q.key] ? '是' : '否'}`,
    ).join('\n');

    const query = `请基于以下 10 道居家环境诊断的答案，给出【深度能量调频】方案：\n${summary}\n\n基础建议已生成，请输出更具体、更可操作的风水调和与唐密观想修行。`;

    const fallback = buildDeepFallback(answers);

    try {
      const res = await fetch('/api/dify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: DEEP_SYSTEM_PROMPT,
          query,
          context: { answers, mode: 'habitat_deep' },
          fallback,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          let ev: { type: string; data?: string; error?: string };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === 'chunk' && typeof ev.data === 'string') {
            accumulated += ev.data;
            setDeepText(accumulated);
          } else if (ev.type === 'error') {
            throw new Error(ev.error || '流式错误');
          }
        }
      }
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return;
      const msg = (e as { message?: string })?.message || 'AI 暂未在线。';
      setDeepError(msg);
      setDeepText(fallback);
    } finally {
      setDeepLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 py-6 md:gap-12 md:py-12">
      <PageHeader
        eyebrow="TOOL · HABITAT"
        title="家居环境"
        subtitle="识居家气，调五行平衡。"
        back={{ href: '/tools', label: '智测工具' }}
      />

      {/* 进度条 */}
      <div className="flex items-center gap-3 text-xs tracking-wider text-foreground/60">
        <span>已完成 {answeredCount} / {QUESTIONS.length}</span>
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted/40">
          <div
            className="absolute left-0 top-0 h-full bg-primary transition-all"
            style={{ width: `${(answeredCount / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 题目区 */}
      <ol className="flex flex-col gap-3">
        {QUESTIONS.map((q, idx) => {
          const v = answers[q.key];
          return (
            <li
              key={q.key}
              className={`rounded-xl border p-4 backdrop-blur-md md:p-5
                          ${
                            v === null
                              ? 'border-primary/20 bg-black/60'
                              : v
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-foreground/20 bg-muted/30'
                          }`}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full
                             border border-primary/30 text-xs font-serif text-primary"
                >
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
                    {q.text}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {[
                      { val: true, label: '是', cls: 'border-primary bg-primary/20 text-primary' },
                      { val: false, label: '否', cls: 'border-foreground/30 text-foreground/80' },
                    ].map((opt) => {
                      const selected = v === opt.val;
                      return (
                        <button
                          key={String(opt.val)}
                          type="button"
                          onClick={() => setAnswer(q.key, opt.val)}
                          className={`rounded-lg border px-4 py-1.5 text-sm transition
                                      ${
                                        selected
                                          ? opt.cls
                                          : 'border-primary/25 text-foreground/70 hover:border-primary/60'
                                      }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* 操作区 */}
      <section className="flex gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !allAnswered}
          className="flex-1 rounded-lg bg-primary px-4 py-3 font-serif text-base text-background
                     transition hover:bg-primary/90
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? '阿阇梨勘察中…' : allAnswered ? '分析家居环境' : `还需 ${QUESTIONS.length - answeredCount} 题`}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-primary/30 px-4 py-3 text-sm text-foreground/80
                     transition hover:border-primary hover:text-primary"
        >
          重置
        </button>
      </section>

      {touched && !allAnswered && (
        <p className="text-center text-sm text-accent">
          请补全全部 {QUESTIONS.length} 道选择题。
        </p>
      )}

      {/* AI 解读区 */}
      {submitted && (
        <section
          ref={resultRef}
          aria-label="环境诊断"
          className="rounded-2xl border border-primary/30 bg-black/60 p-6 backdrop-blur-md md:p-8"
        >
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] tracking-[0.3em] text-foreground/40">
                HABITAT · DIAGNOSIS
              </p>
              <h3 className="font-serif text-2xl text-primary md:text-3xl">
                环境诊断与开示
              </h3>
            </div>
            <div className="text-[10px] tracking-[0.3em] text-foreground/40">
              {loading ? '阿阇梨勘察中…' : '已出建议'}
            </div>
          </header>

          <div className="relative min-h-[160px] whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 md:text-base">
            {aiText || (loading ? '' : '（正在生成建议…）')}
            {loading && aiText.length === 0 && (
              <span
                aria-hidden
                className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-primary/80"
              />
            )}
            {loading && aiText.length > 0 && (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-primary/80"
              />
            )}
          </div>

          {/* AI 完成后用 Markdown 重新渲染一次（更整洁） */}
          {!loading && aiText && (
            <div className="mt-6 hidden">
              <MarkdownText text={aiText} />
            </div>
          )}

          {aiError && (
            <p className="mt-3 text-xs text-accent">
              · 阿阇梨暂未在线（{aiError}），已显示本地解读 ·
            </p>
          )}

          <p className="mt-4 text-[10px] tracking-wider text-foreground/30">
            · 此诊断仅供参考，家宅和睦在心不在形，请以正念为本 ·
          </p>
        </section>
      )}

      {/* ===== 深度调频入口（会员专属 / 可切换积分模式） ===== */}
      {submitted && !loading && (
        <section
          aria-label="深度能量调频"
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleDeepAnalyze}
              disabled={deepLoading}
              className="flex items-center gap-2 text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden>🙏</span>
              <span className="text-sm tracking-wider">
                {deepLoading ? '阿阇梨深度调频中…' : '阿阇梨能量调频'}
              </span>
              <span className="text-[10px] tracking-[0.2em] text-primary/60">
                ⚡ 会员
              </span>
            </button>
          </div>

          {/* 付费墙：非会员时插入 */}
          {deepPaywall && (
            <div className="relative">
              <ReportPaywall
                tierRequired="yearly"
                categoryTitle="家居环境"
                description="阿阇梨能量调频与深度风水修行建议，为年度会员专属权益。"
              />
              <button
                type="button"
                onClick={() => setDeepPaywall(false)}
                aria-label="关闭付费墙"
                className="absolute right-3 top-3 z-10 rounded-md p-1
                           text-foreground/60 transition
                           hover:bg-primary/10 hover:text-primary"
              >
                <span aria-hidden className="text-base leading-none">×</span>
              </button>
            </div>
          )}

          {/* 深度调频结果区 */}
          {deepVisible && !deepPaywall && (
            <section
              aria-label="深度调频开示"
              className="rounded-2xl border border-primary/40 bg-black/60 p-6 backdrop-blur-md md:p-8"
            >
              <header className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] tracking-[0.3em] text-primary/60">
                    HABITAT · DEEP TUNING
                  </p>
                  <h3 className="font-serif text-2xl text-primary md:text-3xl">
                    阿阇梨深度能量调频
                  </h3>
                </div>
                <div className="text-[10px] tracking-[0.3em] text-foreground/40">
                  {deepLoading ? '深度调频中…' : '已出开示'}
                </div>
              </header>

              <div className="relative min-h-[160px] whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 md:text-base">
                {deepText || (deepLoading ? '' : '（正在生成深度调频…）')}
                {deepLoading && deepText.length === 0 && (
                  <span
                    aria-hidden
                    className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-primary/80"
                  />
                )}
                {deepLoading && deepText.length > 0 && (
                  <span
                    aria-hidden
                    className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-pulse bg-primary/80"
                  />
                )}
              </div>

              {deepError && (
                <p className="mt-3 text-xs text-accent">
                  · 阿阇梨暂未在线（{deepError}），已显示本地深度调频 ·
                </p>
              )}

              <p className="mt-4 text-[10px] tracking-wider text-foreground/30">
                · 深度调频基于个人问卷与唐密传承，修行以正念为本 ·
              </p>
            </section>
          )}
        </section>
      )}

      {/* ===== Toast 提示 ===== */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl
                     border border-primary/40 bg-black/80 px-4 py-2
                     text-sm text-foreground backdrop-blur-md shadow-[0_0_30px_-10px_rgba(212,175,55,0.5)]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
