import { appEnv } from '@ybgnb/vite-env/common'
import electronUpdater, { type UpdateDownloadedEvent } from 'electron-updater'
import { app, dialog } from 'electron'
import { getAppSettings } from '@/main/utils/host-app.js'
import { mainLogger } from '@/main/common/main-logger.js'

class AppUpdateManager {
  updateTask: null | Promise<void> = null
  ignoreResult = false
  // 是否显示上次检查更新为最新版本的提示
  showLastCheckUpToDateTip: boolean = false

  init() {
    const autoUpdater = electronUpdater.autoUpdater
    autoUpdater.on('update-not-available', () => {
      if (this.showLastCheckUpToDateTip) {
        dialog.showMessageBox({
          type: 'info',
          buttons: ['确定'],
          title: '提示',
          message: `当前已经是最新版本`,
        })
        this.showLastCheckUpToDateTip = false
      }
    })
    autoUpdater.on('update-downloaded', async (event: UpdateDownloadedEvent) => {
      if (this.ignoreResult) return
      const { response } = await dialog.showMessageBox({
        type: 'info',
        buttons: ['立即安装', '暂不安装'],
        title: '检测到新版本',
        message: `新版本 ${event.version} 已下载完成`,
      })

      if (response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
    if (appEnv.PROD && app.isPackaged && getAppSettings().autoUpdateOnStartup) {
      void this.checkUpdate().catch((error: unknown) => {
        mainLogger.error('自动检查更新失败', error)
      })
    }
  }

  async checkUpdate() {
    if (!app.isPackaged) {
      await dialog.showMessageBox({
        type: 'info',
        buttons: ['确定'],
        title: '开发版无法在线更新',
        message: '在线更新仅适用于从 GitHub Releases 安装的正式版。开发版请更新源码后重新启动。',
      })
      return
    }

    this.ignoreResult = false
    if (this.updateTask) {
      return this.updateTask
    }

    this.updateTask = (async () => {
      try {
        await electronUpdater.autoUpdater.checkForUpdatesAndNotify()
      } finally {
        this.updateTask = null
      }
    })()

    return this.updateTask
  }

  async cancelCheck() {
    this.ignoreResult = true
  }
}

export const appUpdateManager = new AppUpdateManager()
