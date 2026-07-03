#!/usr/bin/env bash
# =====================================================
# 牧心堂 · 一键部署脚本（Bash / macOS / Linux / WSL）
# =====================================================
# 用法：
#   ./scripts/deploy.sh                  # 推 master
#   ./scripts/deploy.sh -m "fix bug"     # 自定义 commit msg
#   ./scripts/deploy.sh --skip-build     # 跳过本地 build
#   ./scripts/deploy.sh --dry-run        # 仅检查不推送
# =====================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MESSAGE="deploy: $(date '+%Y-%m-%d %H:%M')"
SKIP_BUILD=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message)  MESSAGE="$2"; shift 2 ;;
    --skip-build)  SKIP_BUILD=1; shift ;;
    --dry-run)     DRY_RUN=1; shift ;;
    -h|--help)     head -20 "$0"; exit 0 ;;
    *)             echo "未知参数: $1"; exit 1 ;;
  esac
done

step() { echo -e "\n\033[1;36m── $1. $2 ─────────────────────────\033[0m"; }
fail() { echo -e "\033[1;31m❌ $1\033[0m"; exit 1; }

# ---- 0. 预检查 ----
step "0" "预检查"
[ -d .git ] || fail "当前目录不是 git 仓库"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "  当前分支: $BRANCH"

# ---- 1. TypeScript ----
step "1" "TypeScript 类型检查"
npx tsc --noEmit || fail "TypeScript 检查失败"

# ---- 2. ESLint ----
step "2" "ESLint 代码检查"
npx eslint . || fail "ESLint 检查失败"

# ---- 3. Build ----
if [ "$SKIP_BUILD" -eq 0 ]; then
  step "3" "Next.js 本地构建"
  npm run build || fail "Next.js 构建失败（Vercel 也会失败）"
else
  step "3" "Next.js 构建（已跳过）"
fi

# ---- 4. Git status ----
step "4" "Git 状态"
if [ -n "$(git status --porcelain)" ]; then
  echo "  检测到未提交变更："
  git status --short
  read -p "  是否自动 add + commit？(y/n) " ANSWER
  if [ "$ANSWER" = "y" ]; then
    git add -A
    git commit -m "$MESSAGE"
  else
    fail "请先手动提交后再部署"
  fi
fi

# ---- 5. Push ----
step "5" "推送到 GitHub → 触发 Vercel 自动部署"
REMOTE=$(git remote get-url origin)
echo "  Remote: $REMOTE"

if [ "$DRY_RUN" -eq 1 ]; then
  echo -e "\033[1;33m🔍 Dry-run 模式，跳过实际推送\033[0m"
else
  git push origin "$BRANCH" || fail "Git push 失败"
fi

echo ""
echo -e "\033[1;32m✅ 部署触发成功！\033[0m"
echo -e "\033[1;90m📊 Vercel Dashboard: https://vercel.com/dashboard\033[0m"
echo -e "\033[1;90m⏱  预计 1-3 分钟完成构建部署\033[0m"
