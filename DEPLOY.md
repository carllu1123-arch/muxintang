# 牧心堂 · 部署文档

> 当前架构：GitHub + Vercel 集成（自动部署）

---

## 🏗 架构总览

```
┌─────────────┐    git push     ┌─────────────┐   webhook    ┌─────────────┐
│  Local Dev  │ ──────────────► │   GitHub    │ ───────────► │   Vercel    │
│  (这台电脑)  │                 │  carllu1123 │              │  自动构建   │
└─────────────┘                 │  -arch/     │              │  自动部署   │
                                │  muxintang  │              │  + Cron    │
                                └─────────────┘              └─────────────┘
```

- **触发条件**：push 到 `master` 或 `main` 分支
- **构建命令**：`npm install && next build`（Vercel 自动识别 Next.js）
- **输出目录**：`.next`
- **Cron 任务**：`/api/cron/daily-digest` 每日北京时间 06:00 触发

---

## 🚀 日常部署（最常用）

```bash
# 1. 改完代码后，跑本地检查（typecheck + lint + build）
npm run pre-deploy

# 2. 一键推送到 GitHub，Vercel 自动部署
npm run deploy
```

**或者用 Bash**（macOS / WSL）：
```bash
npm run deploy:bash
```

**或者手动**：
```bash
git add -A
git commit -m "feat: 你的描述"
git push origin master
```

---

## 🔧 Vercel 环境变量配置

到 [Vercel Dashboard](https://vercel.com/dashboard) → 选项目 → Settings → Environment Variables

### 必填（核心）

| 变量 | 说明 | 从哪拿 |
|------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | supabase.com → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role（⚠️ 仅服务端） | 同上 |
| `DIFY_API_KEY` | Dify AI 排盘解读 | dify.ai → Apps → API Access |
| `POLAR_WEBHOOK_SECRET` | Polar 支付回调签名 | polar.sh → Settings → Webhooks |
| `NEXT_PUBLIC_SITE_URL` | 站点 URL（OAuth 回调、邮件链接） | `https://muxintang.com` |
| `CRON_SECRET` | Cron 鉴权（建议 32+ 字符随机串） | 自己生成：`openssl rand -base64 32` |

### 选填（功能）

| 变量 | 作用 | 不填的影响 |
|------|------|------------|
| `SMTP_*` + `MAIL_FROM` | 每日晨音邮件推送 | 走 mock 模式（log 到控制台） |
| `SILICONFLOW_API_KEY` | TTS 语音朗读 | TTS 接口 502 |
| `ALIYUN_OSS_*` / `TENCENT_COS_*` / `S3_*` | 对象存储 | 走 Supabase Storage |

### 环境区分

每个变量可以分别配置三个环境：
- **Production**：线上（muxintang.com）
- **Preview**：PR 预览（自动）
- **Development**：本地（一般不用）

---

## 📅 每日晨音 Cron 配置

已在 [vercel.json](../vercel.json) 配置：
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 22 * * *"
    }
  ]
}
```

- **UTC 22:00 = 北京时间次日 06:00**
- Vercel 部署后自动注册到 [Vercel Dashboard → Crons](https://vercel.com/dashboard)
- 手动测试：
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" https://muxintang.com/api/cron/daily-digest
  ```

---

## 🛠 常见排错

### Q1: 部署失败，看不到日志
→ Vercel Dashboard → Deployments → 点失败的那次 → Build Logs

### Q2: 部署成功但页面 404
→ 检查 `NEXT_PUBLIC_SITE_URL` 是否和实际域名一致
→ 检查 `vercel.json` 的 `cleanUrls` / `trailingSlash` 配置

### Q3: Cron 没触发
→ 确认 `CRON_SECRET` 已设置
→ Vercel Dashboard → Crons 标签看是否已注册
→ Pro 计划才有 Cron 功能（免费计划有限制）

### Q4: Supabase 报 fetch failed
→ 检查 `NEXT_PUBLIC_SUPABASE_URL` 是否能在浏览器访问
→ 确认 Vercel 部署地区（建议选 Hong Kong 或 Singapore）

### Q5: 部署很慢
→ 删除 `.next` 和 `node_modules`，Vercel 会自动重装
→ 检查 `package.json` 是否有过大依赖

---

## 🔐 部署前 Checklist

每次部署前，确保：
- [ ] `.env.local` 在本地工作正常
- [ ] Vercel 上对应环境变量已配齐
- [ ] `npm run pre-deploy` 通过
- [ ] commit message 描述清楚改了什么

---

## 📦 部署到本地（备选）

如果想在本地模拟 Vercel 部署（用 standalone 模式）：

```bash
npm run build
npm run start:standalone  # 端口 3001
```

---

## 🆘 紧急回滚

到 Vercel Dashboard → Deployments → 找到上一次正常的部署 → 点 "Promote to Production"

---

最后更新：2026-07-03 · 牧心堂 · 寂光阿阇梨
