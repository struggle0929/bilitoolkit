$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
try {
  # Explicit .cmd avoids selecting npm.ps1 under restrictive execution policies.
  & npm.cmd run dev
  if ($LASTEXITCODE -ne 0) { throw "开发进程退出，错误码：$LASTEXITCODE" }
} catch {
  Write-Host "启动失败（不代表依赖安装失败）：$($_.Exception.Message)" -ForegroundColor Red
  Read-Host '请复制上方错误信息；按 Enter 键关闭窗口'
  exit 1
}
