#!/usr/bin/env pwsh
# =====================================================
# 牧心堂 · 一键部署脚本（PowerShell）
# =====================================================
# 流程：
#   1. tsc --noEmit 类型检查
#   2. eslint 代码检查
#   3. next build 本地构建（确保 Vercel 不会失败）
#   4. git status 检查（避免漏提交）
#   5. git push origin master → 触发 Vercel 自动部署
#
# 用法：
#   .\scripts\deploy.ps1                  # 推 master
#   .\scripts\deploy.ps1 -Message "fix"   # 自定义 commit msg
#   .\scripts\deploy.ps1 -SkipBuild       # 跳过本地 build（加速）
# =====================================================

[CmdletBinding()]
param(
  [string]$Message = "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
  [switch]$SkipBuild = $false,
  [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot) | Out-Null

function Step($n, $title) {
  Write-Host ""
  Write-Host "── $n. $title ─────────────────────────" -ForegroundColor Cyan
}

function Fail($msg) {
  Write-Host "❌ $msg" -ForegroundColor Red
  exit 1
}

# ---- 0. 预检查 ----
Step "0" "预检查"
if (-not (Test-Path ".git")) { Fail "当前目录不是 git 仓库" }
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "master" -and $branch -ne "main") {
  Write-Host "⚠️  当前分支: $branch（部署通常在 master/main）" -ForegroundColor Yellow
}

# ---- 1. TypeScript ----
Step "1" "TypeScript 类型检查"
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Fail "TypeScript 检查失败" }

# ---- 2. ESLint ----
Step "2" "ESLint 代码检查"
npx eslint .
if ($LASTEXITCODE -ne 0) { Fail "ESLint 检查失败" }

# ---- 3. Build（可选） ----
if (-not $SkipBuild) {
  Step "3" "Next.js 本地构建"
  npm run build
  if ($LASTEXITCODE -ne 0) { Fail "Next.js 构建失败（Vercel 也会失败）" }
} else {
  Step "3" "Next.js 构建（已跳过）"
}

# ---- 4. Git status ----
Step "4" "Git 状态"
$status = git status --porcelain
if ($status) {
  Write-Host "检测到未提交变更：" -ForegroundColor Yellow
  git status --short
  Write-Host ""
  $answer = Read-Host "是否自动 add + commit？(y/n)"
  if ($answer -eq "y") {
    git add -A
    git commit -m $Message
  } else {
    Fail "请先手动提交后再部署"
  }
}

# ---- 5. Push ----
Step "5" "推送到 GitHub → 触发 Vercel 自动部署"
$remote = git remote get-url origin
Write-Host "Remote: $remote" -ForegroundColor Gray

if ($DryRun) {
  Write-Host "🔍 Dry-run 模式，跳过实际推送" -ForegroundColor Yellow
} else {
  git push origin $branch
  if ($LASTEXITCODE -ne 0) { Fail "Git push 失败" }
}

Write-Host ""
Write-Host "✅ 部署触发成功！" -ForegroundColor Green
Write-Host "📊 Vercel Dashboard: https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host "⏱  预计 1-3 分钟完成构建部署" -ForegroundColor Gray
