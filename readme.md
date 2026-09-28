# 哔哩工具姬

一款面向 B 站用户的开源工具箱，支持在线安装和卸载插件，可登录多个账号并按需选择账号执行插件。

## Windows 安装与启动

**普通用户请下载安装包，不需要下载源码、安装 Node.js 或修改 `package.json`。**

1. 打开 [GitHub Releases](https://github.com/hzhilong/bilitoolkit/releases/latest)，下载 `BiliToolkit_版本号.exe`（不要选页面下方的 `Source code` 压缩包）。
2. 双击安装包完成安装，然后从桌面或开始菜单的“哔哩工具姬”快捷方式启动。
3. 在应用的“关于”页点击“检测版本更新”。检测到新版本后，等待下载完成并选择“立即安装”。“设置”页也可开启启动时自动更新。

在线更新依赖作者在 GitHub Releases 同时发布安装包和 `latest.yml`。从源码启动的开发版不能通过此功能更新；请重新下载源码或使用 Git 更新后再次启动。

GitHub 的 `Code → Download ZIP` 得到的是**源码**，其中没有可直接运行的应用程序。如果要从源码压缩包启动，请先安装符合项目要求的 [Node.js](https://nodejs.org/)（`^20.19.0` 或 `>=22.12.0`），解压后双击根目录的 `start-windows.cmd`。首次运行会出现安装进度窗口，显示依赖安装、构建和本机模块准备三个阶段及最新日志；下载无法准确换算成百分比。成功后自动启动开发版，下一次双击不会重复安装。开发版运行时需要保持命令窗口打开。开发者的详细步骤见[开发文档](doc/development.md)。

## 技术栈

`Vue 3` + `Electron` + `TypeScript` + `Element Plus`

### [插件列表](https://github.com/hzhilong/bilitoolkit-plugins)

| 插件名称                                     | 描述                                  |
|------------------------------------------|-------------------------------------|
| [哔哩备份姬](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-backup) | 一键备份和还原 B 站账号数据，快速完成账号数据迁移          |
| [速升姬](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-quick-upgrade) | 用于自动完成每日经验任务，包括每日登录、观看、投币和分享        |
| [弹幕工具箱](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-danmaku) | 快速查询视频弹幕                            |
| [图片下载](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-image-downloader) | 快速下载专栏、动态、评论中的图片与表情包，以及视频封面、直播封面和用户头像 |
| [视频下载](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-video-downloader) | 下载视频、音频、弹幕、字幕、封面等资源（仅支持UP主上传的视频）    |
| [透明头像](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-transparent-avatar) | 上传半透明的用户头像                          |
| [评论搜索](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-comment-search)  | 根据 UID 或关键词，快速搜索评论区评论               |
| [移除机器人粉丝](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-remove-bot-followers) | 批量移除并拉黑粉丝中的机器人或片姐                   |
| [视频存档](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-video-archive)   | 自动保存指定用户的最新视频投稿，方便补档                |
| [评论导出](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-comment-export)  | 导出评论，支持本地浏览和查询                      |
| [动态删除](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-dynamic-delete)  | 可批量删除动态，包括转发、抽奖以及图文动态               |
| [批量取关](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-batch-unfollow)  | 批量取消关注用户，可选择关注分组进行操作                |
| [黑名单分享](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-blacklist-share) | 支持黑名单列表导出与导入，方便用户共享黑名单数据并批量拉黑       |
| [评论删除](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-comment-clear)   | 批量删除自己发布过的评论                        |
| [动态互动数据](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-dynamic-interactions) | 查看图文动态的点赞与转发用户                      |
| [动态存档](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-dynamic-archive) | 自动保存指定用户的最新图文动态                     |
| [弹幕投票](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-danmaku-poll)   | 直播弹幕投票（非官方投票功能）                     |
| [收藏夹存档](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-fav-archive)   | 自动下载收藏夹中所有视频                        |
| [合集管理](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-collection-manager)   | 视频合集管理，方便UP主批量归类视频                  |
| [专栏下载](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-opus-downloader)   | 专栏下载器，可保存为markdown/docx/txt                 |
| [稿件管理](https://github.com/hzhilong/bilitoolkit-plugins/blob/main/bilitoolkit-plugin-archive-manager)   | 批量修改稿件可见范围                 |


## 截图

![plugins.png](doc/screenshots/plugins.png)

## 注意事项

* 使用本项目产生的任何后果由使用者自行承担；
* 本项目仅供学习、研究和技术交流使用，请勿将其用于违反相关平台规则的用途；
* 本项目仅对用户具有合法访问权限的内容提供资源获取能力，不提供任何未经授权内容的访问能力；
* 本项目与哔哩哔哩官方无任何关联。

## [开发文档](doc/development.md)

## 致谢

- [bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect)
- [remixicon](https://github.com/Remix-Design/RemixIcon)
