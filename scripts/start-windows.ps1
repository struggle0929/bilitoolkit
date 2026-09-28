Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$projectRoot = Split-Path -Parent $PSScriptRoot
$marker = Join-Path $projectRoot '.bilitoolkit-setup-complete'
$vite = Join-Path $projectRoot 'node_modules\.bin\vite.cmd'

function Show-SetupError([string]$message) {
  [void][System.Windows.Forms.MessageBox]::Show($message, '哔哩工具姬', 'OK', 'Error')
}

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Show-SetupError "源码版需要先安装 Node.js。普通用户可以直接下载安装包：`nhttps://github.com/hzhilong/bilitoolkit/releases/latest"
  exit 1
}

& node -e "const v=process.versions.node.split('.').map(Number);process.exit((v[0]===20&&v[1]>=19)||(v[0]===22&&v[1]>=12)||v[0]>22?0:1)"
if ($LASTEXITCODE -ne 0) {
  Show-SetupError "需要 Node.js 20.19+ 或 22.12+。当前版本：$(& node --version)"
  exit 1
}

if (Test-Path -LiteralPath $marker) {
  if (Test-Path -LiteralPath $vite) {
    Start-Process -FilePath $env:ComSpec -ArgumentList '/k', 'npm run dev' -WorkingDirectory $projectRoot -WindowStyle Normal
    exit 0
  }
}

$form = New-Object System.Windows.Forms.Form
$form.Text = '哔哩工具姬 · 首次安装'
$form.Size = New-Object System.Drawing.Size(700, 430)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.ControlBox = $false
$form.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 10)

$status = New-Object System.Windows.Forms.Label
$status.Location = New-Object System.Drawing.Point(20, 20)
$status.Size = New-Object System.Drawing.Size(640, 32)
$status.Text = '准备安装...'
$form.Controls.Add($status)

$hint = New-Object System.Windows.Forms.Label
$hint.Location = New-Object System.Drawing.Point(20, 54)
$hint.Size = New-Object System.Drawing.Size(640, 42)
$hint.Text = '首次安装通常需要几分钟。下载期间进度条会持续移动，请保持窗口打开。'
$form.Controls.Add($hint)

$progress = New-Object System.Windows.Forms.ProgressBar
$progress.Location = New-Object System.Drawing.Point(20, 102)
$progress.Size = New-Object System.Drawing.Size(640, 20)
$progress.Style = 'Marquee'
$progress.MarqueeAnimationSpeed = 25
$form.Controls.Add($progress)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Location = New-Object System.Drawing.Point(20, 138)
$logBox.Size = New-Object System.Drawing.Size(640, 220)
$logBox.Multiline = $true
$logBox.ReadOnly = $true
$logBox.ScrollBars = 'Vertical'
$logBox.Font = New-Object System.Drawing.Font('Consolas', 9)
$form.Controls.Add($logBox)

$cancel = New-Object System.Windows.Forms.Button
$cancel.Location = New-Object System.Drawing.Point(560, 365)
$cancel.Size = New-Object System.Drawing.Size(100, 28)
$cancel.Text = '取消'
$script:cancelRequested = $false
$cancel.Add_Click({ $script:cancelRequested = $true })
$form.Controls.Add($cancel)

function Update-SetupLog([string]$stdoutPath, [string]$stderrPath) {
  $lines = @()
  if (Test-Path -LiteralPath $stdoutPath) {
    $lines += @(Get-Content -LiteralPath $stdoutPath -Tail 10 -ErrorAction SilentlyContinue)
  }
  if (Test-Path -LiteralPath $stderrPath) {
    $lines += @(Get-Content -LiteralPath $stderrPath -Tail 10 -ErrorAction SilentlyContinue)
  }
  $logBox.Text = ($lines -join [Environment]::NewLine)
  $logBox.SelectionStart = $logBox.Text.Length
  $logBox.ScrollToCaret()
}

function Invoke-SetupStep([string]$title, [string]$command, [int]$number) {
  $status.Text = "第 $number/3 步：$title"
  $logBox.Text = "正在运行：$command"
  $form.Refresh()

  $basePath = Join-Path $env:TEMP "bilitoolkit-setup-$PID-$number"
  $stdoutPath = "$basePath.out.log"
  $stderrPath = "$basePath.err.log"
  $processInfo = New-Object System.Diagnostics.ProcessStartInfo
  $processInfo.FileName = $env:ComSpec
  $processInfo.Arguments = '/d /s /c "' + $command + ' 1>"' + $stdoutPath + '" 2>"' + $stderrPath + '""'
  $processInfo.WorkingDirectory = $projectRoot
  $processInfo.UseShellExecute = $false
  $processInfo.CreateNoWindow = $true
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $processInfo
  [void]$process.Start()

  while (-not $process.HasExited) {
    [System.Windows.Forms.Application]::DoEvents()
    Update-SetupLog $stdoutPath $stderrPath
    if ($script:cancelRequested) {
      & taskkill.exe /PID $process.Id /T /F *> $null
      return $false
    }
    Start-Sleep -Milliseconds 300
    $process.Refresh()
  }

  Update-SetupLog $stdoutPath $stderrPath
  return ($process.ExitCode -eq 0)
}

$form.Show()
[System.Windows.Forms.Application]::DoEvents()

try {
  $installed = Invoke-SetupStep '安装依赖（包括 FFmpeg 和 Electron）' 'npm ci' 1
  if (-not $installed -and -not $script:cancelRequested) {
    $hint.Text = '首次下载失败，正在用 FFmpeg 镜像重试一次。'
    $env:FFMPEG_BINARIES_URL = 'https://cdn.npmmirror.com/binaries/ffmpeg-static'
    $installed = Invoke-SetupStep '重试安装依赖' 'npm ci' 1
  }
  if ($installed -and -not $script:cancelRequested) {
    $built = Invoke-SetupStep '构建运行资源' 'npm run build:all' 2
  }
  if ($installed -and $built -and -not $script:cancelRequested) {
    $rebuilt = Invoke-SetupStep '准备本机数据库模块' 'npm run rebuild:native' 3
  }

  if ($installed -and $built -and $rebuilt -and -not $script:cancelRequested) {
    Set-Content -LiteralPath $marker -Value 'ready' -Encoding ASCII
    $form.Close()
    Start-Process -FilePath $env:ComSpec -ArgumentList '/k', 'npm run dev' -WorkingDirectory $projectRoot -WindowStyle Normal
    exit 0
  }

  if ($script:cancelRequested) {
    $form.Close()
    exit 1
  }

  $status.Text = '安装失败，请查看下方日志。'
  $hint.Text = '完整日志保存在系统临时目录的 bilitoolkit-setup-*.log 文件中。'
  $progress.Style = 'Blocks'
  $progress.Value = 0
  $cancel.Text = '关闭'
  while ($form.Visible) {
    [System.Windows.Forms.Application]::DoEvents()
    if ($script:cancelRequested) { $form.Close() }
    Start-Sleep -Milliseconds 100
  }
  exit 1
} catch {
  $form.Close()
  Show-SetupError "启动失败：$($_.Exception.Message)"
  exit 1
}
