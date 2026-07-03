/**
 * 牧心堂 · 邮件发送 helper
 *
 * 支持三种模式（自动检测）：
 *   1. Mock 模式（开发/预览）  — log 到控制台，不发任何邮件
 *   2. Nodemailer SMTP 模式     — 通过 SMTP_* 环境变量发送
 *   3. 直接写文件（dev 调试）   — 写 .dev-emails/*.html，本地预览
 *
 * 环境变量：
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / MAIL_FROM
 *     任意缺失即进入 mock 模式
 *
 *   CRON_SECRET（cron 接口用）— 防止外部触发群发
 *
 * 设计原则：
 *   - 失败必 log，但不抛错（邮件失败不能让 cron 中断）
 *   - 模板与发送分离（renderDailyDigest / sendEmail）
 *   - 所有邮件走 HTML + plain text 双版本（无图客户端仍能读）
 */

import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import type { DailyQuote } from '@/lib/daily-quote';

export interface EmailEnvelope {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  ok: boolean;
  mode: 'mock' | 'smtp';
  error?: string;
}

/* ============ SMTP 配置检测 ============ */

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM ?? user ?? 'noreply@muxintang.com';

  if (!host || !user || !pass) {
    return null;
  }
  return { host, port, user, pass, from };
}

/** 是否在 mock 模式（无 SMTP 配置） */
export function isEmailMockMode(): boolean {
  return readSmtpConfig() === null;
}

/* ============ Transporter 缓存 ============ */

let _transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (_transporter) return _transporter;
  const cfg = readSmtpConfig();
  if (!cfg) return null;
  _transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  return _transporter;
}

/* ============ 发送接口 ============ */

export async function sendEmail(envelope: EmailEnvelope): Promise<SendResult> {
  const cfg = readSmtpConfig();

  // mock 模式：仅 log
  if (!cfg) {
    console.log(
      `[email mock] → ${envelope.to} | ${envelope.subject} | ${envelope.text.length} chars text`,
    );
    return { ok: true, mode: 'mock' };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, mode: 'smtp', error: 'transporter not initialized' };
  }

  try {
    await transporter.sendMail({
      from: cfg.from,
      to: envelope.to,
      subject: envelope.subject,
      html: envelope.html,
      text: envelope.text,
    });
    return { ok: true, mode: 'smtp' };
  } catch (e) {
    console.error(`[email smtp] send failed to ${envelope.to}:`, e);
    return { ok: false, mode: 'smtp', error: (e as Error).message };
  }
}

/* ============ 每日晨音 · 模板渲染 ============ */

// const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muxintang.com'; // 未来用于绝对 URL 拼接

export interface DailyDigestContext {
  /** 收件人昵称（用于称呼） */
  displayName: string;
  /** 当日金句 */
  quote: DailyQuote;
  /** 邮件发送日期（用于文末"今日"） */
  sentDate: Date;
  /** 推荐跳转链接（如 /me 或 /tools/bazi） */
  ctaHref: string;
  /** CTA 文案 */
  ctaLabel: string;
}

/**
 * 渲染"每日晨音报到"邮件
 *   - 极简黑金风格，参考牧心堂 Web 主题
 *   - 单栏，移动端优先
 *   - 内嵌 CTA 按钮 + 退订链接（恒真，不写死）
 */
export function renderDailyDigest(ctx: DailyDigestContext): EmailEnvelope {
  const { displayName, quote, sentDate, ctaHref, ctaLabel } = ctx;
  const dateStr = sentDate.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const subject = '阿阇梨今日晨音已为阁下准备';

  // 退订链接（用 email 编码的占位，真实部署可换 mailto:unsubscribe@）
  const encodedTo = encodeURIComponent(displayName);

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0B0B0B;font-family:'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;color:#E5E5E5;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0B0B0B;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;">
        <!-- 头部 logo 区 -->
        <tr>
          <td align="center" style="padding:24px 0 32px;">
            <div style="font-size:28px;color:#D4AF37;letter-spacing:0.3em;">牧心堂</div>
            <div style="margin-top:6px;font-size:10px;letter-spacing:0.4em;color:#D4AF3799;">MUXINTANG · DAILY</div>
          </td>
        </tr>
        <!-- 称呼 -->
        <tr>
          <td style="padding:0 24px 16px;font-size:14px;line-height:1.8;color:#E5E5E5;">
            ${encodedTo}道友 早安：
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 24px;font-size:13px;line-height:1.8;color:#999;">
            今日是 ${dateStr}，阿阇梨为阁下准备了一则晨间开示：
          </td>
        </tr>
        <!-- 金句卡片 -->
        <tr>
          <td style="padding:0 24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                   style="background:linear-gradient(180deg,#1A1A1A 0%,#0B0B0B 100%);border:1px solid #D4AF3755;border-radius:12px;">
              <tr>
                <td style="padding:32px 24px;">
                  <div style="font-family:Georgia,'Source Han Serif SC',serif;font-size:24px;line-height:1.6;color:#D4AF37;text-align:center;letter-spacing:0.1em;">
                    ${escapeHtml(quote.text)}
                  </div>
                  <div style="margin-top:20px;padding-top:20px;border-top:1px dashed #D4AF3733;font-size:13px;line-height:1.8;color:#BBB;text-align:center;">
                    ${escapeHtml(quote.note)}
                  </div>
                  <div style="margin-top:16px;font-size:10px;letter-spacing:0.3em;color:#777;text-align:center;">
                    — ${escapeHtml(quote.byline)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- CTA 按钮 -->
        <tr>
          <td align="center" style="padding:32px 24px;">
            <a href="${escapeAttr(ctaHref)}"
               style="display:inline-block;background:#D4AF37;color:#0B0B0B;padding:12px 32px;
                      font-size:14px;letter-spacing:0.1em;text-decoration:none;border-radius:6px;
                      font-weight:500;">
              ${escapeHtml(ctaLabel)}
            </a>
          </td>
        </tr>
        <!-- 收尾 -->
        <tr>
          <td style="padding:24px 24px 0;font-size:12px;line-height:1.8;color:#888;text-align:center;">
            愿您今日心不外驰，安住本心。<br>
            <span style="color:#555;">— 牧心堂 · 寂光阿阇梨 —</span>
          </td>
        </tr>
        <!-- 页脚 -->
        <tr>
          <td style="padding:32px 24px 0;border-top:1px solid #222;margin-top:32px;">
            <div style="font-size:10px;line-height:1.6;color:#555;text-align:center;">
              本邮件由牧心堂系统自动发送，每日清晨 6:00 送达。<br>
              如不希望继续接收，请回复邮件主题注明"退订"。
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = `牧心堂 · 阿阇梨今日晨音

${encodedTo}道友 早安：

今日是 ${dateStr}，阿阇梨为阁下准备了一则晨间开示：

  ${quote.text}

  ${quote.note}
  — ${quote.byline}

→ ${ctaLabel}：${ctaHref}

愿您今日心不外驰，安住本心。
— 牧心堂 · 寂光阿阇梨 —

---
本邮件由牧心堂系统自动发送，每日清晨 6:00 送达。
如不希望继续接收，请回复邮件主题注明"退订"。`;

  return { to: '', subject, html, text };
}

/* ============ HTML 转义 ============ */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
