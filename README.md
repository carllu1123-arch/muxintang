# 牧心堂 · 灵性修学与生命智测

> 生命代码 · 家居环境 · 姓名心解 · 阿阇梨开示

牧心堂是一个独立运行在 `localhost:3001` 的灵性研学网站。它**不与灵境阁、良朋社共享数据**，拥有自己的 Supabase 项目、自己的 Dify 应用、自己的 Polar 支付账户。

## 技术栈

- **Next.js 16.2.10** App Router + Server Components
- **TypeScript 5** 严格模式
- **Tailwind CSS v4**（用 `@theme` 而非 `tailwind.config.ts`）
- **Supabase** 数据库 + Auth（使用 `@supabase/ssr`）
- **lunar-javascript** 八字排盘（硬算 100% 精准）
- **Dify** AI 解读（可降级到本地模板）
- **Polar** 支付 + Webhook
- **React 19**

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 复制环境变量模板
cp .env.example .env.local

# 3. 填入 Supabase / Dify / Polar 配置（见下方说明）

# 4. 启动开发服务器（端口 3001）
npm run dev
```

打开 [http://localhost:3001](http://localhost:3001)

## 启用各模块

### 1. Supabase（必填，登录/会员功能依赖）

1. 在 [supabase.com](https://supabase.com) 新建一个**专属于牧心堂**的项目（不要复用灵境阁 / 良朋社的）
2. 在 SQL Editor 中执行 `supabase/migrations/0001_init.sql`
3. 把项目 URL 和 anon key 填到 `.env.local`：
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
   ```
4. （可选）想要 webhook 落库时，配上 service_role key：
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJh...
   ```

未配置时：内容走 `mock-data.ts`，登录页会提示"未配置"。

### 2. Dify AI 解读（强烈推荐）

1. 在 [dify.ai](https://dify.ai) 创建一个 Chatflow 或 Workflow
2. 输入变量至少包括：
   - `query`: 用户问题
   - `birth`: 出生信息
   - `pillars`: 四柱
   - `day_master`, `day_master_element`
   - `deity`: 唐密本尊
   - `five_elements`: 五行能量
   - `ten_gods`: 十神
3. 输出 Markdown 文本
4. 把 API key 和 app id 填到 `.env.local`：
   ```
   DIFY_API_KEY=app-xxxx
   DIFY_BAZI_WORKFLOW=  # Workflow App（推荐）
   # 或
   DIFY_BAZI_APP_ID=    # Chatbot App
   ```

**不填也能跑**：自动走 `src/lib/bazi-interpretation.ts` 的本地模板。

### 3. Polar 支付

1. 在 [polar.sh](https://polar.sh) 注册，组织 ID 独立
2. 创建两个产品：
   - 月度会员（¥29 或 ¥38）
   - 年度会员（¥199 或 ¥388）
3. 在 Settings → Webhooks 添加：
   - URL: `https://your-domain.com/api/polar/webhook`
   - 事件：`subscription.*` 和 `order.*`
4. 把 webhook secret 填到 `.env.local`：
   ```
   POLAR_WEBHOOK_SECRET=whsec_xxxx
   ```
5. 把两个产品的购买链接填到 `.env.local`（前端"立即开通"按钮用）

**不填也能跑**：付费墙会显示，但点击"立即开通"会跳到 `/pricing` 占位页。

## 目录结构

```
src/
├── app/                    # 路由
│   ├── api/                # API 路由
│   │   ├── bazi/           # POST /api/bazi 排盘
│   │   └── polar/webhook/  # POST /api/polar/webhook
│   ├── learn/              # 四学专栏
│   ├── tools/bazi/         # 生命代码工具
│   ├── library/            # 行者文丛（小说）
│   ├── me/                 # 个人中心
│   ├── login/              # 登录/注册
│   └── pricing/            # 定价
├── components/             # 共享组件
├── lib/                    # 业务逻辑
│   ├── bazi-engine.ts      # 八字硬算
│   ├── bazi-interpretation.ts  # 本地解读模板
│   ├── dify.ts             # Dify 客户端
│   ├── polar.ts            # Polar 客户端 + 签名校验
│   ├── supabase.ts         # 浏览器端 Supabase
│   ├── supabase-server.ts  # 服务端 Supabase（service_role）
│   ├── session.ts          # Server Component 当前用户
│   ├── data.ts             # 统一数据访问层
│   └── mock-data.ts        # Mock 数据（无 DB 时兜底）
└── types/
    └── supabase.ts         # Database / Tables 类型
```

## 关键设计

### 数据访问层自动降级

```ts
// src/lib/data.ts
export async function getArticles(category?) {
  if (useDb()) {
    try { return await getFromSupabase(); }
    catch { /* fallthrough */ }
  }
  return getFromMock();
}
```

Supabase 没配好？自动走 mock。配好了？自动走 DB。**业务页面零感知**。

### 八字硬算 + AI 润色

```ts
// /api/bazi
1. validateBaziInput()
2. calculateBazi()           // lunar-javascript，100% 精准
3. callDify() || buildLocalInterpretation()  // AI / 本地
4. 写 bazi_readings 表（可选）
```

即 AI 故障，硬算依然 100% 正确。

### 付费墙动态解锁

```ts
// src/app/learn/[category]/[slug]/page.tsx
const session = await getCurrentSession();
const userHasAccess = canAccess(session, article.tier_required);
const isLocked = !article.is_free && locked.length > 0 && !userHasAccess;
```

未订阅 → 显示付费墙；已订阅 → 自动解锁全部内容。

### Webhook 安全

```ts
// src/lib/polar.ts → verifyPolarSignature()
// HMAC-SHA256(rawBody, secret)，5 分钟时间窗，timingSafeEqual
```

签名错误立即返回 401，绝不更新 DB。

## 部署

- 端口：`3001`（独立于灵境阁 3000、良朋社 3002）
- 推荐：Vercel / 自建 Docker
- 环境变量：必须填齐 Supabase（至少 anon key）
- Webhook：Polar Dashboard 添加 `https://your-domain.com/api/polar/webhook`

## License

Private · 牧心堂团队
