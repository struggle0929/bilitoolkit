import { getErrorMessage } from '@ybgnb/utils'
import { loadingDialog, showError } from 'bilitoolkit-ui'
import { toolkitApi } from '@/renderer/api/toolkit-api'

export async function checkAppUpdate(): Promise<void> {
  loadingDialog.show({
    showCancel: true,
    message: '正在检查更新',
    onCancel: () => {
      void toolkitApi.core.cancelCheckUpdateApp()
    },
  })

  try {
    await toolkitApi.core.checkUpdateApp()
  } catch (error) {
    showError(`检查更新失败：${getErrorMessage(error)}`)
  } finally {
    loadingDialog.close()
  }
}
