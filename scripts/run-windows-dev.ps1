$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $projectRoot '.bilitoolkit-setup-logs'
$logPath = Join-Path $logDirectory 'development.log'
[void][System.IO.Directory]::CreateDirectory($logDirectory)
Set-Location -LiteralPath $projectRoot
try {
  # Explicit .cmd avoids selecting npm.ps1 under restrictive execution policies.
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
  $OutputEncoding = [Console]::OutputEncoding
  & npm.cmd run dev 2>&1 | Out-File -LiteralPath $logPath -Encoding UTF8
  if ($LASTEXITCODE -ne 0) { throw "开发进程退出，错误码：$LASTEXITCODE" }
} catch {
  Add-Type -AssemblyName System.Windows.Forms
  $message = "启动失败（不代表依赖安装失败）：$($_.Exception.Message)`n`n详细日志：$logPath"
  [void][System.Windows.Forms.MessageBox]::Show($message, '哔哩工具姬', 'OK', 'Error')
  exit 1
}
