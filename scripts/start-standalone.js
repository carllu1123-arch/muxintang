/**
 * 牧心堂 · Standalone 启动脚本
 *
 * Next.js 16 的 output:'standalone' 在 Windows 下会把 server.js 嵌套在
 *   .next/standalone/<CWD 路径>/server.js
 * （Linux/Mac 通常是 .next/standalone/server.js）
 *
 * 本脚本自动递归查找 server.js，并自动复制 .next/static（Next 官方要求）
 * 让 `npm run start:standalone` 在所有平台都能用。
 *
 * 用法：
 *   npm run build
 *   npm run start:standalone
 *
 * 端口与 HOST 通过 PORT / HOST 环境变量覆盖（默认 3001 / 0.0.0.0）
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = process.cwd();
const STANDALONE_DIR = path.join(ROOT, '.next', 'standalone');

/* ============ 1. 定位 server.js ============ */
/**
 * 找到 standalone 输出的 server.js，跳过 node_modules 干扰。
 * Next.js 16 在 Windows 上常嵌套在 CWD 镜像下：
 *   .next/standalone/Documents/<path>/server.js  ← 这个
 *   .next/standalone/.../node_modules/next/.../server.js  ← 跳过
 * 策略：找最浅层的 server.js。
 */
function findServerJs(dir) {
  if (!fs.existsSync(dir)) return null;
  // 1) 标准路径：直接子目录
  const direct = path.join(dir, 'server.js');
  if (fs.existsSync(direct)) return direct;

  // 2) 退化：广度优先找最浅层的 server.js
  const queue = [dir];
  while (queue.length > 0) {
    const current = queue.shift();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const full = path.join(current, e.name);
      // 跳过 node_modules（干扰项）
      if (e.name === 'node_modules') continue;
      // 优先检查当前子目录
      const candidate = path.join(full, 'server.js');
      if (fs.existsSync(candidate)) return candidate;
      // 否则加入队列继续
      queue.push(full);
    }
  }
  return null;
}

const serverJs = findServerJs(STANDALONE_DIR);
if (!serverJs) {
  console.error('❌ 找不到 server.js。请确认已经运行 `npm run build` 且 next.config.ts 中 output: "standalone"');
  console.error(`   查找目录：${STANDALONE_DIR}`);
  process.exit(1);
}
const serverDir = path.dirname(serverJs);
console.log(`✅ 找到 server.js：${path.relative(ROOT, serverJs)}`);

/* ============ 2. 复制 .next/static 到 standalone ============ */
const staticSrc = path.join(ROOT, '.next', 'static');
const staticDst = path.join(serverDir, '.next', 'static');
if (fs.existsSync(staticSrc)) {
  fs.cpSync(staticSrc, staticDst, { recursive: true });
  console.log(`✅ 静态资源已复制到 ${path.relative(ROOT, staticDst)}`);
} else {
  console.warn('⚠️  未找到 .next/static（可能没跑 build？）');
}

/* ============ 3. 复制 public（如有） ============ */
const publicSrc = path.join(ROOT, 'public');
const publicDst = path.join(serverDir, 'public');
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDst, { recursive: true });
  console.log(`✅ public 已复制到 ${path.relative(ROOT, publicDst)}`);
}

/* ============ 4. 启动 server ============ */
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

console.log(`🚀 启动 standalone 服务：${HOST}:${PORT}`);
console.log(`   cwd = ${serverDir}`);

const child = spawn(process.execPath, [serverJs], {
  cwd: serverDir,
  env: { ...process.env, PORT, HOST },
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
