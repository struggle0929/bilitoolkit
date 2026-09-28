# 开发文档

## 哔哩工具姬

### 项目模块

- [bilitoolkit](https://github.com/hzhilong/bilitoolkit) 哔哩工具姬
- [bilitoolkit-types](https://github.com/hzhilong/bilitoolkit-types) 类型库
- [bilitoolkit-runtime](https://github.com/hzhilong/bilitoolkit-runtime) 运行库
- [bilitoolkit-ui](https://github.com/hzhilong/bilitoolkit-ui) UI 库
- [bilitoolkit-plugins](https://github.com/hzhilong/bilitoolkit-plugins) 插件列表

### 项目描述

一个基于 Electron 构建的**插件化桌面平台**，通过插件机制扩展平台功能。平台提供统一的基础 API 与运行环境，插件以 npm 包的形式发布、安装和管理。

平台支持 **UI 插件**与 **Task 插件**两种插件类型：

* **UI 插件**：提供交互界面和可视化功能。平台使用 `WebContentsView` 创建独立的插件视图，并为不同插件配置独立的 Electron `session`，实现运行环境与 Cookie、Storage、缓存等数据的隔离。

  > 因为要在插件视图上面显示类似【账号选择弹窗】的平台页面，所以这里选择使用`WebContentsView`。

* **Task 插件**：用于执行自动化任务。平台通过 `worker_threads` 隔离任务线程，并通过 `vm + Sandbox` 限制 Task 插件可访问的运行环境。

  > 这里并未实现真正意义上的安全沙箱。

### 环境说明

项目采用 **pnpm monorepo** 方式进行本地开发，各子项目在 GitHub 中分别维护。

### 安装依赖

项目已将独立发布的模块依赖写为 npm 版本号。克隆仓库或下载源码 ZIP 后，不需要手动修改 `package.json` 和 `package-lock.json`。先安装符合 `package.json` 要求的 Node.js，并在项目根目录执行：

```bash
npm ci
```

如果只想在 Windows 上快速运行开发版，可以双击根目录的 `start-windows.cmd`。首次运行先选择下载方式，再点击“开始安装”；未找到已缓存的官方 Electron 安装包时默认勾选国内镜像，仅加速 Electron 和 FFmpeg，不修改 npm 全局配置，退出后恢复调用方原有镜像环境变量。失败后切换到另一下载配置重试一次，不保证所有网络或代理环境都能成功。安装过程优先使用 npm 缓存，并显示安装脚本的实时输出；进度条是活动指示，不是准确下载百分比。

成功后在根目录 `.bilitoolkit-setup-complete` 和 `node_modules/.bilitoolkit-setup-state` 保存锁文件 SHA-256。依赖、资源和锁文件均匹配时直接启动；误删根目录标记可从内部记录恢复。锁文件变化、依赖缺失或没有可信记录时重新安装；仅构建资源缺失时复用依赖并重新构建。修复失败不会遗留成功标记。不要以删除标记的方式反复测试下载，建议在全新解压目录验证。普通用户请优先下载 [Releases 安装包](https://github.com/hzhilong/bilitoolkit/releases/latest)，无需开发环境。

每次安装的完整日志保存在 `.bilitoolkit-setup-logs/时间-进程号/`，首次失败和重试日志分别保留。单步默认超时为 900 秒；超时或取消会终止该步的子进程树。启动终端失败与安装失败分开提示。启动器同时核对锁文件内必需包的 package.json 和版本，允许平台相关可选包缺失；这仍不等同于完整文件校验或原生模块 ABI 健康检查。

`ffmpeg-static` 安装时还会从 GitHub Releases 下载 Windows 二进制文件，Electron 也需要下载二进制文件，因此网络代理或加速器可能影响速度和连接。弃用警告不等于安装失败。手动安装时，若 FFmpeg 下载因网络超时失败，可在 **cmd** 中临时指定镜像后重试（仅影响当前命令窗口）：

```cmd
set FFMPEG_BINARIES_URL=https://cdn.npmmirror.com/binaries/ffmpeg-static
npm ci
```

### 构建项目

首次安装依赖后，依次执行：

```bash
npm run build:all
npm run rebuild:native
```

用于完成预加载脚本及原生模块的构建。

### 启动器回归测试

在 Windows 上运行 `node scripts/test-windows-setup.mjs`。测试在项目 `temp/` 下创建独立夹具，使用假的 npm 验证安装阶段、跳过安装、标记恢复、锁文件变更、资源修复、双向镜像重试及失败恢复；不联网、不启动应用、不修改主项目依赖。模拟通过不能替代真实首次下载与界面验收。

全新目录的真实安装验证可运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-windows.ps1 -NonInteractive -NoLaunch -DownloadSource mirror
```

`-NonInteractive` 仅跳过图形交互，仍执行真实 npm 安装；`-NoLaunch` 保留安装成果但不启动开发终端。仅在独立源码副本使用这条验证命令。可用 `-StepTimeoutSeconds 1800` 显式延长慢网络环境下的单步限制，默认 900 秒。

### 开发

启动开发环境：

```bash
npm run dev
```

开发版需要保持终端窗口打开。应用内的在线更新只适用于正式安装版；开发版请用 Git 更新源码并重新构建。

### 打包

依次执行脚本：

```bash
# 执行项目构建
npm run build
# 执行应用打包
npm run app:dist
```

Windows 安装包和自动更新清单输出在 `release/版本号/`。发布新版本时须将 `.exe` 与 `latest.yml` 一同上传到对应的 GitHub Release。仓库的标签发布流程会在推送 `v版本号` 标签后自动完成 Windows 构建和上传；标签版本应与 `package.json` 的 `version` 一致。

## 插件开发

待完善...
