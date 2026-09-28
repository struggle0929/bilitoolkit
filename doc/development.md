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

如果只想在 Windows 上快速运行开发版，可以双击根目录的 `start-windows.cmd`；首次运行会打开安装进度窗口，执行依赖安装和下面的构建步骤。成功后写入 `.bilitoolkit-setup-complete` 标记，下次双击直接启动；若依赖损坏，可删除该标记后重新执行安装。普通用户请优先下载 [Releases 安装包](https://github.com/hzhilong/bilitoolkit/releases/latest)，无需开发环境。

`ffmpeg-static` 安装时还会从 GitHub Releases 下载 Windows 二进制文件。`start-windows.cmd` 首次下载失败后会用 FFmpeg 镜像自动重试一次。手动安装时，若此步因网络超时失败，可在 **cmd** 中临时指定镜像后重试（仅影响当前命令窗口）：

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
